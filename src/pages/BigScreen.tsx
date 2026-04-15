import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Megaphone, AlertTriangle, CheckCircle2, PauseCircle } from 'lucide-react';

export default function BigScreen() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [passes, setPasses] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [gates, setGates] = useState<any[]>([]);
  
  // Zero-drift clock
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Request fullscreen on mount
    const requestFS = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) {
        console.warn("Fullscreen request failed or blocked by browser.");
      }
    };
    requestFS();

    // Zero-drift timer
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!eventId) return;

    const fetchInitialData = async () => {
      try {
        const { data: eventData } = await supabase.from('events').select('*').eq('id', eventId).single();
        if (eventData) setEvent(eventData);

        const { data: zonesData } = await supabase.from('zones').select('*').eq('event_id', eventId).order('exit_time', { ascending: true });
        if (zonesData) setZones(zonesData);

        const { data: annData } = await supabase.from('announcements').select('*').eq('event_id', eventId).order('created_at', { ascending: false }).limit(5);
        if (annData) setAnnouncements(annData);

        // Fetch Passes
        const { data: passesData } = await supabase.from('passes').select('*').eq('event_id', eventId);
        if (passesData) setPasses(passesData);

        if (eventData?.gates) {
          const statuses = eventData.gate_status || {};
          setGates(eventData.gates.map((g: string) => ({ name: g, status: statuses[g] || 'CLEAR' })));
        }
      } catch (error) {
        console.error("Error fetching big screen data:", error);
      }
    };

    fetchInitialData();

    // Fallback polling every 5s
    const fallbackPoll = setInterval(fetchInitialData, 5000);

    const eventSub = supabase.channel(`screen-event-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, payload => {
        setEvent((current: any) => {
          const newData = { ...current, ...payload.new };
          if (newData.gates) {
            const statuses = newData.gate_status || {};
            setGates(newData.gates.map((g: string) => ({ name: g, status: statuses[g] || 'CLEAR' })));
          }
          return newData;
        });
      }).subscribe();

    const zonesSub = supabase.channel(`screen-zones-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zones', filter: `event_id=eq.${eventId}` }, payload => {
        setZones(current => {
          const updated = [...current];
          const index = updated.findIndex(z => z.id === payload.new.id);
          if (index !== -1) {
            updated[index] = { ...current[index], ...payload.new };
          }
          return updated;
        });
      }).subscribe();

    const passesSub = supabase.channel(`screen-passes-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'passes', filter: `event_id=eq.${eventId}` }, payload => {
        setPasses(current => {
          if (payload.eventType === 'INSERT') return [...current, payload.new];
          if (payload.eventType === 'UPDATE') {
            const updated = [...current];
            const index = updated.findIndex(p => p.id === payload.new.id);
            if (index !== -1) updated[index] = { ...current[index], ...payload.new };
            return updated;
          }
          return current;
        });
      }).subscribe();

    const annSub = supabase.channel(`screen-ann-${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements', filter: `event_id=eq.${eventId}` }, payload => {
        setAnnouncements(current => [payload.new, ...current].slice(0, 5));
      }).subscribe();

    return () => {
      clearInterval(fallbackPoll);
      supabase.removeChannel(eventSub);
      supabase.removeChannel(zonesSub);
      supabase.removeChannel(passesSub);
      supabase.removeChannel(annSub);
    };
  }, [eventId]);

  if (!event) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-white text-4xl font-heading">LOADING FLOWPASS...</div>;
  }

  // Derived State
  const totalPasses = event.crowd;
  const exitedCount = passes.filter(p => p.status === 'USED').length;
  const remainingCount = totalPasses - exitedCount;
  const percentExited = Math.round((exitedCount / totalPasses) * 100) || 0;

  const allCleared = zones.length > 0 && zones.every(z => z.status === 'CLEARED');
  const allPaused = event.status === 'PAUSED' || (zones.length > 0 && zones.every(z => z.status === 'HOLD'));
  
  const blockedGates = gates.filter(g => g.status === 'BLOCKED');
  const hasBlockedGate = blockedGates.length > 0;

  // Render Full Screen Overlays
  if (allCleared) {
    return (
      <div className="min-h-screen bg-[#0A2E1A] flex flex-col items-center justify-center text-white p-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-go to-transparent" />
        <CheckCircle2 className="w-48 h-48 text-go mb-12 z-10" />
        <h1 className="text-[120px] font-heading font-bold mb-8 z-10 leading-none">ALL ZONES CLEARED</h1>
        <p className="text-[48px] font-body mb-4 z-10">Thank you for using FlowPass.</p>
        <p className="text-[48px] font-body mb-16 z-10">Everyone has exited safely.</p>
        <div className="text-[32px] font-body text-white/70 z-10">
          <p>{event.name}</p>
          <p>{event.venue} — {new Date(event.date).toLocaleDateString()}</p>
        </div>
      </div>
    );
  }

  if (allPaused) {
    return (
      <div className="min-h-screen bg-[#0A0A2E] flex flex-col items-center justify-center text-white p-12 text-center border-8 border-amber-500/50 animate-pulse">
        <PauseCircle className="w-48 h-48 text-amber-500 mb-12" />
        <h1 className="text-[120px] font-heading font-bold mb-8 leading-none text-amber-500">ALL EXITS PAUSED</h1>
        <p className="text-[64px] font-body mb-4">Please remain in your seats.</p>
        <p className="text-[64px] font-body mb-16">Exit will resume shortly.</p>
        <div className="text-[40px] font-body text-white/70">
          <p>Stay calm · Follow instructions · Staff are here to help</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col text-white overflow-hidden">
      
      {/* ① HEADER BAR */}
      <header className="flex items-center justify-between px-12 py-8 border-b border-white/10 bg-surface">
        <div className="text-[64px] font-timer tracking-wider text-go">🎫 FLOWPASS</div>
        <div className="text-center">
          <h1 className="text-[48px] font-heading font-bold leading-tight">{event.name}</h1>
          <p className="text-[32px] font-body text-dim">{event.venue}</p>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="flex items-center gap-4 bg-stop/20 text-stop px-6 py-2 rounded-full mb-2">
            <div className="w-6 h-6 rounded-full bg-stop animate-pulse" />
            <span className="text-[32px] font-bold tracking-widest">EXIT ACTIVE</span>
          </div>
          <div className="text-[48px] font-timer tracking-widest">
            {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </header>

      {/* OVERALL STATUS BAR */}
      <div className="bg-surface/50 border-b border-white/10 px-12 py-6">
        <div className="flex justify-between items-center text-[32px] font-body mb-4">
          <span>{totalPasses.toLocaleString()} total</span>
          <span className="text-go">{exitedCount.toLocaleString()} exited ✅</span>
          <span className="text-amber-500">{remainingCount.toLocaleString()} remaining</span>
        </div>
        <div className="w-full h-8 bg-black rounded-full overflow-hidden relative">
          <div className="absolute top-0 left-0 h-full bg-go transition-all duration-1000" style={{ width: `${percentExited}%` }} />
          <div className="absolute inset-0 flex items-center justify-center text-xl font-bold mix-blend-difference">
            {percentExited}% cleared
          </div>
        </div>
      </div>

      {/* ② ZONE CARDS — MAIN DISPLAY */}
      <main className="flex-grow p-12 grid grid-cols-2 xl:grid-cols-3 gap-8 content-start">
        {zones.map(zone => {
          let bg = 'bg-[#2E0A0A]';
          let border = 'border-[#FF3B3B]';
          let statusText = '🔴 PLEASE WAIT';
          let isGo = false;

          if (zone.status === 'ACTIVE') {
            bg = 'bg-[#0A2E1A]';
            border = 'border-[#00FF87]';
            statusText = '🟢 EXIT NOW';
            isGo = true;
          } else if (zone.status === 'HOLD') {
            bg = 'bg-[#0A0A2E]';
            border = 'border-[#6366F1]';
            statusText = '⏸ TEMPORARILY PAUSED';
          } else if (zone.status === 'CLEARED') {
            bg = 'bg-[#1A1A1A]';
            border = 'border-[#4A4A6A]';
            statusText = '✅ ALL EXITED';
          } else {
            // Check if it's counting down (within 15 mins)
            const exitTime = new Date(zone.exit_time).getTime();
            if (exitTime - now < 15 * 60000 && exitTime - now > 0) {
              bg = 'bg-[#2E1A0A]';
              border = 'border-[#FFB800]';
              statusText = '🟡 WAIT';
            }
          }

          // Zero-drift countdown
          const getCountdown = () => {
            const diff = new Date(zone.exit_time).getTime() - now;
            if (diff <= 0) return "00 : 00";
            const m = Math.floor(diff / 60000).toString().padStart(2, '0');
            const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
            return `${m} : ${s}`;
          };

          return (
            <div 
              key={zone.id} 
              className={`border-4 rounded-[32px] p-8 flex flex-col items-center text-center transition-all duration-500 ${bg} ${border} ${isGo ? 'scale-[1.02] shadow-[0_0_50px_rgba(0,255,135,0.2)]' : ''}`}
              style={{ minHeight: '380px' }}
            >
              <h2 className="text-[72px] font-timer tracking-widest mb-2">{zone.name}</h2>
              <div className={`text-[48px] font-heading font-bold mb-8 ${isGo ? 'animate-pulse' : ''}`}>
                {statusText}
              </div>
              
              <div className="w-full h-1 bg-white/20 mb-8" />
              
              {zone.status === 'ACTIVE' ? (
                <div className="text-[64px] font-heading font-bold text-go mb-8">PROCEED TO GATES</div>
              ) : zone.status === 'CLEARED' ? (
                <div className="text-[48px] font-body text-dim mb-8">Cleared at {new Date(zone.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              ) : zone.status === 'HOLD' ? (
                <div className="text-[40px] font-body mb-8 leading-tight">
                  <p>Please remain in your seats.</p>
                  <p>Exit will resume shortly.</p>
                </div>
              ) : (
                <div className="text-[96px] font-timer tracking-widest mb-8 leading-none">
                  {getCountdown()}
                </div>
              )}

              <div className="w-full h-1 bg-white/20 mb-8" />

              <div className="text-[40px] font-body font-bold mb-2">
                {zone.gates.join(' & ')}
              </div>
              <div className="text-[28px] font-body text-white/70">
                Assigned Exits
              </div>
            </div>
          );
        })}
      </main>

      {/* QR CODE BEACON */}
      <div className="absolute bottom-32 right-12 flex flex-col items-center z-20">
        <div className="relative w-32 h-32 bg-white rounded-xl p-2 mb-4">
          <div className="absolute inset-0 bg-go/30 rounded-xl animate-radar -z-10" />
          {/* Placeholder QR */}
          <div className="w-full h-full bg-black flex items-center justify-center">
            <div className="text-white text-xs text-center">QR<br/>CODE</div>
          </div>
        </div>
        <div className="text-center bg-black/50 backdrop-blur px-4 py-2 rounded-lg">
          <p className="text-xl font-bold">flowpass.app/register</p>
          <p className="text-sm text-dim">Scan to get your FlowPass</p>
        </div>
      </div>

      {/* ③ BOTTOM ANNOUNCEMENT TICKER */}
      <footer className={`h-[100px] border-t-4 flex items-center overflow-hidden relative z-30 ${hasBlockedGate ? 'border-stop animate-strobe' : 'bg-[#1A1A2E] border-[#2A2A3E]'}`}>
        <div className="whitespace-nowrap animate-marquee flex items-center">
          {hasBlockedGate ? (
            <div className="text-[40px] font-heading font-bold text-white flex items-center gap-4 px-12">
              <AlertTriangle className="w-12 h-12" />
              ⚠️ Gate {blockedGates[0].name} is currently closed — affected zones please follow staff instructions
            </div>
          ) : announcements.length > 0 ? (
            announcements.map((ann, idx) => (
              <div key={idx} className="text-[40px] font-heading font-bold text-white flex items-center px-12">
                <Megaphone className="w-10 h-10 mr-6 text-blue-400" />
                {ann.message}
                <span className="mx-16 text-dim">· · ·</span>
              </div>
            ))
          ) : (
            <div className="text-[40px] font-heading font-bold text-white flex items-center px-12">
              <Megaphone className="w-10 h-10 mr-6 text-blue-400" />
              Please follow your FlowPass instructions and exit via your assigned gate
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
