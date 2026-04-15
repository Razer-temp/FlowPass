import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import LivePassCard from '../components/pass/LivePassCard';
import GateStatus from '../components/pass/GateStatus';
import AnnouncementFeed from '../components/pass/AnnouncementFeed';
import HoldToConfirmButton from '../components/pass/HoldToConfirmButton';
import { X } from 'lucide-react';

export default function PassView() {
  const { passId } = useParams();
  const [pass, setPass] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [zone, setZone] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [gates, setGates] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [showTip, setShowTip] = useState(false);
  const [hasReassigned, setHasReassigned] = useState(false);
  const [originalGate, setOriginalGate] = useState<string | null>(null);

  useEffect(() => {
    // Brightness Tip Logic
    const tipDismissed = sessionStorage.getItem('tipDismissed');
    if (!tipDismissed) {
      setShowTip(true);
    }

    // Wake Lock API
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn("Wake Lock failed:", err);
      }
    };
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock !== null) wakeLock.release();
    };
  }, []);

  useEffect(() => {
    if (!passId) return;

    const fetchInitialData = async () => {
      try {
        const { data: passData } = await supabase.from('passes').select('*').eq('id', passId).single();
        if (!passData) {
          setIsLoading(false);
          return;
        }
        setPass(passData);
        setOriginalGate(passData.gate_id);

        const { data: eventData } = await supabase.from('events').select('*').eq('id', passData.event_id).single();
        if (eventData) {
          setEvent(eventData);
          // Sync gates statuses from event data
          if (eventData.gates) {
            const statuses = eventData.gate_status || {};
            setGates(eventData.gates.map((g: string) => ({ name: g, status: statuses[g] || 'CLEAR' })));
          }
        }

        const { data: zoneData } = await supabase.from('zones').select('*').eq('id', passData.zone_id).single();
        if (zoneData) setZone(zoneData);

        const { data: annData } = await supabase.from('announcements').select('*').eq('event_id', passData.event_id).order('created_at', { ascending: false }).limit(10);
        if (annData) setAnnouncements(annData);

      } catch (error) {
        console.error("Error fetching pass view data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();

    // Real-time subscriptions
    const eventSub = supabase.channel(`pass-event-${passId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events' }, payload => {
        setEvent((current: any) => {
          if (current && current.id === payload.new.id) {
            if (payload.new.gates) {
              const statuses = payload.new.gate_status || {};
              setGates(payload.new.gates.map((g: string) => ({ name: g, status: statuses[g] || 'CLEAR' })));
            }
            return payload.new;
          }
          return current;
        });
      }).subscribe();

    const passSub = supabase.channel(`pass-${passId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'passes', filter: `id=eq.${passId}` }, payload => {
        setPass((current: any) => {
          if (current && current.gate_id !== payload.new.gate_id) {
            setHasReassigned(true);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Amber pulse equivalent
          }
          return payload.new;
        });
      }).subscribe();

    // We listen to zones because zone status changes (HOLD/ACTIVE) affect the pass
    const zoneSub = supabase.channel(`pass-zone-${passId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'zones' }, payload => {
        setZone((current: any) => {
          if (current && current.id === payload.new.id) return payload.new;
          return current;
        });
      }).subscribe();

    const annSub = supabase.channel(`pass-ann-${passId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, payload => {
        setAnnouncements(current => [payload.new, ...current]);
      }).subscribe();

    return () => {
      supabase.removeChannel(eventSub);
      supabase.removeChannel(passSub);
      supabase.removeChannel(zoneSub);
      supabase.removeChannel(annSub);
    };
  }, [passId]);

  const handleDismissTip = () => {
    sessionStorage.setItem('tipDismissed', '1');
    setShowTip(false);
  };

  const handleGoNow = async () => {
    if (pass.status !== 'ACTIVE') {
      await supabase.from('passes').update({ status: 'ACTIVE' }).eq('id', pass.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleExitConfirm = async () => {
    await supabase.from('passes').update({ status: 'USED', exited_at: new Date().toISOString() }).eq('id', pass.id);
    
    // Log activity
    await supabase.from('activity_log').insert({
      event_id: pass.event_id,
      action: `Pass scanned for ${pass.attendee_name} at ${pass.gate_id}`,
      type: 'PASS'
    });
  };

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-go border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!pass || !event || !zone) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-8 text-center text-dim">Pass not found or invalid.</div>;
  }

  return (
    <div className="min-h-screen bg-background text-white pb-12">
      {/* Navbar (Logo only) */}
      <nav className="p-6 flex justify-center border-b border-white/5 bg-surface/50 backdrop-blur-md sticky top-0 z-40">
        <div className="font-timer tracking-widest text-xl text-go">🎫 FLOWPASS</div>
      </nav>

      {/* Brightness Tip */}
      {showTip && (
        <div className="bg-surface border-b border-white/10 p-4 flex items-start justify-between gap-4">
          <div className="text-sm">
            <span className="font-bold">💡 Tip:</span> Turn up your brightness so gate staff can scan your QR code easily in the dark.
          </div>
          <button onClick={handleDismissTip} className="text-go font-bold text-sm whitespace-nowrap px-3 py-1 bg-go/10 rounded-lg">
            Got it ✓
          </button>
        </div>
      )}

      <main className="max-w-md mx-auto p-4 md:p-6">
        {/* 1. Pass Card */}
        <LivePassCard 
          pass={pass} 
          event={event} 
          zone={zone} 
          onGoNow={handleGoNow}
          hasReassigned={hasReassigned}
          onDismissReassign={() => setHasReassigned(false)}
        />

        {/* 2. Gate Status */}
        <GateStatus gates={gates} userGate={pass.gate_id} />

        {/* 3. Announcements */}
        <AnnouncementFeed announcements={announcements.filter(a => a.event_id === pass.event_id)} />

        {/* 4. Exit Confirmation Button */}
        {pass.status === 'ACTIVE' && (
          <HoldToConfirmButton onConfirm={handleExitConfirm} />
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-dim py-8">
        © FlowPass {new Date().getFullYear()}
      </footer>
    </div>
  );
}
