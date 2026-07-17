/**
 * RibbonScene.tsx
 *
 * Sets up the R3F scene inside the <Canvas>:
 *   - Orthographic-ish perspective camera (wide FOV, far clip)
 *   - RibbonMesh (the main animated ribbon)
 *   - ParticleSystem (micro energy particles riding inside the ribbon)
 *   - useVisibilityPause (pauses rendering on hidden tabs)
 *
 * The scene has no lights — all colour and brightness is handled by the
 * fragment shader, which is correct for an additive-blended, emissive effect.
 *
 * Camera is positioned to see the entire world-space ribbon (X: -3.25→3.25)
 * at a comfortable distance, keeping the ribbon in the vertical middle 30-40%
 * of the viewport.
 */

import { RibbonMesh } from "./RibbonMesh";
import { ParticleSystem } from "./ParticleSystem";
import { useVisibilityPause } from "./hooks/useVisibilityPause";
import type { InvestigationState } from "@/context/InvestigationStateContext";

interface RibbonSceneProps {
  state: InvestigationState;
}

function SceneContents({ state }: RibbonSceneProps) {
  useVisibilityPause();
  return (
    <>
      <RibbonMesh state={state} />
      <ParticleSystem state={state} />
    </>
  );
}

export function RibbonScene({ state }: RibbonSceneProps) {
  return <SceneContents state={state} />;
}
