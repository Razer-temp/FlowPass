/**
 * FlowPass — ChaosVsCalm Landing Component
 *
 * Interactive before/after animation comparing uncoordinated
 * crowd rushes vs. FlowPass-managed wave-based dispersal.
 * Dots animate between "chaos" and "calm" layouts on toggle.
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ChaosVsCalm() {
  const [isFlowPass, setIsFlowPass] = useState(false);

  // Generate 40 dots
  const dots = Array.from({ length: 40 });

  return (
    <div className="bg-card border border-white/10 rounded-2xl p-4 sm:p-10 text-center shadow-2xl relative overflow-hidden">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row bg-background border border-white/10 rounded-lg p-1 w-full sm:w-auto sm:inline-flex">
          <button
            className={`px-6 py-3 sm:py-2 w-full sm:w-auto rounded-md text-sm font-bold transition-colors ${!isFlowPass ? 'bg-stop/20 text-stop' : 'text-dim hover:text-white'}`}
            onClick={() => setIsFlowPass(false)}
          >
            Without FlowPass
          </button>
          <button
            className={`px-6 py-3 sm:py-2 w-full sm:w-auto rounded-md text-sm font-bold transition-colors ${isFlowPass ? 'bg-go/20 text-go' : 'text-dim hover:text-white'}`}
            onClick={() => setIsFlowPass(true)}
          >
            With FlowPass
          </button>
        </div>
      </div>

      <div className="relative h-[200px] sm:h-[300px] bg-background/50 border border-white/5 rounded-xl overflow-hidden flex flex-col items-center justify-start p-4">
        {/* The Exit Gate */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-8 border-b-4 border-white/20 flex items-end justify-center">
          <div className="text-xs font-mono text-dim mb-1">EXIT</div>
        </div>

        {/* The Crowd */}
        <div className="relative w-full h-full mt-4">
          {dots.map((_, i) => {
            // Chaos mode: everyone crowds the center bottom instantly
            // Calm mode: they segment into 3 waves (rows) and move methodically
            const wave = i % 3; // 0, 1, or 2
            const chaosX = 40 + Math.random() * 20; // Crowd the middle
            const chaosY = 70 + Math.random() * 20; // Crowd the bottom

            const calmX = 10 + (i % 10) * 8.5; // Spread evenly
            const calmY = 10 + wave * 25; // Distinct rows/waves

            const color = !isFlowPass 
              ? 'bg-stop' 
              : wave === 0 ? 'bg-go' : wave === 1 ? 'bg-wait' : 'bg-stop';

            return (
              <motion.div
                key={i}
                initial={false}
                animate={{
                  left: `${isFlowPass ? calmX : chaosX}%`,
                  top: `${isFlowPass ? calmY : chaosY}%`,
                  scale: isFlowPass ? 1 : 1.2,
                }}
                transition={{
                  duration: isFlowPass ? 1.5 : 0.4,
                  delay: isFlowPass ? wave * 0.1 : Math.random() * 0.2, // Chaos is sporadic, Calm is ordered
                  ease: isFlowPass ? "easeInOut" : "circIn"
                }}
                className={`absolute w-3 h-3 rounded-full ${color} shadow-[0_0_10px_currentColor]`}
              />
            );
          })}
        </div>
        
        {!isFlowPass && (
          <motion.div initial={{ opacity: 0}} animate={{ opacity: 1}} className="absolute inset-0 bg-stop/10 pointer-events-none fade-in"/>
        )}

      </div>

      <div className="mt-6 sm:mt-8 flex items-start gap-4 text-left max-w-xl mx-auto">
        <div className="mt-1">
          {!isFlowPass ? <AlertTriangle className="w-6 h-6 text-stop"/> : <CheckCircle2 className="w-6 h-6 text-go"/>}
        </div>
        <div>
          <h4 className="text-xl font-bold mb-2">
            {!isFlowPass ? 'The "Rush Hour" Effect' : 'The FlowPass Algorithm'}
          </h4>
          <p className="text-dim text-sm leading-relaxed">
            {!isFlowPass 
              ? 'Without coordination, 100% of your crowd rushes the exits the exact second the event finishes, creating deadly bottlenecks and congestion.' 
              : 'FlowPass algorithmically divides the crowd into algorithmic zones based on stadium size. Only one zone moves at a time, keeping density low and people safe.'}
          </p>
        </div>
      </div>
    </div>
  );
}
