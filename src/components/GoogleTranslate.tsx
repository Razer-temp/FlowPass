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
    
    let attempts = 0;
    
    const triggerTranslation = () => {
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
      if (!select) return false;

      // Handle restoring to original language (English)
      if (targetLanguage === 'en') {
        const resetCookie = () => {
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=' + window.location.hostname + '; path=/;';
        };
        // Some Google widgets have an empty string value for the default language.
        if (select.value !== '') {
          select.value = '';
          select.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        }
        resetCookie();
        
        // Also look for the iframe restore button if it exists
        const iframe = document.querySelector('iframe.goog-te-banner-frame') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          const restoreBtn = iframe.contentWindow.document.getElementById(':1.restore') as HTMLElement;
          if (restoreBtn) restoreBtn.click();
        }
        
        return true;
      }

      // Handle translation to another language
      if (select.value !== targetLanguage) {
        // Find if the option actually exists
        const optionExists = Array.from(select.options).some(opt => opt.value === targetLanguage);
        if (optionExists) {
          select.value = targetLanguage;
          
          // Force cookie update natively to ensure Google remembers and applies
          document.cookie = `googtrans=/en/${targetLanguage}; path=/;`;
          document.cookie = `googtrans=/en/${targetLanguage}; domain=${window.location.hostname}; path=/;`;
          
          select.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
          return true; // Successfully triggered
        }
      } else {
        return true; // Already on the correct language
      }
      return false; // Select exists but option doesn't yet or some other issue
    };

    // Google widget takes some time to inject the DOM. Polling helps ensure it applies.
    const attemptTrigger = () => {
      attempts++;
      const success = triggerTranslation();
      if (success || attempts > 20) {
        clearInterval(interval);
      }
    };

    const interval = setInterval(attemptTrigger, 500);
    attemptTrigger(); // Try immediately

    return () => clearInterval(interval);
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
