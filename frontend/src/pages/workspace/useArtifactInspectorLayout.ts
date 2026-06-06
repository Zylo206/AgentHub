import { useEffect, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";

function getArtifactInspectorMinWidth(viewportWidth: number): number {
  if (viewportWidth <= 1368) {
    return 280;
  }
  return viewportWidth <= 1536 ? 320 : 340;
}

function getArtifactInspectorMaxWidth(viewportWidth: number): number {
  const sidebarWidth = viewportWidth <= 1368 ? 218 : viewportWidth <= 1536 ? 236 : 246;
  const gapWidth = viewportWidth <= 1368 ? 12 : 14;
  const middleColumnMinWidth = viewportWidth <= 1368 ? 520 : viewportWidth <= 1536 ? 600 : 680;
  const availableWidth = viewportWidth - sidebarWidth - gapWidth - middleColumnMinWidth;
  return Math.max(getArtifactInspectorMinWidth(viewportWidth), Math.min(720, availableWidth));
}

function getArtifactInspectorRenderWidth(width: number, viewportWidth: number): number {
  const minWidth = getArtifactInspectorMinWidth(viewportWidth);
  const maxWidth = getArtifactInspectorMaxWidth(viewportWidth);
  return Math.min(maxWidth, Math.max(minWidth, width));
}

export function useArtifactInspectorLayout(collapsed: boolean) {
  const [artifactInspectorWidth, setArtifactInspectorWidth] = useState(380);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1600 : window.innerWidth
  );

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function handleArtifactInspectorResizeStart(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const pointerId = event.pointerId;
    const handle = event.currentTarget;
    const minWidth = getArtifactInspectorMinWidth(window.innerWidth);
    const maxWidth = getArtifactInspectorMaxWidth(window.innerWidth);

    handle.setPointerCapture(pointerId);
    document.body.classList.add("workspace-resizing-inspector");

    function handlePointerMove(moveEvent: globalThis.PointerEvent) {
      const nextWidth = Math.round(window.innerWidth - moveEvent.clientX - 8);
      setArtifactInspectorWidth(Math.min(maxWidth, Math.max(minWidth, nextWidth)));
    }

    function handlePointerUp() {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.body.classList.remove("workspace-resizing-inspector");
      try {
        handle.releasePointerCapture(pointerId);
      } catch {
        // Pointer capture can already be released when the browser cancels a drag.
      }
    }

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  const renderWidth = getArtifactInspectorRenderWidth(artifactInspectorWidth, viewportWidth);
  const workspaceStyle = {
    "--artifact-inspector-width": collapsed ? "48px" : `${renderWidth}px`,
    "--workspace-middle-min": viewportWidth <= 1368 ? "520px" : viewportWidth <= 1536 ? "600px" : "680px"
  } as CSSProperties;

  return {
    artifactInspectorRenderWidth: renderWidth,
    workspaceStyle,
    onArtifactInspectorResizeStart: handleArtifactInspectorResizeStart
  };
}
