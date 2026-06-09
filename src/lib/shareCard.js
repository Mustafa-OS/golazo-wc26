// ============================================================================
// SHARE CARD
// ----------------------------------------------------------------------------
// Growth helpers: a scannable QR for the live URL, and a branded "share my slip"
// image (1080x1350, story-ready) rendered on a canvas. `qrcode` is dynamically
// imported so it never weighs down first paint.
// ============================================================================

import { powerMultiplier } from './scoringEngine.js';

const C = {
  ink: '#070E1A', panel: '#0F1B30', panel2: '#16263F',
  more: '#C6FF3E', less: '#FF5C7A', gold: '#FFC83D', mist: '#8DA0BC', white: '#EAF1FB',
};

export async function qrDataUrl(url, width = 320) {
  const QRCode = (await import('qrcode')).default;
  return QRCode.toDataURL(url, { margin: 1, width, color: { dark: C.ink, light: '#FFFFFF' } });
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const loadImg = (src) =>
  new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

/** Render the slip as a shareable PNG Blob. */
export async function slipShareBlob({ picks, potential, mode = 'normal', captainId = null, url }) {
  try { await document.fonts.ready; } catch { /* fonts optional */ }
  const W = 1080, H = 1350, PAD = 72;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const isPower = mode === 'power';

  // background + lime glow
  ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, -120, 60, W / 2, -120, 780);
  g.addColorStop(0, 'rgba(198,255,62,0.16)'); g.addColorStop(1, 'rgba(7,14,26,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // brand
  ctx.textBaseline = 'alphabetic';
  ctx.font = '120px Anton, system-ui, sans-serif';
  ctx.fillStyle = C.white;
  ctx.fillText('GOLAZO', PAD, 150);
  const gw = ctx.measureText('GOLAZO').width;
  ctx.fillStyle = C.more; ctx.fillRect(PAD + gw + 12, 120, 30, 30);
  ctx.font = '600 30px "Hanken Grotesk", system-ui, sans-serif';
  ctx.fillStyle = C.mist;
  ctx.fillText('IMPERIAL · WORLD CUP 2026', PAD, 196);

  // mode badge
  const badge = isPower
    ? `POWER PLAY · ${powerMultiplier(picks.length)}×`
    : (captainId ? 'CAPTAIN BOOST · 2×' : 'MY PICKS');
  ctx.font = '800 34px "Hanken Grotesk", system-ui, sans-serif';
  const bw = ctx.measureText(badge).width + 56;
  rr(ctx, PAD, 226, bw, 62, 31);
  ctx.fillStyle = isPower ? C.more : C.panel2; ctx.fill();
  ctx.fillStyle = isPower ? C.ink : C.gold;
  ctx.fillText(badge, PAD + 28, 267);

  // picks
  let y = 320;
  const rowH = 104, gap = 14, left = PAD + 30, right = W - PAD - 30;
  picks.slice(0, 5).forEach((p) => {
    rr(ctx, PAD, y, W - PAD * 2, rowH, 22);
    ctx.fillStyle = C.panel; ctx.fill();
    const isCap = !isPower && captainId === p.id;
    if (isCap) { ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.stroke(); }
    const more = p.side === 'MORE';
    ctx.textAlign = 'left';
    ctx.font = '800 28px "Hanken Grotesk", system-ui, sans-serif';
    ctx.fillStyle = more ? C.more : C.less;
    ctx.fillText((more ? '▲ ' : '▼ ') + p.side, left, y + 44);
    ctx.font = '800 38px "Hanken Grotesk", system-ui, sans-serif';
    ctx.fillStyle = C.white;
    ctx.fillText(p.playerName + (isCap ? '  ★' : ''), left, y + 86);
    ctx.textAlign = 'right';
    ctx.font = '600 28px "Hanken Grotesk", system-ui, sans-serif';
    ctx.fillStyle = C.mist;
    ctx.fillText(`${p.label} ${p.line}`, right, y + 44);
    ctx.font = '60px Anton, system-ui, sans-serif';
    ctx.fillStyle = C.gold;
    ctx.fillText('+' + (isCap ? p.value * 2 : p.value), right, y + 90);
    y += rowH + gap;
  });

  // potential box
  const py = y + 6;
  rr(ctx, PAD, py, W - PAD * 2, 118, 24);
  ctx.fillStyle = C.panel2; ctx.fill();
  ctx.textAlign = 'left';
  ctx.font = '700 32px "Hanken Grotesk", system-ui, sans-serif';
  ctx.fillStyle = C.mist;
  ctx.fillText(isPower ? 'IF ALL LAND' : 'MAX POTENTIAL', PAD + 34, py + 56);
  ctx.textAlign = 'right';
  ctx.font = '84px Anton, system-ui, sans-serif';
  ctx.fillStyle = C.gold;
  ctx.fillText(potential + ' PTS', right, py + 90);

  // QR + footer
  ctx.textAlign = 'left';
  try {
    const qr = await loadImg(await qrDataUrl(url, 220));
    const qx = W - PAD - 200, qy = H - 280;
    rr(ctx, qx - 14, qy - 14, 228, 228, 18); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.drawImage(qr, qx, qy, 200, 200);
  } catch { /* QR optional */ }
  ctx.font = '800 42px "Hanken Grotesk", system-ui, sans-serif';
  ctx.fillStyle = C.white;
  ctx.fillText('Scan to play', PAD, H - 215);
  ctx.font = '700 32px "Hanken Grotesk", system-ui, sans-serif';
  ctx.fillStyle = C.more;
  ctx.fillText('golazo-wc.web.app', PAD, H - 168);
  ctx.font = '600 26px "Hanken Grotesk", system-ui, sans-serif';
  ctx.fillStyle = C.mist;
  ctx.fillText('Make your picks before kickoff', PAD, H - 124);

  return await new Promise((res) => canvas.toBlob(res, 'image/png'));
}
