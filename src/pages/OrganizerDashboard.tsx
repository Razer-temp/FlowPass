import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import type { FlowEvent, FlowZone, FlowPass, FlowActivityLog, GateDisplay } from '../types';
import { 
  Megaphone, Unlock, PauseCircle, MonitorPlay, 
  Activity, Users, CheckCircle2, AlertTriangle, PlayCircle, Database, PowerOff, ShieldX,
  LayoutGrid, Radio, DoorOpen, ScrollText
} from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';
import { AnimatePresence } from 'motion/react';

// Components
import StatsRow from '../components/dashboard/StatsRow';
import ZoneCard from '../components/dashboard/ZoneCard';
import GatePanel from '../components/dashboard/GatePanel';
import AnnouncementComposer from '../components/dashboard/AnnouncementComposer';
import ActivityLog from '../components/dashboard/ActivityLog';
import { seedSampleData } from '../lib/seedData';

export default function OrganizerDashboard() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<FlowEvent | null>(null);
  const [zones, setZones] = useState<FlowZone[]>([]);
  const [gates, setGates] = useState<GateDisplay[]>([]);
  const [passes, setPasses] = useState<FlowPass[]>([]);
  const [logs, setLogs] = useState<FlowActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<'zones' | 'controls' | 'gates' | 'logs'>('zones');

  useEffect(() => {
    if (!eventId) {
      navigate('/create');
      return;
    }

    const fetchInitialData = async () => {
      try {
        // Fetch Event
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();
        
        if (eventError) throw eventError;
        setEvent(eventData);

        // Fetch Zones
        const { data: zonesData, error: zonesError } = await supabase
          .from('zones')
          .select('*')
          .eq('event_id', eventId)
          .order('exit_time', { ascending: true });
        
        if (zonesError) throw zonesError;
        setZones(zonesData);

        // Initialize Gates handling with our gate_status field
        if (eventData.gates) {
          const statuses = eventData.gate_status || {};
          setGates(eventData.gates.map((g: string) => ({ name: g, status: statuses[g] || 'CLEAR', peopleThrough: 0 })));
        }

        setIsPaused(eventData.status === 'PAUSED');

        // Fetch Passes
        const { data: passesData, error: passesError } = await supabase
          .from('passes')
          .select('*')
          .eq('event_id', eventId);
        
        if (passesError) throw passesError;
        if (passesData) setPasses(passesData);

        // Fetch Logs
        const { data: logsData, error: logsError } = await supabase
          .from('activity_log')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (logsError) throw logsError;
        if (logsData) setLogs(logsData);

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        // navigate('/create'); // Uncomment in production
        setIsLoading(false);
      }
    };

    fetchInitialData();

    // Real-time subscriptions
    const eventSub = supabase.channel(`event-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, payload => {
        setEvent((current: FlowEvent | null) => {
          const newData = { ...current, ...payload.new };
          setIsPaused(newData.status === 'PAUSED');
          if (newData.gates) {
            const statuses = newData.gate_status || {};
            setGates(newData.gates.map((g: string) => ({ name: g, status: statuses[g] || 'CLEAR', peopleThrough: 0 })));
          }
          return newData;
        });
      }).subscribe();

    const zonesSub = supabase.channel(`zones-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zones', filter: `event_id=eq.${eventId}` }, payload => {
        setZones(current => {
          const updated = [...current];
          const index = updated.findIndex(z => z.id === payload.new.id);
          if (index !== -1) updated[index] = { ...current[index], ...payload.new };
          return updated;
        });
      }).subscribe();

    const passesSub = supabase.channel(`passes-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'passes', filter: `event_id=eq.${eventId}` }, payload => {
        setPasses(current => {
          if (payload.eventType === 'INSERT') return [...current, payload.new];
          if (payload.eventType === 'UPDATE') {
            const updated = [...current];
            const index = updated.findIndex(p => p.id === payload.new.id);
            if (index !== -1) updated[index] = { ...current[index], ...payload.new };
            return updated;
          }
          if (payload.eventType === 'DELETE') {
            return current.filter(p => p.id !== payload.old.id);
          }
          return current;
        });
      }).subscribe();

    const logSub = supabase.channel(`logs-${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log', filter: `event_id=eq.${eventId}` }, payload => {
        setLogs(current => [payload.new, ...current].slice(0, 10));
      }).subscribe();

    return () => {
      supabase.removeChannel(eventSub);
      supabase.removeChannel(zonesSub);
      supabase.removeChannel(passesSub);
      supabase.removeChannel(logSub);
    };
  }, [eventId, navigate]);

  // Automated System: Unlock Zones at scheduled exit_time
  useEffect(() => {
    if (isPaused || isEnding || event?.status === 'COMPLETED' || zones.length === 0) return;

    const timer = setInterval(() => {
      const currentTime = Date.now();
      
      zones.forEach(async (zone) => {
        if (zone.status === 'WAIT') {
          const exitTime = new Date(zone.exit_time).getTime();
          // If the scheduled time has arrived or passed
          if (currentTime >= exitTime) {
            try {
              // Optimistically update local state to prevent multiple triggers before DB responds
              setZones(current => current.map(z => z.id === zone.id ? { ...z, status: 'ACTIVE' } : z));
              
              await supabase.from('zones').update({ status: 'ACTIVE' }).eq('id', zone.id);
              await supabase.from('activity_log').insert({
                event_id: eventId, 
                action: `${zone.name} automatically unlocked at scheduled time`, 
                type: 'SYSTEM'
              });
            } catch (error) {
              console.error("Auto unlock failed", error);
            }
          }
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [zones, isPaused, isEnding, event?.status, eventId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-go border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!event) return <div className="p-8 text-center">Event not found</div>;

  // Derived Stats
  const totalPasses = event.crowd;
  const exitedCount = passes.filter(p => p.status === 'USED').length;
  const remainingCount = totalPasses - exitedCount;
  const chaosScore = totalPasses > 0 ? Math.round((remainingCount / totalPasses) * 100) : 0;

  const handleUnlockNextZone = async () => {
    const nextWaitZone = zones.find(z => z.status === 'WAIT');
    if (!nextWaitZone) return;
    await supabase.from('zones').update({ status: 'ACTIVE', exit_time: new Date().toISOString() }).eq('id', nextWaitZone.id);
    await supabase.from('activity_log').insert({
      event_id: eventId, action: `${nextWaitZone.name} unlocked by organizer`, type: 'SYSTEM'
    });
  };

  const handleEndEvent = async () => {
    setIsEnding(true);
    try {
      // 1. Lock Event
      const { error: e1 } = await supabase.from('events').update({ status: 'COMPLETED' }).eq('id', eventId);
      if (e1) throw e1;
      
      // 2. Ghost Protocol: Wipe PII
      const { error: e2 } = await supabase.from('passes').delete().eq('event_id', eventId);
      if (e2) throw e2;
      
      // 3. Log
      const { error: e3 } = await supabase.from('activity_log').insert({
        event_id: eventId, action: 'Event terminated. Ghost Protocol activated. Pass data wiped.', type: 'SYSTEM'
      });
      if (e3) throw e3;
      
      setIsPaused(false);
      setPasses([]); // Manually clear passes just in case realtime is slow
    } catch (e) {
      console.error("Ghost Protocol Failed:", e);
      alert("Failed to End Event securely. Check security policies.");
    } finally {
      setIsEnding(false);
      setShowEndModal(false);
    }
  };

  const isComplete = event.status === 'COMPLETED';

  return (
    <div className="min-h-screen bg-background text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ① TOP COMMAND BAR */}
        <header className="bg-surface border border-white/10 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className={`px-2 py-1 text-xs font-bold rounded flex items-center gap-2 ${isComplete ? 'bg-stop/20 text-stop' : 'bg-go/20 text-go'}`}>
                {!isComplete && <span className="w-2 h-2 rounded-full bg-go animate-pulse"></span>}
                {isComplete ? 'ENDED' : 'LIVE'}
              </span>
              <h1 className="text-xl font-bold">🎫 FlowPass | {event.name} — {event.venue}</h1>
            </div>
            <p className="text-sm text-dim">Event started: {event.end_time} {isComplete && '· Status: Data Purged'}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {!isComplete && (
              <>
            {import.meta.env.MODE === 'development' && (
              <button 
                onClick={() => seedSampleData(event.id, zones)}
                className="px-4 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg font-medium flex items-center gap-2 transition-colors test-seed-btn border border-purple-500/30"
              >
                <Database className="w-4 h-4" /> Seed Passes
              </button>
            )}
            <button 
              onClick={() => setShowAnnouncement(true)}
              aria-label="Send an announcement to all attendees"
              className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Megaphone className="w-4 h-4" /> Announcement
            </button>
            <button 
              onClick={handleUnlockNextZone}
              disabled={!zones.some(z => z.status === 'WAIT')}
              aria-label="Unlock the next waiting zone"
              className="px-4 py-2 bg-go/20 text-go hover:bg-go/30 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Unlock className="w-4 h-4" /> Unlock Next Zone
            </button>
            <button 
              onClick={async () => {
                const newStatus = isPaused ? 'ACTIVE' : 'PAUSED';
                await supabase.from('events').update({ status: newStatus }).eq('id', eventId);
                await supabase.from('activity_log').insert({
                  event_id: eventId,
                  action: `Event ${newStatus === 'PAUSED' ? 'paused' : 'resumed'} by organizer`,
                  type: 'SYSTEM'
                });
                setIsPaused(newStatus === 'PAUSED');
              }}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                isPaused 
                  ? 'bg-stop/20 text-stop border border-stop/50 animate-pulse' 
                  : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
              }`}
            >
              {isPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
              {isPaused ? 'Resume All' : 'Pause All'}
            </button>
            <button 
              onClick={() => setShowEndModal(true)}
              className="px-4 py-2 bg-stop/10 text-stop hover:bg-stop/20 border border-stop/20 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <PowerOff className="w-4 h-4" /> End Event
            </button>
            </>
            )}
            <button 
              onClick={() => window.open(`/screen/${eventId}`, '_blank')}
              aria-label="Open big screen display in new tab"
              className="px-4 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <MonitorPlay className="w-4 h-4" /> Big Screen View
            </button>
          </div>
        </header>

        {isComplete ? (
          <div className="bg-surface border border-stop/20 rounded-2xl p-12 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stop/5 via-black/0 to-black/0 pointer-events-none" />
            <ShieldX className="w-20 h-20 text-stop mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl font-heading font-bold text-white mb-4">Event Terminated</h2>
            <p className="text-dim text-lg max-w-lg mx-auto mb-8">
              The event has been successfully marked as complete. All associated generated passes and personal identifiable information (PII) have been permanently wiped from the servers under Ghost Protocol.
            </p>
            <div className="inline-flex items-center gap-2 font-mono text-xs tracking-widest text-stop/70 uppercase">
              <span className="w-2 h-2 bg-stop animate-pulse rounded-full"></span>
              Secure Auto-Purge Complete
            </div>
          </div>
        ) : isMobile ? (
          /* ═══ MOBILE TABBED VIEW ═══ */
          <>
            <StatsRow total={totalPasses} exited={exitedCount} remaining={remainingCount} chaosScore={chaosScore} />

            {/* Active Tab Content */}
            <div className="pb-24 space-y-6">
              {mobileTab === 'zones' && (
                <section>
                  <h2 className="text-lg font-bold mb-3">Zone Status</h2>
                  <div className="grid grid-cols-1 gap-3">
                    {zones.map((zone, idx) => (
                      <ZoneCard key={zone.id} zone={zone} index={idx} />
                    ))}
                  </div>
                </section>
              )}
              {mobileTab === 'controls' && (
                <section className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold mb-3">Announcements</h2>
                    <AnnouncementComposer eventId={event.id} zones={zones} />
                  </div>
                </section>
              )}
              {mobileTab === 'gates' && (
                <section>
                  <h2 className="text-lg font-bold mb-3">Gate Control</h2>
                  <GatePanel gates={gates} zones={zones} eventId={event.id} />
                </section>
              )}
              {mobileTab === 'logs' && (
                <section>
                  <h2 className="text-lg font-bold mb-3">Live Activity</h2>
                  <ActivityLog eventId={event.id} logs={logs} />
                </section>
              )}
            </div>

            {/* Bottom Tab Navigator */}
            <nav className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-xl border-t border-white/10 z-50 flex justify-around py-2 px-1 safe-area-pb">
              {[
                { id: 'zones' as const, icon: <LayoutGrid className="w-5 h-5" />, label: 'Zones' },
                { id: 'controls' as const, icon: <Radio className="w-5 h-5" />, label: 'Broadcast' },
                { id: 'gates' as const, icon: <DoorOpen className="w-5 h-5" />, label: 'Gates' },
                { id: 'logs' as const, icon: <ScrollText className="w-5 h-5" />, label: 'Logs' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setMobileTab(tab.id)}
                  className={`flex flex-col items-center gap-1 min-w-[60px] py-1 rounded-lg transition-colors ${
                    mobileTab === tab.id ? 'text-go' : 'text-dim'
                  }`}
                >
                  {tab.icon}
                  <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
                </button>
              ))}
            </nav>
          </>
        ) : (
          /* ═══ DESKTOP 3-COLUMN VIEW (UNTOUCHED) ═══ */
          <>
            {/* ② LIVE STATS ROW */}
        <StatsRow 
          total={totalPasses} 
          exited={exitedCount} 
          remaining={remainingCount} 
          chaosScore={chaosScore} 
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN: Zones & Gates */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* ③ ZONE CARDS GRID */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-bold">Zone Status</h2>
                <p className="text-dim text-sm">Tap any card to manage that zone</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {zones.map((zone, idx) => (
                  <ZoneCard key={zone.id} zone={zone} index={idx} />
                ))}
              </div>
            </section>

            {/* ④ SMART GATE REASSIGNMENT PANEL */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-bold">Gate Control</h2>
                <p className="text-dim text-sm">Security staff update gate status from their phones. Changes reflect instantly.</p>
              </div>
              <GatePanel gates={gates} zones={zones} eventId={event.id} />
            </section>

          </div>

          {/* RIGHT COLUMN: Announcements & Logs */}
          <div className="space-y-8">
            
            {/* ⑤ BROADCAST ANNOUNCEMENT */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-bold">Live Announcements</h2>
                <p className="text-dim text-sm">Every attendee sees your message in under 2 seconds.</p>
              </div>
              <AnnouncementComposer eventId={event.id} zones={zones} />
            </section>

            {/* ⑥ LIVE ACTIVITY LOG */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Live Activity</h2>
                  <p className="text-dim text-sm">Every action logged in real-time</p>
                </div>
              </div>
              <ActivityLog eventId={event.id} logs={logs} />
            </section>

          </div>
        </div>
        </>
        )}

      </div>

      {/* END EVENT WARNING MODAL */}
      <AnimatePresence>
        {showEndModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowEndModal(false)}
              className="fixed inset-0 bg-background/90 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 p-6"
            >
              <div className="bg-surface border-2 border-stop/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center">
                <div className="absolute inset-0 bg-stop/5 pointer-events-none" />
                <AlertTriangle className="w-16 h-16 text-stop mx-auto mb-6" />
                <h2 className="text-2xl font-bold mb-2">End Event & Purge Data?</h2>
                <p className="text-dim text-sm mb-8 text-left">
                  This action is <span className="text-stop font-bold">irreversible</span>.
                  <br/><br/>
                  • The event will be locked permanently.
                  <br/>
                  • ALL attendee names, phone numbers, and generated passes will be permanently deleted from the database.
                </p>
                <div className="flex gap-4">
                  <button onClick={() => setShowEndModal(false)} className="flex-1 py-3 text-white font-bold bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleEndEvent} disabled={isEnding} className="flex-1 py-3 bg-stop text-white font-bold flex flex-col items-center justify-center rounded-xl hover:bg-stop/90 transition-colors disabled:opacity-50">
                    {isEnding ? 'Purging...' : 'Execute Purge'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
