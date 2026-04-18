/**
 * FlowPass — AnnouncementAudio Component
 *
 * A small play/stop button that reads announcement text aloud
 * using Google Cloud Text-to-Speech via the server-side proxy.
 *
 * Google Service: Google Cloud Text-to-Speech
 * Free tier: 4 million characters/month (WaveNet voices)
 */

import { useState, useRef } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';

interface AnnouncementAudioProps {
  /** The announcement text to read aloud */
  text: string;
}

/** Speech synthesis states */
type AudioState = 'idle' | 'loading' | 'playing';

export default function AnnouncementAudio({ text }: AnnouncementAudioProps) {
  const [state, setState] = useState<AudioState>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Attempts to play the announcement via Google Cloud TTS (server proxy).
   * Falls back to the browser's built-in Web Speech API if the server
   * endpoint is unavailable.
   */
  const handlePlay = async (): Promise<void> => {
    // Stop if already playing
    if (state === 'playing') {
      stopPlayback();
      return;
    }

    setState('loading');

    try {
      // Strategy 1: Try Google Cloud TTS via server proxy
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: 'en-US' }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.audioContent) {
          // Play the base64-encoded audio from Google Cloud TTS
          const audioSrc = `data:audio/mp3;base64,${data.audioContent}`;
          const audio = new Audio(audioSrc);
          audioRef.current = audio;

          audio.onended = () => setState('idle');
          audio.onerror = () => {
            console.warn('[TTS] Audio playback failed, falling back to Web Speech');
            fallbackToWebSpeech();
          };

          await audio.play();
          setState('playing');
          return;
        }
      }

      // If server returns non-ok or no audio, fall back
      fallbackToWebSpeech();
    } catch {
      // Network error — fall back to browser TTS
      fallbackToWebSpeech();
    }
  };

  /**
   * Falls back to the browser's native Web Speech Synthesis API.
   * This works offline and requires no API key.
   */
  const fallbackToWebSpeech = (): void => {
    if (!('speechSynthesis' in window)) {
      setState('idle');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onend = () => setState('idle');
    utterance.onerror = () => setState('idle');

    window.speechSynthesis.speak(utterance);
    setState('playing');
  };

  /** Stops any currently playing audio */
  const stopPlayback = (): void => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setState('idle');
  };

  return (
    <button
      onClick={handlePlay}
      disabled={state === 'loading'}
      className={`p-1.5 rounded-lg transition-all duration-200 ${
        state === 'playing'
          ? 'bg-go/20 text-go hover:bg-go/30'
          : state === 'loading'
            ? 'bg-white/5 text-dim cursor-wait'
            : 'bg-white/5 text-dim hover:bg-white/10 hover:text-white'
      }`}
      aria-label={state === 'playing' ? 'Stop reading announcement' : 'Read announcement aloud'}
      title={state === 'playing' ? 'Stop' : 'Listen'}
    >
      {state === 'loading' ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : state === 'playing' ? (
        <VolumeX className="w-3.5 h-3.5" />
      ) : (
        <Volume2 className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
