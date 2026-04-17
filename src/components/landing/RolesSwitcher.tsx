/**
 * FlowPass — RolesSwitcher Landing Component
 *
 * Three-tab interactive showcase demonstrating the product from
 * each user perspective: Organizer (laptop mockup), Attendee
 * (phone mockup with live pass), and Gate Staff (scanner mockup).
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, Ticket, ShieldCheck, Smartphone, Laptop, ScanLine } from 'lucide-react';

type Role = 'ORGANIZER' | 'ATTENDEE' | 'STAFF';

export default function RolesSwitcher() {
  const [activeRole, setActiveRole] = useState<Role>('ORGANIZER');

  return (
    <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-6 sm:gap-12 items-center">
      {/* Left: Interactive Tabs (But on bottom for mobile) */}
      <div className="space-y-4 w-full">
        <button
          onClick={() => setActiveRole('ORGANIZER')}
          className={`w-full text-left p-4 sm:p-6 rounded-2xl border transition-all ${activeRole === 'ORGANIZER' ? 'bg-white/10 border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)]' : 'bg-transparent border-transparent hover:bg-white/5'}`}
        >
          <div className="flex items-center gap-4 mb-3">
            <div className={`p-3 rounded-lg ${activeRole === 'ORGANIZER' ? 'bg-go/20 text-go' : 'bg-white/5 text-dim'}`}>
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">1. Organizer Control</h3>
          </div>
          <p className={`text-sm md:text-base transition-colors ${activeRole === 'ORGANIZER' ? 'text-white/80' : 'text-dim'}`}>
            Dictate the flow of the entire venue. View live traffic metrics, unlock zones asynchronously, and blast announcements to 50,000 people instantly.
          </p>
        </button>

        <button
          onClick={() => setActiveRole('ATTENDEE')}
          className={`w-full text-left p-4 sm:p-6 rounded-2xl border transition-all ${activeRole === 'ATTENDEE' ? 'bg-white/10 border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)]' : 'bg-transparent border-transparent hover:bg-white/5'}`}
        >
          <div className="flex items-center gap-4 mb-3">
            <div className={`p-3 rounded-lg ${activeRole === 'ATTENDEE' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-dim'}`}>
              <Ticket className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">2. Attendee Passes</h3>
          </div>
          <p className={`text-sm md:text-base transition-colors ${activeRole === 'ATTENDEE' ? 'text-white/80' : 'text-dim'}`}>
            Zero app downloads. Attendees scan a QR code at their seat and instantly get a live digital pass telling them exactly when it is safe to leave.
          </p>
        </button>

        <button
          onClick={() => setActiveRole('STAFF')}
          className={`w-full text-left p-4 sm:p-6 rounded-2xl border transition-all ${activeRole === 'STAFF' ? 'bg-purple-500/20 border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.1)]' : 'bg-transparent border-transparent hover:bg-white/5'}`}
        >
          <div className="flex items-center gap-4 mb-3">
            <div className={`p-3 rounded-lg ${activeRole === 'STAFF' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-dim'}`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">3. Gate Staff Tools</h3>
          </div>
          <p className={`text-sm md:text-base transition-colors ${activeRole === 'STAFF' ? 'text-white/80' : 'text-dim'}`}>
            Security guards open a secure link to validate passes and report gate congestion back to the Organizer in real-time.
          </p>
        </button>
      </div>

      {/* Right: Cinematic POV Visualizer (Top on mobile) */}
      <div className="relative h-[250px] sm:h-[500px] -mt-4 sm:mt-0 lg:mt-0 w-full flex items-center justify-center transform scale-50 sm:scale-100 origin-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-go/10 via-background to-blue-500/10 rounded-3xl blur-2xl opacity-50 pointer-events-none" />
        
        <AnimatePresence mode="wait">
          {activeRole === 'ORGANIZER' && (
            <motion.div
              key="org"
              initial={{ opacity: 0, y: 20, rotateX: 10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: -20, rotateX: -10 }}
              transition={{ duration: 0.4 }}
              className="relative w-full max-w-lg perspective-1000"
            >
              {/* Laptop Mockup */}
              <div className="w-full bg-slate-900 border-4 border-slate-700 rounded-t-xl h-[300px] overflow-hidden flex flex-col shadow-2xl">
                <div className="h-6 bg-slate-800 flex items-center px-4 gap-2 border-b border-slate-700">
                  <div className="w-2 h-2 rounded-full bg-stop" />
                  <div className="w-2 h-2 rounded-full bg-wait" />
                  <div className="w-2 h-2 rounded-full bg-go" />
                </div>
                <div className="flex-1 p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-32 h-6 bg-slate-800 rounded" />
                    <div className="w-16 h-6 bg-go/30 border border-go/50 rounded" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="h-16 bg-slate-800 rounded-lg" />
                    <div className="h-16 bg-slate-800 rounded-lg" />
                    <div className="h-16 bg-slate-800 rounded-lg" />
                  </div>
                  <div className="flex-1 bg-slate-800 rounded-lg mt-2 relative overflow-hidden">
                    <div className="absolute left-0 bottom-0 w-full h-1/2 bg-gradient-to-t from-go/20 to-transparent" />
                  </div>
                </div>
              </div>
              <div className="w-[110%] -ml-[5%] h-4 bg-slate-600 rounded-b-2xl shadow-xl flex justify-center">
                <div className="w-20 h-1 bg-slate-500 rounded-full mt-1" />
              </div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-xs font-mono font-bold flex items-center gap-2 text-white">
                <Laptop className="w-4 h-4" /> Omni-View Center
              </div>
            </motion.div>
          )}

          {activeRole === 'ATTENDEE' && (
            <motion.div
              key="att"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="relative w-[280px]"
            >
              {/* Phone Mockup */}
              <div className="w-full bg-slate-900 border-[8px] border-slate-800 rounded-[2.5rem] h-[550px] overflow-hidden flex flex-col shadow-2xl relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20" />
                <div className="h-20 bg-gradient-to-b from-blue-500/20 to-transparent flex items-end px-6 pb-2">
                  <div className="text-lg font-bold text-blue-400">🎫 Digital Pass</div>
                </div>
                <div className="flex-1 p-5 flex flex-col gap-4">
                  <div className="w-full bg-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
                    <div className="w-32 h-32 bg-white p-2 rounded-xl">
                      <div className="w-full h-full border-4 border-slate-900 border-dashed rounded-lg opacity-50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-20 bg-slate-800 rounded-xl" />
                    <div className="h-20 bg-slate-800 rounded-xl" />
                  </div>
                  <div className="flex-1 bg-wait/10 border border-wait/30 rounded-xl mt-auto overflow-hidden relative flex items-center justify-center">
                    <div className="text-wait font-bold text-xl uppercase tracking-widest animate-pulse">Wait</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-xs font-mono font-bold flex items-center gap-2 text-white shadow-xl whitespace-nowrap">
                <Smartphone className="w-4 h-4" /> Self-Updating Pass
              </div>
            </motion.div>
          )}

          {activeRole === 'STAFF' && (
             <motion.div
             key="stf"
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: -20 }}
             transition={{ duration: 0.3 }}
             className="relative w-[280px]"
           >
             {/* Scanner Mockup */}
             <div className="w-full bg-slate-900 border-[8px] border-slate-800 rounded-[2.5rem] h-[550px] overflow-hidden flex flex-col shadow-2xl relative">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20" />
               <div className="h-20 bg-gradient-to-b from-purple-500/20 to-transparent flex items-end px-6 pb-2 border-b border-white/5">
                 <div className="text-lg font-bold text-purple-400">Gate 3 | Scanner</div>
               </div>
               
               <div className="flex-1 relative bg-black/50">
                 {/* Scanner lines */}
                 <div className="absolute inset-0 border-[40px] border-black/60 z-10 pointer-events-none" />
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-purple-500/50 rounded-2xl z-10" />
                 <motion.div 
                    animate={{ top: ['20%', '80%', '20%'] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="absolute left-1/2 -translate-x-1/2 w-48 h-0.5 bg-go shadow-[0_0_10px_#22c55e] z-20"
                 />
                 <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-white/10 z-0" />
               </div>
               
               <div className="h-40 bg-slate-800 p-4 shrink-0 flex flex-col gap-3">
                  <div className="h-10 bg-go/20 border border-go/40 rounded-lg flex items-center justify-center font-bold text-go">ZONE A : ALLOW</div>
                  <div className="h-10 bg-stop/20 border border-stop/40 rounded-lg flex items-center justify-center font-bold text-stop">ZONE B : DENY</div>
               </div>
             </div>
             <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-xs font-mono font-bold flex items-center gap-2 text-white shadow-xl whitespace-nowrap">
               <ScanLine className="w-4 h-4" /> Staff Web Scanner
             </div>
           </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
