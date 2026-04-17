/**
 * FlowPass — Create Event Page
 *
 * Multi-step wizard for organizers to configure a new event:
 * venue details → gate/zone mapping → live schedule preview → launch.
 * Generates zones, gates, and the Supabase event record on launch.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  CheckCircle2, Circle, Clock, Users, MapPin, 
  Calendar, Plus, X, ChevronRight, ChevronLeft, Copy, ExternalLink, Download,
  Radio, Monitor, Smartphone, Zap, ScanLine
} from 'lucide-react';
import { generateSchedule, calculateGateLoads } from '../lib/zoneAlgorithm';
import { supabase } from '../lib/supabase';
import { QRCodeCanvas } from 'qrcode.react';
import { sanitizeEventField } from '../lib/sanitize';
import DatePicker from '../components/ui/DatePicker';
import TimePicker from '../components/ui/TimePicker';
import { trackEvent } from '../lib/analytics';

interface EventDraft {
  eventName: string;
  venueName: string;
  date: string;
  endTime: string;
  totalCrowd: number | '';
  numZones: number;
  gates: string[];
  zoneGateMap: Record<string, string[]>;
  manualGap: number | null;
  pin: string;
}

const defaultDraft: EventDraft = {
  eventName: '',
  venueName: '',
  date: '',
  endTime: '22:00',
  totalCrowd: '',
  numZones: 4,
  gates: ['Gate 1', 'Gate 2', 'Gate 3'],
  zoneGateMap: { 'A': ['Gate 1', 'Gate 2'], 'B': ['Gate 2', 'Gate 3'], 'C': ['Gate 1'], 'D': ['Gate 3'] },
  manualGap: null,
  pin: ''
};

export default function CreateEvent() {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<EventDraft>(() => {
    const saved = localStorage.getItem('flowpass_draft');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return defaultDraft;
  });
  const [eventId, setEventId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://flowpass.app';
  const displayOrigin = baseOrigin.replace(/^https?:\/\//, '');

  const handleCopy = (link: string, type: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleDownloadQR = () => {
    const canvas = document.getElementById("attendee-qr-code") as HTMLCanvasElement;
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `flowpass-${draft.eventName.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  useEffect(() => {
    localStorage.setItem('flowpass_draft', JSON.stringify(draft));
  }, [draft]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const updateDraft = (updates: Partial<EventDraft>) => {
    setDraft(prev => ({ ...prev, ...updates }));
  };

  const toggleGateForZone = (zoneId: string, gate: string) => {
    setDraft(prev => {
      const currentGates = prev.zoneGateMap[zoneId] || [];
      const newGates = currentGates.includes(gate)
        ? currentGates.filter(g => g !== gate)
        : [...currentGates, gate];
      return { ...prev, zoneGateMap: { ...prev.zoneGateMap, [zoneId]: newGates } };
    });
  };

  const addGate = () => {
    const newGate = `Gate ${draft.gates.length + 1}`;
    updateDraft({ gates: [...draft.gates, newGate] });
  };

  const removeGate = (gateToRemove: string) => {
    const newGates = draft.gates.filter(g => g !== gateToRemove);
    const newMap = { ...draft.zoneGateMap };
    Object.keys(newMap).forEach(z => {
      newMap[z] = newMap[z].filter(g => g !== gateToRemove);
    });
    updateDraft({ gates: newGates, zoneGateMap: newMap });
  };

  const isStep1Valid = draft.eventName && draft.venueName && draft.date && draft.endTime && Number(draft.totalCrowd) > 0 && draft.pin && draft.pin.length >= 4;
  
  const schedule = generateSchedule(draft.endTime, draft.date, Number(draft.totalCrowd) || 0, draft.numZones, draft.zoneGateMap);
  const gateLoads = calculateGateLoads(Number(draft.totalCrowd) || 0, draft.numZones, draft.gates, draft.zoneGateMap);

  const [isLaunching, setIsLaunching] = useState(false);
  const [_launchError, setLaunchError] = useState<string | null>(null);
  const [_step1Errors, _setStep1Errors] = useState<Record<string, string>>({});

  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      // 1. Create the Event record
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          name: sanitizeEventField(draft.eventName),
          venue: sanitizeEventField(draft.venueName),
          date: draft.date,
          end_time: draft.endTime,
          crowd: Number(draft.totalCrowd),
          gates: draft.gates,
          pin: draft.pin,
          gate_status: {
            __mapping: draft.zoneGateMap
          }
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // 2. Create the Zone records
      const zonesToInsert = schedule.map(zone => ({
        event_id: eventData.id,
        name: zone.name,
        status: 'WAIT', // FORCING WAIT STATUS to prevent cached ACTIVE values from triggering early unlock
        exit_time: zone.exitTime,
        gates: zone.gates,
        estimated_people: zone.estimatedPeople
      }));

      const { error: zonesError } = await supabase
        .from('zones')
        .insert(zonesToInsert);

      if (zonesError) throw zonesError;

      // Success!
      trackEvent({
        action: 'event_created',
        category: 'engagement',
        label: eventData.name,
        value: Number(draft.totalCrowd)
      });

      setEventId(eventData.id);
      localStorage.removeItem('flowpass_draft');
      setStep(4);
    } catch (error) {
      console.error('[CreateEvent] Error launching event:', error);
      setLaunchError('Failed to launch event. Please check your connection and try again.');
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white font-body pb-24">
      {/* PROGRESS BAR */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-white/10 pt-4 md:pt-6 pb-3 md:pb-4 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {step > 1 ? <CheckCircle2 className="w-5 h-5 text-go" /> : <Circle className="w-5 h-5 text-go fill-go/20" />}
              <span className={`text-xs md:text-sm font-bold ${step >= 1 ? 'text-white' : 'text-dim'}`}>Details</span>
            </div>
            <div className={`flex-1 h-px mx-2 md:mx-4 ${step > 1 ? 'bg-go' : 'bg-white/10'}`} />
            <div className="flex items-center gap-2">
              {step > 2 ? <CheckCircle2 className="w-5 h-5 text-go" /> : (step === 2 ? <Circle className="w-5 h-5 text-go fill-go/20" /> : <Circle className="w-5 h-5 text-dim" />)}
              <span className={`text-xs md:text-sm font-bold ${step >= 2 ? 'text-white' : 'text-dim'}`}>Zones</span>
            </div>
            <div className={`flex-1 h-px mx-2 md:mx-4 ${step > 2 ? 'bg-go' : 'bg-white/10'}`} />
            <div className="flex items-center gap-2">
              {step > 3 ? <CheckCircle2 className="w-5 h-5 text-go" /> : (step === 3 ? <Circle className="w-5 h-5 text-go fill-go/20" /> : <Circle className="w-5 h-5 text-dim" />)}
              <span className={`text-xs md:text-sm font-bold ${step >= 3 ? 'text-white' : 'text-dim'}`}>Launch</span>
            </div>
          </div>
          <div className="text-center text-xs text-dim font-mono uppercase tracking-widest mt-4">
            Step {Math.min(step, 3)} of 3
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6 md:pt-12">
        {/* STEP 1: EVENT DETAILS */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
            <div className="text-center mb-8 md:mb-12">
              <h1 className="text-3xl md:text-4xl font-heading font-bold mb-3 md:mb-4">Create Your Event</h1>
              <p className="text-dim text-lg">Tell us about your event and we'll build the safest exit plan for it.</p>
            </div>

            <div className="space-y-6">
              <div className="bg-card border border-white/5 p-6 rounded-2xl">
                <label className="block text-sm font-bold mb-2 flex items-center justify-between">
                  Event Name *
                  {draft.eventName && <CheckCircle2 className="w-4 h-4 text-go" />}
                </label>
                <input 
                  type="text" 
                  value={draft.eventName}
                  onChange={e => updateDraft({ eventName: e.target.value })}
                  placeholder="e.g. IPL 2026 — MI vs CSK"
                  className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-dim/50 focus:outline-none focus:border-go transition-colors"
                />
                <p className="text-xs text-dim mt-2">Use a clear name attendees will recognise on their pass</p>
              </div>

              <div className="bg-card border border-white/5 p-6 rounded-2xl">
                <label className="block text-sm font-bold mb-2 flex items-center justify-between">
                  Venue Name *
                  {draft.venueName && <CheckCircle2 className="w-4 h-4 text-go" />}
                </label>
                <input 
                  type="text" 
                  value={draft.venueName}
                  onChange={e => updateDraft({ venueName: e.target.value })}
                  placeholder="e.g. Wankhede Stadium, Mumbai"
                  className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-dim/50 focus:outline-none focus:border-go transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-card border border-white/5 p-6 rounded-2xl">
                  <label className="block text-sm font-bold mb-2 flex items-center justify-between">
                    Event Date *
                    {draft.date && <CheckCircle2 className="w-4 h-4 text-go" />}
                  </label>
                  <DatePicker 
                    value={draft.date}
                    onChange={date => updateDraft({ date })}
                  />
                </div>
                <div className="bg-card border border-white/5 p-6 rounded-2xl">
                  <label className="block text-sm font-bold mb-2 flex items-center justify-between">
                    Event End Time *
                    {draft.endTime && <CheckCircle2 className="w-4 h-4 text-go" />}
                  </label>
                  <TimePicker 
                    value={draft.endTime}
                    onChange={time => updateDraft({ endTime: time })}
                  />
                </div>
              </div>

              <div className="bg-card border border-white/5 p-6 rounded-2xl">
                <label className="block text-sm font-bold mb-2 flex items-center justify-between">
                  Total Expected Crowd *
                  {Number(draft.totalCrowd) > 0 && <CheckCircle2 className="w-4 h-4 text-go" />}
                </label>
                <input 
                  type="number" 
                  value={draft.totalCrowd}
                  onChange={e => updateDraft({ totalCrowd: e.target.value ? Number(e.target.value) : '' })}
                  placeholder="e.g. 45000"
                  className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-dim/50 focus:outline-none focus:border-go transition-colors mb-4 text-xl font-mono"
                />
                <div className="flex flex-wrap gap-2 mb-4">
                  <button onClick={() => updateDraft({ totalCrowd: 5000 })} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs border border-white/10 transition-colors">Small — 5,000</button>
                  <button onClick={() => updateDraft({ totalCrowd: 20000 })} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs border border-white/10 transition-colors">Medium — 20,000</button>
                  <button onClick={() => updateDraft({ totalCrowd: 50000 })} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs border border-white/10 transition-colors">Large — 50,000</button>
                </div>
                <p className="text-xs text-dim">Include all stands, VIP, and staff. We use this to calculate safe exit timings.</p>
              </div>

              <div className="bg-card border border-white/5 p-6 rounded-2xl">
                <label className="block text-sm font-bold mb-2 flex items-center justify-between">
                  Security PIN (4-10 chars) *
                  {draft.pin && draft.pin.length >= 4 && <CheckCircle2 className="w-4 h-4 text-go" />}
                </label>
                <input 
                  type="text" 
                  value={draft.pin}
                  onChange={e => updateDraft({ pin: e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 10) })}
                  placeholder="e.g. 1234 or FLW-1"
                  className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-dim/50 focus:outline-none focus:border-go transition-colors font-mono uppercase"
                />
                <p className="text-xs text-dim mt-2">Attendees must enter this PIN to access the event registration.</p>
              </div>
            </div>

            <div className="mt-12 flex justify-end">
              <button 
                onClick={() => setStep(2)}
                disabled={!isStep1Valid}
                className="px-8 py-4 bg-white text-background font-bold rounded-lg hover:bg-white/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Zones & Gates <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: ZONES & GATES */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            <div>
              <div className="mb-8">
                <h1 className="text-3xl font-heading font-bold mb-2">Set Up Zones & Gates</h1>
                <p className="text-dim">Define how your venue is divided and which gates each zone uses.</p>
              </div>

              <div className="space-y-6">
                {/* Number of Zones */}
                <div className="bg-card border border-white/5 p-6 rounded-2xl">
                  <label className="block text-sm font-bold mb-6">Number of Zones</label>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-dim font-mono">2</span>
                    <input 
                      type="range" 
                      min="2" max="10" 
                      value={draft.numZones}
                      onChange={e => updateDraft({ numZones: Number(e.target.value) })}
                      className="flex-1 accent-go"
                    />
                    <span className="text-dim font-mono">10</span>
                  </div>
                  <div className="text-center font-bold text-xl text-go mb-2">{draft.numZones} Zones</div>
                  <p className="text-xs text-dim text-center">Auto-labels: {Array.from({length: draft.numZones}).map((_, i) => String.fromCharCode(65 + i)).join(' ')}</p>
                </div>

                {/* Gate Names */}
                <div className="bg-card border border-white/5 p-6 rounded-2xl">
                  <label className="block text-sm font-bold mb-4">Gate Names</label>
                  <div className="flex flex-wrap gap-3 mb-4">
                    {draft.gates.map(gate => (
                      <div key={gate} className="flex items-center gap-2 bg-background border border-white/10 px-3 py-1.5 rounded-lg text-sm">
                        {gate}
                        <button onClick={() => removeGate(gate)} className="text-dim hover:text-stop transition-colors"><X className="w-4 h-4"/></button>
                      </div>
                    ))}
                    <button onClick={addGate} className="flex items-center gap-1 text-sm text-go hover:text-white transition-colors px-3 py-1.5">
                      <Plus className="w-4 h-4"/> Add Gate
                    </button>
                  </div>
                </div>

                {/* Assign Gates */}
                <div className="bg-card border border-white/5 p-6 rounded-2xl">
                  <label className="block text-sm font-bold mb-6">Assign Gates to Zones</label>
                  <div className="space-y-6">
                    {Array.from({ length: draft.numZones }).map((_, i) => {
                      const zoneId = String.fromCharCode(65 + i);
                      return (
                        <div key={zoneId} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                          <div className="text-sm font-bold mb-3 flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center font-mono text-xs">{zoneId}</div>
                            Zone {zoneId}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {draft.gates.map(gate => {
                              const isSelected = draft.zoneGateMap[zoneId]?.includes(gate);
                              return (
                                <button
                                  key={gate}
                                  onClick={() => toggleGateForZone(zoneId, gate)}
                                  className={`px-3 py-1.5 rounded text-sm border transition-colors ${isSelected ? 'bg-go/20 border-go text-go' : 'bg-background border-white/10 text-dim hover:bg-white/10'}`}
                                >
                                  {gate}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Gate Load Visualizer */}
                <div className="bg-card border border-white/5 p-6 rounded-2xl">
                  <label className="block text-sm font-bold mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-go" /> Gate Load Balance
                  </label>
                  <div className="space-y-3">
                    {draft.gates.map(gate => {
                      const load = gateLoads[gate] || 0;
                      const maxLoad = Math.max(...Object.values(gateLoads), 1);
                      const percentage = (load / maxLoad) * 100;
                      const isOverloaded = load > (Number(draft.totalCrowd) * 0.6); // Warning if one gate handles > 60%
                      
                      return (
                        <div key={gate}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-mono">{gate}</span>
                            <span className="text-dim">{load.toLocaleString()} people</span>
                          </div>
                          <div className="h-2 bg-background rounded-full overflow-hidden border border-white/5">
                            <div 
                              className={`h-full rounded-full ${isOverloaded ? 'bg-stop' : 'bg-go'}`} 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          {isOverloaded && <p className="text-[10px] text-stop mt-1">⚠️ Dangerously overloaded</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button onClick={() => setStep(1)} className="px-6 py-3 bg-card text-white font-bold rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2 border border-white/10">
                  <ChevronLeft className="w-5 h-5" /> Back
                </button>
                <button onClick={() => setStep(3)} className="px-8 py-3 bg-white text-background font-bold rounded-lg hover:bg-white/90 transition-colors flex items-center gap-2">
                  Next: Review & Launch <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* LIVE PREVIEW PANEL */}
            <div className="lg:sticky lg:top-28 h-fit">
              <div className="bg-[#0A0A0F] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="bg-go/10 border-b border-go/20 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-go font-bold text-sm tracking-widest uppercase">
                    <span className="w-2 h-2 rounded-full bg-go animate-pulse" />
                    Live Exit Schedule
                  </div>
                  <span className="text-xs text-go/70 font-mono">Updates as you type ⚡</span>
                </div>
                
                <div className="p-6 space-y-4">
                  {schedule.map((zone, _i) => (
                    <div key={zone.id} className="flex items-start gap-4 p-4 rounded-xl bg-card border border-white/5">
                      <div className="mt-1">
                        {zone.status === 'ACTIVE' ? <div className="w-3 h-3 rounded-full bg-go shadow-[0_0_10px_rgba(0,255,135,0.5)]" /> : 
                         zone.status === 'WAIT' ? <div className="w-3 h-3 rounded-full bg-wait" /> : 
                         <div className="w-3 h-3 rounded-full bg-stop" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-lg">{zone.name}</span>
                          <span className="font-timer text-xl tracking-wider text-dim">
                            {new Date(zone.exitTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <div className="text-sm text-dim flex items-center gap-2">
                          <MapPin className="w-3 h-3" /> Gates: {zone.gates.length ? zone.gates.join(', ') : 'None assigned'}
                        </div>
                        <div className="text-sm text-dim flex items-center gap-2 mt-1">
                          <Users className="w-3 h-3" /> ~{zone.estimatedPeople.toLocaleString()} people
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="flex items-center gap-2 text-go font-bold mb-2">
                      <CheckCircle2 className="w-5 h-5" /> Estimated full dispersal
                    </div>
                    <div className="font-timer text-3xl tracking-widest mb-1">
                      {new Date(schedule[schedule.length-1]?.exitTime || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <div className="text-sm text-dim">vs. unmanaged exit: 60–90 mins chaos</div>
                    
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-go/10 text-go text-xs font-mono rounded border border-go/20">
                      🧮 Algorithm confidence: HIGH
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: REVIEW & LAUNCH */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-heading font-bold mb-4">Review Your Exit Plan</h1>
              <p className="text-dim text-lg">Everything looks good? Launch when the event ends or schedule it now.</p>
            </div>

            <div className="bg-card border border-white/10 rounded-2xl overflow-hidden mb-8 shadow-2xl">
              <div className="p-6 border-b border-white/10 bg-white/[0.02]">
                <h3 className="font-mono text-sm tracking-widest text-dim uppercase flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Event Summary
                </h3>
              </div>
              <div className="p-6 grid sm:grid-cols-2 gap-6">
                <div>
                  <div className="text-dim text-xs font-mono mb-1">EVENT</div>
                  <div className="font-bold text-lg">{draft.eventName}</div>
                </div>
                <div>
                  <div className="text-dim text-xs font-mono mb-1">VENUE</div>
                  <div className="font-bold text-lg">{draft.venueName}</div>
                </div>
                <div>
                  <div className="text-dim text-xs font-mono mb-1">DATE & TIME</div>
                  <div className="font-bold text-lg">{draft.date} at {draft.endTime}</div>
                </div>
                <div>
                  <div className="text-dim text-xs font-mono mb-1">TOTAL CROWD</div>
                  <div className="font-bold text-lg">{Number(draft.totalCrowd).toLocaleString()} people</div>
                </div>
                <div>
                  <div className="text-dim text-xs font-mono mb-1 text-go">SECURITY PIN</div>
                  <div className="font-bold text-lg font-mono text-go">{draft.pin}</div>
                </div>
              </div>

              <div className="p-6 border-t border-white/10 bg-white/[0.02]">
                <h3 className="font-mono text-sm tracking-widest text-dim uppercase flex items-center gap-2 mb-6">
                  <Clock className="w-4 h-4" /> Zones & Exit Schedule
                </h3>
                <div className="space-y-3">
                  {schedule.map(zone => (
                    <div key={zone.id} className="flex items-center justify-between bg-background p-3 rounded-lg border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${zone.status === 'ACTIVE' ? 'bg-go' : zone.status === 'WAIT' ? 'bg-wait' : 'bg-stop'}`} />
                        <span className="font-bold">{zone.name}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-dim text-sm">{zone.gates.join(', ')}</span>
                        <span className="font-timer text-lg tracking-wider w-20 text-right">
                          {new Date(zone.exitTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-white/10 bg-go/5 flex items-center justify-between">
                <div>
                  <div className="text-go font-bold mb-1 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Algorithm Status: Optimised
                  </div>
                  <div className="text-sm text-dim">Passes to generate: {Number(draft.totalCrowd).toLocaleString()}</div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="px-4 py-2 bg-background border border-white/10 rounded text-sm font-bold hover:bg-white/5 transition-colors">Edit Details</button>
                  <button onClick={() => setStep(2)} className="px-4 py-2 bg-background border border-white/10 rounded text-sm font-bold hover:bg-white/5 transition-colors">Edit Zones</button>
                </div>
              </div>
            </div>

            <div className="bg-card border border-white/10 rounded-2xl p-6 mb-8">
              <h3 className="font-bold mb-4">When do you want exit mode to start?</h3>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 rounded-xl border border-go bg-go/5 cursor-pointer">
                  <input type="radio" name="launchType" defaultChecked className="mt-1 accent-go" />
                  <div>
                    <div className="font-bold text-white">I'll activate manually</div>
                    <div className="text-sm text-dim">Best option — you control timing from the dashboard</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-4 rounded-xl border border-white/10 bg-background cursor-pointer opacity-50">
                  <input type="radio" name="launchType" disabled className="mt-1" />
                  <div>
                    <div className="font-bold text-white">Auto-activate at event end time</div>
                    <div className="text-sm text-dim">Auto-starts at {draft.endTime} (Coming soon)</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="text-center">
              <button 
                onClick={handleLaunch}
                disabled={isLaunching}
                className="w-full py-6 bg-white text-background font-black text-xl rounded-xl hover:bg-white/90 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-70 disabled:transform-none"
              >
                {isLaunching ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    Launching...
                  </span>
                ) : (
                  <>
                    <Zap className="w-6 h-6" /> Launch FlowPass Event
                  </>
                )}
              </button>
              <p className="text-sm text-dim mt-4">This creates your event and generates all attendee passes. You can still edit timings from your dashboard.</p>
            </div>
          </motion.div>
        )}

        {/* STEP 4: SUCCESS SCREEN */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-20 h-20 bg-go/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-go" />
              </div>
              <h1 className="text-4xl font-heading font-bold mb-2">FlowPass is Live!</h1>
              <p className="text-xl text-dim">{draft.eventName} · {draft.venueName}</p>
            </div>

            <div className="bg-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/10 bg-white/[0.02]">
                <p className="text-sm text-dim text-center">Share these 3 links with your team to run the event:</p>
              </div>

              <div className="p-6 border-b border-white/10">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <Radio className="w-5 h-5 text-go" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1 uppercase tracking-wider font-mono text-sm text-dim">Organizer Dashboard</h3>
                    <p className="text-sm text-dim mb-3">Your live control panel to monitor crowds and manage gates.</p>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-background border border-white/10 rounded px-3 py-2 text-sm font-mono text-dim break-all">
                        {displayOrigin}/organizer/{eventId}
                      </div>
                      <button 
                        onClick={() => handleCopy(`${baseOrigin}/organizer/${eventId}`, 'organizer')}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded transition-colors"
                      >
                        {copiedLink === 'organizer' ? <CheckCircle2 className="w-4 h-4 text-go" /> : <Copy className="w-4 h-4"/>}
                      </button>
                      <Link to={`/organizer/${eventId}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white text-background font-bold rounded text-sm hover:bg-white/90 transition-colors flex items-center gap-1">
                        Open <ExternalLink className="w-4 h-4"/>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-b border-white/10">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <Monitor className="w-5 h-5 text-wait" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1 uppercase tracking-wider font-mono text-sm text-dim">Big Screen Display</h3>
                    <p className="text-sm text-dim mb-3">Open this on the projector or LED boards inside the venue.</p>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-background border border-white/10 rounded px-3 py-2 text-sm font-mono text-dim break-all">
                        {displayOrigin}/screen/{eventId}
                      </div>
                      <button 
                        onClick={() => handleCopy(`${baseOrigin}/screen/${eventId}`, 'screen')}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded transition-colors"
                      >
                        {copiedLink === 'screen' ? <CheckCircle2 className="w-4 h-4 text-go" /> : <Copy className="w-4 h-4"/>}
                      </button>
                      <Link to={`/screen/${eventId}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white text-background font-bold rounded text-sm hover:bg-white/90 transition-colors flex items-center gap-1">
                        Open <ExternalLink className="w-4 h-4"/>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-b border-white/10">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5 text-stop" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1 uppercase tracking-wider font-mono text-sm text-dim">Attendee Registration</h3>
                    <p className="text-sm text-dim mb-3">Share via WhatsApp or display at entry gates for attendees to get passes. <br /><span className="text-go font-bold">Important: They will need PIN ({draft.pin}) to access.</span></p>
                    <div className="flex gap-2 mb-6">
                      <div className="flex-1 bg-background border border-white/10 rounded px-3 py-2 text-sm font-mono text-dim break-all">
                        {displayOrigin}/register/{eventId}
                      </div>
                      <button 
                        onClick={() => handleCopy(`${baseOrigin}/register/${eventId}`, 'register')}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded transition-colors"
                      >
                        {copiedLink === 'register' ? <CheckCircle2 className="w-4 h-4 text-go" /> : <Copy className="w-4 h-4"/>}
                      </button>
                      <Link to={`/register/${eventId}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white text-background font-bold rounded text-sm hover:bg-white/90 transition-colors flex items-center gap-1">
                        Open <ExternalLink className="w-4 h-4"/>
                      </Link>
                    </div>

                    <div className="bg-background border border-white/10 rounded-xl p-6 flex items-center gap-6">
                      <div className="w-32 h-32 bg-white rounded-lg p-2 flex items-center justify-center">
                        <QRCodeCanvas 
                          id="attendee-qr-code"
                          value={`${baseOrigin}/register/${eventId}`}
                          size={112}
                          level="H"
                          includeMargin={false}
                        />
                      </div>
                      <div>
                        <h4 className="font-bold mb-2">Print & Display</h4>
                        <p className="text-sm text-dim mb-4">Stick this at every entry gate so attendees can scan it as they walk in.</p>
                        <button onClick={handleDownloadQR} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-sm font-bold transition-colors flex items-center gap-2">
                          <Download className="w-4 h-4"/> Download PNG
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <ScanLine className="w-5 h-5 text-[#4D9FFF]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1 uppercase tracking-wider font-mono text-sm text-dim">Gate Staff Scanners</h3>
                    <p className="text-sm text-dim mb-4">Send these unique links to the security team at each gate. Their smartphones will turn into high-speed QR scanners.</p>
                    
                    <div className="grid sm:grid-cols-2 gap-3">
                      {draft.gates.map((gate) => (
                        <div key={gate} className="bg-background border border-white/10 rounded-xl p-3 flex items-center justify-between shadow-inner">
                          <span className="font-bold text-sm truncate pr-2">{gate}</span>
                          <div className="flex gap-2 shrink-0">
                            <button 
                              onClick={() => handleCopy(`${baseOrigin}/gate/${eventId}/${encodeURIComponent(gate)}`, `gate-${gate}`)}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs transition-colors flex items-center gap-1.5"
                            >
                              {copiedLink === `gate-${gate}` ? <CheckCircle2 className="w-3.5 h-3.5 text-go" /> : <Copy className="w-3.5 h-3.5"/>}
                              Copy
                            </button>
                            <Link 
                              to={`/gate/${eventId}/${encodeURIComponent(gate)}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="px-3 py-1.5 bg-white/10 text-white font-bold rounded text-xs hover:bg-white/20 transition-colors flex items-center gap-1.5"
                            >
                              Open <ExternalLink className="w-3.5 h-3.5"/>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link to={`/organizer/${eventId}`} className="inline-flex items-center gap-2 px-8 py-4 bg-go text-background font-bold rounded-lg hover:bg-go/90 transition-colors text-lg">
                <Radio className="w-5 h-5" /> Go to Organizer Dashboard
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
