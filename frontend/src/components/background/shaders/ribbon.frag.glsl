// ribbon.frag.glsl
// ─────────────────────────────────────────────────────────────────────────────
// Fragment shader for the multi-strand flowing light ribbon.
//
// KEY CHANGE: Since each strand is now a single-pixel-wide LINE (not a thick
// quad), the fragment shader no longer needs to compute thickness-based glow
// or inner/outer edges. Instead, the visual glow comes naturally from hundreds
// of overlapping additive-blended lines.
//
// COLOR PALETTE (enterprise AI — premium, calm):
//   Electric Blue   — primary information color
//   Deep Indigo     — depth / structure
//   Soft Purple     — intelligence / reasoning
//   Warm Magenta    — warmth / humanity
//   Pale Rose       — soft edges
//   White highlight — where strands overlap densely
//
// All colors are slightly desaturated to feel premium — never neon.
// ─────────────────────────────────────────────────────────────────────────────

varying float vProgress;
varying float vStrandIndex;
varying float vAlpha;
varying float vPulse;
varying float vHighlightMask;
varying float vDepth;

uniform float uTime;
uniform float uGlow;       // [0,1] overall brightness multiplier
uniform float uPulseBlue;  // [0,1] blue pulse intensity (searching)
uniform float uHighlight;  // [0,1] white highlight intensity (verifying/report)

// ── Color palette ────────────────────────────────────────────────────────────
// Carefully tuned to match reference: blue → indigo → purple → magenta → rose
const vec3 cBlue    = vec3(0.22, 0.45, 1.00);   // electric blue
const vec3 cIndigo  = vec3(0.18, 0.20, 0.70);   // deep indigo
const vec3 cPurple  = vec3(0.40, 0.25, 0.62);   // soft purple
const vec3 cMagenta = vec3(0.62, 0.20, 0.48);   // warm magenta
const vec3 cRose    = vec3(0.75, 0.45, 0.55);   // pale rose (edge strands)
const vec3 cWhite   = vec3(0.88, 0.90, 1.00);   // soft white highlight

// Smooth 5-stop gradient across strandIndex [0,1]
// Maps to: rose → magenta → purple → indigo → blue
// This matches the reference where left edge is warm/pink, center is purple/indigo,
// and the right/bottom is blue
vec3 ribbonColor(float t) {
  vec3 col;
  if (t < 0.2) {
    col = mix(cRose, cMagenta, smoothstep(0.0, 0.2, t));
  } else if (t < 0.4) {
    col = mix(cMagenta, cPurple, smoothstep(0.2, 0.4, t));
  } else if (t < 0.65) {
    col = mix(cPurple, cIndigo, smoothstep(0.4, 0.65, t));
  } else {
    col = mix(cIndigo, cBlue, smoothstep(0.65, 1.0, t));
  }
  return col;
}

void main() {
  // Base color from strand index (creates the smooth color gradient across ribbon)
  vec3 color = ribbonColor(vStrandIndex);

  // ── Subtle color shift along ribbon length ──────────────────────────────
  // Blend slightly toward warm on the left, cool on the right
  float progressShift = smoothstep(0.0, 1.0, vProgress);
  color = mix(color * vec3(1.08, 0.96, 0.92), color * vec3(0.92, 0.96, 1.08), progressShift);

  // ── Shimmer: very subtle time-based brightness variation ────────────────
  float shimmer = 0.90 + 0.10 * sin(vProgress * 8.0 + uTime * 0.2 + vStrandIndex * 4.0);
  color *= shimmer;

  // ── Depth-based dimming: strands further back are slightly dimmer ───────
  float depthDim = 1.0 - abs(vDepth) * 1.5;
  depthDim = clamp(depthDim, 0.5, 1.0);
  color *= depthDim;

  // ── Electric blue pulse (searching state) ──────────────────────────────
  vec3 pulseColor = mix(cBlue, cWhite, 0.35);
  color = mix(color, pulseColor, vPulse * 0.6);

  // ── White highlight sweep (verifying / report state) ──────────────────
  color = mix(color, cWhite, vHighlightMask * 0.5);

  // ── Global glow multiplier ─────────────────────────────────────────────
  float baseBrightness = 0.55 + uGlow * 0.30;
  color *= baseBrightness;

  // ── Final alpha ────────────────────────────────────────────────────────
  // With additive blending, lower alpha = more transparent.
  // We keep individual strands quite dim so they only become visible where
  // many overlap — creating the natural light-accumulation effect.
  float alpha = vAlpha;

  // Slight brightness boost for the visual center of the ribbon
  float centerBoost = 1.0 - abs(vStrandIndex - 0.5) * 1.2;
  centerBoost = clamp(centerBoost, 0.0, 1.0);
  alpha *= mix(0.6, 1.0, centerBoost);

  // Clamp to prevent over-bright
  color = clamp(color, 0.0, 1.0);

  gl_FragColor = vec4(color * alpha, alpha);
}
