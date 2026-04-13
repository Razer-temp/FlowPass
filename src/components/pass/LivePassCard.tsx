import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, PauseCircle } from 'lucide-react';

interface LivePassCardProps {
  pass: any;
  event: any;
  zone: any;
  onGoNow: () => void;
  hasReassigned: boolean;
  onDismissReassign: () => void;
}

export default function LivePassCard({ pass, event, zone, onGoNow, hasReassigned, onDismissReassign }: LivePassCardProps) {
  const [now, setNow] = useState(Date.now());
  const [pulse, setPulse] = useState(false);
  const passUrl = `${window.location.origin}/pass/${pass.id}`;

  useEffect(() => {
    const timer = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      
      if (pass.status === 'LOCKED' && zone.status !== 'HOLD') {
        const diff = new Date(zone.exit_time).getTime() - currentTime;
        
        // Haptic heartbeat in last 10 seconds
        if (diff <= 10000 && diff > 0 && diff % 1000 < 100) {
          if (navigator.vibrate) navigator.vibrate(50);
        }
        
        // Trigger GO NOW
        if (diff <= 0) {
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          setPulse(true);
          setTimeout(() => setPulse(false), 1000);
          onGoNow();
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [pass.status, zone.exit_time, zone.status, onGoNow]);

  const isUsed = pass.status === 'USED';
  const isPaused = pass.status === 'PAUSED' || zone.status === 'HOLD';
  const isGoNow = pass.status === 'ACTIVE';
  const isLocked = pass.status === 'LOCKED';

  let cardBg = 'bg-surface border-white/10';
  let statusBox = 'bg-stop/10 border-stop/30 text-stop';
  let statusIcon = <div className="w-3 h-3 rounded-full bg-stop animate-pulse" />;
  let statusText = 'PLEASE WAIT';
  let opacity = 'opacity-100';

  if (isUsed) {
    opacity = 'opacity-85';
    statusBox = 'bg-white/5 border-white/10 text-dim';
    statusIcon = <CheckCircle2 className="w-5 h-5" />;
    statusText = 'EXITED SUCCESSFULLY';
  } else if (isPaused) {
    statusBox = 'bg-[#0A0A2E] border-indigo-500/50 text-white animate-pulse';
    statusIcon = <PauseCircle className="w-5 h-5 text-amber-500" />;
    statusText = 'EXIT TEMPORARILY PAUSED';
  } else if (isGoNow) {
    cardBg = 'bg-[#0A2E1A] border-go/50 shadow-[0_0_30px_rgba(0,255,135,0.15)]';
    statusBox = 'bg-go/20 border-go text-go shadow-[0_0_15px_rgba(0,255,135,0.3)]';
    statusIcon = <div className="w-3 h-3 rounded-full bg-go animate-pulse" />;
    statusText = 'YOU MAY NOW EXIT';
  }

  const getCountdown = () => {
    const diff = new Date(zone.exit_time).getTime() - now;
    if (diff <= 0) return "00 : 00";
    const m = Math.floor(diff / 60000).toString().padStart(2, '0');
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
    return `${m} : ${s}`;
  };

  return (
    <div className="relative">
      {/* Full screen pulse effect */}
      {pulse && <div className="fixed inset-0 bg-go/30 z-50 pointer-events-none animate-ping" />}
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`w-full rounded-3xl overflow-hidden border transition-all duration-500 ${cardBg} ${opacity}`}
        role="main"
        aria-label="Your FlowPass"
      >
        {/* Header */}
        <div className="bg-white/5 p-6 border-b border-white/10">
          <div className="flex justify-between items-center mb-4">
            <span className="font-timer tracking-widest text-xl">✈ FLOWPASS</span>
            <span className="text-xl">🎫</span>
          </div>
          <h2 className="font-heading font-bold text-xl leading-tight">{event.name}</h2>
          <p className="text-sm text-dim">{event.venue} · {new Date(event.date).toLocaleDateString()}</p>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="font-bold text-2xl uppercase tracking-wide">{pass.attendee_name}</h3>
            <p className="text-dim">{pass.seat_number}</p>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-background rounded-xl p-3 border border-white/5">
              <div className="text-xs text-dim mb-1">ZONE</div>
              <div className="font-bold text-2xl">{zone.name}</div>
            </div>
            <div className="flex-1 bg-background rounded-xl p-3 border border-white/5 relative">
              <div className="text-xs text-dim mb-1">GATE</div>
              <div className="font-bold text-2xl">{pass.gate_id}</div>
              {hasReassigned && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-amber-500 rounded-full animate-ping" />
              )}
            </div>
          </div>

          {/* Reassigned Alert */}
          {hasReassigned && (
            <div className="bg-amber-500/10 border border-amber-500/50 rounded-xl p-4 mb-6 text-amber-500">
              <div className="flex items-center gap-2 font-bold mb-2">
                <AlertTriangle className="w-5 h-5" /> YOUR GATE HAS CHANGED
              </div>
              <p className="text-sm mb-3 text-white">
                Your previous gate is closed. Please use <strong className="text-amber-500">{pass.gate_id}</strong> instead.
              </p>
              <button onClick={onDismissReassign} className="w-full py-2 bg-amber-500 text-background font-bold rounded-lg text-sm">
                Got it ✓
              </button>
            </div>
          )}

          {/* Status Box */}
          <div className={`rounded-xl p-5 border mb-8 transition-all duration-500 ${statusBox}`} aria-live={isGoNow ? "assertive" : "polite"}>
            <div className="flex items-center justify-center gap-3 font-bold text-lg mb-2">
              {statusIcon} {statusText}
            </div>
            
            {isLocked && (
              <div className="text-center">
                <div className="font-timer text-5xl tracking-widest my-2" aria-label={`Time remaining: ${getCountdown()}`}>
                  {getCountdown()}
                </div>
                <p className="text-xs text-white/70">remaining</p>
              </div>
            )}

            {isGoNow && (
              <div className="text-center text-sm font-medium mt-2 text-white">
                Head to {pass.gate_id}
              </div>
            )}

            {isUsed && (
              <div className="text-center text-sm mt-2">
                Validated at {new Date(pass.exited_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}

            {isPaused && (
              <div className="text-center text-sm mt-2">
                Please remain seated. Exit will resume shortly.
              </div>
            )}
          </div>

          {/* Instructions */}
          {!isUsed && !isPaused && (
            <p className="text-center text-sm text-dim mb-8 px-4">
              {isLocked ? "Stay seated. Your pass will automatically update when it's your turn to exit." : "Show this pass to gate staff or scan your QR code at the exit."}
            </p>
          )}

          {/* QR Code Shield */}
          <div className="relative flex justify-center mb-8">
            <div className="absolute left-0 right-0 top-1/2 h-px bg-white/10 -z-10 border-dashed border-t" />
            <div className={`bg-white p-4 rounded-2xl ${isUsed ? 'opacity-30 grayscale' : ''}`}>
              <QRCodeSVG 
                value={passUrl} 
                size={180}
                level="H"
                includeMargin={false}
              />
              {isUsed && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-background/80 backdrop-blur-sm text-white font-bold py-2 px-6 rounded-full border border-white/20 transform -rotate-12">
                    USED
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="text-center text-sm text-dim">
            <p className="font-bold text-white mb-1">{pass.gate_id}</p>
            <p>{isUsed ? "This pass has been used and cannot be reused." : "Follow green signs after exiting"}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
