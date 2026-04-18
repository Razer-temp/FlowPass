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

// ─── Firebase Cloud Messaging — Zone Unlock Notifications ──────
// Uses the FCM HTTP v1 API directly (same pattern as TTS above).
// No firebase-admin dependency — just fetch() + GCP default credentials.
// Free: Unlimited messages on all Firebase plans.

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

app.post('/api/notify-zone', async (req, res) => {
  try {
    const { eventId, zoneId, zoneName, gate, type, title, body } = req.body;

    if (!eventId || !zoneId) {
      return res.status(400).json({ error: 'Missing eventId or zoneId.' });
    }

    if (!FIREBASE_PROJECT_ID) {
      return res.status(503).json({
        error: 'Firebase Cloud Messaging is not configured.',
        hint: 'Set FIREBASE_PROJECT_ID environment variable to enable push notifications.'
      });
    }

    // Step 1: Get GCP access token (same pattern as TTS)
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
        error: 'FCM push is only available in production (Cloud Run).',
        hint: 'The app will use in-browser realtime updates as fallback.'
      });
    }

    // Step 2: Query Supabase for all FCM tokens in this zone (or all zones if ALL)
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(503).json({ error: 'Supabase credentials not configured on server.' });
    }

    const zoneQuery = zoneId === 'ALL' ? `event_id=eq.${eventId}` : `zone_id=eq.${zoneId}`;
    const supabaseQuery = await fetch(
      `${SUPABASE_URL}/rest/v1/passes?${zoneQuery}&fcm_token=not.is.null&select=id,fcm_token,gate_id,attendee_name`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!supabaseQuery.ok) {
      console.error('[Server] Supabase query failed:', await supabaseQuery.text());
      return res.status(502).json({ error: 'Failed to query pass tokens from database.' });
    }

    const passes = await supabaseQuery.json();
    const tokens = passes.map(p => p.fcm_token).filter(Boolean);

    if (tokens.length === 0) {
      return res.json({ sent: 0, message: 'No push tokens registered for this zone.' });
    }

    console.log(`[Server] Sending FCM push to ${tokens.length} devices for ${zoneName}`);

    // Step 3: Send FCM notifications in batches (max 500 per request)
    const BATCH_SIZE = 500;
    let totalSuccess = 0;
    let totalFailure = 0;
    const staleTokenIds = [];

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE);
      const batchPasses = passes.slice(i, i + BATCH_SIZE);

      // Send individual messages for each token (FCM v1 doesn't have multicast)
      const sendPromises = batch.map(async (token, idx) => {
        const pass = batchPasses[idx];
        const passGate = pass?.gate_id || gate || 'your assigned gate';
        const passUrl = `${process.env.APP_URL || 'https://flowpass.app'}/pass/${pass?.id || ''}`;

        const fcmPayload = {
          message: {
            token,
            data: {
              title: title || `🟢 EXIT NOW — ${zoneName}`,
              body: body || `Your zone is open! Head to ${passGate} now.`,
              zoneId: zoneId,
              zoneName: zoneName || 'ALL',
              gate: passGate,
              passUrl: passUrl,
              type: type || 'unlock'
            },
            webpush: {
              headers: { Urgency: 'high', TTL: type === 'announcement' ? '86400' : '600' },
              fcm_options: { link: passUrl },
            },
          },
        };

        try {
          const fcmResponse = await fetch(
            `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(fcmPayload),
            }
          );

          if (fcmResponse.ok) {
            totalSuccess++;
          } else {
            const errorBody = await fcmResponse.json().catch(() => ({}));
            const errorCode = errorBody?.error?.details?.[0]?.errorCode || errorBody?.error?.status || '';

            // Clean up stale/invalid tokens
            if (errorCode === 'UNREGISTERED' || errorCode === 'INVALID_ARGUMENT') {
              staleTokenIds.push(pass?.id);
            }
            totalFailure++;
          }
        } catch {
          totalFailure++;
        }
      });

      await Promise.all(sendPromises);
    }

    // Step 4: Clean up stale tokens from Supabase
    if (staleTokenIds.length > 0) {
      console.log(`[Server] Cleaning ${staleTokenIds.length} stale FCM tokens.`);
      await fetch(
        `${SUPABASE_URL}/rest/v1/passes?id=in.(${staleTokenIds.join(',')})`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ fcm_token: null }),
        }
      );
    }

    console.log(`[Server] FCM results: ${totalSuccess} sent, ${totalFailure} failed, ${staleTokenIds.length} cleaned.`);
    res.json({ sent: totalSuccess, failed: totalFailure, cleaned: staleTokenIds.length });

  } catch (error) {
    console.error('[Server] FCM notify-zone failed:', error.message || error);
    res.status(500).json({ error: 'Push notification dispatch failed.' });
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
