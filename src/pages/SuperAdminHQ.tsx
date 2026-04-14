import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ShieldAlert, Zap, Globe, Users, Database, ExternalLink, Activity, Target, Shield, Ticket, Container } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';

const MASTER_KEY = 'FLOW-NEXUS-99';

type Tab = 'EVENTS' | 'USERS' | 'GATES';

export default function SuperAdminHQ() {
  const navigate = useNavigate();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [shake, setShake] = useState(false);
  const isMobile = useIsMobile();

  // Tab State
  const [activeTab, setActiveTab] = useState<Tab>('EVENTS');

  // Dashboard Data State
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [totalPassesCount, setTotalPassesCount] = useState(0);
  const [recentPasses, setRecentPasses] = useState<any[]>([]);

  // Authentication Logic
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === MASTER_KEY) {
      setIsUnlocked(true);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setFailedAttempts(f => f + 1);
      if (failedAttempts + 1 >= 3) {
        navigate('/');
      }
    }
  };

  // Fetch Dashboard Data
  useEffect(() => {
    if (!isUnlocked) return;

    const fetchGlobalData = async () => {
      try {
        const [eventsRes, passesCountRes, recentPassesRes] = await Promise.all([
          supabase.from('events').select('*').order('created_at', { ascending: false }),
          supabase.from('passes').select('*', { count: 'exact', head: true }),
          supabase.from('passes').select(`*, events(name)`).order('created_at', { ascending: false }).limit(100)
        ]);
        
        if (eventsRes.data) setEvents(eventsRes.data);
        if (passesCountRes.count !== null) setTotalPassesCount(passesCountRes.count);
        if (recentPassesRes.data) setRecentPasses(recentPassesRes.data);
      } catch (err) {
        console.error("Failed to fetch HQ data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGlobalData();
    
    // Realtime listeners
    const evSub = supabase.channel('global-hq-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchGlobalData())
      .subscribe();
      
    const passSub = supabase.channel('global-hq-passes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'passes' }, () => fetchGlobalData())
      .subscribe();

    return () => { 
      supabase.removeChannel(evSub);
      supabase.removeChannel(passSub);
    };
  }, [isUnlocked]);

  // If Vault is Locked
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-go/5 via-black to-black pointer-events-none" />
        
        <div className="max-w-md w-full relative z-10 text-center">
          <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(0,255,135,0.1)]">
            <ShieldAlert className="w-10 h-10 text-dim" />
          </div>
          <h1 className="text-3xl font-mono tracking-widest font-bold uppercase mb-2">Restricted Access</h1>
          <p className="text-dim font-mono text-sm mb-12">Enter Master Dispatch Key</p>
          
          <form onSubmit={handleLogin}>
            <motion.div animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.3 }}>
              <input 
                type="password"
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`w-full bg-surface border ${shake ? 'border-stop/50 focus:border-stop' : 'border-white/10 focus:border-go'} rounded-xl px-4 py-4 text-center tracking-[1em] text-xl font-mono focus:outline-none transition-colors mb-6 shadow-inner`}
              />
            </motion.div>
            
            <button type="submit" className="w-full py-4 bg-white/10 hover:bg-white/20 transition-colors rounded-xl font-bold font-mono tracking-widest text-sm uppercase">
              Authenticate
            </button>
          </form>

          {failedAttempts > 0 && (
            <p className="text-stop text-sm font-mono mt-4">
              Access Denied. {3 - failedAttempts} attempts remaining.
            </p>
          )}
        </div>
      </div>
    );
  }

  // --- DASHBOARD CALCULATIONS ---
  const totalCrowd = events.reduce((sum, e) => sum + (Number(e.crowd) || 0), 0);
  const activeEvents = events.filter(e => e.status !== 'COMPLETED');
  const globalGates: { eventName: string, eventId: string, gate: string, status: string }[] = [];
  
  activeEvents.forEach(e => {
    if (e.gates && Array.isArray(e.gates)) {
      e.gates.forEach((gate: string) => {
        // e.gate_status holds LIVE statuses, fallback to WAIT
        const status = e.gate_status && e.gate_status[gate] ? e.gate_status[gate] : 'WAIT';
        globalGates.push({ eventName: e.name, eventId: e.id, gate, status });
      });
    }
  });

  // Chart Data: Last 7 days Crowd Volume
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  
  const chartData = last7Days.map(dateStr => {
    const dailyEvents = events.filter(e => e.created_at.startsWith(dateStr));
    const dailyCrowd = dailyEvents.reduce((sum, e) => sum + (Number(e.crowd) || 0), 0);
    return { date: dateStr, total: dailyCrowd, count: dailyEvents.length };
  });

  const maxChartVal = Math.max(...chartData.map(d => d.total), 1);

  return (
    <div className="min-h-screen bg-background text-white font-body selection:bg-go/30 pb-24">
      {/* HEADER */}
      <header className="border-b border-white/5 bg-surface/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-go text-background rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,255,135,0.3)] shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="font-heading font-bold text-xl leading-none mb-1 text-transparent bg-clip-text bg-gradient-to-r from-go to-emerald-500">
                GLOBAL COMMAND
              </div>
              <div className="font-mono text-xs text-dim tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-go animate-pulse" /> TARGET: OMISCIENT
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl">
            {(['EVENTS', 'USERS', 'GATES'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-colors ${
                  activeTab === tab ? 'bg-white/10 text-white' : 'text-dim hover:text-white/80'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button onClick={() => navigate('/')} className="text-sm font-bold text-dim hover:text-white transition-colors hidden md:block">
            Exit HQ
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-24">
          <div className="w-10 h-10 border-4 border-go border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <main className={`max-w-7xl mx-auto ${isMobile ? 'px-4 pt-6' : 'px-6 pt-12'} space-y-8 ${isMobile ? 'pb-12' : 'pb-0'}`}>
          
          {/* KPI ROW */}
          <div className={`grid ${isMobile ? 'grid-cols-2' : 'md:grid-cols-4'} gap-4`}>
            <div className={`bg-surface border border-white/10 ${isMobile ? 'p-4' : 'p-6'} rounded-2xl relative overflow-hidden group hover:border-go/30 transition-colors`}>
              <div className="absolute -right-4 -top-4 text-white/5 w-24 h-24 transform group-hover:scale-110 transition-transform"><Database className="w-full h-full" /></div>
              <p className="font-mono text-xs text-dim tracking-widest mb-2 relative z-10">TOTAL EVENTS</p>
              <div className={`${isMobile ? 'text-3xl' : 'text-5xl'} font-timer text-white relative z-10`}>{events.length.toLocaleString()}</div>
            </div>
            
            <div className={`bg-surface border border-white/10 ${isMobile ? 'p-4' : 'p-6'} rounded-2xl relative overflow-hidden group hover:border-go/30 transition-colors`}>
              <div className="absolute -right-4 -top-4 text-go/5 w-24 h-24 transform group-hover:scale-110 transition-transform"><Users className="w-full h-full" /></div>
              <p className="font-mono text-xs text-dim tracking-widest mb-2 relative z-10">USERS HANDLED</p>
              <div className={`${isMobile ? 'text-3xl' : 'text-5xl'} font-timer text-go relative z-10`}>{totalCrowd.toLocaleString()}</div>
            </div>
            
            <div className={`bg-surface border border-white/10 ${isMobile ? 'p-4' : 'p-6'} rounded-2xl relative overflow-hidden group hover:border-go/30 transition-colors`}>
              <div className="absolute -right-4 -top-4 text-white/5 w-24 h-24 transform group-hover:scale-110 transition-transform"><Ticket className="w-full h-full" /></div>
              <p className="font-mono text-xs text-dim tracking-widest mb-2 relative z-10">PASSES ISSUED</p>
              <div className={`${isMobile ? 'text-3xl' : 'text-5xl'} font-timer text-white relative z-10`}>{totalPassesCount.toLocaleString()}</div>
            </div>

            <div className={`bg-surface border border-go/30 ${isMobile ? 'p-4' : 'p-6'} rounded-2xl relative overflow-hidden shadow-[0_0_30px_rgba(0,255,135,0.05)]`}>
               <div className="absolute -right-4 -top-4 text-go/10 w-24 h-24"><Shield className="w-full h-full" /></div>
               <p className="font-mono text-xs text-go tracking-widest mb-2 relative z-10">GLOBAL GATES</p>
               <div className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-heading font-bold text-white relative z-10 mb-1`}>{globalGates.length} ONLINE</div>
               <p className="text-xs text-dim font-mono relative z-10">Staff points deployed</p>
            </div>
          </div>

          {/* TAB: EVENTS */}
          {activeTab === 'EVENTS' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${isMobile ? 'space-y-6' : 'grid lg:grid-cols-3 gap-8'}`}>
              <div className={`${isMobile ? '' : 'lg:col-span-2'} space-y-6`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Target className="w-5 h-5 text-go" /> Global Event Pulse
                  </h2>
                </div>

                <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white/5 font-mono text-dim text-xs uppercase tracking-wider">
                        <tr>
                          <th className="p-4 rounded-tl-2xl">Status</th>
                          <th className="p-4">Event Name</th>
                          <th className="p-4">Expected Crowd</th>
                          <th className="p-4">Security</th>
                          <th className="p-4 text-right rounded-tr-2xl">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {events.slice(0, 10).map((event) => {
                          const isActive = event.status !== 'COMPLETED';
                          return (
                            <tr key={event.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold ${isActive ? 'bg-go/20 text-go' : 'bg-white/5 text-dim'}`}>
                                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-go animate-pulse"/>}
                                  {isActive ? 'ACTIVE' : 'ENDED'}
                                </span>
                              </td>
                              <td className="p-4 font-bold">{event.name}</td>
                              <td className="p-4 font-mono text-dim">{Number(event.crowd).toLocaleString()}</td>
                              <td className="p-4">
                                {event.pin ? (
                                  <span className="inline-flex px-2 py-1 bg-white/5 border border-white/10 rounded items-center gap-2 text-xs font-mono text-dim">
                                    <Lock className="w-3 h-3" />
                                    <span>{event.pin}</span>
                                  </span>
                                ) : (
                                  <span className="text-xs text-dim/50">Open</span>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                <Link 
                                  to={`/organizer/${event.id}`}
                                  className="inline-flex items-center gap-1 text-dim hover:text-go transition-colors font-bold text-xs uppercase tracking-wider"
                                >
                                  View Dash <ExternalLink className="w-3 h-3"/>
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                        {events.length === 0 && (
                          <tr><td colSpan={5} className="p-8 text-center text-dim font-mono">No global events detected.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-go" /> 7-Day Network Load
                </h2>
                
                <div className={`bg-surface border border-white/10 rounded-2xl p-4 sm:p-6 ${isMobile ? 'h-[250px]' : 'h-[400px]'} flex flex-col shadow-2xl`}>
                  <div className="flex-1 flex items-end justify-between gap-2 pt-8 relative">
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 opacity-20">
                      <div className="border-t border-white/20 w-full" />
                      <div className="border-t border-white/20 w-full" />
                      <div className="border-t border-white/20 w-full" />
                      <div className="border-t border-white/20 w-full" />
                    </div>

                    {chartData.map((data, i) => {
                      const heightPercent = (data.total / maxChartVal) * 100;
                      return (
                        <div key={data.date} className="relative flex-1 flex flex-col justify-end items-center group h-full z-10 pb-8">
                          <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-white/10 rounded px-2 py-1 text-xs font-mono text-center pointer-events-none whitespace-nowrap">
                            <span className="text-go font-bold">{data.total.toLocaleString()}</span> pax
                            <br />{data.count} events
                          </div>
                          
                          <motion.div 
                            className="w-full bg-gradient-to-t from-go/20 to-go/80 rounded-t-lg relative border-t border-go"
                            initial={{ height: 0 }}
                            animate={{ height: `${heightPercent || 2}%` }}
                            transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                          />
                          <div className="absolute bottom-0 text-[10px] font-mono text-dim uppercase rotate-45 origin-left translate-y-4">
                            {new Date(data.date).toLocaleDateString([], { weekday: 'short' })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: USERS (LIVE TICKER) */}
          {activeTab === 'USERS' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Ticket className="w-5 h-5 text-go" /> Global Pass Ticker (Latest 100 Users)
              </h2>
              <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 font-mono text-dim text-xs uppercase tracking-wider">
                      <tr>
                        <th className="p-4 rounded-tl-2xl">Timestamp</th>
                        <th className="p-4">User Name</th>
                        <th className="p-4">Target Event</th>
                        <th className="p-4">Assigned Info</th>
                        <th className="p-4 text-right rounded-tr-2xl">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <AnimatePresence>
                        {recentPasses.map((pass) => (
                          <motion.tr 
                            key={pass.id} 
                            initial={{ opacity: 0, backgroundColor: 'rgba(0,255,135,0.2)' }}
                            animate={{ opacity: 1, backgroundColor: 'transparent' }}
                            className="hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="p-4 font-mono text-xs text-dim">
                              {new Date(pass.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="p-4 font-bold">{pass.attendee_name || 'Anonymous User'}</td>
                            <td className="p-4 text-dim">{pass.events?.name || 'Unknown Event'}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-xs font-mono">{pass.seat_number}</span>
                                <span className="text-dim">→</span>
                                <span className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-xs font-mono">{pass.gate_id}</span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                pass.status === 'LOCKED' ? 'bg-stop/20 text-stop' :
                                pass.status === 'SCANNED' ? 'bg-wait/20 text-wait' :
                                'bg-go/20 text-go'
                              }`}>
                                {pass.status}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                      {recentPasses.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-dim font-mono">No users have registered yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: GATES & STAFF */}
          {activeTab === 'GATES' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Container className="w-5 h-5 text-go" /> Global Staff Deployment Matrix
              </h2>
              
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'} gap-4 sm:gap-6`}>
                {globalGates.length > 0 ? globalGates.map((g, idx) => (
                  <div key={`${g.eventId}-${g.gate}-${idx}`} className="bg-surface border border-white/10 p-6 rounded-2xl flex flex-col gap-4 shadow-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold font-mono tracking-wider">{g.gate}</h3>
                        <p className="text-dim text-sm truncate max-w-[200px]">{g.eventName}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold font-mono ${
                        g.status === 'GO' ? 'bg-go/20 text-go' :
                        g.status === 'WAIT' ? 'bg-wait/20 text-wait' :
                        g.status === 'STOP' ? 'bg-stop/20 text-stop' :
                        'bg-white/5 text-dim' // 'COMPLETED' or other
                      }`}>
                        {g.status}
                      </span>
                    </div>
                    
                    <div className="pt-4 border-t border-white/5 flex gap-2">
                      <Link 
                        to={`/gate/${g.eventId}/${g.gate}`}
                        className="flex-1 text-center bg-white/5 hover:bg-white/10 border border-white/10 rounded py-2 text-xs font-bold tracking-widest uppercase transition-colors"
                      >
                        Inspect Node
                      </Link>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full bg-surface border border-white/10 p-12 rounded-2xl text-center shadow-lg">
                    <Shield className="w-12 h-12 text-dim mx-auto mb-4" />
                    <h3 className="text-xl font-heading mb-2">No Active Gate Nodes</h3>
                    <p className="text-dim font-mono text-sm tracking-widest">AWAITING ZERO-HOUR</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </main>
      )}
    </div>
  );
}
