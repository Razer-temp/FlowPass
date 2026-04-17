/**
 * FlowPass — Footer Component
 *
 * Site-wide footer with branding, quick navigation links,
 * technology stack credits, and the GitHub repository link.
 */

import { Ticket, Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-background border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-12 mb-16">
          <div>
            <div className="flex items-center gap-2 font-heading font-bold text-xl mb-4 tracking-tight">
              <Ticket className="w-6 h-6 text-go" />
              FLOWPASS
            </div>
            <p className="text-dim leading-relaxed">
              Smart digital exit passes for large events.<br/>
              Making crowds safer — one wave at a time.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4 font-heading">Quick Links</h4>
            <ul className="space-y-3 text-dim text-sm">
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#roles" className="hover:text-white transition-colors">For Organizers</a></li>
              <li><a href="#roles" className="hover:text-white transition-colors">For Attendees</a></li>
              <li>
                <a href="https://github.com/rehmanmusharaf/FlowPass" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-2 mt-2" aria-label="View FlowPass source code on GitHub">
                  <Github className="w-4 h-4"/> View on GitHub
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 font-heading">Built With</h4>
            <ul className="space-y-3 text-dim text-sm">
              <li className="flex items-center gap-2">⚡ React + Vite</li>
              <li className="flex items-center gap-2">🗄️ Supabase (Realtime + Postgres)</li>
              <li className="flex items-center gap-2">☁️ Google Cloud Run</li>
              <li className="flex items-center gap-2">🔒 Zero personal data stored</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-dim">
          <p>© FlowPass 2026 · Built for physical event safety</p>
          <p className="mt-2 md:mt-0">Open Source · Free to use</p>
        </div>
      </div>
    </footer>
  );
}
