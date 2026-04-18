import express from 'express';
import cors from 'cors';
import translate from 'google-translate-api-x';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Simple in-memory cache to save on duplicate translations
// Note: In a multi-instance deployment, this cache is per-instance.
const translationCache = new Map();

app.post('/api/translate', async (req, res) => {
  try {
    const { texts, targetLanguage } = req.body;

    if (!texts || !targetLanguage) {
      return res.status(400).json({ error: 'Missing texts or targetLanguage in request body.' });
    }

    const textArray = Array.isArray(texts) ? texts : [texts];
    const results = [];
    const textsToTranslate = [];
    const indicesToTranslate = [];

    // Check cache first
    textArray.forEach((text, i) => {
      const cacheKey = `${targetLanguage}:${text}`;
      if (translationCache.has(cacheKey)) {
        results[i] = translationCache.get(cacheKey);
      } else {
        textsToTranslate.push(text);
        indicesToTranslate.push(i);
      }
    });

    // Translate what's missing from cache using the free public engine
    if (textsToTranslate.length > 0) {
      const translateResponse = await translate(textsToTranslate, { to: targetLanguage });
      // The API returns an array of objects if multiple texts were passed, or a single object if there was only one text.
      const translatedArray = Array.isArray(translateResponse) ? translateResponse : [translateResponse];

      translatedArray.forEach((translatedItem, i) => {
        const translatedText = translatedItem.text;
        const originalText = textsToTranslate[i];
        const cacheKey = `${targetLanguage}:${originalText}`;
        
        translationCache.set(cacheKey, translatedText);
        
        const originalIndex = indicesToTranslate[i];
        results[originalIndex] = translatedText;
      });
    }

    res.json({ translations: results, source: 'google-translate-api-x' });

  } catch (error) {
    console.error('[Server] Translation Engine Failed:', error.message || error);
    // Graceful degradation: return original text so the UI never breaks
    const textArray = Array.isArray(req.body?.texts) ? req.body.texts : [req.body?.texts].filter(Boolean);
    res.json({ translations: textArray, error: 'Free engine temporarily unavailable: Falling back to original text.' });
  }
});

// ─── Google Cloud Text-to-Speech Proxy ─────────────────────────
// Uses default application credentials on Cloud Run (free tier: 4M chars/month)
// Falls back to a 503 response in local development.
app.post('/api/tts', async (req, res) => {
  try {
    const { text, language = 'en-US' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing "text" in request body.' });
    }

    // Truncate to 5000 chars (API limit per request)
    const truncatedText = text.slice(0, 5000);

    // Attempt to get access token via default credentials (works on Cloud Run)
    let accessToken = '';
    try {
      const tokenResponse = await fetch(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
        { headers: { 'Metadata-Flavor': 'Google' } }
      );
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        accessToken = tokenData.access_token;
      }
    } catch {
      // Not on Google Cloud — metadata server unavailable
    }

    if (!accessToken) {
      return res.status(503).json({
        error: 'Google Cloud TTS is only available in production (Cloud Run).',
        hint: 'The browser will fall back to Web Speech API automatically.'
      });
    }

    // Call Google Cloud Text-to-Speech API
    const ttsResponse = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: truncatedText },
        voice: {
          languageCode: language,
          name: `${language}-Standard-C`,
          ssmlGender: 'FEMALE',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 0.95,
          pitch: 0,
        },
      }),
    });

    if (!ttsResponse.ok) {
      const errorBody = await ttsResponse.text();
      console.error('[Server] TTS API error:', errorBody);
      return res.status(502).json({ error: 'Google Cloud TTS API returned an error.' });
    }

    const ttsData = await ttsResponse.json();
    res.json({ audioContent: ttsData.audioContent });

  } catch (error) {
    console.error('[Server] TTS endpoint failed:', error.message || error);
    res.status(500).json({ error: 'TTS processing failed.' });
  }
});

// Serve the Vite static build
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback for React Router (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Listening on port ${PORT}`);
  console.log(`[Server] Free Translation Engine Ready.`);
});
