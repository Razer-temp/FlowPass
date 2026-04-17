/**
 * FlowPass — ScrollTimeline Landing Component
 *
 * Scroll-driven progress bars simulating a three-zone staggered
 * dispersal timeline. Bars animate into view as the user scrolls,
 * reinforcing the core value proposition of timed zone releases.
 */

import { motion } from 'motion/react';

export default function ScrollTimeline() {

  return (
    <div className="max-w-3xl mx-auto bg-background p-6 sm:p-12 rounded-2xl border border-white/5 relative mt-12 sm:mt-16 shadow-2xl">
      <div className="w-full space-y-4 sm:space-y-8 font-mono text-sm relative">
        <div className="text-center text-dim text-xs tracking-widest uppercase mb-4 sm:mb-8">
          Scroll-driven Staggering Simulation
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <div className="flex items-center gap-4 sm:w-36 justify-between sm:justify-start">
            <div className="text-dim">10:00 PM</div>
            <div className="font-bold">Zone A</div>
          </div>
          <div className="flex flex-1 items-center gap-4 w-full">
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-go shadow-[0_0_10px_#22c55e]" 
                initial={{ width: "0%" }} 
                whileInView={{ width: "100%" }} 
                transition={{ duration: 1.2, delay: 0.2 }} 
                viewport={{ once: true, margin: "-50px" }} 
              />
            </div>
            <div className="w-6 text-go">🟢</div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <div className="flex items-center gap-4 sm:w-36 justify-between sm:justify-start">
            <div className="text-dim">10:12 PM</div>
            <div className="font-bold">Zone B</div>
          </div>
          <div className="flex flex-1 items-center gap-4 w-full">
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-wait shadow-[0_0_10px_#eab308]" 
                initial={{ width: "0%" }} 
                whileInView={{ width: "100%" }} 
                transition={{ duration: 1.2, delay: 1.0 }} 
                viewport={{ once: true, margin: "-50px" }} 
              />
            </div>
            <div className="w-6 text-wait">🟡</div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <div className="flex items-center gap-4 sm:w-36 justify-between sm:justify-start">
            <div className="text-dim">10:24 PM</div>
            <div className="font-bold">Zone C</div>
          </div>
          <div className="flex flex-1 items-center gap-4 w-full">
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-stop shadow-[0_0_10px_#ef4444]" 
                initial={{ width: "0%" }} 
                whileInView={{ width: "100%" }} 
                transition={{ duration: 1.2, delay: 1.8 }} 
                viewport={{ once: true, margin: "-50px" }} 
              />
            </div>
            <div className="w-6 text-stop">🔴</div>
          </div>
        </div>

        <motion.div 
          className="mt-6 sm:mt-8 text-center text-dim font-medium"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.8 }}
          viewport={{ once: true }}
        >
          Full dispersal achieved safely by 10:36 PM
        </motion.div>
      </div>
    </div>
  );
}
