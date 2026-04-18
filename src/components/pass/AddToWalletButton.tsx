/**
 * FlowPass — AddToWalletButton Component
 *
 * Renders a Google Wallet "Add to Wallet" button that generates
 * a digital pass for the attendee's Android device. Shows a
 * fallback message on unsupported platforms (iOS/desktop).
 *
 * Google Service: Google Wallet API (Generic Pass — Free)
 */

import { useState } from 'react';
import { Smartphone, ExternalLink, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getWalletSaveUrl, isWalletSupported } from '../../lib/googleWallet';
import type { FlowPass, FlowEvent, FlowZone } from '../../types';

interface AddToWalletButtonProps {
  /** Attendee's pass record */
  pass: FlowPass;
  /** Event record */
  event: FlowEvent;
  /** Assigned zone record */
  zone: FlowZone;
}

export default function AddToWalletButton({ pass, event, zone }: AddToWalletButtonProps) {
  const [showDemoNotice, setShowDemoNotice] = useState(false);
  const supported = isWalletSupported();
  const saveUrl = getWalletSaveUrl(pass, event, zone);

  // If URL generation failed (e.g. encoding error), hide the button entirely
  if (!saveUrl) return null;

  return (
    <div className="mt-3">
      {supported ? (
        <a
          href={saveUrl}
          onClick={(e) => {
            e.preventDefault();
            setShowDemoNotice(true);
          }}
          className="group w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-surface border border-white/10 rounded-xl hover:border-amber-500/40 hover:bg-amber-500/5 transition-all duration-300"
          aria-label="Add this pass to Google Wallet"
        >
          {/* Google Wallet Icon */}
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center group-hover:bg-amber-500/25 transition-colors">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20.64 6.35c-.78-.35-1.64-.55-2.55-.55-3.53 0-6.4 2.86-6.4 6.4 0 .7.11 1.38.32 2.01L3.2 22.73V7.27L12 1.27l8.64 5.08z"
                fill="#F59E0B"
                fillOpacity="0.8"
              />
              <path
                d="M12.01 14.21c.21.63.32 1.31.32 2.01 0 3.53-2.86 6.4-6.4 6.4-.91 0-1.77-.19-2.55-.55L12 16.22l.01-2.01z"
                fill="#F59E0B"
                fillOpacity="0.6"
              />
            </svg>
          </div>

          <div className="flex-1 text-left">
            <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
              Add to Google Wallet
            </div>
            <div className="text-[10px] text-dim font-mono tracking-wider">
              Save digital pass to your phone
            </div>
          </div>

          <ExternalLink className="w-4 h-4 text-dim group-hover:text-amber-400 transition-colors" />
        </a>
      ) : (
        /* Fallback for iOS & unsupported browsers */
        <div className="w-full flex items-center gap-3 px-5 py-3 bg-surface/50 border border-white/5 rounded-xl opacity-60">
          <Smartphone className="w-5 h-5 text-dim" />
          <div className="text-xs text-dim">
            <span className="font-bold">Google Wallet</span> — Available on Android devices
          </div>
        </div>
      )}

      {/* Demo Notice Modal */}
      <AnimatePresence>
        {showDemoNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#111115] border border-amber-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_0_50px_-12px_rgba(245,158,11,0.25)] relative"
            >
              <button 
                onClick={() => setShowDemoNotice(false)} 
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">Google Pay Setup Required</h3>
                <p className="text-gray-300 text-sm leading-relaxed mb-8">
                  Google Wallet enforces a strict security model. To enable real-world saving, you must register a business <strong className="text-white font-bold">Issuer Account</strong> in the Google Pay Developer Console.
                </p>
                
                <div className="space-y-4">
                  <button 
                    onClick={() => setShowDemoNotice(false)} 
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black transition-colors rounded-xl font-bold text-sm shadow-lg shadow-amber-500/20"
                  >
                    Understood
                  </button>
                  <a 
                    href={saveUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="w-full py-2 flex items-center justify-center gap-2 text-white/60 text-xs hover:text-white transition-colors group/link"
                  >
                    Confirm Google API rejection <ExternalLink className="w-3 h-3 group-hover/link:text-amber-500 transition-colors" />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
