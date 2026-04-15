import { motion } from 'motion/react';
import { Copy, Share2, ExternalLink, Bookmark, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface PassCardProps {
  pass: any;
  event: any;
  zone: any;
}

export default function PassCard({ pass, event, zone }: PassCardProps) {
  const navigate = useNavigate();
  const passUrl = `${window.location.origin}/pass/${pass.id}`;
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(passUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPass = () => {
    // Auto-copy for convenience
    navigator.clipboard.writeText(passUrl);
    navigate(`/pass/${pass.id}`);
  };

  const handleWhatsApp = () => {
    const text = `Hey! Here's my FlowPass for ${event.name}. My exit is scheduled for ${new Date(zone.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} from ${zone.gates.join(' & ')}. ${passUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  let statusBg = 'bg-stop/20 border-stop/50 text-stop';
  let statusText = '🔴 PLEASE WAIT';
  
  if (zone.status === 'ACTIVE') {
    statusBg = 'bg-go/20 border-go/50 text-go';
    statusText = '🟢 EXIT NOW';
  } else if (zone.status === 'CLEARED') {
    statusBg = 'bg-white/10 border-white/20 text-dim';
    statusText = '✅ EXITED';
  }

  return (
    <motion.div 
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="text-center mb-4">
        <h3 className="text-go font-bold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> Registration Successful
        </h3>
        <p className="text-dim text-sm">Your pass is ready. Please save it for exit.</p>
      </div>

      {/* The Pass Card */}
      <div className="bg-surface rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
        {/* Top Header */}
        <div className="bg-white/5 p-6 border-b border-white/10">
          <div className="flex justify-between items-center mb-4">
            <span className="font-timer tracking-widest text-xl">✈ FLOWPASS</span>
            <span className="text-xl">🎫</span>
          </div>
          <h2 className="font-heading font-bold text-xl leading-tight">{event.name}</h2>
          <p className="text-sm text-dim">{event.venue} · {new Date(event.date).toLocaleDateString()}</p>
        </div>

        {/* Attendee Details */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="font-bold text-2xl uppercase tracking-wide">{pass.attendee_name}</h3>
            <p className="text-dim">{pass.seat_number}</p>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-background rounded-xl p-3 border border-white/5">
              <div className="text-xs text-dim mb-1">ZONE</div>
              <div className="font-bold text-xl">{zone.name}</div>
            </div>
            <div className="flex-1 bg-background rounded-xl p-3 border border-white/5">
              <div className="text-xs text-dim mb-1">GATE</div>
              <div className="font-bold text-xl">{zone.gates.join(' & ')}</div>
            </div>
          </div>

          <div className="mb-6 text-center">
            <div className="text-sm text-dim mb-1">EXIT OPENS AT</div>
            <div className="font-timer text-4xl tracking-widest">
              {new Date(zone.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Status Badge */}
          <div className={`rounded-xl p-4 border text-center font-bold mb-8 ${statusBg}`}>
            {statusText}
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG value={passUrl} size={160} level="H" includeMargin={false} />
            </div>
          </div>

          <div className="text-center text-sm text-dim">
            <p className="font-bold text-white mb-1 uppercase tracking-widest">{pass.id.slice(-6)}</p>
            <p>Show this to gate staff</p>
          </div>
        </div>

        {/* Offline Badge */}
        <div className="absolute top-4 right-4 bg-go/20 text-go text-[10px] font-bold px-2 py-1 rounded-full border border-go/30 backdrop-blur-md">
          SAVED OFFLINE
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 space-y-4">
        {/* Primary Action */}
        <button 
          onClick={handleOpenPass} 
          className="w-full py-5 bg-go text-background font-black text-xl rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(0,255,135,0.3)]"
        >
          <ExternalLink className="w-6 h-6" /> Open Live Pass
        </button>

        {/* Secondary Actions Row */}
        <div className="flex gap-3">
          <button 
            onClick={handleCopy} 
            className="flex-1 py-4 bg-surface border border-white/10 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
          >
            <Copy className="w-4 h-4 text-go" /> {copied ? 'Copied ✓' : 'Copy Link'}
          </button>
          
          <button 
            onClick={handleWhatsApp} 
            className="flex-1 py-4 bg-surface border border-white/10 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
          >
            <Share2 className="w-4 h-4 text-[#25D366]" /> WhatsApp
          </button>
        </div>

        {/* Added to Home Screen Tip */}
        <div className="flex items-center justify-center gap-2 text-xs text-dim mt-4">
          <Bookmark className="w-3 h-3 text-go" />
          <span>Tip: Add this page to your home screen for quick access</span>
        </div>
      </div>
    </motion.div>
  );
}
