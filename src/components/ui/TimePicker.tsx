import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value: string; // 24-hour format "HH:mm" expected by backend/algorithms
  onChange: (time: string) => void;
  label?: string;
}

export default function TimePicker({ value, onChange, label }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Default internal states
  const [hour12, setHour12] = useState('12');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('PM');

  // Convert 24h prop into 12h display
  useEffect(() => {
    if (value) {
      const parts = value.split(':');
      if (parts.length === 2) {
        let h24 = parseInt(parts[0], 10);
        const m = parts[1];
        const p = h24 >= 12 ? 'PM' : 'AM';
        
        let h12 = h24 % 12;
        if (h12 === 0) h12 = 12;

        setHour12(String(h12).padStart(2, '0'));
        setMinute(m);
        setPeriod(p);
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format the visual display string on the button
  const displayString = value ? `${hour12}:${minute} ${period}` : "Select time...";

  // Commit changes back as 24-hour format
  const handleTimeChange = (h: string, m: string, p: 'AM' | 'PM') => {
    setHour12(h);
    setMinute(m);
    setPeriod(p);

    let h24 = parseInt(h, 10);
    if (p === 'AM' && h24 === 12) {
      h24 = 0;
    } else if (p === 'PM' && h24 < 12) {
      h24 += 12;
    }

    onChange(`${String(h24).padStart(2, '0')}:${m}`);
  };

  const hours12List = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutesList = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

  return (
    <div className="relative w-full" ref={popupRef}>
      {label && <label className="block text-sm font-bold mb-2 text-white">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-background border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-go transition-colors"
      >
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-dim" />
          <span className={value ? "text-white font-mono text-lg" : "text-dim/50"}>
            {displayString}
          </span>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 top-full left-0 mt-2 p-4 bg-[#12121A]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full sm:w-[320px] flex gap-2"
          >
             {/* Hours Column */}
             <div className="flex-1">
               <div className="text-center font-bold text-[10px] uppercase tracking-widest text-dim mb-2 border-b border-white/10 pb-2">Hour</div>
               <div className="h-48 overflow-y-auto scrollbar-hide flex flex-col gap-1 pr-1" style={{ scrollbarWidth: 'none' }}>
                  {hours12List.map(h => (
                    <button
                      key={`h-${h}`}
                      onClick={() => handleTimeChange(h, minute, period)}
                      className={`
                        py-2 text-center rounded-lg font-mono text-lg transition-colors
                        ${hour12 === h ? 'bg-go text-background font-bold shadow-[0_0_15px_rgba(0,255,135,0.4)]' : 'hover:bg-white/10 text-white'}
                      `}
                    >
                      {h}
                    </button>
                  ))}
               </div>
             </div>

             {/* Divider */}
             <div className="flex items-center justify-center font-bold text-xl text-dim opacity-50 px-1">:</div>

             {/* Minutes Column */}
             <div className="flex-1">
               <div className="text-center font-bold text-[10px] uppercase tracking-widest text-dim mb-2 border-b border-white/10 pb-2">Min</div>
               <div className="h-48 overflow-y-auto scrollbar-hide flex flex-col gap-1 pr-1" style={{ scrollbarWidth: 'none' }}>
                  {minutesList.map(m => (
                    <button
                      key={`m-${m}`}
                      onClick={() => handleTimeChange(hour12, m, period)}
                      className={`
                        py-2 text-center rounded-lg font-mono text-lg transition-colors
                        ${minute === m ? 'bg-go text-background font-bold shadow-[0_0_15px_rgba(0,255,135,0.4)]' : 'hover:bg-white/10 text-white'}
                      `}
                    >
                      {m}
                    </button>
                  ))}
               </div>
             </div>

             {/* Period Column */}
             <div className="flex-1 border-l border-white/10 pl-2 ml-1">
               <div className="text-center font-bold text-[10px] uppercase tracking-widest text-dim mb-2 border-b border-white/10 pb-2">AM/PM</div>
               <div className="flex flex-col gap-2 mt-4">
                 <button
                   onClick={() => handleTimeChange(hour12, minute, 'AM')}
                   className={`
                     py-3 text-center rounded-lg font-bold text-sm transition-colors
                     ${period === 'AM' ? 'bg-go text-background shadow-[0_0_15px_rgba(0,255,135,0.4)]' : 'hover:bg-white/10 text-white'}
                   `}
                 >
                   AM
                 </button>
                 <button
                   onClick={() => handleTimeChange(hour12, minute, 'PM')}
                   className={`
                     py-3 text-center rounded-lg font-bold text-sm transition-colors
                     ${period === 'PM' ? 'bg-go text-background shadow-[0_0_15px_rgba(0,255,135,0.4)]' : 'hover:bg-white/10 text-white'}
                   `}
                 >
                   PM
                 </button>
               </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
