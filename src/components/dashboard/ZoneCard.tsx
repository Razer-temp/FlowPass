/**
 * FlowPass — ZoneCard Dashboard Component
 *
 * Displays a single zone's status on the organizer dashboard with
 * controls for hold/resume, early unlock, and exit time editing.
 * Visual state (color, badge, icon) changes reactively based on
 * the zone's current lifecycle status.
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { PauseCircle, PlayCircle, Clock, Edit2, Unlock, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { FlowZone } from '../../types';

interface ZoneCardProps {
  /** Zone data from the database */
  zone: FlowZone;
  /** Index in the zone list (used for stagger animation) */
  index: number;
}

export default function ZoneCard({ zone }: ZoneCardProps) {
  const [isHolding, setIsHolding] = useState(zone.status === 'HOLD');
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [showTimeEdit, setShowTimeEdit] = useState(false);
  const [newTime, setNewTime] = useState(
    new Date(zone.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  );

  const handleHoldToggle = async (): Promise<void> => {
    const newStatus = isHolding ? 'ACTIVE' : 'HOLD';
    setIsHolding(!isHolding);
    
    await supabase
      .from('zones')
      .update({ status: newStatus })
      .eq('id', zone.id);
  };

  const handleUnlockEarly = async (): Promise<void> => {
    await supabase
      .from('zones')
      .update({ status: 'ACTIVE', exit_time: new Date().toISOString() })
      .eq('id', zone.id);
    setShowUnlockConfirm(false);
  };

  const handleTimeUpdate = async (): Promise<void> => {
    const [hours, minutes] = newTime.split(':').map(Number);
    const exitDate = new Date(zone.exit_time);
    exitDate.setHours(hours, minutes, 0, 0);
    await supabase
      .from('zones')
      .update({ exit_time: exitDate.toISOString() })
      .eq('id', zone.id);
    setShowTimeEdit(false);
  };

  // Determine visual state based on status
  let stateColor = 'bg-surface border-white/10';
  let badgeColor = 'bg-white/10 text-dim';
  let badgeText = 'LOCKED';
  let icon = <Clock className="w-4 h-4" />;

  if (zone.status === 'ACTIVE') {
    stateColor = 'bg-go/5 border-go/30';
    badgeColor = 'bg-go/20 text-go';
    badgeText = 'GO NOW';
    icon = <div className="w-2 h-2 rounded-full bg-go animate-pulse" />;
  } else if (zone.status === 'HOLD') {
    stateColor = 'bg-amber-500/5 border-amber-500/30';
    badgeColor = 'bg-amber-500/20 text-amber-500';
    badgeText = 'HOLD';
    icon = <PauseCircle className="w-4 h-4" />;
  } else if (zone.status === 'CLEARED') {
    stateColor = 'bg-surface border-white/5 opacity-50';
    badgeColor = 'bg-white/5 text-dim';
    badgeText = 'CLEARED';
    icon = <CheckCircle2 className="w-4 h-4" />;
  }

  return (
    <motion.div 
      layout
      className={`relative rounded-2xl p-5 border transition-colors ${stateColor}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">{zone.name}</h3>
        <div className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-2 ${badgeColor}`}>
          {icon} {badgeText}
        </div>
      </div>

      <div className="space-y-2 text-sm text-dim mb-6">
        <p>Assigned: <span className="text-white font-medium">{zone.estimated_people.toLocaleString()}</span></p>
        <p>Exits via: <span className="text-white font-medium">{zone.gates.join(', ')}</span></p>
        <p>
          {zone.status === 'ACTIVE' ? 'Active since: ' : 'Opens at: '}
          <span className="text-white font-medium">{new Date(zone.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto">
        {zone.status === 'ACTIVE' || zone.status === 'HOLD' ? (
          <button 
            onClick={handleHoldToggle}
            className={`flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
              isHolding ? 'bg-go/20 text-go hover:bg-go/30' : 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
            }`}
          >
            {isHolding ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
            {isHolding ? 'Resume' : 'Hold'}
          </button>
        ) : zone.status !== 'CLEARED' ? (
          <button 
            onClick={() => setShowUnlockConfirm(true)}
            aria-label={`Unlock ${zone.name} early`}
            className="flex-1 py-2 bg-go/10 text-go hover:bg-go/20 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Unlock className="w-4 h-4" /> Unlock Early
          </button>
        ) : (
          <button className="flex-1 py-2 bg-white/5 text-white hover:bg-white/10 rounded-lg font-medium flex items-center justify-center transition-colors">
            View Log
          </button>
        )}

        {zone.status !== 'CLEARED' && (
          <button 
            onClick={() => setShowTimeEdit(true)}
            aria-label={`Edit exit time for ${zone.name}`}
            className="px-4 py-2 bg-white/5 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Unlock Confirmation Modal */}
      {showUnlockConfirm && (
        <div className="absolute inset-0 bg-surface/95 backdrop-blur-sm rounded-2xl p-5 flex flex-col justify-center items-center text-center z-10">
          <h4 className="font-bold mb-2">Unlock {zone.name} early?</h4>
          <p className="text-sm text-dim mb-4">This will open exits ahead of schedule.</p>
          <div className="flex gap-2 w-full">
            <button 
              onClick={() => setShowUnlockConfirm(false)}
              aria-label="Cancel unlock"
              className="flex-1 py-2 bg-white/10 rounded-lg font-medium hover:bg-white/20"
            >
              Cancel
            </button>
            <button 
              onClick={handleUnlockEarly}
              aria-label="Confirm unlock now"
              className="flex-1 py-2 bg-go text-background rounded-lg font-bold hover:bg-go/90"
            >
              Unlock Now
            </button>
          </div>
        </div>
      )}

      {/* Time Edit Modal */}
      {showTimeEdit && (
        <div className="absolute inset-0 bg-surface/95 backdrop-blur-sm rounded-2xl p-5 flex flex-col justify-center items-center text-center z-10">
          <h4 className="font-bold mb-2">Edit Exit Time for {zone.name}</h4>
          <input 
            type="time" 
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            aria-label="New exit time"
            className="w-full bg-background border border-white/20 rounded-lg px-4 py-3 text-center font-timer text-2xl tracking-wider mb-4 focus:outline-none focus:border-go"
          />
          <div className="flex gap-2 w-full">
            <button 
              onClick={() => setShowTimeEdit(false)}
              aria-label="Cancel time edit"
              className="flex-1 py-2 bg-white/10 rounded-lg font-medium hover:bg-white/20"
            >
              Cancel
            </button>
            <button 
              onClick={handleTimeUpdate}
              aria-label="Save new exit time"
              className="flex-1 py-2 bg-go text-background rounded-lg font-bold hover:bg-go/90"
            >
              Save Time
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
