"use client";

import * as React from "react";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from "lucide-react";

interface PinchZoomContainerProps {
  children: React.ReactNode;
  className?: string;
  minScale?: number;
  maxScale?: number;
  targetWidth?: number;
}

export function PinchZoomContainer({
  children,
  className = "",
  minScale = 0.4,
  maxScale = 3.0,
  targetWidth = 750,
}: PinchZoomContainerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const contentWrapperRef = React.useRef<HTMLDivElement>(null);

  const [scale, setScale] = React.useState<number>(1.0);
  const [fitScale, setFitScale] = React.useState<number>(1.0);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = React.useState(false);
  const [initialized, setInitialized] = React.useState(false);

  // Gesture state refs (avoids re-binding listeners)
  const stateRef = React.useRef({
    scale: 1.0,
    fitScale: 1.0,
    position: { x: 0, y: 0 },
    initialDistance: 0,
    initialScale: 1.0,
    lastTouch: { x: 0, y: 0 },
    lastTapTime: 0,
    isPinching: false,
    isDragging: false,
  });

  // Calculate fit-to-screen scale on mount and window resize
  const calculateFitScale = React.useCallback(() => {
    if (!containerRef.current) return 1.0;
    const containerWidth = containerRef.current.clientWidth || window.innerWidth;
    const padding = 24;
    const availableWidth = Math.max(containerWidth - padding, 280);
    
    // If container is smaller than target invoice width (mobile), scale down so full page is visible
    if (availableWidth < targetWidth) {
      const calculated = Math.min(1.0, Math.max(minScale, Number((availableWidth / targetWidth).toFixed(3))));
      return calculated;
    }
    return 1.0;
  }, [targetWidth, minScale]);

  // Initial load auto-fit
  React.useEffect(() => {
    const initialFit = calculateFitScale();
    setFitScale(initialFit);
    setScale(initialFit);
    setPosition({ x: 0, y: 0 });
    stateRef.current.scale = initialFit;
    stateRef.current.fitScale = initialFit;
    stateRef.current.position = { x: 0, y: 0 };
    setInitialized(true);

    const handleResize = () => {
      const newFit = calculateFitScale();
      setFitScale(newFit);
      stateRef.current.fitScale = newFit;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [calculateFitScale]);

  // Keep stateRef in sync with state
  React.useEffect(() => {
    stateRef.current.scale = scale;
    stateRef.current.position = position;
  }, [scale, position]);

  const updateTransform = React.useCallback(
    (newScale: number, newPos: { x: number; y: number }) => {
      const clampedScale = Math.min(Math.max(newScale, minScale), maxScale);
      setScale(clampedScale);
      setPosition(newPos);
      stateRef.current.scale = clampedScale;
      stateRef.current.position = newPos;
    },
    [minScale, maxScale]
  );

  const handleZoomIn = () => {
    const next = Math.min(Number((scale + 0.2).toFixed(2)), maxScale);
    updateTransform(next, position);
  };

  const handleZoomOut = () => {
    const next = Math.max(Number((scale - 0.2).toFixed(2)), minScale);
    updateTransform(next, position);
  };

  const handleToggleFit = () => {
    // If currently at fit scale, zoom to 1.0 (100%), otherwise return to fit scale
    if (Math.abs(scale - fitScale) < 0.05 && fitScale < 0.95) {
      updateTransform(1.0, { x: 0, y: 0 });
    } else {
      updateTransform(fitScale, { x: 0, y: 0 });
    }
  };

  const handleReset = () => {
    updateTransform(fitScale, { x: 0, y: 0 });
  };

  // Touch event handlers for mobile pinch & drag
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function getDistance(t1: Touch, t2: Touch) {
      return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        // 2 fingers = Pinch zoom
        e.preventDefault();
        stateRef.current.isPinching = true;
        stateRef.current.isDragging = false;
        stateRef.current.initialDistance = getDistance(e.touches[0], e.touches[1]);
        stateRef.current.initialScale = stateRef.current.scale;
      } else if (e.touches.length === 1) {
        // 1 finger: Double tap detection or Pan
        const now = Date.now();
        const diff = now - stateRef.current.lastTapTime;
        stateRef.current.lastTapTime = now;

        if (diff < 300 && diff > 0) {
          // Double tap toggles zoom
          e.preventDefault();
          if (stateRef.current.scale > stateRef.current.fitScale * 1.2) {
            updateTransform(stateRef.current.fitScale, { x: 0, y: 0 });
          } else {
            updateTransform(1.5, { x: 0, y: 0 });
          }
          return;
        }

        if (stateRef.current.scale > stateRef.current.fitScale) {
          stateRef.current.isDragging = true;
          stateRef.current.lastTouch = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          };
          setIsPanning(true);
        }
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && stateRef.current.isPinching) {
        e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        if (stateRef.current.initialDistance > 0) {
          const factor = dist / stateRef.current.initialDistance;
          const newScale = Math.min(
            Math.max(Number((stateRef.current.initialScale * factor).toFixed(3)), minScale),
            maxScale
          );
          setScale(newScale);
          stateRef.current.scale = newScale;
        }
      } else if (
        e.touches.length === 1 &&
        stateRef.current.isDragging &&
        stateRef.current.scale > stateRef.current.fitScale
      ) {
        const dx = e.touches[0].clientX - stateRef.current.lastTouch.x;
        const dy = e.touches[0].clientY - stateRef.current.lastTouch.y;

        stateRef.current.lastTouch = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };

        const newPos = {
          x: stateRef.current.position.x + dx,
          y: stateRef.current.position.y + dy,
        };

        setPosition(newPos);
        stateRef.current.position = newPos;
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) {
        stateRef.current.isPinching = false;
      }
      if (e.touches.length === 0) {
        stateRef.current.isDragging = false;
        setIsPanning(false);
      }
    }

    // Ctrl + Wheel to zoom on desktop / trackpad
    function onWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        const next = Math.min(Math.max(Number((stateRef.current.scale + delta).toFixed(2)), minScale), maxScale);
        updateTransform(next, stateRef.current.position);
      }
    }

    container.addEventListener("touchstart", onTouchStart, { passive: false });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd);
    container.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("wheel", onWheel);
    };
  }, [minScale, maxScale, updateTransform]);

  // Use scaled width to ensure container correctly computes scrollable size
  const isScaled = scale !== 1.0;
  const isZoomedIn = scale > fitScale * 1.05;

  return (
    <div className="relative w-full flex flex-col items-center select-none">
      {/* Zoom Area Viewport */}
      <div
        ref={containerRef}
        className={`w-full overflow-x-auto overflow-y-visible touch-pan-y ${className}`}
        style={{
          cursor: isZoomedIn ? (isPanning ? "grabbing" : "grab") : "default",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Alignment wrapper: starts at left:0 on small screens, centered on large screens */}
        <div
          className="w-full flex justify-start sm:justify-center py-2 px-1"
          style={{ minWidth: "100%" }}
        >
          <div
            ref={contentWrapperRef}
            style={{
              transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
              transformOrigin: "top left",
              transition:
                stateRef.current.isPinching || stateRef.current.isDragging
                  ? "none"
                  : "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              willChange: "transform",
              // Adjust layout size when scaled so surrounding scroll behaves predictably
              width: targetWidth,
              marginBottom: scale < 1.0 ? `-${Math.round((1 - scale) * 700)}px` : undefined,
              marginRight: scale < 1.0 ? `-${Math.round((1 - scale) * targetWidth)}px` : undefined,
            }}
          >
            {children}
          </div>
        </div>
      </div>

      {/* Floating Zoom Controls Bar */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex items-center gap-1 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-gray-200 dark:border-zinc-800 shadow-xl rounded-full px-2 py-1 text-xs text-foreground">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={scale <= minScale}
          className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
          title="Zoom Out (-)"
          aria-label="Zoom Out"
        >
          <ZoomOut className="size-3.5" />
        </button>

        <button
          type="button"
          onClick={handleToggleFit}
          className="px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
          title={Math.abs(scale - fitScale) < 0.05 ? "Click for 100% Size" : "Click to Fit Screen"}
        >
          {Math.round(scale * 100)}%
        </button>

        <button
          type="button"
          onClick={handleZoomIn}
          disabled={scale >= maxScale}
          className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
          title="Zoom In (+)"
          aria-label="Zoom In"
        >
          <ZoomIn className="size-3.5" />
        </button>

        {Math.abs(scale - fitScale) > 0.05 && (
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground ml-0.5 cursor-pointer transition-colors"
            title="Reset to Fit Screen"
            aria-label="Reset to Fit Screen"
          >
            <RotateCcw className="size-3" />
          </button>
        )}
      </div>
    </div>
  );
}
