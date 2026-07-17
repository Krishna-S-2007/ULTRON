/**
 * useVisibilityPause.ts
 *
 * Pauses the R3F render loop when the browser tab is hidden and resumes
 * when the user comes back. This avoids wasted GPU cycles and prevents
 * memory / battery drain on idle tabs.
 *
 * Usage: call this hook inside the R3F Canvas (it needs useThree access).
 */

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

export function useVisibilityPause() {
  const { gl } = useThree();

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        // Halt rendering
        gl.setAnimationLoop(null);
      } else {
        // R3F will re-register its own loop on the next frame automatically
        // when frameloop="always". We just need to let it know to restart.
        // Dispatching a synthetic focus event re-activates the fiber loop.
        window.dispatchEvent(new Event("focus"));
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [gl]);
}
