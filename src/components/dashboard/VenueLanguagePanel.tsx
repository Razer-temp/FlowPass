import { useState, useEffect } from 'react';
import { Globe, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface VenueLanguagePanelProps {
  eventId: string;
  gateStatus: Record<string, string>;
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
];

export default function VenueLanguagePanel({ eventId, gateStatus }: VenueLanguagePanelProps) {
  const [activeLanguage, setActiveLanguage] = useState<string>('en');

  // Sync with DB
  useEffect(() => {
    setActiveLanguage(gateStatus.__display_language || 'en');
  }, [gateStatus]);

  const changeLanguage = async (code: string) => {
    try {
      // Optimistic update
      setActiveLanguage(code);
      
      const newGateStatus = { ...gateStatus, __display_language: code };
      await supabase.from('events').update({ gate_status: newGateStatus }).eq('id', eventId);
      
      await supabase.from('activity_log').insert({
        event_id: eventId,
        action: `Big Screen language updated to ${LANGUAGES.find(l => l.code === code)?.name}`,
        type: 'SYSTEM'
      });
    } catch (e) {
      console.error('Error updating display language:', e);
    }
  };

  return (
    <div className="bg-surface border border-white/10 rounded-2xl p-6 overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-go/50 to-transparent"></div>
      
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
          <Globe className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Venue Language</h3>
          <p className="text-dim text-xs">Instantly translate the Big Screen</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {LANGUAGES.map(lang => {
          const isActive = activeLanguage === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xl font-bold transition-all ${
                isActive 
                  ? 'bg-blue-500/20 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                  : 'bg-background border-white/10 text-dim hover:text-white hover:border-white/30'
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              {lang.name}
              {isActive && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
