// particles.frag.glsl
// ─────────────────────────────────────────────────────────────────────────────
// Fragment shader for micro light pulses flowing inside the ribbon.
//
// Renders very soft circular point sprites with Gaussian falloff — appearing
// as tiny glowing motes that travel through the strands. These should be
// barely noticeable, adding subtle life without drawing attention.
// ─────────────────────────────────────────────────────────────────────────────

varying float vLifeAlpha;

uniform float uTime;

void main() {
  // Distance from center of point sprite → soft circle
  vec2  uv   = gl_PointCoord - 0.5;
  float dist = length(uv);

  // Gaussian falloff: bright center → transparent edge
  float circle = exp(-dist * dist * 22.0);
  if (circle < 0.01) discard;

  // Subtle warm-white color, slightly blue-purple tinted to match ribbon palette
  vec3 color = vec3(0.72, 0.78, 1.0);

  float alpha = circle * vLifeAlpha * 0.4;

  gl_FragColor = vec4(color * alpha, alpha);
}
