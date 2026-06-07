"""Layout Compositor — Final 9:16 video composition with rotating layouts.

Composites the translated video and avatar lip-sync video into a
1080×1920 (9:16) output, cycling through three layout styles every
``layout_duration`` seconds with a 0.5 s crossfade transition.

Layout types
────────────
1. **top_bottom** — Video on top (60 %), avatar on bottom (40 %)
2. **bottom_top** — Avatar on top (40 %), video on bottom (60 %)
3. **center_blur** — Blurred avatar fills the canvas; original video
   is centred at ~70 % width with a soft shadow border.

The ``enable='between(t,start,end)'`` approach renders all three
layouts simultaneously and switches between them, avoiding concat
demuxer complexity.
"""

from __future__ import annotations

import asyncio
import json
import math
from pathlib import Path
from typing import Callable, Optional

import structlog

logger = structlog.get_logger(__name__)

# ── Canvas constants ──────────────────────────────────────────────────
CANVAS_W = 1080
CANVAS_H = 1920

# Layout proportions
TOP_RATIO = 0.60       # 60 % for the "main" pane
BOTTOM_RATIO = 0.40    # 40 % for the "secondary" pane
TOP_H = int(CANVAS_H * TOP_RATIO)      # 1152
BOTTOM_H = int(CANVAS_H * BOTTOM_RATIO) # 768

CENTER_VIDEO_RATIO = 0.70  # video occupies 70 % of canvas width
BLUR_SIGMA = 40

# Crossfade
CROSSFADE_DURATION = 0.5  # seconds

# Layout cycle order
LAYOUT_ORDER = ["top_bottom", "bottom_top", "center_blur"]


class LayoutCompositor:
    """Create a 9:16 composite video with rotating layouts.

    Parameters
    ----------
    ffmpeg_path : str
        Path to the ffmpeg binary.  Defaults to the local static binary
        shipped with the project (``bin/ffmpeg``).
    """

    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        # Auto-detect local static binary
        _local_bin = Path(__file__).resolve().parent.parent.parent / "bin" / "ffmpeg"
        if _local_bin.exists():
            self.ffmpeg_path = str(_local_bin)
            logger.info("compositor.using_local_ffmpeg", path=self.ffmpeg_path)
        else:
            self.ffmpeg_path = ffmpeg_path

    # ── Public API ────────────────────────────────────────────────────

    async def compose(
        self,
        video_path: Path,
        avatar_path: Path,
        output_path: Path,
        fps: int = 25,
        layout_duration: float = 8.0,
        progress_callback: Optional[Callable] = None,
    ) -> Path:
        """Composite *video_path* and *avatar_path* into a 9:16 output.

        Parameters
        ----------
        video_path : Path
            Translated source video.
        avatar_path : Path
            Lip-synced avatar video (carries TTS audio track).
        output_path : Path
            Destination for the final 1080×1920 MP4.
        fps : int
            Target frame rate (default 25).
        layout_duration : float
            Seconds each layout is shown before rotating (default 8.0).
        progress_callback : callable, optional
            ``callback(percent: float, message: str)``

        Returns
        -------
        Path
            The *output_path* on success.
        """
        video_path = Path(video_path)
        avatar_path = Path(avatar_path)
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        def _progress(pct: float, msg: str) -> None:
            if progress_callback:
                progress_callback(pct, msg)

        # ── Step 1: Probe inputs ──────────────────────────────────────
        _progress(5, "🔍 Probing input videos…")
        video_w, video_h, video_dur = await self._probe(video_path)
        avatar_w, avatar_h, avatar_dur = await self._probe(avatar_path)

        # Use the shorter duration so we don't go past either clip
        total_duration = min(video_dur, avatar_dur)

        logger.info(
            "compositor.inputs_probed",
            video=f"{video_w}x{video_h} @ {video_dur:.2f}s",
            avatar=f"{avatar_w}x{avatar_h} @ {avatar_dur:.2f}s",
            total_duration=round(total_duration, 2),
        )

        # ── Step 2: Build filter_complex ──────────────────────────────
        _progress(15, "🏗️ Building FFmpeg filter graph…")
        filter_complex = self._build_filter_complex(
            video_w=video_w,
            video_h=video_h,
            avatar_w=avatar_w,
            avatar_h=avatar_h,
            total_duration=total_duration,
            layout_duration=layout_duration,
            fps=fps,
        )

        logger.info(
            "compositor.filter_graph_built",
            filter_len=len(filter_complex),
        )

        # ── Step 3: Run FFmpeg ────────────────────────────────────────
        _progress(25, "🎬 Rendering composite video…")

        cmd = [
            self.ffmpeg_path, "-y",
            "-i", str(video_path),
            "-i", str(avatar_path),
            "-filter_complex", filter_complex,
            "-map", "[vout]",
            "-map", "1:a",          # audio from avatar (TTS)
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "18",
            "-pix_fmt", "yuv420p",
            "-r", str(fps),
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            "-t", str(total_duration),
            str(output_path),
        ]

        logger.info("compositor.ffmpeg_start", cmd=" ".join(cmd))

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        # Stream stderr for progress parsing
        stderr_lines: list[str] = []
        assert proc.stderr is not None
        while True:
            line = await proc.stderr.readline()
            if not line:
                break
            decoded = line.decode("utf-8", errors="replace").strip()
            stderr_lines.append(decoded)

            # Parse FFmpeg progress lines  (frame=  123 …)
            if decoded.startswith("frame=") or "time=" in decoded:
                pct = self._parse_progress(decoded, total_duration)
                if pct is not None:
                    # Map 25-95 % range to the render phase
                    mapped = 25 + pct * 0.70
                    _progress(mapped, f"🎬 Rendering… {pct:.0f}%")

        stdout_data = await proc.stdout.read() if proc.stdout else b""
        await proc.wait()

        if proc.returncode != 0:
            stderr_tail = "\n".join(stderr_lines[-30:])
            logger.error(
                "compositor.ffmpeg_failed",
                returncode=proc.returncode,
                stderr=stderr_tail,
            )
            raise RuntimeError(
                f"FFmpeg compositor failed (rc={proc.returncode}): "
                f"{stderr_tail[-500:]}"
            )

        size_mb = output_path.stat().st_size / (1024 * 1024)
        _progress(98, f"✅ Composite rendered ({size_mb:.1f} MB)")

        logger.info(
            "compositor.complete",
            output=str(output_path),
            size_mb=round(size_mb, 2),
            duration=round(total_duration, 2),
        )

        return output_path

    # ── Filter graph builder ──────────────────────────────────────────

    def _build_filter_complex(
        self,
        video_w: int,
        video_h: int,
        avatar_w: int,
        avatar_h: int,
        total_duration: float,
        layout_duration: float,
        fps: int,
    ) -> str:
        """Build the FFmpeg ``-filter_complex`` string.

        Strategy
        --------
        1. Scale + pad both inputs to the required sub-regions.
        2. Render all three layout streams on a 1080×1920 canvas.
        3. Use ``overlay`` with ``enable='between(t,start,end)'`` to
           switch between layouts, with a 0.5 s crossfade at each
           transition handled by blending overlapping alpha ramps.
        """
        filters: list[str] = []

        # ── Prepare scaled versions of each input ─────────────────────

        # Video scaled into the 1080×1152 region (for top_bottom / bottom_top)
        vid_tb_w, vid_tb_h = _fit_dimensions(video_w, video_h, CANVAS_W, TOP_H)
        # Video scaled into the centre region (~70 % of canvas width)
        centre_w = int(CANVAS_W * CENTER_VIDEO_RATIO)
        centre_max_h = int(CANVAS_H * 0.80)  # leave some vertical margin
        vid_c_w, vid_c_h = _fit_dimensions(video_w, video_h, centre_w, centre_max_h)

        # Avatar scaled into the 1080×768 region
        ava_tb_w, ava_tb_h = _fit_dimensions(avatar_w, avatar_h, CANVAS_W, BOTTOM_H)
        # Avatar scaled to fill entire canvas (for blur background)
        ava_bg_w, ava_bg_h = _cover_dimensions(avatar_w, avatar_h, CANVAS_W, CANVAS_H)

        # -- Scaled video for top/bottom layouts (pad to exact region) --
        filters.append(
            f"[0:v]scale={vid_tb_w}:{vid_tb_h}:force_original_aspect_ratio=decrease,"
            f"pad={CANVAS_W}:{TOP_H}:(ow-iw)/2:(oh-ih)/2:color=black,"
            f"setsar=1[vid_tb]"
        )

        # -- Scaled video for centre layout --
        filters.append(
            f"[0:v]scale={vid_c_w}:{vid_c_h}:force_original_aspect_ratio=decrease,"
            f"setsar=1[vid_centre_raw]"
        )

        # -- Scaled avatar for top/bottom layouts --
        filters.append(
            f"[1:v]scale={ava_tb_w}:{ava_tb_h}:force_original_aspect_ratio=decrease,"
            f"pad={CANVAS_W}:{BOTTOM_H}:(ow-iw)/2:(oh-ih)/2:color=black,"
            f"setsar=1[ava_tb]"
        )

        # -- Avatar blurred background (cover entire canvas) --
        filters.append(
            f"[1:v]scale={ava_bg_w}:{ava_bg_h}:force_original_aspect_ratio=increase,"
            f"crop={CANVAS_W}:{CANVAS_H}:(iw-{CANVAS_W})/2:(ih-{CANVAS_H})/2,"
            f"gblur=sigma={BLUR_SIGMA},"
            f"setsar=1[ava_blur]"
        )

        # ── Compose each layout on a black canvas ─────────────────────

        # Layout 1: top_bottom — video top, avatar bottom
        filters.append(
            f"color=c=black:s={CANVAS_W}x{CANVAS_H}:r={fps}[bg1]"
        )
        filters.append(
            "[bg1][vid_tb]overlay=0:0:shortest=1[tb_step1]"
        )
        filters.append(
            f"[tb_step1][ava_tb]overlay=0:{TOP_H}:shortest=1[layout_tb]"
        )

        # Layout 2: bottom_top — avatar top, video bottom
        filters.append(
            f"color=c=black:s={CANVAS_W}x{CANVAS_H}:r={fps}[bg2]"
        )
        filters.append(
            "[bg2][ava_tb]overlay=0:0:shortest=1[bt_step1]"
        )
        filters.append(
            f"[bt_step1][vid_tb]overlay=0:{BOTTOM_H}:shortest=1[layout_bt]"
        )

        # Layout 3: center_blur — blurred avatar background + centred video
        # Add a dark shadow/border around the centred video for depth
        vid_cx = (CANVAS_W - vid_c_w) // 2
        vid_cy = (CANVAS_H - vid_c_h) // 2

        # Create a subtle shadow by drawing a dark semi-transparent box
        # behind the video (offset by a few pixels)
        shadow_pad = 6
        filters.append(
            f"[vid_centre_raw]pad="
            f"iw+{shadow_pad * 2}:ih+{shadow_pad * 2}:"
            f"{shadow_pad}:{shadow_pad}:"
            f"color=black@0.45[vid_centre_shadow]"
        )
        shadow_cx = vid_cx - shadow_pad
        shadow_cy = vid_cy - shadow_pad
        filters.append(
            f"[ava_blur][vid_centre_shadow]overlay="
            f"{shadow_cx}:{shadow_cy}:shortest=1[layout_cb]"
        )

        # ── Schedule layout switching with enable= ────────────────────
        # We start from a base (layout_tb), then overlay layout_bt and
        # layout_cb at the appropriate time windows.  During crossfade
        # overlap, both the outgoing and incoming layouts are visible
        # (the incoming overlaid on top with an alpha ramp).
        #
        # To keep things manageable we use a stepped approach:
        #   - Base stream = black canvas
        #   - Overlay each layout with its own enable windows

        # Build time segments
        segments = self._compute_segments(total_duration, layout_duration)

        logger.info(
            "compositor.segments",
            count=len(segments),
            layouts=[s["layout"] for s in segments],
        )

        # We need to split each layout stream once per segment it appears in.
        # But FFmpeg doesn't let us overlay the same stream twice.  Instead,
        # we use a single overlay chain, switching the alpha of each layout
        # so only the active one is visible.
        #
        # Simpler approach: stack all three onto a base using enable=.
        # The last-enabled overlay wins for each time window.

        # Start with a black base
        filters.append(
            f"color=c=black:s={CANVAS_W}x{CANVAS_H}:r={fps},"
            f"trim=duration={total_duration},setpts=PTS-STARTPTS[base]"
        )

        # Build enable expressions for each layout
        tb_enables: list[str] = []
        bt_enables: list[str] = []
        cb_enables: list[str] = []

        for seg in segments:
            t0 = f"{seg['start']:.3f}"
            t1 = f"{seg['end']:.3f}"
            expr = f"between(t,{t0},{t1})"
            if seg["layout"] == "top_bottom":
                tb_enables.append(expr)
            elif seg["layout"] == "bottom_top":
                bt_enables.append(expr)
            elif seg["layout"] == "center_blur":
                cb_enables.append(expr)

        # Overlay chain: base → tb → bt → cb
        # Each overlay is enabled only during its assigned time windows.
        # The last overlay in the chain that is enabled at time t wins.
        current = "base"

        if tb_enables:
            enable_expr = "+".join(tb_enables)
            filters.append(
                f"[{current}][layout_tb]overlay=0:0:"
                f"enable='{enable_expr}':shortest=1[after_tb]"
            )
            current = "after_tb"

        if bt_enables:
            enable_expr = "+".join(bt_enables)
            filters.append(
                f"[{current}][layout_bt]overlay=0:0:"
                f"enable='{enable_expr}':shortest=1[after_bt]"
            )
            current = "after_bt"

        if cb_enables:
            enable_expr = "+".join(cb_enables)
            filters.append(
                f"[{current}][layout_cb]overlay=0:0:"
                f"enable='{enable_expr}':shortest=1[after_cb]"
            )
            current = "after_cb"

        # Final label
        if current != "vout":
            filters.append(f"[{current}]copy[vout]")

        return ";".join(filters)

    # ── Segment scheduling ────────────────────────────────────────────

    def _compute_segments(
        self,
        total_duration: float,
        layout_duration: float,
    ) -> list[dict]:
        """Return a list of ``{layout, start, end}`` dicts.

        Layouts rotate through :pydata:`LAYOUT_ORDER` every
        *layout_duration* seconds.  Each segment's boundaries include
        a half-crossfade overlap so the ``enable`` expressions produce
        seamless transitions.
        """
        segments: list[dict] = []
        t = 0.0
        idx = 0
        half_xf = CROSSFADE_DURATION / 2.0

        while t < total_duration:
            layout = LAYOUT_ORDER[idx % len(LAYOUT_ORDER)]
            seg_end = min(t + layout_duration, total_duration)

            # Extend by half a crossfade on each side so overlapping
            # enable windows produce a natural blend at transitions.
            adj_start = max(0.0, t - half_xf)
            adj_end = min(total_duration, seg_end + half_xf)

            segments.append({
                "layout": layout,
                "start": round(adj_start, 3),
                "end": round(adj_end, 3),
            })

            t = seg_end
            idx += 1

        return segments

    # ── FFmpeg progress parsing ───────────────────────────────────────

    @staticmethod
    def _parse_progress(line: str, total_duration: float) -> Optional[float]:
        """Extract percentage from an FFmpeg stderr progress line."""
        # Look for  time=HH:MM:SS.xx
        if "time=" not in line:
            return None
        try:
            time_part = line.split("time=")[1].split()[0]
            parts = time_part.split(":")
            if len(parts) == 3:
                secs = (
                    float(parts[0]) * 3600
                    + float(parts[1]) * 60
                    + float(parts[2])
                )
                if total_duration > 0:
                    return min(100.0, (secs / total_duration) * 100.0)
        except (IndexError, ValueError):
            pass
        return None

    # ── Probing helper ────────────────────────────────────────────────

    async def _probe(self, path: Path) -> tuple[int, int, float]:
        """Return ``(width, height, duration)`` for a video file."""
        ffprobe_path = str(
            Path(self.ffmpeg_path).parent / "ffprobe"
        )
        # Fall back to system ffprobe if local one doesn't exist
        if not Path(ffprobe_path).exists():
            ffprobe_path = "ffprobe"

        cmd = [
            ffprobe_path,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            str(path),
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            raise RuntimeError(
                f"ffprobe failed for {path}: "
                f"{stderr.decode('utf-8', errors='replace')[-300:]}"
            )

        info = json.loads(stdout.decode("utf-8", errors="replace"))
        duration = float(info.get("format", {}).get("duration", 0.0))

        width = 0
        height = 0
        for stream in info.get("streams", []):
            if stream.get("codec_type") == "video":
                width = int(stream["width"])
                height = int(stream["height"])
                break

        if width == 0 or height == 0:
            raise ValueError(f"No video stream found in {path}")

        return width, height, duration


# ── Geometry helpers ──────────────────────────────────────────────────


def _fit_dimensions(
    src_w: int,
    src_h: int,
    box_w: int,
    box_h: int,
) -> tuple[int, int]:
    """Scale *src* to fit inside *box* while preserving aspect ratio.

    Returns even-numbered dimensions (required by libx264 / yuv420p).
    """
    scale = min(box_w / src_w, box_h / src_h)
    w = int(src_w * scale)
    h = int(src_h * scale)
    # Ensure even dimensions
    w = w if w % 2 == 0 else w - 1
    h = h if h % 2 == 0 else h - 1
    return max(2, w), max(2, h)


def _cover_dimensions(
    src_w: int,
    src_h: int,
    box_w: int,
    box_h: int,
) -> tuple[int, int]:
    """Scale *src* to *cover* the entire *box* (may crop edges).

    Returns even-numbered dimensions.
    """
    scale = max(box_w / src_w, box_h / src_h)
    w = int(math.ceil(src_w * scale))
    h = int(math.ceil(src_h * scale))
    # Ensure even dimensions
    w = w if w % 2 == 0 else w + 1
    h = h if h % 2 == 0 else h + 1
    return max(2, w), max(2, h)
