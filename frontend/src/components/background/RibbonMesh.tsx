/**
 * RibbonMesh.tsx
 *
 * The core Three.js line-based mesh for the animated ribbon.
 *
 * KEY ARCHITECTURAL CHANGE:
 * Instead of a single Mesh with thick quad-strip geometry, we now render
 * THREE.LineSegments — ~1500 individual polylines, each 1 pixel wide.
 * With additive blending, overlapping strands accumulate into the glowing
 * ethereal ribbon seen in the reference image.
 *
 * The useFrame loop:
 *  1. Advances uTime
 *  2. Lerps current shader uniforms toward the target values for the active
 *     InvestigationState
 *  3. Writes the lerped values back to the ShaderMaterial uniforms
 *
 * NO React state is mutated inside useFrame — all work is direct mutation of
 * Three.js objects, which is the correct R3F pattern for 60fps animations.
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createRibbonGeometry } from "./utils/ribbonGeometry";
import {
  getRibbonTargets,
  lerpUniforms,
  type RibbonUniforms,
} from "./hooks/useRibbonState";
import type { InvestigationState } from "@/context/InvestigationStateContext";

// Import GLSL as raw strings (Vite's built-in ?raw import)
import ribbonVert from "./shaders/ribbon.vert.glsl?raw";
import ribbonFrag from "./shaders/ribbon.frag.glsl?raw";

interface RibbonMeshProps {
  state: InvestigationState;
}

export function RibbonMesh({ state }: RibbonMeshProps) {
  const lineRef = useRef<THREE.LineSegments>(null!);
  const matRef = useRef<THREE.ShaderMaterial>(null!);

  // Current lerped uniform values (mutable ref — NOT React state)
  const currentUniforms = useRef<RibbonUniforms>(getRibbonTargets("idle"));

  // Build geometry once — 1500 strands × 300 segments
  const geometry = useMemo(
    () =>
      createRibbonGeometry({
        strandCount: 1500,
        segments: 300,
        width: 7.5,
        spread: 0.35,
      }),
    []
  );

  // Build ShaderMaterial once
  const material = useMemo(() => {
    const uniforms = getRibbonTargets("idle");
    return new THREE.ShaderMaterial({
      vertexShader: ribbonVert,
      fragmentShader: ribbonFrag,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: uniforms.speed },
        uAmplitude: { value: uniforms.amplitude },
        uFrequency: { value: uniforms.frequency },
        uPulseBlue: { value: uniforms.pulseBlue },
        uHighlight: { value: uniforms.highlight },
        uAlignStrands: { value: uniforms.alignStrands },
        uGlow: { value: uniforms.glow },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });
  }, []);

  // ── Animation loop ──────────────────────────────────────────────────────────
  useFrame((_state, delta) => {
    if (!matRef.current) return;

    const mat = matRef.current;

    // Advance time (wrap at 10000 to prevent float precision loss)
    mat.uniforms.uTime.value = (mat.uniforms.uTime.value + delta) % 10000;

    // Get target uniforms for current state
    const target = getRibbonTargets(state);

    // Lerp toward target — speed: ~2s transition (lerpFactor ≈ delta * 0.5)
    const lerpFactor = Math.min(delta * 0.5, 1.0);
    currentUniforms.current = lerpUniforms(
      currentUniforms.current,
      target,
      lerpFactor
    );

    const cu = currentUniforms.current;
    mat.uniforms.uSpeed.value = cu.speed;
    mat.uniforms.uAmplitude.value = cu.amplitude;
    mat.uniforms.uFrequency.value = cu.frequency;
    mat.uniforms.uPulseBlue.value = cu.pulseBlue;
    mat.uniforms.uHighlight.value = cu.highlight;
    mat.uniforms.uAlignStrands.value = cu.alignStrands;
    mat.uniforms.uGlow.value = cu.glow;
  });

  return (
    <lineSegments
      ref={lineRef}
      geometry={geometry}
      // Position ribbon in the centre-lower area of viewport
      position={[0, -0.1, 0]}
    >
      <primitive object={material} ref={matRef} attach="material" />
    </lineSegments>
  );
}
