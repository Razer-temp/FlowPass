import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { 
  Megaphone, Unlock, PauseCircle, MonitorPlay, 
  Activity, Users, CheckCircle2, AlertTriangle, PlayCircle, Database
} from 'lucide-react';

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
  
  const [event, setEvent] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [gates, setGates] = useState<any[]>([]);
  const [passes, setPasses] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);

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
        const newData = payload.new as any;
        setEvent(newData);
        setIsPaused(newData.status === 'PAUSED');
        if (newData.gates) {
          const statuses = newData.gate_status || {};
          setGates(newData.gates.map((g: string) => ({ name: g, status: statuses[g] || 'CLEAR', peopleThrough: 0 })));
        }
      }).subscribe();

    const zonesSub = supabase.channel(`zones-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zones', filter: `event_id=eq.${eventId}` }, payload => {
        setZones(current => {
          const updated = [...current];
          const index = updated.findIndex(z => z.id === payload.new.id);
          if (index !== -1) updated[index] = payload.new;
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
            if (index !== -1) updated[index] = payload.new;
            return updated;
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
  const exitedCount = passes.filter(p => p.status === 'USED').length; // Mocked for now
  const remainingCount = totalPasses - exitedCount;
  const chaosScore = Math.round((remainingCount / totalPasses) * 100);

  return (
    <div className="min-h-screen bg-background text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ① TOP COMMAND BAR */}
        <header className="bg-surface border border-white/10 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="px-2 py-1 bg-go/20 text-go text-xs font-bold rounded flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-go animate-pulse"></span>
                LIVE
              </span>
              <h1 className="text-xl font-bold">🎫 FlowPass | {event.name} — {event.venue}</h1>
            </div>
            <p className="text-sm text-dim">Event started: {event.end_time} · Running for: 14 mins</p>
          </div>

          <div className="flex flex-wrap gap-3">
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
              className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Megaphone className="w-4 h-4" /> Announcement
            </button>
            <button className="px-4 py-2 bg-go/20 text-go hover:bg-go/30 rounded-lg font-medium flex items-center gap-2 transition-colors">
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
            <button className="px-4 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg font-medium flex items-center gap-2 transition-colors">
              <MonitorPlay className="w-4 h-4" /> Big Screen View
            </button>
          </div>
        </header>

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
      </div>
    </div>
  );
}
