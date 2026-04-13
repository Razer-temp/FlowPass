import { useState, useEffect } from 'react';
import { Megaphone, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AnnouncementComposerProps {
  eventId: string;
  zones: any[];
}

const TEMPLATES = [
  { label: '🚇 Metro', text: 'Metro services running normally. Platform 3 for central line.' },
  { label: '🚗 Transport', text: 'Auto rickshaws available at Gate 2 exit. Cab pickup zone at Gate 4.' },
  { label: '⚠️ Safety', text: 'Please move calmly. Do not rush exits. Security staff are here to help.' },
  { label: '✅ All clear', text: 'All exits are open and flowing smoothly. Thank you for your patience.' }
];

export default function AnnouncementComposer({ eventId, zones }: AnnouncementComposerProps) {
  const [message, setMessage] = useState('');
  const [targetZone, setTargetZone] = useState('ALL');
  const [isSending, setIsSending] = useState(false);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    // Fetch recent announcements
    const fetchAnnouncements = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (data) setRecentAnnouncements(data);
    };

    fetchAnnouncements();

    // Subscribe to new announcements
    const sub = supabase.channel(`announcements-${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements', filter: `event_id=eq.${eventId}` }, payload => {
        setRecentAnnouncements(current => [payload.new, ...current].slice(0, 5));
      }).subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [eventId]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setIsSending(true);

    try {
      await supabase.from('announcements').insert({
        event_id: eventId,
        message: message.trim(),
        target_zone: targetZone
      });
      
      setMessage('');
    } catch (error) {
      console.error("Failed to send announcement", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* COMPOSER */}
      <div className="bg-surface border border-white/10 rounded-2xl p-5">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="w-full bg-background border border-white/10 rounded-xl p-4 text-white placeholder:text-dim focus:outline-none focus:border-blue-500 resize-none h-24 mb-2"
          maxLength={160}
        />
        <div className="flex justify-between items-center text-xs text-dim mb-4">
          <span>{message.length} / 160 characters</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {TEMPLATES.map((t, i) => (
            <button 
              key={i}
              onClick={() => setMessage(t.text)}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <select 
            value={targetZone}
            onChange={(e) => setTargetZone(e.target.value)}
            className="bg-background border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All attendees</option>
            {zones.map(z => (
              <option key={z.id} value={z.id}>{z.name} only</option>
            ))}
          </select>

          <button 
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="flex-1 bg-blue-500 text-white font-bold py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" /> {isSending ? 'Sending...' : 'Broadcast Now'}
          </button>
        </div>
      </div>

      {/* RECENT ANNOUNCEMENTS */}
      <div className="bg-surface border border-white/10 rounded-2xl p-5">
        <h3 className="font-bold mb-4 text-sm text-dim tracking-wider">RECENT ANNOUNCEMENTS</h3>
        <div className="space-y-4">
          {recentAnnouncements.length === 0 ? (
            <p className="text-sm text-dim italic">No announcements sent yet.</p>
          ) : (
            recentAnnouncements.map((ann, idx) => (
              <div key={idx} className="border-l-2 border-blue-500 pl-3">
                <div className="flex items-center gap-2 text-xs text-dim mb-1">
                  <Megaphone className="w-3 h-3" />
                  <span>Sent to {ann.target_zone === 'ALL' ? 'All' : 'Specific Zone'}</span>
                  <span>·</span>
                  <span>{new Date(ann.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm">{ann.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
