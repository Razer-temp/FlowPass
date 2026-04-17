/**
 * FlowPass — GatePanel Dashboard Component
 *
 * Displays all gates for an event with live status controls (CLEAR / BUSY / BLOCKED).
 * Features a "Smart Reassignment" system: when a gate is blocked, FlowPass
 * automatically reassigns affected zones and passes to the next available gate,
 * with an undo countdown to prevent accidental triggers.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GateDisplay, FlowZone, GateReassignmentAlert } from '../../types';

interface GatePanelProps {
  /** Current gate status list */
  gates: GateDisplay[];
  /** All zones for the event */
  zones: FlowZone[];
  /** The event ID */
  eventId: string;
}

/** Auto-confirm countdown duration in seconds */
const UNDO_COUNTDOWN_SECONDS = 5;

export default function GatePanel({ gates, zones, eventId }: GatePanelProps) {
  const [activeAlert, setActiveAlert] = useState<GateReassignmentAlert | null>(null);
  const [undoCountdown, setUndoCountdown] = useState(UNDO_COUNTDOWN_SECONDS);

  /** Triggers smart gate reassignment when a gate is marked as blocked */
  const simulateGateBlock = (gateName: string): void => {
    const affectedZones = zones.filter(z => z.gates.includes(gateName));
    if (affectedZones.length === 0) return;

    // Find next clear gate
    const clearGates = gates.filter(g => g.name !== gateName && g.status === 'CLEAR');
    const newGate = clearGates.length > 0 ? clearGates[0].name : 'Any Available Gate';

    setActiveAlert({
      blockedGate: gateName,
      affectedZones: affectedZones.map(z => z.name),
      newGate: newGate,
    });
    setUndoCountdown(UNDO_COUNTDOWN_SECONDS);
  };

  /** Executes the gate reassignment in the database */
  const handleConfirmReassignment = useCallback(async (): Promise<void> => {
    if (!activeAlert) return;
    try {
      const { data: eventData } = await supabase.from('events').select('gate_status').eq('id', eventId).single();
      const newGateStatus = { ...(eventData?.gate_status || {}) };
      newGateStatus[activeAlert.blockedGate] = 'BLOCKED';

      await supabase.from('events').update({ gate_status: newGateStatus }).eq('id', eventId);

      for (const zone of zones) {
        if (zone.gates.includes(activeAlert.blockedGate)) {
          const newGates = zone.gates.filter((g: string) => g !== activeAlert.blockedGate);
          if (activeAlert.newGate !== 'Any Available Gate' && !newGates.includes(activeAlert.newGate)) {
            newGates.push(activeAlert.newGate);
          }
          await supabase.from('zones').update({ gates: newGates }).eq('id', zone.id);

          if (activeAlert.newGate !== 'Any Available Gate') {
            await supabase.from('passes')
              .update({ gate_id: activeAlert.newGate })
              .eq('zone_id', zone.id)
              .eq('gate_id', activeAlert.blockedGate);
          }
        }
      }

      await supabase.from('activity_log').insert({
        event_id: eventId,
        action: `SMART REASSIGNMENT: ${activeAlert.affectedZones.join(', ')} moved from ${activeAlert.blockedGate} to ${activeAlert.newGate}`,
        type: 'REASSIGN',
      });

      setActiveAlert(null);
    } catch (e) {
      console.error('[GatePanel] Error during reassignment:', e);
    }
  }, [activeAlert, eventId, zones]);

  // Auto-confirm countdown logic
  useEffect(() => {
    if (!activeAlert) return;

    if (undoCountdown > 0) {
      const timer = setTimeout(() => setUndoCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      handleConfirmReassignment();
    }
  }, [activeAlert, undoCountdown, handleConfirmReassignment]);

  /** Updates a single gate's status in the events table */
  const updateGateStatus = async (gateName: string, status: string): Promise<void> => {
    try {
      const { data: eventData } = await supabase.from('events').select('gate_status').eq('id', eventId).single();
      const newGateStatus = { ...(eventData?.gate_status || {}) };
      newGateStatus[gateName] = status;
      await supabase.from('events').update({ gate_status: newGateStatus }).eq('id', eventId);
      
      // Logic for restoration when a gate is CLEAR
      if (status === 'CLEAR') {
        const mapping = eventData?.gate_status?.__mapping;
        
        // Fetch LATEST zones from DB to avoid stale prop data issues
        const { data: latestZones } = await supabase.from('zones').select('*').eq('event_id', eventId);
        
        if (latestZones) {
          for (const zone of latestZones) {
            // Robust name matching: Normalize both to just the letters/labels
            const zoneLabel = zone.name.toUpperCase().replace('ZONE', '').trim();
            
            let shouldBeAssigned = false;
            
            if (mapping) {
              const assignedGatesForZone = mapping[zoneLabel] || [];
              shouldBeAssigned = assignedGatesForZone.includes(gateName);
            } else {
              // Legacy events without __mapping: skip automatic restoration
              console.warn('[GatePanel] Legacy event: No __mapping found. Skipping automatic restoration.');
            }

            if (shouldBeAssigned && !zone.gates.includes(gateName)) {
              const newGates = [...zone.gates, gateName];
              await supabase.from('zones').update({ gates: newGates }).eq('id', zone.id);
            }
          }
        }
      }

      await supabase.from('activity_log').insert({
        event_id: eventId,
        action: `Gate ${gateName} marked as ${status}${status === 'CLEAR' ? ' (Automatic restoration triggered)' : ''}`,
        type: 'SYSTEM',
      });
    } catch (e) {
      console.error('[GatePanel] Failed to update gate:', e);
    }
  };

  const handleUndo = (): void => {
    setActiveAlert(null);
  };

  return (
    <div className="space-y-4">
      {/* SMART ALERT BANNER */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, scale: 0.95, height: 0 }}
            className="bg-stop/10 border border-stop/30 rounded-xl p-4 overflow-hidden relative"
          >
            {/* Auto-confirm progress bar */}
            <motion.div 
              className="absolute bottom-0 left-0 h-1 bg-stop"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: UNDO_COUNTDOWN_SECONDS, ease: 'linear' }}
            />

            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-stop shrink-0 mt-0.5" />
              <div className="flex-grow">
                <h4 className="font-bold text-stop mb-1">SMART REASSIGNMENT TRIGGERED</h4>
                <p className="text-sm text-dim mb-3">
                  <span className="text-white">{activeAlert.blockedGate}</span> marked BLOCKED. 
                  FlowPass is reassigning <span className="text-white">{activeAlert.affectedZones.join(', ')}</span> to <span className="text-white">{activeAlert.newGate}</span>.
                </p>
                
                <div className="flex gap-2">
                  <button 
                    onClick={handleUndo}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> Undo ({undoCountdown}s)
                  </button>
                  <button 
                    onClick={handleConfirmReassignment}
                    className="px-4 py-2 bg-stop text-white rounded-lg text-sm font-bold hover:bg-stop/90 transition-colors"
                  >
                    Confirm Now
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GATE LIST */}
      <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden">
        {gates.map((gate, idx) => (
          <div key={idx} className="p-4 border-b border-white/5 last:border-0 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold">{gate.name}</h4>
                <a 
                  href={`/gate/${eventId}/${encodeURIComponent(gate.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-dim hover:text-white flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full transition-colors"
                >
                  Open View ↗
                </a>
              </div>
              <p className="text-xs text-dim mt-1">
                Serving: {zones.filter(z => z.gates.includes(gate.name)).map(z => z.name).join(', ') || 'None'}
              </p>
            </div>
            
            <div className="flex gap-1 bg-background p-1 rounded-lg">
              <button 
                onClick={() => updateGateStatus(gate.name, 'CLEAR')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${gate.status === 'CLEAR' || !gate.status ? 'bg-go text-background' : 'text-dim hover:bg-white/5'}`}>
                CLEAR
              </button>
              <button 
                onClick={() => updateGateStatus(gate.name, 'BUSY')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${gate.status === 'BUSY' ? 'bg-amber-500 text-background' : 'text-dim hover:bg-white/5'}`}>
                BUSY
              </button>
              <button 
                onClick={() => simulateGateBlock(gate.name)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${gate.status === 'BLOCKED' ? 'bg-stop text-white' : 'text-dim hover:bg-white/5'}`}
              >
                BLOCKED
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
