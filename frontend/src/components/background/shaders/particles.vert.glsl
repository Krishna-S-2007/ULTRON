// particles.vert.glsl
// ─────────────────────────────────────────────────────────────────────────────
// Vertex shader for micro light pulses that travel INSIDE the ribbon.
//
// These are tiny glowing dots that occasionally pulse through the strands,
// giving the ribbon a sense of energy and life. They follow the same wave
// math as the ribbon strands so they appear embedded in the ribbon.
//
// ATTRIBUTES:
//   a_baseProgress  float  [0, 1]  starting X position along the ribbon
//   a_speed         float  [0.4, 1.4] per-particle time multiplier
//   a_strandLane    float  [0, 1]  which vertical band the particle occupies
//   a_size          float          point sprite size
//
// UNIFORMS:
//   uTime           float
//   uSpeed          float   base ribbon speed
//   uAmplitude      float   matched to ribbon vertex shader
//   uFrequency      float   matched to ribbon vertex shader
//   uParticleAlpha  float   [0,1] master fade for particles
// ─────────────────────────────────────────────────────────────────────────────

uniform float uTime;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uFrequency;
uniform float uParticleAlpha;

attribute float a_baseProgress;
attribute float a_speed;
attribute float a_strandLane;
attribute float a_size;

varying float vLifeAlpha;  // per-particle fade-in/out

void main() {
  // Advance particle along ribbon, loop every 1.0 unit
  float prog = fract(a_baseProgress + uTime * uSpeed * a_speed * 0.03);

  // Mirror ribbon wave at this particle's lane
  float t = uTime * uSpeed;
  float phaseOffset = a_strandLane * 6.2832;
  float waveY = sin(prog * uFrequency * 3.14159 + t + phaseOffset * 0.3) * uAmplitude
              + sin(prog * uFrequency * 5.2 + t * 1.3 + phaseOffset * 0.5) * uAmplitude * 0.28;

  // Map progress [0,1] → world X  (matches ribbon geometry span of 7.0)
  float worldX = (prog - 0.5) * 6.5;
  float worldY = waveY + (a_strandLane - 0.5) * 0.08;
  float worldZ = sin(a_strandLane * 3.14159) * 0.05;

  // Fade in and out at edges of the ribbon
  float edgeFade = smoothstep(0.0, 0.10, prog) * smoothstep(1.0, 0.90, prog);
  // Also fade at vertical edges
  float laneFade = smoothstep(0.0, 0.15, a_strandLane) * smoothstep(1.0, 0.85, a_strandLane);
  vLifeAlpha = edgeFade * laneFade * uParticleAlpha;

  vec4 mvPosition = modelViewMatrix * vec4(worldX, worldY, worldZ, 1.0);
  gl_PointSize = a_size * (1.0 / -mvPosition.z) * 60.0;
  gl_Position  = projectionMatrix * mvPosition;
}
