import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw, Check, X, Move } from "lucide-react";

interface ImageCropperProps {
  open: boolean;
  onClose: () => void;
  imageFile: File | null;
  onCropComplete: (croppedImageBase64: string) => void;
  aspectRatio?: number;
  maxOutputSize?: number;
  outputWidth?: number;
  outputHeight?: number;
}

export function ImageCropper({
  open,
  onClose,
  imageFile,
  onCropComplete,
  aspectRatio = 1,
  maxOutputSize = 400 * 1024,
  outputWidth = 400,
  outputHeight = 400,
}: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (imageFile && open) {
      const img = new Image();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        img.onload = () => {
          setImage(img);
          setZoom(1);
          setPosition({ x: 0, y: 0 });
        };
        img.src = e.target?.result as string;
      };
      
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile, open]);

  useEffect(() => {
    if (image && canvasRef.current) {
      drawImage();
    }
  }, [image, zoom, position]);

  const drawImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 300;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, size, size);

    const scale = Math.max(size / image.width, size / image.height) * zoom;
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    
    const x = (size - scaledWidth) / 2 + position.x;
    const y = (size - scaledHeight) / 2 + position.y;

    ctx.drawImage(image, x, y, scaledWidth, scaledHeight);
  }, [image, zoom, position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const resetPosition = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const compressImage = async (
    canvas: HTMLCanvasElement,
    targetSize: number
  ): Promise<string> => {
    let quality = 0.9;
    let result = canvas.toDataURL("image/jpeg", quality);
    
    while (result.length > targetSize && quality > 0.1) {
      quality -= 0.1;
      result = canvas.toDataURL("image/jpeg", quality);
    }
    
    if (result.length > targetSize) {
      const tempCanvas = document.createElement("canvas");
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) return result;
      
      let newWidth = outputWidth;
      let newHeight = outputHeight;
      
      while (result.length > targetSize && newWidth > 50) {
        newWidth = Math.floor(newWidth * 0.8);
        newHeight = Math.floor(newHeight * 0.8);
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
        result = tempCanvas.toDataURL("image/jpeg", 0.8);
      }
    }
    
    return result;
  };

  const handleCrop = async () => {
    if (!canvasRef.current || !image) return;
    
    setIsProcessing(true);
    
    try {
      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = outputWidth;
      outputCanvas.height = outputHeight;
      const ctx = outputCanvas.getContext("2d");
      
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outputWidth, outputHeight);

      const previewSize = 300;
      const scale = Math.max(previewSize / image.width, previewSize / image.height) * zoom;
      const scaledWidth = image.width * scale;
      const scaledHeight = image.height * scale;
      
      const previewX = (previewSize - scaledWidth) / 2 + position.x;
      const previewY = (previewSize - scaledHeight) / 2 + position.y;
      
      const outputScale = outputWidth / previewSize;
      const outputX = previewX * outputScale;
      const outputY = previewY * outputScale;
      const outputScaledWidth = scaledWidth * outputScale;
      const outputScaledHeight = scaledHeight * outputScale;

      ctx.drawImage(image, outputX, outputY, outputScaledWidth, outputScaledHeight);

      const compressedImage = await compressImage(outputCanvas, maxOutputSize);
      
      console.log(`🖼️ [IMAGE-CROPPER] Original file: ${imageFile?.size} bytes`);
      console.log(`🖼️ [IMAGE-CROPPER] Compressed output: ${compressedImage.length} bytes`);
      
      onCropComplete(compressedImage);
      onClose();
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">Ajustar Logo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Arrastra para posicionar tu logo. La imagen se ajustará automáticamente al tamaño correcto.
          </p>
          
          <div 
            ref={previewRef}
            className="relative mx-auto bg-gray-800 rounded-lg overflow-hidden border-2 border-dashed border-cyan-500/50"
            style={{ width: 300, height: 300 }}
          >
            <canvas
              ref={canvasRef}
              className="cursor-move touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ width: 300, height: 300 }}
            />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {!image && (
                <span className="text-gray-500">Cargando imagen...</span>
              )}
            </div>
            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-gray-300 flex items-center gap-1">
              <Move className="w-3 h-3" />
              Arrastra para mover
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>Zoom</span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <ZoomOut className="w-4 h-4 text-gray-400" />
              <Slider
                value={[zoom]}
                onValueChange={([value]) => setZoom(value)}
                min={0.5}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <ZoomIn className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={resetPosition}
            className="w-full bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restablecer posición
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleCrop}
            disabled={!image || isProcessing}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            {isProcessing ? (
              <>Procesando...</>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Aplicar Logo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
