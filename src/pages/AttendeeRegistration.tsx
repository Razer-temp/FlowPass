/**
 * FlowPass — Attendee Registration Page
 *
 * Public-facing registration form where attendees enter their name
 * and seat number to receive a live digital pass. The seat number
 * is used to auto-detect the correct zone and gate assignment.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import type { FlowEvent, FlowZone, FlowPass } from '../types';
import { assignZoneFromSeat } from '../lib/zoneAlgorithm';
import { sanitizeName, sanitizeSeat, isValidUUID } from '../lib/sanitize';
import { CheckCircle2, Ticket, MapPin, ShieldCheck, AlertCircle } from 'lucide-react';
import PassCard from '../components/PassCard';
import NotificationBell from '../components/pass/NotificationBell';

export default function AttendeeRegistration() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<FlowEvent | null>(null);
  const [zones, setZones] = useState<FlowZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [name, setName] = useState('');
  const [seat, setSeat] = useState('');
  const [phone, setPhone] = useState('');
  
  // Detection & Submission State
  const [detectionResult, setDetectionResult] = useState<{ zone: FlowZone, reason: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedPass, setGeneratedPass] = useState<FlowPass | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const lastSubmitTime = useRef<number>(0); // Rate limiting
  const RATE_LIMIT_MS = 5000; // 5-second cooldown between submissions

  useEffect(() => {
    if (!eventId || !isValidUUID(eventId)) return;

    // Check offline cache first
    const cachedPass = localStorage.getItem(`flowpass_pass_${eventId}`);
    if (cachedPass) {
      setGeneratedPass(JSON.parse(cachedPass));
    }

    const fetchEventData = async () => {
      try {
        const { data: eventData } = await supabase.from('events').select('*').eq('id', eventId).single();
        if (eventData) setEvent(eventData);

        const { data: zonesData } = await supabase.from('zones').select('*').eq('event_id', eventId);
        if (zonesData) setZones(zonesData);
      } catch (error) {
        console.error("Error fetching event:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventData();
  }, [eventId]);

  useEffect(() => {
    if (seat.length >= 2 && zones.length > 0) {
      const result = assignZoneFromSeat(seat, zones);
      if (result && (!detectionResult || result.zone.id !== detectionResult.zone.id)) {
        setDetectionResult(result);
        if (navigator.vibrate) navigator.vibrate(50);
      }
    } else {
      setDetectionResult(null);
    }
  }, [seat, zones]);

  const validateFields = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    else if (name.trim().length < 2) newErrors.name = 'Name must be at least 2 characters';
    if (!seat.trim()) newErrors.seat = 'Seat number is required';
    if (phone && phone.replace(/\D/g, '').length !== 10 && phone.replace(/\D/g, '').length > 0) {
      newErrors.phone = 'Enter a valid 10-digit number';
    }
    if (!detectionResult) newErrors.seat = 'Could not detect zone from seat — try adding Stand/Block';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateFields()) return;

    // Rate limiting — prevent rapid repeat submissions
    const now = Date.now();
    if (now - lastSubmitTime.current < RATE_LIMIT_MS) {
      setSubmitError(`Please wait ${Math.ceil((RATE_LIMIT_MS - (now - lastSubmitTime.current)) / 1000)} seconds before trying again.`);
      return;
    }
    lastSubmitTime.current = now;

    setIsSubmitting(true);

    try {
      const sanitizedName = sanitizeName(name);
      const sanitizedSeat = sanitizeSeat(seat);

      // Duplicate pass prevention — check if this seat is already registered
      const { data: existingPass } = await supabase
        .from('passes')
        .select('id')
        .eq('event_id', eventId)
        .eq('seat_number', sanitizedSeat)
        .limit(1)
        .maybeSingle();

      if (existingPass) {
        setSubmitError('This seat has already been registered. If this is an error, contact event staff.');
        setIsSubmitting(false);
        return;
      }

      const { data: passData, error } = await supabase
        .from('passes')
        .insert({
          event_id: eventId,
          zone_id: detectionResult!.zone.id,
          gate_id: detectionResult!.zone.gates[0],
          attendee_name: sanitizedName,
          seat_number: sanitizedSeat,
          status: 'LOCKED'
        })
        .select()
        .single();

      if (error) throw error;

      // Cache offline
      localStorage.setItem(`flowpass_pass_${eventId}`, JSON.stringify(passData));
      setGeneratedPass(passData);
      
      // Log activity
      await supabase.from('activity_log').insert({
        event_id: eventId,
        action: `Pass generated for ${name.trim()} in ${detectionResult!.zone.name}`,
        type: 'PASS'
      });

    } catch (error) {
      console.error("Error generating pass:", error);
      setSubmitError('Failed to generate pass. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-go border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!event) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-8 text-center text-dim">Event not found or has been deleted.</div>;
  }

  // If event is complete, hide form
  const isComplete = event.status === 'COMPLETED' || (zones.length > 0 && zones.every(z => z.status === 'CLEARED'));

  return (
    <div className="min-h-screen bg-background text-white p-4 md:p-8 pb-24">
      <div className="max-w-md mx-auto">
        
        {/* ① EVENT HEADER */}
        <div className="bg-surface border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 mb-6 md:mb-8 text-center">
          <div className="font-timer tracking-widest text-lg md:text-xl text-go mb-3 md:mb-4">🎫 FLOWPASS</div>
          <h1 className="font-heading font-bold text-2xl mb-1">{event.name}</h1>
          <p className="text-dim text-sm mb-6">{event.venue} · {new Date(event.date).toLocaleDateString()}</p>
          
          {isComplete ? (
            <div className="bg-go/10 border border-go/30 text-go rounded-xl p-4">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
              <p className="font-bold">This event has ended.</p>
              <p className="text-sm opacity-80">All attendees have exited safely.</p>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-stop/20 text-stop px-4 py-2 rounded-full text-sm font-bold">
              <div className="w-2 h-2 rounded-full bg-stop animate-pulse" />
              EXIT ACTIVE
            </div>
          )}
        </div>

        {isComplete ? null : generatedPass ? (
          /* ④ INSTANT PASS + NOTIFICATION OPT-IN */
          <div className="space-y-4">
            <PassCard pass={generatedPass} event={event} zone={zones.find(z => z.id === generatedPass.zone_id) ?? detectionResult?.zone ?? zones[0]} />

            {/* Firebase Cloud Messaging — Push Notification Opt-In */}
            <NotificationBell passId={generatedPass.id} />
          </div>
        ) : (
          /* ② SMART FORM */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold mb-2">Get Your FlowPass</h2>
              <p className="text-dim text-sm">Enter your details below — your zone and gate are assigned automatically from your seat number.</p>
            </div>

            {/* FIELD 1 — YOUR NAME */}
            <div className="space-y-2">
              <label className="flex justify-between text-sm font-bold">
                Your Name <span className="text-stop">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  required 
                  minLength={2}
                  maxLength={50}
                  autoFocus
                  ref={nameInputRef}
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors(prev => ({...prev, name: ''})); }}
                  placeholder="e.g. Rahul Sharma"
                  aria-label="Your full name"
                  aria-required="true"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  className={`w-full bg-surface border rounded-xl px-4 py-4 focus:outline-none focus:border-go transition-colors capitalize ${errors.name ? 'border-stop' : 'border-white/10'}`}
                />
                {name.length >= 2 && !errors.name && <CheckCircle2 className="absolute right-4 top-4 w-5 h-5 text-go" />}
              </div>
              {errors.name ? (
                <p id="name-error" className="text-xs text-stop flex items-center gap-1 mt-1" role="alert">
                  <AlertCircle className="w-3 h-3" /> {errors.name}
                </p>
              ) : (
                <p className="text-xs text-dim">This appears on your FlowPass</p>
              )}
            </div>

            {/* FIELD 2 — SEAT NUMBER */}
            <div className="space-y-2">
              <label className="flex justify-between text-sm font-bold">
                Seat Number <span className="text-stop">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  required 
                  minLength={3}
                  value={seat}
                  onChange={(e) => { setSeat(e.target.value); setErrors(prev => ({...prev, seat: ''})); }}
                  placeholder="e.g. Stand C, Row 12, Seat 4"
                  aria-label="Your seat number"
                  aria-required="true"
                  aria-invalid={!!errors.seat}
                  aria-describedby={errors.seat ? 'seat-error' : 'seat-hint'}
                  className={`w-full bg-surface border rounded-xl px-4 py-4 focus:outline-none focus:border-go transition-colors pl-12 ${errors.seat ? 'border-stop' : 'border-white/10'}`}
                />
                <MapPin className="absolute left-4 top-4 w-5 h-5 text-dim" />
                {detectionResult && <CheckCircle2 className="absolute right-4 top-4 w-5 h-5 text-go" />}
              </div>
              {errors.seat ? (
                <p id="seat-error" className="text-xs text-stop flex items-center gap-1 mt-1" role="alert">
                  <AlertCircle className="w-3 h-3" /> {errors.seat}
                </p>
              ) : (
                <div id="seat-hint" className="flex items-start gap-2 text-xs text-dim mt-2">
                  <span className="text-xl">💡</span>
                  <p>Your zone and exit gate are auto-assigned from this. {seat.length >= 2 && !detectionResult ? "Can't detect zone yet — try adding Stand/Block" : ''}</p>
                </div>
              )}
            </div>

            {/* SMART ZONE PREVIEW */}
            <AnimatePresence>
              {detectionResult && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="bg-go/10 border border-go/30 rounded-xl p-4 overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2 text-go text-sm font-bold mb-2">
                    <span className="flex items-center gap-1.5 underline decoration-go/30 underline-offset-4">⚡ {detectionResult.reason}</span>
                    <span className="text-[10px] bg-go/20 px-2 py-0.5 rounded-full uppercase tracking-tighter">Smart AI</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-xl font-bold text-white">{detectionResult.zone.name} → {detectionResult.zone.gates[0]}</div>
                      <div className="text-xs text-dim">Opening exit in approx {Math.floor((new Date(detectionResult.zone.exit_time).getTime() - Date.now()) / 60000)} mins</div>
                    </div>
                    <div className="text-go text-xs font-medium">✅ Verified</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* FIELD 3 — PHONE */}
            <div className="space-y-2">
              <label className="flex justify-between text-sm font-bold">
                Mobile Number <span className="text-dim font-normal">(optional)</span>
              </label>
              <div className="relative">
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setErrors(prev => ({...prev, phone: ''})); }}
                  placeholder="+91 XXXXXXXXXX"
                  aria-label="Mobile number (optional)"
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? 'phone-error' : 'phone-hint'}
                  className={`w-full bg-surface border rounded-xl px-4 py-4 focus:outline-none focus:border-go transition-colors ${errors.phone ? 'border-stop' : 'border-white/10'}`}
                />
                {phone.replace(/\D/g, '').length === 10 && <CheckCircle2 className="absolute right-4 top-4 w-5 h-5 text-go" />}
              </div>
              {errors.phone ? (
                <p id="phone-error" className="text-xs text-stop flex items-center gap-1 mt-1" role="alert">
                  <AlertCircle className="w-3 h-3" /> {errors.phone}
                </p>
              ) : (
                <div id="phone-hint" className="flex items-center gap-1 text-xs text-dim">
                  <ShieldCheck className="w-3 h-3" /> Only used to receive organizer announcements — never shared
                </div>
              )}
            </div>

            {/* Submit Error */}
            {submitError && (
              <div className="bg-stop/10 border border-stop/30 rounded-xl p-4 text-stop text-sm flex items-center gap-2" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" /> {submitError}
              </div>
            )}

            {/* ③ THE MAIN CTA BUTTON */}
            <button 
              type="submit"
              disabled={!name || !seat || !detectionResult || isSubmitting}
              aria-label="Generate your FlowPass exit pass"
              className="w-full py-4 bg-go text-background font-black text-xl rounded-xl hover:bg-go/90 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none disabled:hover:bg-go flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,135,0.2)] mt-8"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  Generating... {detectionResult ? `Assigning ${detectionResult.zone.name} · ${detectionResult.zone.gates[0]}` : ''}
                </>
              ) : (
                <>
                  <Ticket className="w-6 h-6" /> Get My FlowPass
                </>
              )}
            </button>
            <p className="text-center text-xs text-dim mt-4">
              🔒 No account needed · No app download · Works on any phone
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
