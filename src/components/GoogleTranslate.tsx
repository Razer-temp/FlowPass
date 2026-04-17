/**
 * Google Translate Integration
 *
 * Adds a client-side Google Translate widget to make announcements
 * and passes accessible in any language.
 *
 * Google Service: Google Translate API (Client-side Widget)
 */

import { useEffect } from 'react';

export default function GoogleTranslate() {
  useEffect(() => {
    // Prevent duplicate scripts/widgets in React Strict Mode or hot reloads
    if (document.getElementById('google-translate-script')) return;

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
      }
    };

    const addScript = document.createElement('script');
    addScript.id = 'google-translate-script';
    addScript.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    addScript.async = true;
    document.body.appendChild(addScript);

  }, []);

  return (
    <div 
      id="google_translate_element" 
      className="google-translate-container"
      style={{ minHeight: '32px' }}
    />
  );
}

// Ensure TypeScript knows about the global function
declare global {
  interface Window {
    googleTranslateElementInit: () => void;
    google: any;
  }
}
