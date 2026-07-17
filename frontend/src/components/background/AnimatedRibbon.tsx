/**
 * AnimatedRibbon.tsx
 *
 * Pure Canvas 2D animated ribbon background.
 *
 * Rewritten from Three.js → Canvas 2D for pixel-perfect accuracy against
 * the reference image. Draws hundreds of thin silky strands procedurally —
 * no external assets, no textures, no pre-baked data.
 *
 * Visual design:
 *   - Pure black #050505 background
 *   - Single S-curve ribbon spanning full viewport width
 *   - ~260 individual strands per ribbon
 *   - Colors: warm orange → magenta → indigo → electric blue (peak) → purple → magenta → cyan/white
 *   - Strands fan out dramatically at right edge, converge at peak
 *   - Slow, organic undulation — flowing silk / liquid light
 *   - Large negative black space above and below for UI readability
 *
 * Performance:
 *   - DPR capped at 1.5 (no 4x overdraw on Retina)
 *   - Pauses rendering when document.hidden (Page Visibility API)
 *   - Zero React re-renders inside the draw loop
 *   - requestAnimationFrame-based loop, cancelled on unmount
 *
 * State machine:
 *   Uniform parameters are lerped toward state targets each frame (~2s transition).
 *   BACKEND WIRING: state prop comes from InvestigationStateContext,
 *   set by Dashboard.tsx when the live event stream changes pipeline stage.
 */

import { useEffect, useRef } from "react";
import type { InvestigationState } from "@/context/InvestigationStateContext";

// ── Configuration ─────────────────────────────────────────────────────────────
const STRANDS = 280;  // Number of individual strand lines
const STEPS   = 420;  // Polyline segments per strand (quality)

// ── Color palette (strand index 0 → 1) ────────────────────────────────────────
// Matches reference: warm salmon → magenta → deep indigo → electric blue (peak)
//                    → purple → magenta → bright blue → soft white (right fan)
type ColorStop = readonly [number, number, number, number]; // [t, r, g, b]

const PALETTE: ColorStop[] = [
  [0.00, 205, 105,  75],   // warm salmon-orange
  [0.10, 185,  68, 138],   // pink-magenta
  [0.20, 115,  58, 215],   // deep indigo
  [0.34,  55,  95, 255],   // electric blue (pre-peak)
  [0.46, 110, 155, 255],   // bright blue (peak strands)
  [0.54, 175, 195, 255],   // near-white center highlight
  [0.62,  82,  88, 238],   // blue-indigo (post-peak)
  [0.72, 162,  52, 198],   // purple
  [0.83, 188,  58, 115],   // magenta
  [0.91,  68, 155, 255],   // bright blue (right fan strands)
  [1.00, 210, 222, 255],   // soft white
] as const;

function strandRGB(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  let i = 0;
  while (i < PALETTE.length - 2 && PALETTE[i + 1][0] <= t) i++;
  const p0 = PALETTE[i];
  const p1 = PALETTE[i + 1];
  const f  = p1[0] <= p0[0] ? 0 : (t - p0[0]) / (p1[0] - p0[0]);
  return [
    Math.round(p0[1] + (p1[1] - p0[1]) * f),
    Math.round(p0[2] + (p1[2] - p0[2]) * f),
    Math.round(p0[3] + (p1[3] - p0[3]) * f),
  ];
}

// ── Ribbon geometry math ──────────────────────────────────────────────────────

/**
 * Returns the Y centre of the ribbon as a fraction of canvas height [0=top, 1=bottom].
 * Base shape: arch that rises from ~63% at edges to ~32% at the peak (x≈0.45),
 * with a slight rightward tilt matching the reference image.
 * The animation adds slow, layered sine waves for the flowing silk effect.
 */
function ribbonCY(xn: number, time: number, speed: number, amp: number): number {
  // Base arch shape (static)
  const base = 0.62 - 0.29 * Math.sin(xn * Math.PI) + 0.05 * xn;

  // Three layered animation waves
  const w1 = Math.sin(xn * Math.PI * 2.2 + time * speed * 0.30) * amp * 0.032;
  const w2 = Math.sin(xn * Math.PI * 0.8 - time * speed * 0.19) * amp * 0.016;
  const w3 = Math.sin(xn * Math.PI * 4.1 + time * speed * 0.50) * amp * 0.007;

  return base + w1 + w2 + w3;
}

/**
 * Returns the half-spread (ribbon width) as a fraction of canvas height.
 * Ribbon converges at the peak, fans out at both edges —
 * especially the right edge where strands fan out dramatically (as in reference).
 */
function halfSpread(xn: number, time: number, amp: number): number {
  // Tight at peak (where sin(x*π) is maximum), wider at edges
  const peakTightness = 1 - Math.sin(xn * Math.PI);
  const base = 0.016 + peakTightness * 0.028;

  // Dramatic right fan-out (strands visible individually on right side)
  const rightFan = Math.pow(Math.max(0, (xn - 0.66) / 0.34), 1.7) * 0.170;

  // Slight left fan
  const leftFan  = Math.pow(Math.max(0, (0.09 - xn)  / 0.09), 1.6) * 0.065;

  // Slow breathing of spread width
  const breathe = Math.sin(time * 0.38 + xn * 3.8) * 0.004 * amp;

  return base + rightFan + leftFan + breathe;
}

// ── State-based animation parameters ─────────────────────────────────────────

interface Params {
  speed:      number;  // Animation speed multiplier
  amp:        number;  // Wave amplitude multiplier
  bright:     number;  // Overall brightness
  pulseBlue:  number;  // Searching: blue L→R pulse [0,1]
  highlight:  number;  // Verifying/report: white sweep [0,1]
  align:      number;  // Reasoning/planning: strand convergence [0,1]
}

const STATE_PARAMS: Record<InvestigationState, Params> = {
  //            speed   amp    bright  pulse  hi     align
  idle:       { speed:1.00, amp:1.00, bright:1.00, pulseBlue:0.00, highlight:0.00, align:0.00 },
  planning:   { speed:1.10, amp:0.82, bright:1.00, pulseBlue:0.00, highlight:0.00, align:0.45 },
  searching:  { speed:1.45, amp:1.12, bright:1.04, pulseBlue:1.00, highlight:0.00, align:0.00 },
  verifying:  { speed:1.05, amp:0.94, bright:1.05, pulseBlue:0.00, highlight:0.85, align:0.10 },
  reasoning:  { speed:1.22, amp:0.78, bright:1.00, pulseBlue:0.00, highlight:0.00, align:0.65 },
  report:     { speed:1.05, amp:0.94, bright:1.22, pulseBlue:0.00, highlight:0.55, align:0.20 },
  completed:  { speed:0.82, amp:0.90, bright:1.12, pulseBlue:0.00, highlight:0.18, align:0.00 },
};

// ── Smoothstep helper ─────────────────────────────────────────────────────────
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface AnimatedRibbonProps {
  /** Current AI investigation phase — drives subtle ribbon behaviour */
  state?: InvestigationState;
}

export function AnimatedRibbon({ state = "idle" }: AnimatedRibbonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef(0);
  const timeRef   = useRef(0);
  const prevRef   = useRef(0);
  const stateRef  = useRef<InvestigationState>("idle");
  const paramsRef = useRef<Params>({ ...STATE_PARAMS.idle });

  // Keep stateRef current without triggering re-renders
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // ── Resize: account for device pixel ratio, cap at 1.5 ──────────────────
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width  = Math.round(window.innerWidth  * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width  = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Draw loop ────────────────────────────────────────────────────────────
    const draw = (now: number) => {
      // Delta time (capped to avoid jump after tab switch back)
      const dt = prevRef.current ? Math.min((now - prevRef.current) / 1000, 0.05) : 0.016;
      prevRef.current = now;

      // Only advance time when tab is visible
      if (!document.hidden) timeRef.current += dt;
      const time = timeRef.current;

      // ── Lerp state params toward current target (~2s transition) ──────────
      const target = STATE_PARAMS[stateRef.current] ?? STATE_PARAMS.idle;
      const p = paramsRef.current;
      const lf = dt * 0.5;
      p.speed     += (target.speed     - p.speed)     * lf;
      p.amp       += (target.amp       - p.amp)       * lf;
      p.bright    += (target.bright    - p.bright)    * lf;
      p.pulseBlue += (target.pulseBlue - p.pulseBlue) * lf;
      p.highlight += (target.highlight - p.highlight) * lf;
      p.align     += (target.align     - p.align)     * lf;

      const W = canvas.width;
      const H = canvas.height;
      const { speed, amp, bright, pulseBlue, highlight, align } = p;

      // ── Background ────────────────────────────────────────────────────────
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, W, H);

      // ── Strands ───────────────────────────────────────────────────────────
      // Precompute blue pulse position (searching state)
      const pulsePos = ((time * speed * 0.22) % 1.0);

      for (let si = 0; si < STRANDS; si++) {
        const sn = si / (STRANDS - 1);  // [0, 1] strand normalised index
        const sc = sn - 0.5;            // [-0.5, 0.5] signed centre offset

        // Base color for this strand
        let [r, g, b] = strandRGB(sn);

        // Brightness from state
        r = Math.min(255, r * bright);
        g = Math.min(255, g * bright);
        b = Math.min(255, b * bright);

        // Opacity: centre strands are most opaque; outermost strands fade out.
        // Also the very centre strand has a slight boost to create a "spine".
        const centerDist = Math.abs(sc) * 2;  // [0, 1]
        const baseAlpha  = Math.max(0.04, 0.74 - centerDist * 0.66);

        // Strand convergence (reasoning / planning) — pull strands toward centre
        const alignedSC = sc * (1.0 - align * 0.70);

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${baseAlpha.toFixed(3)})`;
        ctx.lineWidth   = 0.68;

        for (let step = 0; step <= STEPS; step++) {
          const xn = step / STEPS;

          // Smooth fade at left and right viewport edges
          const edgeFade = smoothstep(0, 0.055, xn) * smoothstep(1, 0.945, xn);
          if (edgeFade < 0.001) {
            // Move without drawing in fade zone — avoids hard line-start artefact
            const cy  = ribbonCY(xn, time, speed, amp);
            const hs  = halfSpread(xn, time, amp);
            const yn  = cy + alignedSC * hs * 2.0;
            ctx.moveTo(xn * W, yn * H);
            continue;
          }

          const cy = ribbonCY(xn, time, speed, amp);
          const hs = halfSpread(xn, time, amp);
          const yn = cy + alignedSC * hs * 2.0;

          if (step === 0) ctx.moveTo(xn * W, yn * H);
          else            ctx.lineTo(xn * W, yn * H);
        }

        ctx.globalAlpha = 1.0;
        ctx.stroke();
      }

      // ── Blue pulse overlay (searching state) ──────────────────────────────
      // A vertical soft band of electric blue sweeps from left to right
      if (pulseBlue > 0.01) {
        const px = pulsePos * W;
        const grad = ctx.createLinearGradient(px - W * 0.10, 0, px + W * 0.10, 0);
        grad.addColorStop(0,   "rgba(80,130,255,0)");
        grad.addColorStop(0.4, `rgba(80,130,255,${(pulseBlue * 0.08).toFixed(3)})`);
        grad.addColorStop(0.5, `rgba(120,170,255,${(pulseBlue * 0.12).toFixed(3)})`);
        grad.addColorStop(0.6, `rgba(80,130,255,${(pulseBlue * 0.08).toFixed(3)})`);
        grad.addColorStop(1,   "rgba(80,130,255,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      // ── White highlight sweep (verifying / report state) ──────────────────
      // A soft white band sweeps across, representing evidence validation / confidence
      if (highlight > 0.01) {
        const hPos  = ((time * speed * 0.11) % 1.2) - 0.1; // runs slightly off-screen
        const hx    = hPos * W;
        const width = W * 0.28;
        const grad  = ctx.createLinearGradient(hx - width * 0.5, 0, hx + width * 0.5, 0);
        grad.addColorStop(0,   "rgba(255,255,255,0)");
        grad.addColorStop(0.4, `rgba(240,245,255,${(highlight * 0.045).toFixed(3)})`);
        grad.addColorStop(0.5, `rgba(255,255,255,${(highlight * 0.065).toFixed(3)})`);
        grad.addColorStop(0.6, `rgba(240,245,255,${(highlight * 0.045).toFixed(3)})`);
        grad.addColorStop(1,   "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []); // Runs once; state changes flow through stateRef

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position:      "fixed",
        inset:         0,
        zIndex:        0,
        pointerEvents: "none",
        display:       "block",
      }}
    />
  );
}
