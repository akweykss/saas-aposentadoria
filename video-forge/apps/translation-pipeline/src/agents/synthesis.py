"""Phase 5: Synthesis Agent — FFmpeg final composition.

Composes the final video by merging the source video, translated audio,
and caption overlay. Applies cinematic post-processing: LUT color grade,
motion interpolation, film grain, and metadata purging.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional

import structlog

from ..db.models import Database, JobStatus
from ..utils.ffmpeg import FFmpegWrapper
from ..utils.manifest import JobManifest

logger = structlog.get_logger(__name__)


class SynthesisAgent:
    """Handles final video synthesis and post-processing."""

    def __init__(
        self,
        db: Database,
        workspace_dir: str | Path,
        apply_lut: bool = True,
        apply_grain: bool = True,
        apply_minterp: bool = False,
        grain_intensity: int = 8,
        lut_path: Optional[str | Path] = None,
    ):
        self.db = db
        self.workspace_dir = Path(workspace_dir)
        self.apply_lut = apply_lut
        self.apply_grain = apply_grain
        self.apply_minterp = apply_minterp
        self.grain_intensity = grain_intensity
        self.lut_path = lut_path
        self.ffmpeg = FFmpegWrapper()

    async def process(self, job_id: str) -> Optional[JobManifest]:
        """Run the final synthesis pipeline.

        Flow:
        1. Validate job is in PROCESSING_SYNTHESIS status
        2. Load manifest for all intermediate paths
        3. Compose video + translated audio + overlay
        4. Apply post-processing (LUT, grain, minterp)
        5. Purge metadata
        6. Update manifest and transition to DONE
        """
        job = await self.db.get_job(job_id)
        if not job:
            logger.error("synthesis.job_not_found", job_id=job_id)
            return None

        if job.status != JobStatus.PROCESSING_SYNTHESIS:
            logger.error(
                "synthesis.invalid_status",
                job_id=job_id,
                status=job.status.value,
            )
            return None

        try:
            manifest = JobManifest.load(job.manifest_path)
            manifest.set_phase_status("synthesis", "running")

            ingestion = manifest.get_phase("ingestion")
            voice = manifest.get_phase("voice")
            overlay = manifest.get_phase("overlay")

            video_path = ingestion["video_path"]
            audio_path = voice["tts"]["merged_audio_path"]

            # Read new fields from manifest
            speed_factor = voice.get("tts", {}).get("speed_factor", 1.0)
            segment_speeds = voice.get("tts", {}).get("segment_speeds", [])
            ass_subtitle_path = overlay.get("ass_subtitle_path")
            sub_blur_region = overlay.get("sub_blur_region")

            # Set up output directory
            output_dir = self.workspace_dir / "outputs" / job_id
            output_dir.mkdir(parents=True, exist_ok=True)

            # Work directory for intermediate files
            work_dir = output_dir / "_work"
            work_dir.mkdir(parents=True, exist_ok=True)

            # Determine output filename
            output_path = output_dir / f"translated_{job_id[:8]}.mp4"

            logger.info(
                "synthesis.starting",
                job_id=job_id,
                video=video_path,
                audio=audio_path,
                speed_factor=speed_factor,
                segment_speeds_count=len(segment_speeds),
                ass_subtitle=ass_subtitle_path,
                sub_blur_region=str(sub_blur_region),
                lut=self.apply_lut,
                grain=self.apply_grain,
            )

            def _synth_progress(pct: float, msg: str):
                from ..server_progress import update_progress
                update_progress(job_id, "processing_synthesis", pct, msg)

            # ── Phase 1: Render video WITHOUT subtitles ──────────────
            # Subtitles are added AFTER the video is ready, as a separate
            # post-processing step with exact timestamps from audio
            # transcription. This guarantees 100% sync.
            final_path = await self.ffmpeg.full_synthesis_pipeline(
                video_path=video_path,
                audio_path=audio_path,
                output_path=output_path,
                ass_subtitle_path=None,  # NO subtitles in first pass
                speed_factor=speed_factor,
                apply_hflip=True,
                sub_blur_region=sub_blur_region,
                apply_lut_flag=self.apply_lut,
                apply_grain_flag=self.apply_grain,
                lut_path=self.lut_path,
                grain_intensity=self.grain_intensity,
                work_dir=work_dir,
                progress_callback=_synth_progress,
                segment_speeds=segment_speeds,
            )

            # ── Phase 2: Post-process subtitles ────────────────────────
            # Transcribe the actual audio to get exact sentence timestamps,
            # then burn subtitles onto the rendered video.
            _synth_progress(95, "📝 Gerando legendas sincronizadas...")

            try:
                # Get the audio path to transcribe
                audio_to_transcribe = Path(audio_path)

                # Transcribe with AssemblyAI for exact timestamps
                import assemblyai as aai
                import os
                aai.settings.api_key = os.environ.get("ASSEMBLYAI_API_KEY", "")

                target_lang = manifest.target_language or "pt-BR"
                lang_map = {
                    "pt-BR": "pt", "pt": "pt",
                    "en-US": "en", "en": "en",
                    "es-ES": "es", "es-MX": "es", "es": "es",
                    "fr-FR": "fr", "fr": "fr",
                    "de-DE": "de", "de": "de",
                    "it-IT": "it", "it": "it",
                    "ja-JP": "ja", "ja": "ja",
                    "ko-KR": "ko", "ko": "ko",
                }
                aai_lang = lang_map.get(target_lang, "pt")

                _synth_progress(96, "🔍 Transcrevendo áudio para legendas exatas...")
                config = aai.TranscriptionConfig(language_code=aai_lang)
                transcriber = aai.Transcriber(config=config)
                transcript = transcriber.transcribe(str(audio_to_transcribe))

                if transcript.status == aai.TranscriptStatus.error:
                    raise RuntimeError(f"AssemblyAI: {transcript.error}")

                # Build subtitle segments from sentences
                sub_segments = []
                try:
                    sentences = transcript.get_sentences()
                except AttributeError:
                    sentences = transcript.sentences() if hasattr(transcript, 'sentences') else None

                if sentences:
                    for sentence in sentences:
                        sub_segments.append({
                            "start": round(sentence.start / 1000.0, 3),
                            "end": round(sentence.end / 1000.0, 3),
                            "translated": sentence.text,
                        })
                elif transcript.words:
                    # Group words into ~6-word chunks
                    words = transcript.words
                    for i in range(0, len(words), 6):
                        chunk = words[i:i+6]
                        text = " ".join(w.text for w in chunk)
                        sub_segments.append({
                            "start": round(chunk[0].start / 1000.0, 3),
                            "end": round(chunk[-1].end / 1000.0, 3),
                            "translated": text,
                        })

                # Split long segments so each has max 2 lines (~90 chars)
                MAX_2LINES = 44  # 22 chars/line × 2 lines (fits 1080px at 92px font)
                final_segments = []
                for seg in sub_segments:
                    txt = seg["translated"].strip()
                    if len(txt) <= MAX_2LINES:
                        final_segments.append(seg)
                        continue
                    # Split into chunks at word boundaries
                    chunks, remaining = [], txt
                    while remaining:
                        if len(remaining) <= MAX_2LINES:
                            chunks.append(remaining)
                            break
                        sp = MAX_2LINES
                        while sp > 0 and remaining[sp] != ' ':
                            sp -= 1
                        if sp == 0:
                            sp = MAX_2LINES
                        chunks.append(remaining[:sp].strip())
                        remaining = remaining[sp:].strip()
                    # Distribute time proportionally
                    dur = seg["end"] - seg["start"]
                    total_c = sum(len(c) for c in chunks)
                    t = seg["start"]
                    for c in chunks:
                        r = len(c) / total_c if total_c > 0 else 1 / len(chunks)
                        cd = dur * r
                        final_segments.append({
                            "start": round(t, 3),
                            "end": round(t + cd, 3),
                            "translated": c,
                        })
                        t += cd
                sub_segments = final_segments

                if sub_segments:
                    logger.info(
                        "synthesis.subtitles_transcribed",
                        segments=len(sub_segments),
                        sample=[s["translated"][:40] for s in sub_segments[:3]],
                    )

                    # Generate .ass file with exact timestamps
                    _synth_progress(97, f"📝 Queimando {len(sub_segments)} legendas...")
                    ass_path = work_dir / "subtitles_synced.ass"
                    # Get video resolution
                    vid_w, vid_h = await self.ffmpeg.get_resolution(final_path)
                    blur_y = sub_blur_region.get("y", int(vid_h * 0.85)) if sub_blur_region else int(vid_h * 0.85)
                    blur_h = sub_blur_region.get("h", vid_h - blur_y) if sub_blur_region else (vid_h - blur_y)

                    self.ffmpeg.generate_ass_subtitles(
                        segments=sub_segments,
                        output_path=ass_path,
                        video_width=vid_w,
                        video_height=vid_h,
                        sub_blur_y=blur_y,
                        sub_blur_h=blur_h,
                    )

                    # Burn subtitles onto the video (fast re-encode)
                    output_with_subs = output_dir / f"translated_{job_id[:8]}_subs.mp4"
                    final_path = await self.ffmpeg._burn_subtitles_final(
                        video_path=final_path,
                        ass_path=ass_path,
                        output_path=output_with_subs,
                    )
                    logger.info(
                        "synthesis.subtitles_burned",
                        segments=len(sub_segments),
                        output=str(final_path),
                    )
                else:
                    logger.warning("synthesis.no_subtitle_segments")

            except Exception as sub_err:
                logger.warning(
                    "synthesis.subtitle_postprocess_failed",
                    error=str(sub_err),
                    msg="Video saved without subtitles",
                )

            # ── Phase 3: Lip Sync + 9:16 Layout Composition ─────────────
            # If a character is selected, generate lip-synced avatar video
            # and compose a 9:16 layout with rotating layouts.
            # Uses the official DreamAPI SDK which uploads files directly —
            # no public URLs or ngrok needed.
            character_id = manifest._data.get("character_id")
            dreamface_key = os.environ.get("DREAMFACE_API_KEY", "")

            if character_id and dreamface_key:
                try:
                    _synth_progress(97, "🎭 Gerando lip sync do avatar...")
                    logger.info(
                        "synthesis.lipsync_start",
                        job_id=job_id,
                        character_id=character_id,
                    )

                    from ..agents.lipsync import LipSyncAgent
                    from ..agents.compositor import LayoutCompositor

                    # Find the character avatar video
                    char_dir = Path(__file__).parent.parent.parent / "data" / "characters" / character_id
                    char_meta_path = char_dir / "meta.json"
                    if not char_meta_path.exists():
                        logger.warning("synthesis.character_not_found", character_id=character_id)
                    else:
                        import json as _json_m
                        char_meta = _json_m.loads(char_meta_path.read_text())
                        avatar_filename = char_meta.get("avatar_filename", "")
                        avatar_file = char_dir / avatar_filename

                        if not avatar_file.exists():
                            logger.warning("synthesis.avatar_file_missing", path=str(avatar_file))
                        else:
                            lipsync_agent = LipSyncAgent(
                                workspace_dir=self.workspace_dir,
                                dreamface_api_key=dreamface_key,
                            )

                            # Process using local files — SDK handles upload
                            lipsync_result = await lipsync_agent.process(
                                job_id=job_id,
                                audio_path=Path(audio_path),
                                avatar_video_path=avatar_file,
                                progress_callback=lambda phase, pct, msg: _synth_progress(
                                    97 + pct * 0.015, f"🎭 {msg}"
                                ),
                            )

                            if lipsync_result and lipsync_result.exists():
                                # Compose 9:16 layout with rotating layouts
                                _synth_progress(98, "🎬 Compondo layout 9:16...")

                                compositor = LayoutCompositor(
                                    ffmpeg_path=str(self.ffmpeg._ffmpeg_path),
                                )
                                composed_path = output_dir / f"translated_{job_id[:8]}_9x16.mp4"
                                final_path = await compositor.compose(
                                    video_path=final_path,
                                    avatar_path=lipsync_result,
                                    output_path=composed_path,
                                    fps=25,
                                    layout_duration=8.0,
                                    progress_callback=lambda pct, msg: _synth_progress(
                                        98 + pct * 0.01, f"🎬 {msg}"
                                    ),
                                )

                                logger.info(
                                    "synthesis.lipsync_composed",
                                    job_id=job_id,
                                    output=str(final_path),
                                )
                            else:
                                logger.warning("synthesis.lipsync_result_missing")

                except Exception as ls_err:
                    logger.warning(
                        "synthesis.lipsync_failed",
                        error=str(ls_err),
                        msg="Video saved without lip sync overlay",
                    )

            # Get final video stats
            duration = await self.ffmpeg.get_duration(final_path)
            width, height = await self.ffmpeg.get_resolution(final_path)
            size_bytes = final_path.stat().st_size

            # Update manifest
            manifest.set_synthesis_result(
                output_video_path=str(final_path),
                resolution=f"{width}x{height}",
                duration=duration,
                size_bytes=size_bytes,
                lut=self.apply_lut,
                minterp=self.apply_minterp,
                grain=self.apply_grain,
            )

            # Update job with output path
            await self.db.update_job_field(
                job_id, "output_video_path", str(final_path)
            )

            # Clean up work directory
            try:
                import shutil
                shutil.rmtree(work_dir, ignore_errors=True)
            except Exception:
                pass

            # Transition to DONE
            await self.db.update_job_status(job_id, JobStatus.DONE)

            logger.info(
                "synthesis.complete",
                job_id=job_id,
                output=str(final_path),
                resolution=f"{width}x{height}",
                duration_s=round(duration, 2),
                size_mb=round(size_bytes / (1024 * 1024), 2),
            )
            return manifest

        except Exception as e:
            error_msg = f"Synthesis failed: {str(e)}"
            logger.exception("synthesis.error", job_id=job_id, error=error_msg)
            await self.db.update_job_status(
                job_id, JobStatus.ERROR, error_message=error_msg
            )
            return None
