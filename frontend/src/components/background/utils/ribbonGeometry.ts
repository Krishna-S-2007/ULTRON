/**
 * ribbonGeometry.ts
 *
 * Generates geometry for the animated ribbon effect.
 *
 * KEY CHANGE: Instead of thick quad-strip meshes, we now generate pure LINE
 * geometry — each strand is a single polyline with ~300 segments. At 1500
 * strands this gives ~450,000 line segments that, when rendered with additive
 * blending, create the ethereal flowing-fiber look from the reference image.
 *
 * Each vertex carries per-strand random attributes so the vertex shader can
 * give each strand independent wave parameters without any CPU per-frame work.
 *
 * ATTRIBUTES (per vertex):
 *   position       vec3   base X position along ribbon, Y/Z zeroed (shader displaces)
 *   a_strandIndex  float  [0,1] normalised strand ID (for color gradient)
 *   a_progress     float  [0,1] position along the ribbon length
 *   a_phase        float  [0, 2π] random phase offset per strand
 *   a_ampOffset    float  [-1, 1] per-strand amplitude variation
 *   a_speedMult    float  [0.7, 1.3] per-strand speed multiplier
 *   a_opacity      float  [0.15, 1.0] per-strand base opacity
 *   a_yOffset      float  per-strand vertical offset (spread)
 *   a_zLayer       float  per-strand depth layer for parallax
 */

import * as THREE from "three";

export interface RibbonGeometryOptions {
  /** Number of individual strands. Default 1500 */
  strandCount?: number;
  /** Number of segments per strand polyline. Default 300 */
  segments?: number;
  /** World-space width of the ribbon (X span). Default 7.0 */
  width?: number;
  /** Maximum spread in Y across all strands. Default 0.28 */
  spread?: number;
}

/**
 * Attempt to seed a simple PRNG for reproducible strand placement.
 * Uses a simple mulberry32 algorithm.
 */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRibbonGeometry(
  options: RibbonGeometryOptions = {}
): THREE.BufferGeometry {
  const {
    strandCount = 1500,
    segments = 300,
    width = 7.5,
    spread = 0.35,
  } = options;

  const rng = mulberry32(42); // deterministic random

  const vertsPerStrand = segments + 1;
  const totalVerts = strandCount * vertsPerStrand;

  // Positions
  const positions = new Float32Array(totalVerts * 3);
  // Custom attributes (per-vertex, but constant within a strand)
  const strandIdxs = new Float32Array(totalVerts);
  const progresses = new Float32Array(totalVerts);
  const phases = new Float32Array(totalVerts);
  const ampOffsets = new Float32Array(totalVerts);
  const speedMults = new Float32Array(totalVerts);
  const opacities = new Float32Array(totalVerts);
  const yOffsets = new Float32Array(totalVerts);
  const zLayers = new Float32Array(totalVerts);

  // Line indices: each strand is a connected polyline → (segments) line segments
  // Using LineSegments: pairs of vertices
  const totalLineIndices = strandCount * segments * 2;
  const indices = new Uint32Array(totalLineIndices);

  let vIdx = 0;
  let iIdx = 0;

  for (let s = 0; s < strandCount; s++) {
    const sNorm = s / (strandCount - 1); // [0, 1]

    // Per-strand random properties
    const phase = rng() * Math.PI * 2;
    const ampOff = (rng() - 0.5) * 2.0; // [-1, 1]
    const speedM = 0.7 + rng() * 0.6; // [0.7, 1.3]

    // Opacity: most strands are very dim, few are bright
    // Use a steeper power curve so most strands are barely visible
    // This creates the translucent fiber-optic look where density = brightness
    const rawOpacity = rng();
    const opacity = 0.04 + Math.pow(rawOpacity, 2.2) * 0.56; // [0.04, 0.60]

    // Y offset: gaussian-like distribution centered at 0
    // Use Box-Muller approximation for bell-curve spread
    const u1 = Math.max(rng(), 0.0001);
    const u2 = rng();
    const gaussY =
      Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const yOff = gaussY * spread * 0.42; // moderate spread, gaussian density

    // Z layer: slight depth variation for parallax
    const zLayer = (rng() - 0.5) * 0.20;

    const baseVert = s * vertsPerStrand;

    for (let seg = 0; seg <= segments; seg++) {
      const t = seg / segments; // progress [0, 1]
      const xWorld = (t - 0.5) * width;

      const vi = baseVert + seg;

      positions[vi * 3] = xWorld;
      positions[vi * 3 + 1] = yOff; // base Y (shader adds wave)
      positions[vi * 3 + 2] = zLayer;

      strandIdxs[vi] = sNorm;
      progresses[vi] = t;
      phases[vi] = phase;
      ampOffsets[vi] = ampOff;
      speedMults[vi] = speedM;
      opacities[vi] = opacity;
      yOffsets[vi] = yOff;
      zLayers[vi] = zLayer;

      // Line segment indices (pairs)
      if (seg < segments) {
        indices[iIdx++] = vi;
        indices[iIdx++] = vi + 1;
      }
    }

    vIdx += vertsPerStrand;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("a_strandIndex", new THREE.BufferAttribute(strandIdxs, 1));
  geo.setAttribute("a_progress", new THREE.BufferAttribute(progresses, 1));
  geo.setAttribute("a_phase", new THREE.BufferAttribute(phases, 1));
  geo.setAttribute("a_ampOffset", new THREE.BufferAttribute(ampOffsets, 1));
  geo.setAttribute("a_speedMult", new THREE.BufferAttribute(speedMults, 1));
  geo.setAttribute("a_opacity", new THREE.BufferAttribute(opacities, 1));
  geo.setAttribute("a_yOffset", new THREE.BufferAttribute(yOffsets, 1));
  geo.setAttribute("a_zLayer", new THREE.BufferAttribute(zLayers, 1));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));

  return geo;
}

// ── Particle geometry ─────────────────────────────────────────────────────────

export interface ParticleGeometryOptions {
  /** Number of particles. Default 120 */
  count?: number;
}

export function createParticleGeometry(
  options: ParticleGeometryOptions = {}
): THREE.BufferGeometry {
  const { count = 120 } = options;

  const baseProgress = new Float32Array(count);
  const speed = new Float32Array(count);
  const strandLane = new Float32Array(count);
  const size = new Float32Array(count);
  // Dummy positions — actual positions computed in vertex shader
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    baseProgress[i] = Math.random();
    speed[i] = 0.4 + Math.random() * 1.0;
    strandLane[i] = Math.random();
    size[i] = 0.4 + Math.random() * 0.8;
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute(
    "a_baseProgress",
    new THREE.BufferAttribute(baseProgress, 1)
  );
  geo.setAttribute("a_speed", new THREE.BufferAttribute(speed, 1));
  geo.setAttribute("a_strandLane", new THREE.BufferAttribute(strandLane, 1));
  geo.setAttribute("a_size", new THREE.BufferAttribute(size, 1));

  return geo;
}
