/**
 * ParticleSystem.tsx
 *
 * Renders ~150 micro-particles that flow INSIDE the ribbon using a Points
 * geometry and custom GLSL shaders. Particles follow the same wave math as
 * the ribbon strands so they appear to ride the ribbon's energy.
 *
 * Blending: AdditiveBlending — particles self-illuminate, never obscure UI.
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createParticleGeometry } from "./utils/ribbonGeometry";
import { getRibbonTargets, lerpUniforms, type RibbonUniforms } from "./hooks/useRibbonState";
import type { InvestigationState } from "@/context/InvestigationStateContext";

import particlesVert from "./shaders/particles.vert.glsl?raw";
import particlesFrag from "./shaders/particles.frag.glsl?raw";

interface ParticleSystemProps {
  state: InvestigationState;
}

export function ParticleSystem({ state }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null!);
  const matRef    = useRef<THREE.ShaderMaterial>(null!);
  const curRef    = useRef<RibbonUniforms>(getRibbonTargets("idle"));

  const geometry = useMemo(() => createParticleGeometry({ count: 150 }), []);

  const material = useMemo(() => {
    const u = getRibbonTargets("idle");
    return new THREE.ShaderMaterial({
      vertexShader:   particlesVert,
      fragmentShader: particlesFrag,
      uniforms: {
        uTime:         { value: 0 },
        uSpeed:        { value: u.speed },
        uAmplitude:    { value: u.amplitude },
        uFrequency:    { value: u.frequency },
        uParticleAlpha:{ value: u.particleAlpha },
      },
      transparent: true,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
      depthTest:   false,
    });
  }, []);

  useFrame((_state, delta) => {
    if (!matRef.current) return;
    const mat = matRef.current;

    mat.uniforms.uTime.value = (mat.uniforms.uTime.value + delta) % 1000;

    const target = getRibbonTargets(state);
    const lerpFactor = Math.min(delta * 0.5, 1.0);
    curRef.current = lerpUniforms(curRef.current, target, lerpFactor);

    const cu = curRef.current;
    mat.uniforms.uSpeed.value         = cu.speed;
    mat.uniforms.uAmplitude.value     = cu.amplitude;
    mat.uniforms.uFrequency.value     = cu.frequency;
    mat.uniforms.uParticleAlpha.value = cu.particleAlpha;
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      position={[0, -0.15, 0.05]}  // Slightly in front of ribbon (Z bias)
    >
      <primitive object={material} ref={matRef} attach="material" />
    </points>
  );
}
