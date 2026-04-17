/**
 * FlowPass — Landing Page
 *
 * The public-facing homepage that explains the product, showcases
 * an interactive hero pass card, and provides CTAs for both
 * organisers and attendees.
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Ticket, Radio, Users, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { HERO_CYCLE_INTERVAL_MS } from '../lib/constants';

import ChaosVsCalm from '../components/landing/ChaosVsCalm';
import RolesSwitcher from '../components/landing/RolesSwitcher';
import ScrollTimeline from '../components/landing/ScrollTimeline';
import GlassCard from '../components/landing/GlassCard';

export default function LandingPage() {
  const [passState, setPassState] = useState<'WAIT' | 'ACTIVE'>('WAIT');

  // Auto-cycle the pass state for hero animation
  useEffect(() => {
    const interval = setInterval(() => {
      setPassState(s => s === 'WAIT' ? 'ACTIVE' : 'WAIT');
    }, HERO_CYCLE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col">
      {/* HERO SECTION */}
      <section className="relative pt-8 md:pt-20 pb-12 md:pb-32 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-go/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-dim mb-8">
              <span className="w-2 h-2 rounded-full bg-stop animate-pulse" />
              LIVE · Built for physical event safety
            </div>
            
            <h1 className="text-5xl md:text-7xl font-heading font-extrabold tracking-tight leading-[1.1] mb-6">
              End the<br />
              Post-Event<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-go to-emerald-500">Stampede.</span>
            </h1>

            <p className="text-lg md:text-xl text-dim mb-6 md:mb-10 max-w-lg leading-relaxed">
              Every attendee gets a smart digital exit pass. 33,000 people leave Wankhede in waves — not a life-threatening rush.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8 w-full sm:w-auto">
              <Link to="/create" className="px-8 py-4 bg-white text-background font-bold rounded-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
                <Radio className="w-5 h-5" /> Create Event — I'm an Organizer
              </Link>
              <Link to="/events" className="px-8 py-4 bg-card border border-white/10 text-white font-bold rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                <Ticket className="w-5 h-5" /> Get My Pass — I'm an Attendee
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm text-dim font-medium">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-go shrink-0" /> Free to use</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-go shrink-0" /> No app download</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-go shrink-0" /> Works on any phone</span>
            </div>
          </div>

          {/* Interactive Hero Visual */}
          <div className="relative w-full max-w-sm mx-auto lg:ml-auto">
            <motion.div
              className="bg-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative z-10"
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-2 font-heading font-bold text-lg tracking-tight">
                  <Ticket className="w-5 h-5 text-go" /> FLOWPASS
                </div>
                <span className="text-2xl">🎫</span>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <div className="text-dim text-xs font-mono uppercase tracking-wider">IPL 2026 · Wankhede</div>
                  <div className="font-mono font-bold text-xl mt-1">RAHUL SHARMA</div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 bg-background p-4 rounded-xl border border-white/5">
                    <div className="text-dim text-xs font-mono mb-1">ZONE</div>
                    <div className="font-heading font-bold text-3xl">C</div>
                  </div>
                  <div className="flex-1 bg-background p-4 rounded-xl border border-white/5">
                    <div className="text-dim text-xs font-mono mb-1">GATE</div>
                    <div className="font-heading font-bold text-3xl">2</div>
                  </div>
                </div>

                <motion.div
                  className={`p-5 rounded-xl border flex items-center justify-between transition-colors duration-500 ${passState === 'WAIT' ? 'bg-stop/10 border-stop/30 text-stop' : 'bg-go/10 border-go/30 text-go'}`}
                  layout
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${passState === 'WAIT' ? 'bg-stop' : 'bg-go'} animate-pulse`} />
                    <span className="font-bold tracking-wider text-lg">
                      {passState === 'WAIT' ? 'PLEASE WAIT' : 'GO NOW'}
                    </span>
                  </div>
                  {passState === 'WAIT' && (
                    <span className="font-timer text-3xl tracking-widest">18:32</span>
                  )}
                </motion.div>

                <div className="pt-4 flex justify-center">
                   <div className="bg-white p-3 rounded-lg inline-block">
                     <QRCodeSVG value="https://flowpass.app/pass/demo" size={80} level="L" />
                   </div>
                </div>
              </div>
            </motion.div>

            {/* Interactive Toggle */}
            <div className="absolute -right-8 md:-right-16 top-1/2 -translate-y-1/2 bg-card border border-white/10 p-4 rounded-xl shadow-2xl z-20 hidden sm:block">
              <div className="text-[10px] text-dim mb-3 font-mono uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-go animate-pulse" />
                Live Simulator
              </div>
              <button
                onClick={() => setPassState(s => s === 'WAIT' ? 'ACTIVE' : 'WAIT')}
                className="w-full py-2.5 px-5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Radio className={`w-4 h-4 ${passState === 'WAIT' ? 'text-go' : 'text-wait'}`} />
                {passState === 'WAIT' ? 'Unlock Zone C' : 'Reset to Wait'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM STATS */}
      <section className="py-12 md:py-24 bg-background border-y border-white/5 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 md:mb-16">
            <div className="text-stop font-mono text-sm tracking-widest uppercase mb-4">Why This Exists</div>
            <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6">Every large event ends the same way.</h2>
            <p className="text-xl text-dim max-w-2xl mx-auto leading-relaxed">
              The match finishes. The concert ends. And 33,000 people rush the same 3 exits at the exact same second.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card border border-white/5 p-8 rounded-2xl text-center">
              <div className="text-5xl font-timer text-white mb-2">3,550</div>
              <div className="text-lg font-bold mb-2">stampede incidents</div>
              <div className="text-dim text-sm">in India (2001–2015)<br/>Source: NCRB</div>
            </div>
            <div className="bg-card border border-white/5 p-8 rounded-2xl text-center">
              <div className="text-5xl font-timer text-stop mb-2">129</div>
              <div className="text-lg font-bold mb-2">lives lost in just</div>
              <div className="text-dim text-sm">8 stampedes in 2025<br/>across India</div>
            </div>
            <div className="bg-card border border-white/5 p-8 rounded-2xl text-center">
              <div className="text-5xl font-timer text-white mb-2">79%</div>
              <div className="text-lg font-bold mb-2">of stampedes happen</div>
              <div className="text-dim text-sm">due to poor crowd<br/>management alone</div>
            </div>
          </div>

          <div className="mt-12 md:mt-20 text-center mb-8 md:mb-16">
            <p className="text-3xl font-heading font-bold">
              Poor coordination kills people.<br/>
              <span className="text-go mt-2 block">FlowPass fixes coordination.</span>
            </p>
          </div>

          <ChaosVsCalm />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-12 md:py-32 bg-card relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 md:mb-20">
            <div className="text-go font-mono text-sm tracking-widest uppercase mb-4">How It Works</div>
            <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6">From chaos to calm — in 60 seconds of setup.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-8 relative z-10">
            <div className="relative">
              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center font-heading font-bold text-xl mb-6 border border-white/10">1</div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Radio className="w-5 h-5 text-go"/> Organizer Sets Up</h3>
              <p className="text-dim leading-relaxed">Enter your event name, venue, number of zones, and crowd size. FlowPass instantly calculates the safest staggered exit schedule — no guesswork.</p>
            </div>
            <div className="relative">
              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center font-heading font-bold text-xl mb-6 border border-white/10">2</div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Ticket className="w-5 h-5 text-go"/> Attendees Get Pass</h3>
              <p className="text-dim leading-relaxed">Share one QR code or link. Attendees enter their seat number and instantly receive a personal digital exit pass — their zone, gate, and exact exit time. No app download. Ever.</p>
            </div>
            <div className="relative">
              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center font-heading font-bold text-xl mb-6 border border-white/10">3</div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-go"/> Zones Exit in Waves</h3>
              <p className="text-dim leading-relaxed">Zone A exits first. Zone B follows 12 minutes later. Zone C after that. 33,000 people disperse smoothly in waves — instead of a single dangerous surge.</p>
            </div>
          </div>

          {/* Scroll-Triggered Timeline Visual */}
          <ScrollTimeline />
        </div>
      </section>

      {/* THREE ROLES */}
      <section id="roles" className="py-12 md:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 md:mb-20">
            <div className="text-wait font-mono text-sm tracking-widest uppercase mb-4">Three Roles. One System.</div>
            <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6">Built for everyone at the venue.</h2>
          </div>

          <RolesSwitcher />
        </div>
      </section>

      {/* SMART LOGIC HIGHLIGHT */}
      <section className="py-12 md:py-32 bg-card border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 md:mb-20">
            <div className="text-go font-mono text-sm tracking-widest uppercase mb-4">Intelligent By Design</div>
            <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6">
              FlowPass doesn't just show timers.<br/>
              It makes smart decisions.
            </h2>
            <p className="text-xl text-dim max-w-2xl mx-auto leading-relaxed">
              Most crowd systems are passive dashboards. FlowPass is an active decision-making system that reacts to what's happening on the ground.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-12 md:mb-20">
            <GlassCard 
              icon={<span className="text-2xl">🧮</span>}
              title="Auto Exit Gap Calculation"
              description="Calculates the safest time gap between zones based on your exact crowd size and number of gates. You don't guess. The algorithm does."
            />
            <GlassCard 
              icon={<span className="text-2xl">🔀</span>}
              title="Smart Gate Reassignment"
              description="If Gate 3 gets blocked mid-event, FlowPass instantly reassigns that zone to the next available gate and updates every affected pass."
            />
            <GlassCard 
              icon={<span className="text-2xl">⚡</span>}
              title="Real-Time Pass Updates"
              description="Every attendee's FlowPass updates live — no refresh needed. Status flips from WAIT to GO the moment their zone unlocks."
            />
            <GlassCard 
              icon={<span className="text-2xl">📢</span>}
              title="Instant Broadcast"
              description="Organizer types one announcement. Every attendee with an open pass sees it in under 2 seconds. 'Metro Line 1 running — Platform 3'"
            />
          </div>

          <div className="text-center w-full px-6">
            <Link to="/create" className="inline-flex w-full sm:w-auto items-center justify-center px-10 py-5 bg-white text-background font-bold rounded-lg hover:bg-white/90 transition-colors gap-3 text-lg">
              <Radio className="w-6 h-6" /> See It In Action — Create Event
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
