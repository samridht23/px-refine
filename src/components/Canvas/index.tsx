import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useCanvasStore } from "../../App"

const MAX_SCALE = 4; // Maximum zoom-in level
const MIN_SCALE = 0.30; // Maximum zoom-out level
const GRID_STEP = 30; // Grid spacing in logical units
const DOT_SIZE = 2; // Size of the dots (square dots)

const InfiniteCanvas: React.FC = () => {

  const { setCanvasRef } = useCanvasStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);

  // Initialize the canvas context and set up the resolution
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const devicePixelRatio = window.devicePixelRatio || 1;
        canvas.width = canvas.clientWidth * devicePixelRatio;
        canvas.height = canvas.clientHeight * devicePixelRatio;
        ctx.scale(devicePixelRatio, devicePixelRatio);
      }
    }
    setCanvasRef(canvasRef);
  }, []);

  // Utility function for distance between two touch points
  const getTouchDistance = (touches: TouchList): number => {
    const [touch1, touch2] = [touches[0], touches[1]];
    return Math.sqrt(
      (touch2.pageX - touch1.pageX) ** 2 + (touch2.pageY - touch1.pageY) ** 2
    );
  };

  // Handle drawing the infinite grid as dots
  const drawGrid = useCallback(() => {
    if (!context) return;

    const { width, height } = canvasRef.current!;
    context.clearRect(0, 0, width, height);

    const step = GRID_STEP;
    const dotSize = DOT_SIZE;

    const startX = Math.floor(-pan.x / scale / step) * step;
    const startY = Math.floor(-pan.y / scale / step) * step;

    const endX = (width / scale) + startX;
    const endY = (height / scale) + startY;

    context.fillStyle = '#666666'; // Black dots
    for (let x = startX; x <= endX; x += step) {
      for (let y = startY; y <= endY; y += step) {
        const screenX = (x * scale) + pan.x;
        const screenY = (y * scale) + pan.y;
        context.fillRect(screenX - dotSize / 2, screenY - dotSize / 2, dotSize, dotSize);
      }
    }

    useCanvasStore.getState().images.forEach((image) => {
      const img = new Image();
      img.src = image.url;
      img.onload = () => {
        const { x, y, width, height } = image;
        context.drawImage(
          img,
          (x * scale) + pan.x,
          (y * scale) + pan.y,
          width * scale,
          height * scale
        );
      };
    });
  }, [context, pan, scale]);

  // Event handlers for panning and zooming
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    setPan((prevPan) => ({
      x: prevPan.x + dx,
      y: prevPan.y + dy,
    }));
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Cast React.TouchList to TouchList
    const touches = e.touches as unknown as TouchList;

    if (touches.length === 2) {
      setLastTouchDistance(getTouchDistance(touches));
    } else if (touches.length === 1) {
      setLastPos({ x: touches[0].clientX, y: touches[0].clientY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touches = e.touches as unknown as TouchList; // Cast React.TouchList to TouchList
    if (touches.length === 2) {
      // Pinch zoom (two fingers)
      const currentDistance = getTouchDistance(touches);
      if (lastTouchDistance) {
        const zoomFactor = currentDistance / lastTouchDistance;
        setScale((prevScale) =>
          Math.min(MAX_SCALE, Math.max(MIN_SCALE, prevScale * zoomFactor)) // Clamp the zoom level between MIN and MAX
        );
      }
      setLastTouchDistance(currentDistance); // Update the last touch distance
    } else if (touches.length === 1) {
      // Pan with one finger
      const dx = touches[0].clientX - lastPos.x;
      const dy = touches[0].clientY - lastPos.y;

      // Update pan state
      setPan((prevPan) => ({
        x: prevPan.x + dx,
        y: prevPan.y + dy,
      }));
      setLastPos({ x: touches[0].clientX, y: touches[0].clientY }); // Update last position
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setLastTouchDistance(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = 1.1;
    const zoomDirection = e.deltaY < 0 ? 1 : -1;
    const zoomAmount = zoomDirection > 0 ? scaleFactor : 1 / scaleFactor;
    setScale((prevScale) =>
      Math.min(MAX_SCALE, Math.max(MIN_SCALE, prevScale * zoomAmount))
    );
  };

  useEffect(() => {
    drawGrid();
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();
      }
    };
    const handleGestureStart = (event: Event) => {
      event.preventDefault();
    };
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('gesturestart', handleGestureStart, { passive: false });

    return () => {
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('gesturestart', handleGestureStart);
    };
  }, [drawGrid]);

  return (
    <canvas
      ref={canvasRef}
      className="w-[100vw] h-[100vh] absolute top-0 left-0 bg-[#18181b] -z-10"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
};

export default InfiniteCanvas;

