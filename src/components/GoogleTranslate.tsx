/**
 * FlowPass — Google Translate Integration
 *
 * Adds a client-side Google Translate widget to make announcements
 * and passes accessible in any language.
 *
 * For the 'hidden' Big Screen mode, this uses a robust Hard-Reload Engine,
 * forcibly updating tracking cookies and automatically refreshing the screen
 * when the target presentation language is dynamically swapped over WebSockets.
 */

import { useEffect, useRef } from 'react';
import type { GoogleTranslateAPI } from '../types';

interface GoogleTranslateProps {
  variant?: 'visible' | 'hidden';
  targetLanguage?: string;
}

export default function GoogleTranslate({ variant = 'visible', targetLanguage = 'en' }: GoogleTranslateProps): React.JSX.Element {
  const isInitialized = useRef(false);
  const prevLang = useRef(targetLanguage);

  const injectGoogleScript = () => {
    if (document.getElementById('google-translate-script')) return;

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

    const addScript = document.createElement('script');
    addScript.id = 'google-translate-script';
    addScript.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    addScript.async = true;
    document.body.appendChild(addScript);
  };

  // 1. One-Time Native Injection
  useEffect(() => {
    if (!isInitialized.current) {
      injectGoogleScript();
    }
  }, []);

  // 2. Fallback Hard-Reload Engine (Orchestrates remote sync natively)
  useEffect(() => {
    if (variant !== 'hidden') return;
    
    // Check if the external targetLanguage has actually changed since we mounted
    if (prevLang.current !== targetLanguage) {
      const domain = window.location.hostname;
      
      if (targetLanguage === 'en') {
        // Clear cookies to restore original English default
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${domain}; path=/;`;
      } else {
        // Enforce the new target language context
        document.cookie = `googtrans=/en/${targetLanguage}; path=/;`;
        document.cookie = `googtrans=/en/${targetLanguage}; domain=${domain}; path=/;`;
      }

      // Hard reload the display to command Google's strict init listener to parse
      // the new cookies natively, ensuring robust zero-fault translation without UI hacks.
      window.location.reload();
    }
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
