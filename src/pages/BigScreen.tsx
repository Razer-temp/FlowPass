import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
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
    return <div className="min-h-screen bg-background flex items-center justify-center text-white text-3xl font-heading">LOADING FLOWPASS...</div>;
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

  if (allCleared) {
    return (
      <div className="h-screen w-screen bg-[#0A2E1A] flex flex-col items-center justify-center text-white p-8 text-center relative overflow-hidden font-body">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-go to-transparent" />
        <CheckCircle2 className="w-32 h-32 md:w-48 md:h-48 text-go mb-8 z-10" />
        <h1 className="text-5xl md:text-7xl lg:text-[10vw] font-heading font-bold mb-6 z-10 leading-none">ALL ZONES CLEARED</h1>
        <p className="text-2xl md:text-4xl lg:text-5xl mb-4 z-10">Thank you for using FlowPass.</p>
        <p className="text-2xl md:text-4xl lg:text-5xl mb-12 z-10">Everyone has exited safely.</p>
        <div className="text-xl md:text-3xl text-white/70 z-10">
          <p>{event.name}</p>
          <p>{event.venue} — {new Date(event.date).toLocaleDateString()}</p>
        </div>
      </div>
    );
  }

  if (allPaused) {
    return (
      <div className="h-screen w-screen bg-[#0A0A2E] flex flex-col items-center justify-center text-white p-8 text-center border-8 border-amber-500/50 animate-pulse font-body">
        <PauseCircle className="w-32 h-32 md:w-48 md:h-48 text-amber-500 mb-8 z-10" />
        <h1 className="text-5xl md:text-7xl lg:text-[8vw] font-heading font-bold mb-6 leading-none text-amber-500">ALL EXITS PAUSED</h1>
        <p className="text-3xl md:text-5xl lg:text-6xl mb-4">Please remain in your seats.</p>
        <p className="text-3xl md:text-5xl lg:text-6xl mb-12">Exit will resume shortly.</p>
        <div className="text-2xl md:text-4xl text-white/70">
          <p>Stay calm · Follow instructions · Staff are here to help</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-background flex flex-col md:flex-row text-white overflow-hidden font-body">
      
      {/* 1. LEFT DASHBOARD SIDEBAR */}
      <aside className="w-full md:w-[35%] lg:w-[30%] min-w-[320px] max-w-[500px] h-auto md:h-full shrink-0 bg-surface/40 backdrop-blur-md border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between p-6 lg:p-10 z-10 relative shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col gap-6 lg:gap-10">
          {/* Header Row */}
          <div className="flex justify-between items-center">
            <div className="text-3xl lg:text-5xl font-timer tracking-wider text-go">🎫 FLOWPASS</div>
            <div className="flex items-center gap-2 bg-stop/20 text-stop px-3 py-1 lg:px-4 lg:py-2 rounded-full border border-stop/30 shadow-[0_0_15px_rgba(255,59,59,0.2)]">
              <div className="w-3 h-3 rounded-full bg-stop animate-pulse" />
              <span className="text-xs lg:text-sm font-bold tracking-widest hidden sm:block">EXIT ACTIVE</span>
            </div>
          </div>

          {/* Clock */}
          <div className="text-4xl sm:text-5xl lg:text-7xl font-timer tracking-widest textShadow">
            {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>

          {/* Event Details */}
          <div>
            <h1 className="text-3xl lg:text-5xl xl:text-6xl font-heading font-bold leading-tight break-words">{event.name}</h1>
            <p className="text-xl lg:text-2xl text-dim mt-2">{event.venue}</p>
            <p className="text-lg lg:text-xl text-white/50">{new Date(event.date).toLocaleDateString()}</p>
          </div>

          {/* Overall Progress Block */}
          <div className="bg-black/30 rounded-3xl p-5 lg:p-8 border border-white/5 shadow-inner">
            <div className="flex justify-between items-baseline mb-4">
              <div className="text-sm lg:text-base text-dim uppercase font-bold tracking-wider">Overall Progress</div>
              <div className="text-amber-500 font-bold text-sm lg:text-lg">{remainingCount.toLocaleString()} remain</div>
            </div>
            
            <div className="w-full h-6 lg:h-8 bg-black rounded-full overflow-hidden relative mb-4 border border-white/10">
              <div className="absolute top-0 left-0 h-full bg-go transition-all duration-1000 shadow-[0_0_10px_#00FF87]" style={{ width: `${percentExited}%` }} />
              <div className="absolute inset-0 flex items-center justify-center text-sm lg:text-base font-bold mix-blend-difference text-white">
                {percentExited}% cleared
              </div>
            </div>
            
            <div className="flex justify-between items-center text-sm lg:text-xl">
              <span>{totalPasses.toLocaleString()} total</span>
              <span className="text-go font-bold">{exitedCount.toLocaleString()} exited ✅</span>
            </div>
          </div>
        </div>

        {/* QR Code Anchor point */}
        <div className="mt-8 relative hidden md:block">
          <div className="absolute -inset-4 bg-go/5 rounded-3xl blur-xl -z-10" />
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 lg:p-8 flex flex-col items-center backdrop-blur-sm">
            <div className="relative w-full aspect-square max-w-[240px] bg-white rounded-2xl p-3 lg:p-4 mb-6 shadow-2xl">
              <div className="absolute inset-0 bg-go/20 rounded-2xl animate-radar -z-10" />
              <div className="w-full h-full flex items-center justify-center bg-white rounded-xl overflow-hidden">
                <QRCodeSVG 
                  value={`${window.location.origin}/register/${eventId}`} 
                  size={240}
                  style={{ width: '100%', height: '100%' }}
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>
            <div className="text-center w-full">
              <p className="text-base lg:text-xl font-bold bg-black/60 px-4 py-3 rounded-xl border border-white/10 mb-2 truncate break-all">
                {window.location.host}/register/...{eventId?.slice(0,4)}
              </p>
              <p className="text-sm lg:text-base text-dim">Scan to get your FlowPass</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. RIGHT MAIN PANEL */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#06060C] h-full overflow-hidden relative">
        
        {/* Zone Cards Arena */}
        <div className="flex-1 p-6 lg:p-12 overflow-y-auto overflow-x-hidden">
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6 lg:gap-10 auto-rows-fr">
            {zones.map(zone => {
              let bg = 'bg-[#2E0A0A]/80';
              let border = 'border-[#FF3B3B]/50';
              let statusText = '🔴 PLEASE WAIT';
              let isGo = false;

              if (zone.status === 'ACTIVE') {
                bg = 'bg-[#0A2E1A]';
                border = 'border-[#00FF87]';
                statusText = '🟢 EXIT NOW';
                isGo = true;
              } else if (zone.status === 'HOLD') {
                bg = 'bg-[#0A0A2E]/90';
                border = 'border-[#6366F1]/50';
                statusText = '⏸ TEMPORARILY PAUSED';
              } else if (zone.status === 'CLEARED') {
                bg = 'bg-[#1A1A1A]/80';
                border = 'border-[#4A4A6A]/30';
                statusText = '✅ ALL EXITED';
              } else {
                // Check if it's counting down (within 15 mins)
                const exitTime = new Date(zone.exit_time).getTime();
                if (exitTime - now < 15 * 60000 && exitTime - now > 0) {
                  bg = 'bg-[#2E1A0A]/90';
                  border = 'border-[#FFB800]/60';
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
                  className={`border-[3px] rounded-[32px] p-6 lg:p-10 flex flex-col items-center text-center justify-center transition-all duration-500 backdrop-blur-md ${bg} ${border} ${isGo ? 'scale-[1.03] shadow-[0_0_50px_rgba(0,255,135,0.25)] relative overflow-hidden' : ''}`}
                >
                  {isGo && (
                    <div className="absolute inset-0 bg-gradient-to-b from-go/10 to-transparent pointer-events-none" />
                  )}
                  
                  <h2 className="text-5xl lg:text-7xl font-timer tracking-widest mb-4">{zone.name}</h2>
                  <div className={`text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-heading font-bold mb-8 ${isGo ? 'animate-pulse text-white' : ''}`}>
                    {statusText}
                  </div>
                  
                  <div className="w-full h-px bg-white/20 mb-8" />
                  
                  {zone.status === 'ACTIVE' ? (
                    <div className="text-4xl lg:text-5xl xl:text-6xl font-heading font-bold text-go mb-8">PROCEED TO GATES</div>
                  ) : zone.status === 'CLEARED' ? (
                    <div className="text-3xl lg:text-4xl text-dim mb-8">Cleared at {new Date(zone.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  ) : zone.status === 'HOLD' ? (
                    <div className="text-3xl lg:text-4xl mb-8 leading-tight">
                      <p>Remain seated.</p>
                      <p className="text-dim text-lg lg:text-2xl mt-2">Exit will resume shortly.</p>
                    </div>
                  ) : (
                    <div className="text-[12vw] sm:text-[10vw] md:text-7xl lg:text-8xl xl:text-[8rem] font-timer tracking-widest mb-8 leading-none">
                      {getCountdown()}
                    </div>
                  )}

                  <div className="w-full h-px bg-white/20 mb-8" />

                  <div className="text-2xl lg:text-4xl font-bold mb-2">
                    {zone.gates.join(' & ')}
                  </div>
                  <div className="text-xl lg:text-2xl text-white/60 uppercase tracking-widest font-semibold">
                    Assigned Exits
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. BOTTOM ANNOUNCEMENT TICKER */}
        <footer className={`flex-none h-20 lg:h-28 border-t-4 flex items-center overflow-hidden relative z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] ${hasBlockedGate ? 'border-stop bg-stop/10 animate-strobe' : 'bg-surface/80 border-[#2A2A3E]'}`}>
          <div className="whitespace-nowrap animate-marquee flex items-center h-full">
            {hasBlockedGate ? (
              <div className="text-3xl lg:text-5xl font-heading font-bold text-white flex items-center gap-6 px-12 h-full">
                <AlertTriangle className="w-12 h-12 lg:w-16 lg:h-16 text-stop" />
                <span>⚠️ Gate {blockedGates[0].name} is currently closed — affected zones please follow staff instructions</span>
              </div>
            ) : announcements.length > 0 ? (
              announcements.map((ann, idx) => (
                <div key={idx} className="text-3xl lg:text-5xl font-heading font-bold text-white flex items-center px-12 h-full">
                  <Megaphone className="w-10 h-10 lg:w-16 lg:h-16 mr-6 text-blue-400" />
                  {ann.message}
                  <span className="mx-16 text-dim opacity-50">· · ·</span>
                </div>
              ))
            ) : (
              <div className="text-3xl lg:text-5xl font-heading font-bold text-white flex items-center px-12 h-full">
                <Megaphone className="w-10 h-10 lg:w-16 lg:h-16 mr-6 text-blue-400" />
                Please follow your FlowPass instructions and exit via your assigned gate
              </div>
            )}
          </div>
        </footer>
      </main>

    </div>
  );
}
