/**
 * FlowPass — Navbar Component
 *
 * Persistent top navigation bar with the FlowPass logo, section
 * anchor links, and a CTA to create a new event.
 */

import { Link } from 'react-router-dom';
import { Ticket } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-heading font-bold text-xl tracking-tight">
          <Ticket className="w-6 h-6 text-go" />
          FLOWPASS
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-dim">
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#roles" className="hover:text-white transition-colors">For Organizers</a>
          <a href="#roles" className="hover:text-white transition-colors">For Attendees</a>
        </div>
        <Link to="/create" className="px-5 py-2.5 bg-white text-background font-bold rounded hover:bg-white/90 transition-colors text-sm">
          Create Event &rarr;
        </Link>
      </div>
    </nav>
  );
}
