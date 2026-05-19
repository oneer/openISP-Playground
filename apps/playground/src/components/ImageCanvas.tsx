import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { RgbImage } from "../isp/types";

type ImageCanvasProps = {
  image: RgbImage;
  zoomScale: number;
};

export function ImageCanvas({ image, zoomScale }: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartRef = useRef({
    pointerId: -1,
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const canDrag = zoomScale > 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const imageData = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
    canvas.width = image.width;
    canvas.height = image.height;
    context.putImageData(imageData, 0, 0);
  }, [image]);

  useEffect(() => {
    if (!canDrag) {
      setIsDragging(false);
    }
  }, [canDrag]);

  function getScrollFrame() {
    return canvasRef.current?.closest<HTMLElement>(".canvas-frame") ?? null;
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!canDrag || event.button !== 0) {
      return;
    }

    const frame = getScrollFrame();
    if (!frame) {
      return;
    }

    dragStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: frame.scrollLeft,
      scrollTop: frame.scrollTop,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    setIsDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDragging || event.pointerId !== dragStartRef.current.pointerId) {
      return;
    }

    const frame = getScrollFrame();
    if (!frame) {
      return;
    }

    frame.scrollLeft = dragStartRef.current.scrollLeft - (event.clientX - dragStartRef.current.x);
    frame.scrollTop = dragStartRef.current.scrollTop - (event.clientY - dragStartRef.current.y);
  }

  function endDrag(event: PointerEvent<HTMLCanvasElement>) {
    if (event.pointerId === dragStartRef.current.pointerId) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      setIsDragging(false);
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className={`image-canvas ${canDrag ? "is-draggable" : ""} ${isDragging ? "is-dragging" : ""}`}
      style={{ width: `${image.width * zoomScale}px` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      aria-label="ISP preview canvas"
    />
  );
}
