/**
 * useRibbonState.ts
 *
 * Maps an InvestigationState → a target set of shader uniforms.
 * All values are smoothly lerped each frame inside useFrame (RibbonMesh.tsx)
 * so state transitions are always gradual and elegant — never jarring.
 *
 * TUNING FOR LINE-BASED RENDERING:
 * With 1500 thin lines instead of 200 thick quads, the visual density is
 * much higher. Speed and amplitude values are tuned to be very slow and
 * gentle — the ribbon should feel like it's breathing, not oscillating.
 *
 * BACKEND WIRING:
 * The `state` prop on AnimatedRibbon comes from InvestigationStateContext,
 * which the Dashboard updates via setInvestigationState() when the live
 * event stream changes the pipeline stage.
 */

import type { InvestigationState } from "@/context/InvestigationStateContext";

export interface RibbonUniforms {
  /** Overall wave speed multiplier */
  speed: number;
  /** Peak Y displacement amplitude */
  amplitude: number;
  /** Spatial wave frequency */
  frequency: number;
  /** Blue pulse intensity [0,1] (searching state) */
  pulseBlue: number;
  /** White highlight sweep intensity [0,1] (verifying / report) */
  highlight: number;
  /** Strand alignment / convergence [0,1] (reasoning / planning) */
  alignStrands: number;
  /** Overall glow multiplier [0,1] (report state) */
  glow: number;
  /** Particle alpha [0,1] */
  particleAlpha: number;
}

/** Target uniform values for each investigation state */
const STATE_TARGETS: Record<InvestigationState, RibbonUniforms> = {
  idle: {
    speed: 0.08,          // Very slow — breathing pace
    amplitude: 0.32,      // Moderate wave height
    frequency: 0.75,      // Gentle, wide curves
    pulseBlue: 0.0,
    highlight: 0.0,
    alignStrands: 0.0,
    glow: 0.0,
    particleAlpha: 0.0,
  },
  planning: {
    speed: 0.10,
    amplitude: 0.26,
    frequency: 0.95,
    pulseBlue: 0.0,
    highlight: 0.0,
    alignStrands: 0.40,
    glow: 0.0,
    particleAlpha: 0.12,
  },
  searching: {
    speed: 0.13,
    amplitude: 0.34,
    frequency: 0.82,
    pulseBlue: 1.0,
    highlight: 0.0,
    alignStrands: 0.0,
    glow: 0.05,
    particleAlpha: 0.45,
  },
  verifying: {
    speed: 0.10,
    amplitude: 0.30,
    frequency: 0.78,
    pulseBlue: 0.0,
    highlight: 0.70,
    alignStrands: 0.10,
    glow: 0.10,
    particleAlpha: 0.25,
  },
  reasoning: {
    speed: 0.11,
    amplitude: 0.24,
    frequency: 1.05,
    pulseBlue: 0.0,
    highlight: 0.0,
    alignStrands: 0.60,
    glow: 0.05,
    particleAlpha: 0.18,
  },
  report: {
    speed: 0.10,
    amplitude: 0.30,
    frequency: 0.82,
    pulseBlue: 0.0,
    highlight: 0.50,
    alignStrands: 0.20,
    glow: 0.30,
    particleAlpha: 0.35,
  },
  completed: {
    speed: 0.07,
    amplitude: 0.28,
    frequency: 0.70,
    pulseBlue: 0.0,
    highlight: 0.15,
    alignStrands: 0.0,
    glow: 0.12,
    particleAlpha: 0.0,
  },
};

/** Returns the target uniform values for the given state */
export function getRibbonTargets(state: InvestigationState): RibbonUniforms {
  return STATE_TARGETS[state] ?? STATE_TARGETS.idle;
}

/** Linear interpolation helper */
export function lerpUniforms(
  current: RibbonUniforms,
  target: RibbonUniforms,
  t: number
): RibbonUniforms {
  const lerp = (a: number, b: number) => a + (b - a) * t;
  return {
    speed: lerp(current.speed, target.speed),
    amplitude: lerp(current.amplitude, target.amplitude),
    frequency: lerp(current.frequency, target.frequency),
    pulseBlue: lerp(current.pulseBlue, target.pulseBlue),
    highlight: lerp(current.highlight, target.highlight),
    alignStrands: lerp(current.alignStrands, target.alignStrands),
    glow: lerp(current.glow, target.glow),
    particleAlpha: lerp(current.particleAlpha, target.particleAlpha),
  };
}
