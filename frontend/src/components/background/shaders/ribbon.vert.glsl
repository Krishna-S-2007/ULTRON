// ribbon.vert.glsl
// ─────────────────────────────────────────────────────────────────────────────
// Vertex shader for the multi-strand flowing light ribbon.
//
// KEY ARCHITECTURAL CHANGE:
// Instead of displacing vertices of a thick quad mesh, we now displace vertices
// of individual polyLINES. Each strand is ~1 pixel wide (rendered via
// THREE.LineSegments). The visual ribbon emerges from 1500 of these strands
// layered with additive blending, creating the fiber-optic / light-painting
// look from the reference.
//
// Each strand has its own randomised attributes baked into the geometry:
//   a_phase      — unique wave phase offset
//   a_ampOffset  — per-strand amplitude variation
//   a_speedMult  — per-strand speed multiplier
//   a_opacity    — per-strand base opacity
//   a_yOffset    — vertical offset (spread distribution)
//   a_zLayer     — depth layer for subtle parallax
//
// The wave function uses 4 layers of sine waves for organic movement.
// ─────────────────────────────────────────────────────────────────────────────

uniform float uTime;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uFrequency;
uniform float uPulseBlue;
uniform float uHighlight;
uniform float uAlignStrands;
uniform float uGlow;

attribute float a_strandIndex;  // [0, 1]
attribute float a_progress;     // [0, 1] along ribbon length
attribute float a_phase;        // [0, 2π] random phase offset
attribute float a_ampOffset;    // [-1, 1] amplitude variation
attribute float a_speedMult;    // [0.7, 1.3] speed multiplier
attribute float a_opacity;      // [0.08, 0.80] per-strand opacity
attribute float a_yOffset;      // Y spread offset
attribute float a_zLayer;       // Z depth layer

varying float vProgress;
varying float vStrandIndex;
varying float vAlpha;
varying float vPulse;
varying float vHighlightMask;
varying float vDepth;

void main() {
  vProgress    = a_progress;
  vStrandIndex = a_strandIndex;

  float t    = uTime * uSpeed * a_speedMult;
  float prog = a_progress;
  float phase = a_phase;

  // ── Primary wave (large, very slow sinusoidal flow) ──────────────────────
  // Each strand has a unique phase → they all undulate slightly differently
  float ampScale = 1.0 + a_ampOffset * 0.25; // ±25% amplitude variation
  float wave1 = sin(prog * uFrequency * 3.14159 + t + phase * 0.3)
              * uAmplitude * ampScale;

  // ── Secondary wave (higher frequency, creates ribbon curvature) ──────────
  float wave2 = sin(prog * uFrequency * 5.2 + t * 1.3 + phase * 0.5)
              * uAmplitude * 0.28 * ampScale;

  // ── Tertiary wave (subtle organic micro-movement) ────────────────────────
  float wave3 = sin(prog * uFrequency * 8.5 + t * 0.65 + phase * 0.9)
              * uAmplitude * 0.1 * ampScale;

  // ── Quaternary micro-turbulence (breathing effect) ──────────────────────
  float wave4 = sin(prog * uFrequency * 14.0 + t * 0.4 + phase * 1.4)
              * uAmplitude * 0.04;

  // ── Strand convergence (reasoning / planning states) ────────────────────
  float alignedPhase = phase * (1.0 - uAlignStrands * 0.7);
  float alignedWave = sin(prog * uFrequency * 3.14159 + t + alignedPhase * 0.3)
                    * uAmplitude * ampScale;
  float primaryWave = mix(wave1, alignedWave, uAlignStrands);

  float totalY = primaryWave + wave2 + wave3 + wave4;

  // ── Compose final position ──────────────────────────────────────────────
  vec3 displaced = position;
  displaced.y += totalY;           // wave displacement on top of base yOffset
  // Z is already set per-strand in geometry (a_zLayer baked into position.z)

  // ── Alpha: fade edges of ribbon (leftmost / rightmost 10%) ──────────────
  float edgeFade = smoothstep(0.0, 0.10, prog) * smoothstep(1.0, 0.90, prog);

  // Also fade outermost strands (those at extreme strandIndex)
  float strandFade = smoothstep(0.0, 0.08, a_strandIndex)
                   * smoothstep(1.0, 0.92, a_strandIndex);

  // Per-strand base opacity from geometry (creates density variation)
  vAlpha = edgeFade * strandFade * a_opacity;

  // Store depth for fragment shader (subtle depth-based dimming)
  vDepth = a_zLayer;

  // ── Blue pulse (searching state): travels left → right ──────────────────
  float pulsePhase = fract(t * 0.15 - prog * 0.6);
  float pulseBand  = smoothstep(0.0, 0.10, pulsePhase) * smoothstep(0.22, 0.10, pulsePhase);
  vPulse = pulseBand * uPulseBlue;

  // ── Highlight sweep (verifying / report state) ─────────────────────────
  float hlPhase = fract(t * 0.08);
  float hlPos   = fract(hlPhase * 1.2 - prog);
  float hlMask  = smoothstep(0.0, 0.12, hlPos) * smoothstep(0.35, 0.20, hlPos);
  vHighlightMask = hlMask * uHighlight;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
