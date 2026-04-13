import { useState, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface HoldToConfirmButtonProps {
  onConfirm: () => void;
}

export default function HoldToConfirmButton({ onConfirm }: HoldToConfirmButtonProps) {
  const [progress, setProgress] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>();

  const animate = (time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const elapsed = time - startTimeRef.current;
    const newProgress = Math.min((elapsed / 1500) * 100, 100); // 1.5 seconds to fill
    setProgress(newProgress);

    if (newProgress < 100) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      setIsConfirmed(true);
      if (navigator.vibrate) navigator.vibrate(100);
      onConfirm();
    }
  };

  const startHold = () => {
    if (isConfirmed) return;
    startTimeRef.current = undefined;
    requestRef.current = requestAnimationFrame(animate);
  };

  const stopHold = () => {
    if (isConfirmed) return;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setProgress(0);
  };

  if (isConfirmed) {
    return (
      <div className="w-full py-4 bg-go text-background font-bold text-xl rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,135,0.2)]">
        <CheckCircle2 className="w-6 h-6" /> Logged — stay safe!
      </div>
    );
  }

  return (
    <div className="text-center mt-8 mb-12">
      <button
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onContextMenu={(e) => e.preventDefault()} // Prevent context menu on long press
        className="relative w-full py-4 bg-surface border-2 border-go/30 text-go font-bold text-xl rounded-xl overflow-hidden select-none touch-none transition-transform active:scale-[0.98]"
      >
        <div 
          className="absolute top-0 left-0 h-full bg-go/20 transition-none" 
          style={{ width: `${progress}%` }} 
        />
        <span className="relative z-10 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-6 h-6" /> Hold to Confirm Exit
        </span>
      </button>
      <p className="text-xs text-dim mt-3 px-4">
        Hold when you're through the gate. This helps the organiser track how many people are still inside.
      </p>
    </div>
  );
}
