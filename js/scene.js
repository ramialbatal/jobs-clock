// @ts-check
/**
 * Jobs Clock: the picture behind the top of the page. A town at sunrise as the working day starts: office windows
 * lighting up, a crane lifting a load, people walking to work along the street and a tractor in the fields at the
 * edge of town. Drawn with a 2D canvas; clock-core's startScene runs it (see app.js).
 */
import { seeded } from "clock-core";

/** @typedef {[number, number, number]} RGB */
/** @param {RGB} c @param {number} [a] */
const rgba = (c, a = 1) => `rgba(${c.join(",")},${a})`;

const SKY = /** @type {RGB[]} */ ([[9, 14, 32], [32, 44, 92], [212, 132, 92]]);
const FAR = /** @type {RGB} */ ([34, 42, 76]), NEAR = /** @type {RGB} */ ([13, 16, 30]);
const LIT = /** @type {RGB} */ ([255, 204, 120]);
// Clothes and skin tones for the people walking to work
const CLOTHES = ["#5b8def", "#e0645a", "#4fbf7f", "#f0c24a", "#c58af0", "#e8edf2", "#f08a3c"];
const SKIN = ["#f1c9a5", "#d9a37c", "#a86f4c", "#6e4630"];

/**
 * @typedef {object} Building
 * @property {number} x
 * @property {number} w
 * @property {number} h
 * @property {boolean} near
 * @property {{ x: number, y: number, on: number, flip: number }[]} windows  on: 0..1 brightness; flip: seconds to the next change
 */

/**
 * Build the jobs scene.
 * @returns {import("clock-core").Scene}
 */
export function jobsScene() {
  /** @type {Building[]} */ let buildings = [];
  /** @type {{ x: number, top: number, jib: number, base: number }} */ let crane = { x: 0, top: 0, jib: 0, base: 0 };
  /** @type {{ x: number, speed: number, size: number, phase: number, clothes: string, skin: string }[]} */ let people = [];
  let farmFrom = 0, win = 3;

  return {
    layout(f) {
      const { w, ground: G } = f;
      const rnd = seeded(5);
      const maxH = G * (w < 600 ? 0.36 : 0.48);
      farmFrom = w * (w < 600 ? 0.8 : 0.82);
      win = Math.max(2.5, G / 140);
      buildings = [];
      // A far row of tall, faint towers, then a near row of offices with windows
      for (const near of [false, true]) {
        for (let x = near ? -10 : -30; x < farmFrom;) {
          const bw = (near ? 34 : 26) + rnd() * (near ? 60 : 40);
          const bh = maxH * (near ? 0.25 + rnd() * 0.55 : 0.45 + rnd() * 0.55);
          /** @type {Building} */ const b = { x, w: Math.min(bw, farmFrom - x), h: bh, near, windows: [] };
          if (b.w > 12) {
            const gap = win * 2.6;
            for (let wy = G - bh + gap; wy < G - gap; wy += gap) {
              for (let wx = x + gap * 0.7; wx < x + b.w - gap * 0.7; wx += gap) {
                const on = rnd() < (near ? 0.45 : 0.3) ? 1 : 0;
                b.windows.push({ x: wx, y: wy, on, flip: 2 + rnd() * 25 });
              }
            }
          }
          buildings.push(b);
          x += bw + (near ? 4 + rnd() * 10 : -6);
        }
      }
      // A crane on the tallest near building in the left half
      const host = buildings.filter((b) => b.near && b.x < w * 0.45).sort((a, b) => b.h - a.h)[0] ?? buildings[0];
      crane = { x: host.x + host.w * 0.5, base: G - host.h, top: G - host.h - Math.min(G * 0.16, 60), jib: Math.min(w * 0.12, 90) };
      // People walking along the street, both ways
      people = Array.from({ length: Math.max(6, Math.round(w / 55)) }, () => ({
        x: rnd() * w, speed: (rnd() < 0.5 ? -1 : 1) * (10 + rnd() * 14), size: Math.max(14, G * 0.055) * (0.85 + rnd() * 0.3), phase: rnd() * 6,
        clothes: CLOTHES[Math.floor(rnd() * CLOTHES.length)], skin: SKIN[Math.floor(rnd() * SKIN.length)],
      }));
    },

    draw(f) {
      const { ctx, w, h, ground: G, t, dt } = f;

      // Sunrise sky, dark at the top for the title
      const sky = ctx.createLinearGradient(0, 0, 0, G);
      sky.addColorStop(0, rgba(SKY[0])); sky.addColorStop(0.55, rgba(SKY[1])); sky.addColorStop(1, rgba(SKY[2]));
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, G + 1);
      // The sun just coming up behind the fields
      const sx = (farmFrom + w) / 2, sr = Math.min(w, G) * 0.07;
      const glow = ctx.createRadialGradient(sx, G - sr * 0.4, sr * 0.3, sx, G - sr * 0.4, sr * 5);
      glow.addColorStop(0, "rgba(255,190,120,.55)"); glow.addColorStop(1, "rgba(255,160,100,0)");
      ctx.fillStyle = glow; ctx.fillRect(sx - sr * 5, G - sr * 5.4, sr * 10, sr * 10);
      ctx.fillStyle = "rgb(255,214,150)"; ctx.beginPath(); ctx.arc(sx, G - sr * 0.4, sr, Math.PI, 0); ctx.fill();

      // Buildings, with windows switching on and off as people start work
      for (const b of buildings) {
        ctx.fillStyle = rgba(b.near ? NEAR : FAR);
        ctx.fillRect(b.x, G - b.h, b.w, b.h + 1);
        for (const wd of b.windows) {
          if (dt) {
            wd.flip -= dt;
            if (wd.flip <= 0) { wd.flip = 4 + Math.random() * 30; wd.on = wd.on > 0.5 ? 0 : 1; }
          }
          const a = b.near ? 0.9 : 0.4;
          if (wd.on) { ctx.fillStyle = rgba(LIT, a); ctx.fillRect(wd.x, wd.y, win, win * 1.3); }
        }
      }

      // The crane: mast, jib, a trolley sliding along it and a load going up and down
      const { x: cx, top, jib, base } = crane;
      ctx.strokeStyle = "rgb(230,170,60)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, base); ctx.lineTo(cx, top); ctx.moveTo(cx - jib * 0.3, top); ctx.lineTo(cx + jib, top); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, top - 10); ctx.lineTo(cx + jib, top); ctx.moveTo(cx, top - 10); ctx.lineTo(cx - jib * 0.3, top); ctx.stroke();
      const trolley = cx + jib * (0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.25)));
      const drop = (base - top) * (0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.4 + 1)));
      ctx.strokeStyle = "rgba(220,220,230,.7)";
      ctx.beginPath(); ctx.moveTo(trolley, top); ctx.lineTo(trolley, top + drop); ctx.stroke();
      ctx.fillStyle = "rgb(230,170,60)"; ctx.fillRect(trolley - 6, top + drop, 12, 6);
      if (Math.sin(t * 2) > 0.5) { ctx.fillStyle = "rgba(255,70,50,.9)"; ctx.fillRect(cx - 1.5, top - 14, 3, 3); }

      // Fields at the edge of town, with a tractor going back and forth
      const field = ctx.createLinearGradient(0, G - 14, 0, G);
      field.addColorStop(0, "rgb(70,86,44)"); field.addColorStop(1, "rgb(40,52,28)");
      ctx.fillStyle = field;
      ctx.beginPath(); ctx.moveTo(farmFrom - 20, G); ctx.quadraticCurveTo(farmFrom + 30, G - 16, w, G - 12); ctx.lineTo(w, G); ctx.fill();
      ctx.strokeStyle = "rgba(30,40,20,.6)"; ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(farmFrom, G - i * 3); ctx.lineTo(w, G - i * 3 - 1); ctx.stroke(); }
      const span = w - farmFrom - 40, phase = (t * 0.06) % 2, dir = phase < 1 ? 1 : -1;
      const tx = farmFrom + 20 + span * (phase < 1 ? phase : 2 - phase), ty = G - 10, s = Math.max(10, G * 0.03);
      ctx.save(); ctx.translate(tx, ty); ctx.scale(dir, 1);
      ctx.fillStyle = "rgb(20,24,16)";
      ctx.fillRect(-s, -s * 0.9, s * 1.4, s * 0.6); ctx.fillRect(-s * 0.2, -s * 1.5, s * 0.7, s * 0.7);
      ctx.fillStyle = "rgba(255,214,150,.6)"; ctx.fillRect(-s * 0.1, -s * 1.4, s * 0.5, s * 0.35);
      ctx.fillStyle = "rgb(20,24,16)";
      ctx.beginPath(); ctx.arc(-s * 0.55, -s * 0.25, s * 0.45, 0, Math.PI * 2); ctx.arc(s * 0.3, -s * 0.15, s * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // The street, with people walking to work
      const street = ctx.createLinearGradient(0, G, 0, h);
      street.addColorStop(0, "rgb(30,32,46)"); street.addColorStop(0.3, "rgb(16,18,28)"); street.addColorStop(1, "rgb(10,12,16)");
      ctx.fillStyle = street; ctx.fillRect(0, G, w, h - G);
      ctx.lineCap = "round";
      for (const p of people) {
        if (dt) { p.x += p.speed * dt; if (p.x > w + 20) p.x = -20; if (p.x < -20) p.x = w + 20; }
        const s = p.size, step = Math.sin(t * 6 + p.phase) * s * 0.2, swing = step * 0.8, y = G + 1;
        ctx.lineWidth = s * 0.12; ctx.strokeStyle = "rgb(24,28,44)";
        ctx.beginPath(); ctx.moveTo(p.x, y - s * 0.42); ctx.lineTo(p.x - step, y); ctx.moveTo(p.x, y - s * 0.42); ctx.lineTo(p.x + step, y); ctx.stroke();
        ctx.fillStyle = p.clothes;
        ctx.beginPath(); ctx.roundRect(p.x - s * 0.15, y - s * 0.9, s * 0.3, s * 0.52, s * 0.1); ctx.fill();
        ctx.strokeStyle = p.clothes; ctx.lineWidth = s * 0.09;
        ctx.beginPath(); ctx.moveTo(p.x, y - s * 0.82); ctx.lineTo(p.x + swing, y - s * 0.5); ctx.stroke();
        ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(p.x, y - s * 1.05, s * 0.15, 0, Math.PI * 2); ctx.fill();
      }
    },
  };
}
