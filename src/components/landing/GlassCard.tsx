/**
 * FlowPass — GlassCard Landing Component
 *
 * Glassmorphism feature card with mouse-tracking radial
 * spotlight effect. Used on the landing page to highlight
 * key product capabilities.
 */

import React, { useRef, useState } from 'react';

interface GlassCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function GlassCard({ icon, title, description }: GlassCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || isFocused) return;

    const div = divRef.current;
    const rect = div.getBoundingClientRect();

    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setIsFocused(true);
    setOpacity(1);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setOpacity(0);
  };

  const handleMouseEnter = () => {
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setIsFocused(false);
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex gap-6 p-8 rounded-2xl bg-background border border-white/10 overflow-hidden group shadow-2xl transition-transform hover:-translate-y-1"
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,.1), transparent 40%)`,
        }}
      />
      
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:bg-go/10 group-hover:text-go group-hover:border-go/20 transition-colors z-10">
        {icon}
      </div>
      <div className="z-10">
        <h4 className="text-xl font-bold mb-3">{title}</h4>
        <p className="text-dim leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
