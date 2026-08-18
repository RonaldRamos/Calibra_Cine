import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Check, PenTool } from 'lucide-react';

interface SignaturePadProps {
  initialSignature?: string;
  onSave: (signatureDataUrl: string) => void;
  onClear: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  initialSignature,
  onSave,
  onClear,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(Boolean(initialSignature));
  
  // Track last saved data URL internally to prevent clearing canvas when parent re-renders with the same signature
  const lastSavedDataUrlRef = useRef<string | null>(initialSignature || null);
  const isInternalDrawingRef = useRef<boolean>(false);
  const hasDrawnRef = useRef<boolean>(Boolean(initialSignature));
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize and scale canvas once or on resize
  const setupCanvas = useCallback((preserveContent = true) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = Math.max(window.devicePixelRatio || 2, 2);
    const displayWidth = rect.width > 0 ? rect.width : 400;
    const displayHeight = 144; // h-36

    // Save existing image if we need to preserve it
    let previousImage: ImageData | null = null;
    if (preserveContent && canvas.width > 0 && canvas.height > 0) {
      try {
        previousImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch {
        // ignore
      }
    }

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#0f172a'; // Deep slate-900 for high contrast
    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // If we had a previous image and same dimensions, restore
    if (previousImage && preserveContent) {
      // Re-render
      if (lastSavedDataUrlRef.current) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
        };
        img.src = lastSavedDataUrlRef.current;
      }
    } else if (lastSavedDataUrlRef.current) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      };
      img.src = lastSavedDataUrlRef.current;
    }
  }, []);

  // Mount effect & resize observer
  useEffect(() => {
    setupCanvas(false);

    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      setupCanvas(true);
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [setupCanvas]);

  // Handle external change of initialSignature ONLY when different from internal state
  useEffect(() => {
    if (initialSignature && initialSignature !== lastSavedDataUrlRef.current) {
      lastSavedDataUrlRef.current = initialSignature;
      hasDrawnRef.current = true;
      setHasSignature(true);
      
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = container.getBoundingClientRect();
      const displayWidth = rect.width > 0 ? rect.width : 400;
      const displayHeight = 144;

      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      };
      img.src = initialSignature;
    } else if (!initialSignature && lastSavedDataUrlRef.current && !isInternalDrawingRef.current) {
      lastSavedDataUrlRef.current = null;
      hasDrawnRef.current = false;
      setHasSignature(false);
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const rect = container.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width || 400, 144);
    }
  }, [initialSignature]);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture not supported
    }

    setIsDrawing(true);
    isInternalDrawingRef.current = true;
    const { x, y } = getCoordinates(e);
    lastPointRef.current = { x, y };

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);

    hasDrawnRef.current = true;
    setHasSignature(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    const lastPoint = lastPointRef.current || { x, y };

    // Quadratic curve smoothing
    const midX = (lastPoint.x + x) / 2;
    const midY = (lastPoint.y + y) / 2;

    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midX, midY);
    ctx.stroke();

    lastPointRef.current = { x, y };
    hasDrawnRef.current = true;
    if (!hasSignature) {
      setHasSignature(true);
    }
  };

  const saveCurrentSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawnRef.current) return;

    const dataUrl = canvas.toDataURL('image/png');
    lastSavedDataUrlRef.current = dataUrl;
    onSave(dataUrl);
  }, [onSave]);

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      e.preventDefault();
      setIsDrawing(false);
      isInternalDrawingRef.current = false;
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {
          // Ignore
        }
      }
      lastPointRef.current = null;
      saveCurrentSignature();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      setIsDrawing(false);
      isInternalDrawingRef.current = false;
      lastPointRef.current = null;
      saveCurrentSignature();
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container ? container.getBoundingClientRect() : canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width || 400, 144);
    hasDrawnRef.current = false;
    lastSavedDataUrlRef.current = null;
    isInternalDrawingRef.current = false;
    setHasSignature(false);
    onClear();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-sky-500" />
          Assinatura Digital (Rubrica)
        </label>
        {hasSignature && (
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Assinatura Capturada
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 overflow-hidden group transition-all duration-200 focus-within:border-sky-500 touch-none select-none shadow-2xs"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerUp}
          className="w-full h-36 cursor-crosshair touch-none block"
          style={{ touchAction: 'none' }}
        />

        {!hasSignature && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-medium gap-1">
            <PenTool className="w-5 h-5 text-slate-300 dark:text-slate-600" />
            <span>Assine ou desenhe a rubrica aqui (Com o dedo, caneta touch ou mouse)</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
        >
          <Eraser className="w-3.5 h-3.5" />
          Limpar Assinatura
        </button>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
          {hasSignature ? '✓ Assinatura salva automaticamente' : 'Desenhe no quadro acima para assinar'}
        </span>
      </div>
    </div>
  );
};

