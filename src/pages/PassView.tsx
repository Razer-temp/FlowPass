/**
 * FlowPass — PassView Page
 *
 * The attendee’s live pass view. Shows real-time zone status,
 * gate conditions, announcements, and a QR code for gate staff.
 * Uses wake-lock to prevent screen sleep during events.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import type { FlowPass, FlowEvent, FlowZone, FlowAnnouncement, GateDisplay } from '../types';
import useWakeLock from '../hooks/useWakeLock';
import LivePassCard from '../components/pass/LivePassCard';
import GateStatus from '../components/pass/GateStatus';
import AnnouncementFeed from '../components/pass/AnnouncementFeed';
import HoldToConfirmButton from '../components/pass/HoldToConfirmButton';
import VenueMap from '../components/pass/VenueMap';
import AddToCalendarButton from '../components/pass/AddToCalendarButton';
import AddToWalletButton from '../components/pass/AddToWalletButton';
import NotificationBell from '../components/pass/NotificationBell';
import { onForegroundMessage } from '../lib/firebase';
import { REALTIME_POLL_INTERVAL_MS } from '../lib/constants';

export default function PassView() {
  const { passId } = useParams();
  const [pass, setPass] = useState<FlowPass | null>(null);
  const [event, setEvent] = useState<FlowEvent | null>(null);
  const [zone, setZone] = useState<FlowZone | null>(null);
  const [announcements, setAnnouncements] = useState<FlowAnnouncement[]>([]);
  const [gates, setGates] = useState<GateDisplay[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [showTip, setShowTip] = useState(false);
  const [hasReassigned, setHasReassigned] = useState(false);
  const [pushToast, setPushToast] = useState<{ title: string; body: string } | null>(null);

  // Prevent screen sleep so QR code stays visible for gate staff
  useWakeLock();

  useEffect(() => {
    // Brightness Tip Logic
    const tipDismissed = sessionStorage.getItem('tipDismissed');
    if (!tipDismissed) {
      setShowTip(true);
    }
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

    // Fallback polling every 5s ensures data stays fresh even if WebSocket drops
    const fallbackPoll = setInterval(fetchInitialData, REALTIME_POLL_INTERVAL_MS);

    // Real-time subscriptions
    const eventSub = supabase.channel(`pass-event-${passId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events' }, payload => {
        setEvent((current: FlowEvent | null) => {
          if (current && current.id === payload.new.id) {
            const updatedEvent = { ...current, ...payload.new };
            if (updatedEvent.gates) {
              const statuses = updatedEvent.gate_status || {};
              setGates(updatedEvent.gates.map((g: string) => ({ name: g, status: statuses[g] || 'CLEAR' })));
            }
            return updatedEvent;
          }
          return current;
        });
      }).subscribe((status) => {
        console.log('[PassView] events subscription:', status);
      });

    const passSub = supabase.channel(`pass-${passId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'passes', filter: `id=eq.${passId}` }, payload => {
        setPass((current: FlowPass | null) => {
          if (!current) return current;
          const updatedPass = { ...current, ...payload.new } as FlowPass;
          if (current.gate_id !== updatedPass.gate_id) {
            setHasReassigned(true);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          }
          return updatedPass;
        });
      }).subscribe((status) => {
        console.log('[PassView] pass subscription:', status);
      });

    // We listen to zones because zone status changes (HOLD/ACTIVE) affect the pass
    const zoneSub = supabase.channel(`pass-zone-${passId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'zones' }, payload => {
        setZone((current: FlowZone | null) => {
          if (current && current.id === payload.new.id) return { ...current, ...payload.new };
          return current;
        });
      }).subscribe((status) => {
        console.log('[PassView] zone subscription:', status);
      });

    const annSub = supabase.channel(`pass-ann-${passId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, payload => {
        setAnnouncements(current => [payload.new as FlowAnnouncement, ...current]);
      }).subscribe((status) => {
        console.log('[PassView] announcements subscription:', status);
      });

    // Subscribe to foreground FCM messages for in-app toast
    const unsubFCM = onForegroundMessage((msg) => {
      setPushToast({ title: msg.title, body: msg.body });
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      setTimeout(() => setPushToast(null), 6000);
    });

    return () => {
      clearInterval(fallbackPoll);
      supabase.removeChannel(eventSub);
      supabase.removeChannel(passSub);
      supabase.removeChannel(zoneSub);
      supabase.removeChannel(annSub);
      unsubFCM();
    };
  }, [passId]);

  const handleDismissTip = () => {
    sessionStorage.setItem('tipDismissed', '1');
    setShowTip(false);
  };

  /** Marks the pass as ACTIVE so the attendee can proceed to gates */
  const handleGoNow = async (): Promise<void> => {
    if (!pass) return;
    if (pass.status !== 'ACTIVE') {
      await supabase.from('passes').update({ status: 'ACTIVE' }).eq('id', pass.id);
    }
  };

  /** Marks the pass as USED when the attendee confirms they have exited */
  const handleExitConfirm = async (): Promise<void> => {
    if (!pass) return;
    await supabase.from('passes').update({ status: 'USED', exited_at: new Date().toISOString() }).eq('id', pass.id);
    
    await supabase.from('activity_log').insert({
      event_id: pass.event_id,
      action: `Pass scanned for ${pass.attendee_name} at ${pass.gate_id}`,
      type: 'PASS',
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
      {/* Navbar */}
      <nav className="p-4 md:p-6 flex justify-between items-center border-b border-white/5 bg-surface/50 backdrop-blur-md sticky top-0 z-40">
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

        {/* 2.5 Push Notification Opt-In — Firebase Cloud Messaging */}
        <div className="mt-6">
          <NotificationBell passId={pass.id} />
        </div>

        {/* Foreground Push Toast */}
        <AnimatePresence>
          {pushToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-4 left-4 right-4 z-50 bg-go/95 text-background rounded-2xl p-4 shadow-2xl shadow-go/30 backdrop-blur-md"
            >
              <p className="font-black text-lg">{pushToast.title}</p>
              <p className="text-sm font-medium opacity-90">{pushToast.body}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Google Services Integration */}
        <div className="mt-6 space-y-1">
          <h3 className="text-xs font-mono tracking-widest text-dim uppercase mb-3 px-1">Event Tools · Powered by Google</h3>

          {/* 3a. Google Maps — Interactive Venue Location */}
          <VenueMap venueName={event.venue} />

          {/* 3b. Google Calendar — Add to Calendar */}
          <AddToCalendarButton
            eventName={event.name}
            date={event.date}
            endTime={event.end_time}
            venue={event.venue}
            passUrl={`${window.location.origin}/pass/${pass.id}`}
          />

          {/* 3c. Google Wallet — Digital Pass for Android */}
          <AddToWalletButton pass={pass} event={event} zone={zone} />
        </div>

        {/* 4. Announcements (with Google Cloud TTS audio) */}
        <AnnouncementFeed announcements={announcements.filter(a => a.event_id === pass.event_id)} />

        {/* 5. Exit Confirmation Button */}
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
