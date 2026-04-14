import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface GatePanelProps {
  gates: any[];
  zones: any[];
  eventId: string;
}

export default function GatePanel({ gates, zones, eventId }: GatePanelProps) {
  const [activeAlert, setActiveAlert] = useState<any>(null);
  const [undoCountdown, setUndoCountdown] = useState(5);

  // Simulate a gate becoming blocked for demonstration
  const simulateGateBlock = (gateName: string) => {
    const affectedZones = zones.filter(z => z.gates.includes(gateName));
    if (affectedZones.length === 0) return;

    // Find next clear gate (simplified logic for prototype)
    const clearGates = gates.filter(g => g.name !== gateName && g.status === 'CLEAR');
    const newGate = clearGates.length > 0 ? clearGates[0].name : 'Any Available Gate';

    setActiveAlert({
      blockedGate: gateName,
      affectedZones: affectedZones.map(z => z.name),
      newGate: newGate
    });
    setUndoCountdown(5);
  };

  // Auto-confirm countdown logic
  useEffect(() => {
    if (!activeAlert) return;

    if (undoCountdown > 0) {
      const timer = setTimeout(() => setUndoCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Auto-confirm triggered
      handleConfirmReassignment();
    }
  }, [activeAlert, undoCountdown]);

  const handleConfirmReassignment = async () => {
    if (!activeAlert) return;
    try {
      // 1. Fetch current gate_status
      const { data: eventData } = await supabase.from('events').select('gate_status').eq('id', eventId).single();
      const newGateStatus = { ...(eventData?.gate_status || {}) };
      newGateStatus[activeAlert.blockedGate] = 'BLOCKED';

      // 2. Update events table
      await supabase.from('events').update({ gate_status: newGateStatus }).eq('id', eventId);

      // 3. Update affected zones
      for (const zone of zones) {
        if (zone.gates.includes(activeAlert.blockedGate)) {
          const newGates = zone.gates.filter((g: string) => g !== activeAlert.blockedGate);
          if (activeAlert.newGate !== 'Any Available Gate' && !newGates.includes(activeAlert.newGate)) {
            newGates.push(activeAlert.newGate);
          }
          await supabase.from('zones').update({ gates: newGates }).eq('id', zone.id);

          // Also update passes assigned to the blocked gate → reassign to new gate
          if (activeAlert.newGate !== 'Any Available Gate') {
            await supabase.from('passes')
              .update({ gate_id: activeAlert.newGate })
              .eq('zone_id', zone.id)
              .eq('gate_id', activeAlert.blockedGate);
          }
        }
      }

      // Log activity
      await supabase.from('activity_log').insert({
        event_id: eventId,
        action: `SMART REASSIGNMENT: ${activeAlert.affectedZones.join(', ')} moved from ${activeAlert.blockedGate} to ${activeAlert.newGate}`,
        type: 'REASSIGN'
      });

      setActiveAlert(null);
    } catch (e) {
      console.error("Error during reassignment", e);
    }
  };

  const updateGateStatus = async (gateName: string, status: string) => {
    try {
      const { data: eventData } = await supabase.from('events').select('gate_status').eq('id', eventId).single();
      const newGateStatus = { ...(eventData?.gate_status || {}) };
      newGateStatus[gateName] = status;
      await supabase.from('events').update({ gate_status: newGateStatus }).eq('id', eventId);
      
      await supabase.from('activity_log').insert({
        event_id: eventId,
        action: `Gate ${gateName} marked as ${status}`,
        type: 'SYSTEM'
      });
    } catch (e) {
      console.error("Failed to update gate:", e);
    }
  };

  const handleUndo = () => {
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
              transition={{ duration: 5, ease: 'linear' }}
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
