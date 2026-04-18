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
