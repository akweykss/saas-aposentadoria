/**
 * Lightweight animated donut chart using Canvas.
 */

/**
 * Render an animated donut chart into a container.
 * @param {HTMLElement} container - DOM element to render into
 * @param {Array<{label: string, value: number, color: string}>} segments
 * @param {Object} [options]
 * @param {number} [options.size=240] - Canvas size in pixels
 * @param {number} [options.lineWidth=28] - Donut thickness
 * @param {number} [options.animationDuration=1200] - Animation duration in ms
 * @param {string} [options.centerText] - Text to show in center
 * @param {string} [options.centerSubtext] - Subtext below center text
 */
export function renderDonutChart(container, segments, options = {}) {
  const {
    size = 240,
    lineWidth = 28,
    animationDuration = 1200,
    centerText = '',
    centerSubtext = '',
  } = options;

  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  container.innerHTML = '';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - lineWidth) / 2 - 4;

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return;

  // Calculate angles
  const arcs = [];
  let currentAngle = -Math.PI / 2; // Start from top
  for (const seg of segments) {
    const sweep = (seg.value / total) * Math.PI * 2;
    arcs.push({
      startAngle: currentAngle,
      endAngle: currentAngle + sweep,
      color: seg.color,
      label: seg.label,
      value: seg.value,
    });
    currentAngle += sweep;
  }

  // Animate
  const startTime = performance.now();

  function draw(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / animationDuration, 1);
    const eased = easeOutCubic(progress);

    ctx.clearRect(0, 0, size, size);

    // Draw background circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // Draw segments
    for (const arc of arcs) {
      const sweepAngle = (arc.endAngle - arc.startAngle) * eased;
      if (sweepAngle <= 0) continue;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, arc.startAngle, arc.startAngle + sweepAngle);
      ctx.strokeStyle = arc.color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Draw gap separators
    if (eased > 0.5) {
      for (const arc of arcs) {
        const sweepAngle = (arc.endAngle - arc.startAngle) * eased;
        if (sweepAngle <= 0.05) continue;
        const endX = cx + radius * Math.cos(arc.startAngle + sweepAngle);
        const endY = cy + radius * Math.sin(arc.startAngle + sweepAngle);
        ctx.beginPath();
        ctx.arc(endX, endY, lineWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = arc.color;
        ctx.fill();
      }
    }

    // Center text
    if (centerText) {
      const textOpacity = Math.max(0, (eased - 0.3) / 0.7);
      ctx.globalAlpha = textOpacity;

      ctx.font = `800 ${size * 0.12}px Inter, sans-serif`;
      ctx.fillStyle = '#f0f2f8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(centerText, cx, centerSubtext ? cy - 8 : cy);

      if (centerSubtext) {
        ctx.font = `500 ${size * 0.055}px Inter, sans-serif`;
        ctx.fillStyle = '#8891b0';
        ctx.fillText(centerSubtext, cx, cy + 16);
      }

      ctx.globalAlpha = 1;
    }

    if (progress < 1) {
      requestAnimationFrame(draw);
    }
  }

  requestAnimationFrame(draw);

  // Legend
  const legend = document.createElement('div');
  legend.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:16px;';
  for (const seg of segments) {
    if (seg.value <= 0) continue;
    const item = document.createElement('div');
    item.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:13px;';
    item.innerHTML = `
      <span style="width:10px;height:10px;border-radius:50%;background:${seg.color};flex-shrink:0;"></span>
      <span style="color:#8891b0;flex:1;">${seg.label}</span>
      <span style="color:#f0f2f8;font-weight:600;font-family:Inter,sans-serif;">$${seg.value.toLocaleString('en-US')}</span>
    `;
    legend.appendChild(item);
  }
  container.appendChild(legend);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
