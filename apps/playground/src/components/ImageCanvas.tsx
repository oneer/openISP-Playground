import { useEffect, useRef } from "react";
import type { RgbImage } from "../isp/types";

type ImageCanvasProps = {
  image: RgbImage;
  zoomScale: number;
};

export function ImageCanvas({ image, zoomScale }: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  return (
    <canvas
      ref={canvasRef}
      className="image-canvas"
      style={{ width: `${image.width * zoomScale}px` }}
      aria-label="ISP preview canvas"
    />
  );
}
