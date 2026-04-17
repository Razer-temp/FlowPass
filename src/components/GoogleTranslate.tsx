/**
 * FlowPass — Google Translate Integration
 *
 * Adds a client-side Google Translate widget to make announcements
 * and passes accessible in any language.
 *
 * The 'hidden' variant uses a Hard-Reset Engine to guarantee translation 
 * sync across devices without needing page reloads.
 */

import { useEffect, useRef } from 'react';
import type { GoogleTranslateAPI } from '../types';

interface GoogleTranslateProps {
  variant?: 'visible' | 'hidden';
  targetLanguage?: string;
}

export default function GoogleTranslate({ variant = 'visible', targetLanguage = 'en' }: GoogleTranslateProps): React.JSX.Element {
  const isInitialized = useRef(false);

  // Core bootstrapper and Deep-Wipe engine
  const injectGoogleScript = () => {
    // 1. Wipe existing scripts
    const existing = document.getElementById('google-translate-script');
    if (existing) existing.remove();

    // 2. Wipe UI elements injected by Google
    const existingUi = document.querySelectorAll('.skiptranslate, iframe[name="goog_te_frame"]');
    existingUi.forEach(el => el.remove());

    // 3. Clear the main target container recursively
    const container = document.getElementById('google_translate_element');
    if (container) container.innerHTML = '';

    isInitialized.current = false;

    // 4. Set up global init function anew
    window.googleTranslateElementInit = () => {
      if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: true,
          },
          'google_translate_element'
        );
        isInitialized.current = true;
      }
    };

    // 5. Hard inject
    const addScript = document.createElement('script');
    addScript.id = 'google-translate-script';
    addScript.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    addScript.async = true;
    document.body.appendChild(addScript);
  };

  // Initial load for normal (visible) widgets
  useEffect(() => {
    if (variant === 'visible') {
      if (!isInitialized.current && !document.getElementById('google-translate-script')) {
        injectGoogleScript();
      }
    }
  }, [variant]);

  // Remote Orchestration (Ghost Mode) Hard-Reset Engine
  useEffect(() => {
    if (variant !== 'hidden') return;

    const domain = window.location.hostname;
    
    if (targetLanguage === 'en') {
      // 1. Clear cookies to ensure it stays English on a hard reload
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${domain}; path=/;`;
      
      // 2. Trigger the Google-injected Restore button to revert the DOM natively
      const iframe = document.querySelector('iframe.goog-te-banner-frame') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        // Attempt to find the restore button inside Google's hidden iframe
        const restoreBtn = iframe.contentWindow.document.getElementById(':1.restore') as HTMLElement;
        if (restoreBtn) {
          restoreBtn.click();
        }
      }
      
      // We do NOT wipe the script for English, because the restoreBtn click instantly reverts the DOM!
      return;
    } 
    
    // For all other languages, force native Google translation context
    document.cookie = `googtrans=/en/${targetLanguage}; path=/;`;
    document.cookie = `googtrans=/en/${targetLanguage}; domain=${domain}; path=/;`;

    // Wipe cached Google object to force a native reload from the new cookie state
    delete (window as any).google;
    
    // Inject and run
    injectGoogleScript();

  }, [targetLanguage, variant]);

  return (
    <div 
      id="google_translate_element" 
      className={`google-translate-container ${variant === 'hidden' ? 'google-translate-hidden' : ''}`}
      style={{ minHeight: variant === 'hidden' ? '0' : '32px' }}
    />
  );
}

// Ensure TypeScript knows about the global function
declare global {
  interface Window {
    googleTranslateElementInit: () => void;
    google: GoogleTranslateAPI;
  }
}
