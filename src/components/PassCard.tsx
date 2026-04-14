import { motion } from 'motion/react';
import { Copy, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

interface PassCardProps {
  pass: any;
  event: any;
  zone: any;
}

export default function PassCard({ pass, event, zone }: PassCardProps) {
  const passUrl = `${window.location.origin}/pass/${pass.id}`;
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(passUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <p className="font-bold text-white mb-1">{zone.gates.join(' & ')}</p>
            <p>Follow signs after exit</p>
          </div>
        </div>

        {/* Offline Badge */}
        <div className="absolute top-4 right-4 bg-go/20 text-go text-[10px] font-bold px-2 py-1 rounded-full border border-go/30 backdrop-blur-md">
          SAVED OFFLINE
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 space-y-3">
        <button onClick={handleCopy} aria-label="Copy pass link to clipboard" className="w-full py-4 bg-surface border border-white/10 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-white/5 transition-colors">
          <Copy className="w-4 h-4" /> {copied ? '✅ Copied!' : 'Copy Pass Link'}
        </button>
        <button onClick={handleWhatsApp} aria-label="Share pass via WhatsApp" className="w-full py-4 bg-[#25D366] text-background font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#25D366]/90 transition-colors">
          <Share2 className="w-4 h-4" /> Share via WhatsApp
        </button>
      </div>
    </motion.div>
  );
}
