/**
 * FlowPass — Event Selector Page
 *
 * Displays a searchable list of all active events. Attendees pick
 * their event here, enter the security PIN if required, and are
 * redirected to the registration flow.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { FlowEvent } from '../types';
import { Ticket, Calendar, MapPin, ArrowRight, Search, Lock, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function EventSelector() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<FlowEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedEvent, setSelectedEvent] = useState<FlowEvent | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (data) setEvents(data);
        if (error) console.error('[EventSelector] Supabase error:', error);
      } catch (err) {
        console.error('[EventSelector] Error fetching events:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const filteredEvents = events.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.venue.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEventClick = (event: FlowEvent): void => {
    if (!event.pin) {
      navigate(`/register/${event.id}`);
    } else {
      setSelectedEvent(event);
      setPinInput('');
      setPinError(false);
    }
  };

  const handlePinSubmit = (e: FormEvent): void => {
    e.preventDefault();
    if (selectedEvent && pinInput.toUpperCase() === selectedEvent.pin.toUpperCase()) {
      navigate(`/register/${selectedEvent.id}`);
    } else {
      setPinError(true);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white p-4 md:p-12 pb-32 relative">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-heading font-bold mb-2 md:mb-4">Select an Event</h1>
        <p className="text-dim text-base md:text-lg mb-6 md:mb-8">Choose an active event to register and receive your digital exit pass.</p>

        {/* SEARCH BAR */}
        <div className="relative mb-8 md:mb-12">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by event name or venue..."
            className="w-full bg-surface border border-white/20 rounded-xl md:rounded-2xl px-12 md:px-14 py-4 md:py-5 text-base md:text-lg text-white placeholder:text-dim/50 focus:outline-none focus:border-go transition-colors shadow-lg"
          />
          <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-5 md:w-6 h-5 md:h-6 text-dim" />
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-2 border-go border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-surface border border-white/10 rounded-2xl p-12 text-center shadow-lg">
            <p className="text-xl text-dim mb-6">No events found. You need to create an event first.</p>
            <Link to="/create" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-background font-bold rounded-lg hover:bg-white/90 transition-colors">
              Create Event
            </Link>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-surface border border-white/10 rounded-2xl p-12 text-center shadow-lg">
            <p className="text-xl text-dim mb-2">No results matching &quot;{searchQuery}&quot;</p>
            <button onClick={() => setSearchQuery('')} className="text-go font-bold hover:underline">Clear search</button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredEvents.map((event) => (
              <button 
                key={event.id}
                onClick={() => handleEventClick(event)}
                className="w-full text-left bg-surface border border-white/10 hover:border-go/50 rounded-xl md:rounded-2xl p-4 md:p-6 transition-all duration-300 flex items-center justify-between group shadow-lg hover:shadow-go/10 hover:-translate-y-1"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg md:text-2xl font-bold mb-2 md:mb-3 flex items-center gap-2 md:gap-3 truncate">
                    <Ticket className="w-5 md:w-6 h-5 md:h-6 text-go shrink-0" /> <span className="truncate">{event.name}</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 md:gap-6 text-xs md:text-sm text-dim">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> {event.venue}
                    </span>
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> {new Date(event.date).toLocaleDateString()}
                    </span>
                    {event.pin && (
                      <span className="flex items-center gap-1 text-wait">
                        <Lock className="w-3 h-3" /> Protected
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${event.status === 'COMPLETED' ? 'bg-stop/20 text-stop' : 'bg-go/20 text-go'}`}>
                      {event.status === 'COMPLETED' ? 'ENDED' : 'ACTIVE'}
                    </span>
                  </div>
                </div>
                <div className="w-10 md:w-12 h-10 md:h-12 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-go/20 transition-colors shrink-0 ml-3 md:ml-4">
                  <ArrowRight className="w-5 md:w-6 h-5 md:h-6 text-dim group-hover:text-go transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SECURITY MODAL */}
      <AnimatePresence>
        {selectedEvent && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 px-6"
            >
              <div className="bg-surface border border-white/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="absolute top-6 right-6 text-dim hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                
                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                  <Lock className="w-8 h-8 text-go" />
                </div>
                
                <h2 className="text-3xl font-heading font-bold mb-2">Access Event</h2>
                <p className="text-dim mb-8">Enter the security PIN for <span className="text-white font-bold">{selectedEvent.name}</span></p>

                <form onSubmit={handlePinSubmit}>
                  <motion.div animate={pinError ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }}>
                    <input 
                      type="text"
                      autoFocus
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value);
                        setPinError(false);
                      }}
                      placeholder="Enter PIN"
                      className={`w-full bg-background border ${pinError ? 'border-stop/50 focus:border-stop' : 'border-white/20 focus:border-go'} rounded-xl px-4 py-4 text-xl tracking-widest uppercase font-mono text-center mb-4 transition-colors focus:outline-none`}
                    />
                  </motion.div>
                  
                  {pinError && (
                    <p className="text-stop text-sm font-bold flex items-center justify-center gap-2 mb-4">
                      <AlertCircle className="w-4 h-4" /> Incorrect PIN
                    </p>
                  )}

                  <button 
                    type="submit"
                    disabled={!pinInput.trim()}
                    className="w-full py-4 bg-white text-background font-bold text-lg rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    Unlock &amp; Register <ArrowRight className="w-5 h-5"/>
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
