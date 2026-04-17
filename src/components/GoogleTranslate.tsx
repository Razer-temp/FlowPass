/**
 * FlowPass — Google Translate Integration
 *
 * Adds a client-side Google Translate widget to make announcements
 * and passes accessible in any language.
 *
 * Google Service: Google Translate API (Client-side Widget)
 */

import { useEffect, useRef } from 'react';
import type { GoogleTranslateAPI } from '../types';

interface GoogleTranslateProps {
  variant?: 'visible' | 'hidden';
  targetLanguage?: string;
}

/**
 * Renders the Google Translate inline widget.
 * Lazily loads the external script on first mount and prevents
 * duplicate injection during React Strict Mode / hot reloads.
 */
export default function GoogleTranslate({ variant = 'visible', targetLanguage = 'en' }: GoogleTranslateProps): React.JSX.Element {
  const isInitialized = useRef(false);

  useEffect(() => {
    // Prevent duplicate scripts/widgets in React Strict Mode or hot reloads
    if (document.getElementById('google-translate-script')) {
      isInitialized.current = true;
      return;
    }

    window.googleTranslateElementInit = () => {
      if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
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

  }, []);

  // Effect to programmatically change translations when targetLanguage prop changes
  useEffect(() => {
    if (variant !== 'hidden') return;
    
    const triggerTranslation = () => {
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
      if (select) {
        if (select.value !== targetLanguage) {
          select.value = targetLanguage;
          select.dispatchEvent(new Event('change'));
        }
      }
    };

    // Google widget takes some time to inject the DOM. Polling or timeout helps ensure it applies.
    triggerTranslation();
    const interval = setInterval(triggerTranslation, 500);
    const timeout = setTimeout(() => clearInterval(interval), 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
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
