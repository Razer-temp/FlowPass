import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle2, XCircle, AlertTriangle, Clock, Camera, WifiOff, ArrowLeft, PauseCircle } from 'lucide-react';

export default function GateStaffView() {
  const { eventId, gateId } = useParams();
  const decodedGateId = decodeURIComponent(gateId || '');
  
  const [event, setEvent] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [passesCache, setPassesCache] = useState<Record<string, any>>({});
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Shift Stats
  const [shiftStats, setShiftStats] = useState({
    checked: 0,
    valid: 0,
    invalid: 0,
    overrides: 0,
    reports: 0,
    lastReport: 'None'
  });

  // Validation State
  const [inputCode, setInputCode] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Gate Status
  const [currentGateStatus, setCurrentGateStatus] = useState('CLEAR');
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  // Zero-drift clock for countdowns
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Online/Offline detection
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Wake Lock
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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (wakeLock !== null) wakeLock.release();
    };
  }, []);

  useEffect(() => {
    if (!eventId || !decodedGateId) return;

    const fetchInitialData = async () => {
      try {
        const { data: eventData } = await supabase.from('events').select('*').eq('id', eventId).single();
        if (eventData) setEvent(eventData);

        const { data: zonesData } = await supabase.from('zones').select('*').eq('event_id', eventId);
        if (zonesData) {
          // Only care about zones assigned to this gate
          setZones(zonesData.filter(z => z.gates.includes(decodedGateId)));
        }

        // Fetch all passes for fast offline/in-memory validation
        // In production with 50k passes, we'd paginate or only fetch active ones.
        const { data: passesData } = await supabase.from('passes').select('*').eq('event_id', eventId);
        if (passesData) {
          const cache: Record<string, any> = {};
          passesData.forEach(p => cache[p.id] = p);
          setPassesCache(cache);
        }
      } catch (error) {
        console.error("Error fetching gate data:", error);
      }
    };

    fetchInitialData();

    // Real-time Subscriptions
    const zonesSub = supabase.channel(`gate-zones-${eventId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'zones', filter: `event_id=eq.${eventId}` }, payload => {
        setZones(current => {
          const updated = [...current];
          const index = updated.findIndex(z => z.id === payload.new.id);
          if (index !== -1 && payload.new.gates.includes(decodedGateId)) {
            updated[index] = payload.new;
          }
          return updated;
        });
      }).subscribe();

    const passesSub = supabase.channel(`gate-passes-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'passes', filter: `event_id=eq.${eventId}` }, payload => {
        setPassesCache(current => {
          const updated = { ...current };
          if (payload.eventType === 'DELETE') {
            delete updated[payload.old.id];
          } else {
            updated[payload.new.id] = payload.new;
          }
          return updated;
        });
      }).subscribe();

    return () => {
      supabase.removeChannel(zonesSub);
      supabase.removeChannel(passesSub);
    };
  }, [eventId, decodedGateId]);

  const triggerFlash = (color: string) => {
    setFlashColor(color);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setTimeout(() => setFlashColor(null), 500);
  };

  const handleValidate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputCode.trim()) return;

    const code = inputCode.trim().toLowerCase();
    
    // Find pass by short code (last 6 chars of UUID) or seat number
    const pass = Object.values(passesCache).find(p => 
      p.id.toLowerCase().endsWith(code) || 
      p.seat_number.toLowerCase().includes(code)
    );

    setShiftStats(s => ({ ...s, checked: s.checked + 1 }));

    if (!pass) {
      triggerFlash('bg-red-500');
      setValidationResult({ type: 'NOT_FOUND' });
      setShiftStats(s => ({ ...s, invalid: s.invalid + 1 }));
      return;
    }

    const passZone = zones.find(z => z.id === pass.zone_id);
    const isCorrectGate = pass.gate_id === decodedGateId;

    if (pass.status === 'USED') {
      triggerFlash('bg-amber-500');
      setValidationResult({ type: 'USED', pass });
      setShiftStats(s => ({ ...s, invalid: s.invalid + 1 }));
      return;
    }

    if (!isCorrectGate) {
      triggerFlash('bg-amber-500');
      setValidationResult({ type: 'WRONG_GATE', pass });
      setShiftStats(s => ({ ...s, invalid: s.invalid + 1 }));
      return;
    }

    if (!passZone || passZone.status !== 'ACTIVE') {
      triggerFlash('bg-red-500');
      setValidationResult({ type: 'NOT_OPEN', pass, zone: passZone });
      setShiftStats(s => ({ ...s, invalid: s.invalid + 1 }));
      return;
    }

    // Valid!
    triggerFlash('bg-green-500');
    setValidationResult({ type: 'VALID', pass, zone: passZone });
  };

  const confirmPass = async (passId: string, isOverride = false) => {
    // Optimistic update
    setPassesCache(current => ({
      ...current,
      [passId]: { ...current[passId], status: 'USED', exited_at: new Date().toISOString() }
    }));
    
    setShiftStats(s => ({ 
      ...s, 
      valid: s.valid + (isOverride ? 0 : 1),
      overrides: s.overrides + (isOverride ? 1 : 0)
    }));

    setValidationResult(null);
    setInputCode('');
    if (inputRef.current) inputRef.current.focus();

    if (!isOffline) {
      await supabase.from('passes').update({ status: 'USED', exited_at: new Date().toISOString() }).eq('id', passId);
      await supabase.from('activity_log').insert({
        event_id: eventId,
        action: `Pass scanned at ${decodedGateId} ${isOverride ? '(Override)' : ''}`,
        type: 'PASS'
      });
    } else {
      // In a real app, queue this in localStorage to sync later
      console.log("Offline: Pass validation queued.");
    }
  };

  const reportGateStatus = async (status: string) => {
    setCurrentGateStatus(status);
    setShowBlockConfirm(false);
    setShiftStats(s => ({ ...s, reports: s.reports + 1, lastReport: `${new Date().toLocaleTimeString()} — ${status}` }));

    if (!isOffline) {
      try {
        // Update events.gate_status JSONB field
        const { data: eventData } = await supabase.from('events').select('gate_status').eq('id', eventId).single();
        const newGateStatus = { ...(eventData?.gate_status || {}) };
        newGateStatus[decodedGateId] = status;
        await supabase.from('events').update({ gate_status: newGateStatus }).eq('id', eventId);

        // Also log to Activity Log for organizer dashboard
        await supabase.from('activity_log').insert({
          event_id: eventId,
          action: `Gate ${decodedGateId} reported status: ${status}`,
          type: 'SYSTEM'
        });
      } catch (e) {
        console.error('Failed to report gate status:', e);
      }
    }
  };

  if (!event) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-go border-t-transparent rounded-full animate-spin" /></div>;
  }

  const isPaused = event.status === 'PAUSED';
  const passesThroughGate = Object.values(passesCache).filter(p => p.gate_id === decodedGateId && p.status === 'USED').length;

  return (
    <div className="min-h-screen bg-background text-white pb-24 relative">
      {/* Flash Overlay */}
      {flashColor && (
        <div className={`fixed inset-0 z-50 pointer-events-none ${flashColor} opacity-50 animate-pulse`} />
      )}

      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-amber-500 text-background font-bold px-4 py-2 flex items-center justify-center gap-2 text-sm sticky top-0 z-40">
          <WifiOff className="w-4 h-4" /> LOW SIGNAL — Using offline cache
        </div>
      )}

      {/* ① GATE HEADER */}
      <header className={`p-4 md:p-6 border-b-4 ${isPaused ? 'bg-amber-500 border-amber-600 text-background' : 'bg-surface border-white/10'}`}>
        <div className="font-timer tracking-widest text-lg md:text-xl mb-2 md:mb-4 opacity-80">🎫 FLOWPASS</div>
        <h1 className="text-3xl md:text-4xl font-heading font-bold uppercase mb-1">{decodedGateId}</h1>
        <p className="text-sm opacity-80 mb-3 md:mb-4">{event.name} · {new Date(event.date).toLocaleDateString()}</p>
        
        {isPaused ? (
          <div className="font-bold text-lg flex items-start gap-2">
            <PauseCircle className="w-6 h-6 shrink-0" />
            <div>
              <p className="text-2xl mb-1">ALL EXITS PAUSED</p>
              <p className="text-sm opacity-90">Do not let anyone through. Wait for organiser to resume.</p>
            </div>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 bg-stop/20 text-stop px-3 py-1.5 rounded-full text-sm font-bold border border-stop/30">
            <div className="w-2 h-2 rounded-full bg-stop animate-pulse" />
            EXIT MODE ACTIVE
          </div>
        )}
      </header>

      {/* Validation Result Overlay */}
      {validationResult && (
        <div className="fixed inset-0 z-40 bg-background flex flex-col">
          {validationResult.type === 'VALID' && (
            <div className="flex-1 bg-[#0A2E1A] p-6 flex flex-col">
              <div className="flex items-center gap-3 text-go font-bold text-2xl mb-8 mt-4">
                <CheckCircle2 className="w-8 h-8" /> LET THROUGH
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                <h2 className="text-4xl font-heading font-bold mb-2 uppercase">{validationResult.pass.attendee_name}</h2>
                <p className="text-xl text-dim mb-6">{validationResult.zone.name} · {validationResult.pass.gate_id} · {validationResult.pass.seat_number}</p>
                <div className="text-sm text-dim border-t border-white/10 pt-4">
                  Pass: ...{validationResult.pass.id.slice(-6).toUpperCase()}
                </div>
              </div>
              <div className="mt-auto space-y-4">
                <button onClick={() => confirmPass(validationResult.pass.id)} className="w-full py-6 bg-go text-background font-black text-2xl rounded-2xl active:scale-95 transition-transform">
                  ✅ Confirm — Mark Passed
                </button>
                <button onClick={() => setValidationResult(null)} className="w-full py-4 bg-surface border border-white/10 font-bold text-xl rounded-2xl">
                  ← Back
                </button>
              </div>
            </div>
          )}

          {validationResult.type === 'NOT_OPEN' && (
            <div className="flex-1 bg-[#2E0A0A] p-6 flex flex-col">
              <div className="flex items-center gap-3 text-stop font-bold text-2xl mb-8 mt-4">
                <XCircle className="w-8 h-8" /> ASK TO WAIT
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                <h2 className="text-3xl font-heading font-bold mb-2 uppercase">{validationResult.pass.attendee_name}</h2>
                <p className="text-lg text-dim mb-6">{validationResult.zone?.name || 'Unknown Zone'} · {validationResult.pass.seat_number}</p>
                
                <div className="bg-black/30 rounded-xl p-4 mb-4">
                  <p className="text-sm text-dim mb-1 font-bold">WHY:</p>
                  <p className="text-lg">Zone hasn't opened yet.</p>
                  {validationResult.zone && (
                    <p className="text-go font-bold mt-1">Opens at {new Date(validationResult.zone.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  )}
                </div>

                <div className="bg-stop/20 border border-stop/30 rounded-xl p-4">
                  <p className="text-sm text-stop mb-1 font-bold">WHAT TO SAY:</p>
                  <p className="text-lg leading-tight">"Your zone opens at {validationResult.zone ? new Date(validationResult.zone.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'later'}. Please check your FlowPass app and wait for the green signal."</p>
                </div>
              </div>
              <div className="mt-auto">
                <button onClick={() => setValidationResult(null)} className="w-full py-6 bg-surface border border-white/10 font-bold text-xl rounded-2xl active:scale-95 transition-transform">
                  ← Back — Check Another
                </button>
              </div>
            </div>
          )}

          {validationResult.type === 'USED' && (
            <div className="flex-1 bg-[#2E1A0A] p-6 flex flex-col">
              <div className="flex items-center gap-3 text-amber-500 font-bold text-2xl mb-8 mt-4">
                <AlertTriangle className="w-8 h-8" /> ALREADY USED
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                <h2 className="text-3xl font-heading font-bold mb-2 uppercase">{validationResult.pass.attendee_name}</h2>
                <p className="text-lg text-dim mb-6">{validationResult.pass.seat_number}</p>
                
                <div className="bg-black/30 rounded-xl p-4 mb-4">
                  <p className="text-lg text-amber-500 font-bold">This pass was already used:</p>
                  <p className="text-xl mt-1">{validationResult.pass.gate_id} — {new Date(validationResult.pass.exited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>

                <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4">
                  <p className="text-sm text-amber-500 mb-1 font-bold">WHAT TO SAY:</p>
                  <p className="text-lg leading-tight">"This pass was already scanned. Please contact event staff if you believe this is an error."</p>
                </div>
              </div>
              <div className="mt-auto">
                <button onClick={() => setValidationResult(null)} className="w-full py-6 bg-surface border border-white/10 font-bold text-xl rounded-2xl active:scale-95 transition-transform">
                  ← Back — Check Another
                </button>
              </div>
            </div>
          )}

          {validationResult.type === 'WRONG_GATE' && (
            <div className="flex-1 bg-[#2E1A0A] p-6 flex flex-col">
              <div className="flex items-center gap-3 text-amber-500 font-bold text-2xl mb-8 mt-4">
                <AlertTriangle className="w-8 h-8" /> WRONG GATE
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                <h2 className="text-3xl font-heading font-bold mb-2 uppercase">{validationResult.pass.attendee_name}</h2>
                <p className="text-lg text-dim mb-6">{validationResult.pass.seat_number}</p>
                
                <div className="bg-black/30 rounded-xl p-4 mb-4">
                  <p className="text-sm text-dim mb-1 font-bold">THEIR ASSIGNED GATE IS:</p>
                  <p className="text-3xl font-bold text-amber-500">{validationResult.pass.gate_id}</p>
                </div>

                <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4">
                  <p className="text-sm text-amber-500 mb-1 font-bold">WHAT TO SAY:</p>
                  <p className="text-lg leading-tight">"Your pass is for {validationResult.pass.gate_id}. Please head to that exit."</p>
                </div>
              </div>
              <div className="mt-auto space-y-4">
                <button onClick={() => confirmPass(validationResult.pass.id, true)} className="w-full py-4 bg-surface border border-amber-500/50 text-amber-500 font-bold text-lg rounded-2xl active:scale-95 transition-transform">
                  ✅ Let Through Anyway (Override)
                </button>
                <button onClick={() => setValidationResult(null)} className="w-full py-6 bg-amber-500 text-background font-black text-xl rounded-2xl active:scale-95 transition-transform">
                  ← Direct to Correct Gate
                </button>
              </div>
            </div>
          )}

          {validationResult.type === 'NOT_FOUND' && (
            <div className="flex-1 bg-[#2E0A0A] p-6 flex flex-col">
              <div className="flex items-center gap-3 text-stop font-bold text-2xl mb-8 mt-4">
                <XCircle className="w-8 h-8" /> PASS NOT FOUND
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                <p className="text-xl mb-6">No pass found matching: <strong className="text-stop">"{inputCode}"</strong></p>
                
                <div className="bg-black/30 rounded-xl p-4">
                  <p className="text-sm text-dim mb-2 font-bold">WHAT TO DO:</p>
                  <ul className="space-y-2 text-lg list-disc pl-5">
                    <li>Ask attendee to check their pass URL</li>
                    <li>Try entering the code again</li>
                    <li>Direct to the help desk if unsure</li>
                  </ul>
                </div>
              </div>
              <div className="mt-auto">
                <button onClick={() => { setValidationResult(null); setInputCode(''); }} className="w-full py-6 bg-surface border border-white/10 font-bold text-xl rounded-2xl active:scale-95 transition-transform">
                  ← Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <main className="p-4 space-y-8">
        {/* ② ACTIVE ZONES */}
        <section>
          <h2 className="text-xl font-bold mb-1">Zones Active at {decodedGateId}</h2>
          <p className="text-sm text-dim mb-4">Only let through passes from OPEN zones below</p>
          
          <div className="space-y-3" role="list">
            {zones.map(zone => {
              const isCleared = zone.status === 'CLEARED';
              const isHold = zone.status === 'HOLD';
              const isActive = zone.status === 'ACTIVE';
              
              let bg = 'bg-[#2E0A0A] border-stop/30';
              let icon = <div className="w-6 h-6 rounded-full bg-stop flex items-center justify-center text-xs font-bold">!</div>;
              let statusText = 'NOT YET';
              let desc = `Opens at ${new Date(zone.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

              if (isCleared) {
                bg = 'bg-surface border-white/5 opacity-50';
                icon = <CheckCircle2 className="w-6 h-6 text-dim" />;
                statusText = 'CLEARED';
                desc = 'Zone fully cleared';
              } else if (isHold) {
                bg = 'bg-[#2E1A0A] border-amber-500/30';
                icon = <div className="w-6 h-6 rounded-full bg-amber-500 animate-pulse" />;
                statusText = 'ON HOLD';
                desc = 'Zone paused — hold attendees';
              } else if (isActive) {
                bg = 'bg-[#0A2E1A] border-go/50 shadow-[0_0_15px_rgba(0,255,135,0.1)]';
                icon = <CheckCircle2 className="w-6 h-6 text-go" />;
                statusText = 'OPEN';
                desc = 'Let through — zone is active';
              } else {
                // Countdown logic for NOT YET
                const diff = new Date(zone.exit_time).getTime() - now;
                if (diff > 0 && diff < 15 * 60000) { // within 15 mins
                  const m = Math.floor(diff / 60000).toString().padStart(2, '0');
                  const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
                  desc = `Opens in: ${m} : ${s}`;
                }
              }

              return (
                <div key={zone.id} className={`border rounded-2xl p-5 flex items-start gap-4 transition-colors ${bg}`}>
                  <div className="mt-1">{icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xl">{zone.name}</span>
                      <span className={`font-bold ${isActive ? 'text-go' : isHold ? 'text-amber-500' : isCleared ? 'text-dim' : 'text-stop'}`}>
                        {isActive ? '✅ ' : isHold ? '⏸ ' : isCleared ? '' : '🔒 '}{statusText}
                      </span>
                    </div>
                    <p className={`text-sm ${isActive ? 'text-go font-medium' : 'text-dim'}`}>{desc}</p>
                  </div>
                </div>
              );
            })}
            {zones.length === 0 && (
              <div className="bg-surface border border-white/10 rounded-2xl p-6 text-center text-dim">
                No zones assigned to this gate.
              </div>
            )}
          </div>
        </section>

        {/* ③ PEOPLE THROUGH COUNTER */}
        <section className="bg-surface border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 text-center">
          <p className="text-xs md:text-sm font-bold text-dim tracking-widest mb-1 md:mb-2">THROUGH THIS GATE</p>
          <div className="text-5xl md:text-6xl font-timer tracking-widest text-go mb-1">{passesThroughGate.toLocaleString()}</div>
          <p className="text-xs md:text-sm text-dim">people passed</p>
        </section>

        {/* ④ VALIDATE A PASS */}
        <section>
          <h2 className="text-xl font-bold mb-1">Validate a Pass</h2>
          <p className="text-sm text-dim mb-4">Enter short code or seat number</p>
          
          <form onSubmit={handleValidate} className="bg-surface border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6">
            <input
              ref={inputRef}
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="e.g. A1B2C3 or Stand C"
              aria-label="Enter pass short code or seat number"
              aria-required="true"
              className="w-full bg-background border border-white/20 rounded-xl px-4 py-4 md:py-5 text-xl md:text-2xl text-center font-mono uppercase focus:outline-none focus:border-go transition-colors mb-4"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck="false"
            />
            <button 
              type="submit"
              disabled={!inputCode.trim()}
              aria-label="Validate the pass code"
              className="w-full py-5 bg-go text-background font-black text-xl rounded-xl disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-6 h-6" /> Check Pass
            </button>
            
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-dim text-sm font-bold">OR</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button 
              type="button"
              onClick={() => alert("Camera scanning requires HTTPS and permissions. For this preview, please use the manual entry field above.")}
              className="w-full py-4 bg-surface border border-white/20 font-bold text-lg rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" /> Scan QR Code
            </button>
          </form>
        </section>

        {/* ⑤ REPORT THIS GATE */}
        <section>
          <h2 className="text-xl font-bold mb-1">Gate Status</h2>
          <p className="text-sm text-dim mb-4">Tap to update — organiser sees instantly</p>
          
          {showBlockConfirm ? (
            <div className="bg-stop/10 border border-stop/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-stop mb-2">Mark {decodedGateId} as BLOCKED?</h3>
              <p className="text-sm text-white/80 mb-6">This will alert the organiser and trigger automatic zone reassignment. Only use if the gate is truly closed.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowBlockConfirm(false)} className="flex-1 py-4 bg-surface border border-white/20 font-bold rounded-xl">
                  Cancel
                </button>
                <button onClick={() => reportGateStatus('BLOCKED')} className="flex-1 py-4 bg-stop text-white font-bold rounded-xl flex items-center justify-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Yes, Blocked
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button 
                onClick={() => reportGateStatus('CLEAR')}
                className={`w-full p-5 rounded-2xl border-2 flex items-center gap-4 transition-colors text-left ${currentGateStatus === 'CLEAR' ? 'bg-go/10 border-go' : 'bg-surface border-white/5'}`}
              >
                <div className="w-8 h-8 rounded-full bg-go/20 flex items-center justify-center text-go">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-lg">All Clear</div>
                  <div className="text-sm text-dim">Flowing normally</div>
                </div>
                {currentGateStatus === 'CLEAR' && <div className="ml-auto text-go font-bold text-sm">← Selected</div>}
              </button>

              <button 
                onClick={() => reportGateStatus('BUSY')}
                className={`w-full p-5 rounded-2xl border-2 flex items-center gap-4 transition-colors text-left ${currentGateStatus === 'BUSY' ? 'bg-amber-500/10 border-amber-500' : 'bg-surface border-white/5'}`}
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-lg">Getting Busy</div>
                  <div className="text-sm text-dim">Crowds building up</div>
                </div>
                {currentGateStatus === 'BUSY' && <div className="ml-auto text-amber-500 font-bold text-sm">← Selected</div>}
              </button>

              <button 
                onClick={() => setShowBlockConfirm(true)}
                className={`w-full p-5 rounded-2xl border-2 flex items-center gap-4 transition-colors text-left ${currentGateStatus === 'BLOCKED' ? 'bg-stop/10 border-stop' : 'bg-surface border-white/5'}`}
              >
                <div className="w-8 h-8 rounded-full bg-stop/20 flex items-center justify-center text-stop">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-lg">Gate Blocked</div>
                  <div className="text-sm text-dim">Do not send more people here</div>
                </div>
                {currentGateStatus === 'BLOCKED' && <div className="ml-auto text-stop font-bold text-sm">← Selected</div>}
              </button>
            </div>
          )}
        </section>

        {/* ⑥ SHIFT SUMMARY */}
        <section className="bg-surface border border-white/10 rounded-2xl p-6 text-sm">
          <h3 className="font-bold text-dim tracking-widest mb-4 uppercase">Your Shift — {decodedGateId}</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span>Passes checked:</span> <span className="font-bold">{shiftStats.checked}</span></div>
            <div className="flex justify-between text-go"><span>Valid:</span> <span className="font-bold">{shiftStats.valid} ✅</span></div>
            <div className="flex justify-between text-stop"><span>Invalid:</span> <span className="font-bold">{shiftStats.invalid} ❌</span></div>
            <div className="flex justify-between text-amber-500"><span>Overrides used:</span> <span className="font-bold">{shiftStats.overrides} ⚠️</span></div>
          </div>
          <div className="h-px bg-white/10 my-4" />
          <div className="space-y-2 text-dim">
            <div className="flex justify-between"><span>Status reports sent:</span> <span>{shiftStats.reports}</span></div>
            <div className="flex justify-between"><span>Last report:</span> <span>{shiftStats.lastReport}</span></div>
          </div>
        </section>
      </main>
    </div>
  );
}
