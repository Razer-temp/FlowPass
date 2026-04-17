/**
 * FlowPass — Google Gemini AI Integration
 *
 * Provides AI-powered crowd safety analysis and smart announcement generation
 * using Google's Generative AI (Gemini 2.0 Flash).
 *
 * Google Service: Google Generative AI (Gemini API)
 * Free tier: 15 requests/minute, 1M tokens/day
 */

import { GoogleGenAI } from '@google/genai';

// ─── Configuration ─────────────────────────────────────────────

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const MODEL_ID = 'gemini-2.0-flash';

let aiClient: GoogleGenAI | null = null;

/**
 * Lazily initializes the Google GenAI client.
 * Returns null if no API key is configured (graceful degradation).
 */
function getClient(): GoogleGenAI | null {
  if (!GEMINI_API_KEY) {
    console.warn('[Gemini] No API key configured. AI features disabled.');
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return aiClient;
}

// ─── Types ─────────────────────────────────────────────────────

export interface CrowdAnalysisInput {
  eventName: string;
  venue: string;
  totalCrowd: number;
  exitedCount: number;
  remainingCount: number;
  zones: Array<{
    name: string;
    status: string;
    estimatedPeople: number;
    exitTime: string;
    gates: string[];
  }>;
  gates: Array<{
    name: string;
    status: string;
  }>;
  isPaused: boolean;
}

export interface AIRecommendation {
  summary: string;
  risks: string[];
  actions: string[];
  safetyScore: number;
}

export interface AnnouncementContext {
  eventName: string;
  venue: string;
  activeZones: string[];
  waitingZones: string[];
  blockedGates: string[];
  exitedPercent: number;
  totalCrowd: number;
  customTopic?: string;
}

// ─── Core AI Functions ─────────────────────────────────────────

/**
 * Analyzes live crowd data and returns AI-powered safety recommendations.
 *
 * Uses Gemini to evaluate current event conditions and suggest actions
 * to prevent bottlenecks, stampedes, and optimize crowd flow.
 *
 * @param input - Live event metrics from the organizer dashboard
 * @returns AI-generated safety analysis with risk assessment
 */
export async function analyzeCrowdSafety(input: CrowdAnalysisInput): Promise<AIRecommendation> {
  const client = getClient();

  if (!client) {
    return getFallbackRecommendation(input);
  }

  const prompt = buildCrowdAnalysisPrompt(input);

  try {
    const response = await client.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 512,
        topP: 0.8,
      },
    });

    const text = response.text || '';
    return parseAIRecommendation(text, input);
  } catch (error) {
    console.error('[Gemini] Crowd analysis failed:', error);
    return getFallbackRecommendation(input);
  }
}

/**
 * Generates context-aware announcement messages using Gemini AI.
 *
 * Takes the current event state (zones, gates, crowd density) and an optional
 * custom topic to produce a clear, concise announcement suitable for
 * broadcast to attendees.
 *
 * @param context - Current event state for context-aware generation
 * @returns Generated announcement text (max 160 chars)
 */
export async function generateSmartAnnouncement(context: AnnouncementContext): Promise<string> {
  const client = getClient();

  if (!client) {
    return getFallbackAnnouncement(context);
  }

  const prompt = buildAnnouncementPrompt(context);

  try {
    const response = await client.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 100,
        topP: 0.9,
      },
    });

    const text = (response.text || '').trim();
    // Enforce 160-character limit for SMS-style announcements
    return text.slice(0, 160);
  } catch (error) {
    console.error('[Gemini] Announcement generation failed:', error);
    return getFallbackAnnouncement(context);
  }
}

/**
 * Checks if Gemini AI is available (API key configured).
 */
export function isGeminiAvailable(): boolean {
  return !!GEMINI_API_KEY;
}

// ─── Prompt Engineering ────────────────────────────────────────

function buildCrowdAnalysisPrompt(input: CrowdAnalysisInput): string {
  const exitPercent = input.totalCrowd > 0
    ? Math.round((input.exitedCount / input.totalCrowd) * 100)
    : 0;

  const zoneDetails = input.zones.map(z =>
    `  - ${z.name}: status=${z.status}, people=~${z.estimatedPeople}, gates=[${z.gates.join(',')}], exit_time=${z.exitTime}`
  ).join('\n');

  const gateDetails = input.gates.map(g =>
    `  - ${g.name}: ${g.status}`
  ).join('\n');

  return `You are a crowd safety AI advisor for live events. Analyze this real-time data and provide actionable safety recommendations.

EVENT: ${input.eventName} at ${input.venue}
TOTAL CROWD: ${input.totalCrowd.toLocaleString()}
EXITED: ${input.exitedCount.toLocaleString()} (${exitPercent}%)
REMAINING: ${input.remainingCount.toLocaleString()}
PAUSED: ${input.isPaused ? 'YES — ALL EXITS PAUSED' : 'No'}

ZONES:
${zoneDetails}

GATES:
${gateDetails}

Respond in this EXACT format (no markdown, no extra text):
SUMMARY: [One sentence describing overall crowd safety status]
RISK: [Risk item 1]
RISK: [Risk item 2 if any]
ACTION: [Recommended action 1]
ACTION: [Recommended action 2 if any]
ACTION: [Recommended action 3 if any]
SAFETY_SCORE: [Number 1-100, where 100 is safest]

Focus on:
- Bottleneck detection (gates handling too many zones)
- Timing gaps between zone releases
- Blocked/busy gates requiring rerouting
- Overall crowd density risks`;
}

function buildAnnouncementPrompt(context: AnnouncementContext): string {
  const topic = context.customTopic
    ? `The organizer wants to announce about: "${context.customTopic}"`
    : 'Generate a general status update announcement.';

  return `You are writing a short public announcement for a live event crowd management system.

EVENT: ${context.eventName} at ${context.venue}
CROWD: ${context.totalCrowd.toLocaleString()} total, ${context.exitedPercent}% have exited
ACTIVE ZONES (currently exiting): ${context.activeZones.length > 0 ? context.activeZones.join(', ') : 'None'}
WAITING ZONES: ${context.waitingZones.length > 0 ? context.waitingZones.join(', ') : 'None'}
BLOCKED GATES: ${context.blockedGates.length > 0 ? context.blockedGates.join(', ') : 'None'}

${topic}

Rules:
1. Maximum 160 characters
2. Clear, calm, and reassuring tone
3. Include specific zone/gate names if relevant
4. No hashtags, no emojis, no URLs
5. Respond with ONLY the announcement text, nothing else`;
}

// ─── Response Parsing ──────────────────────────────────────────

function parseAIRecommendation(text: string, input: CrowdAnalysisInput): AIRecommendation {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let summary = 'Crowd flow analysis complete.';
  const risks: string[] = [];
  const actions: string[] = [];
  let safetyScore = 75;

  for (const line of lines) {
    if (line.startsWith('SUMMARY:')) {
      summary = line.replace('SUMMARY:', '').trim();
    } else if (line.startsWith('RISK:')) {
      risks.push(line.replace('RISK:', '').trim());
    } else if (line.startsWith('ACTION:')) {
      actions.push(line.replace('ACTION:', '').trim());
    } else if (line.startsWith('SAFETY_SCORE:')) {
      const score = parseInt(line.replace('SAFETY_SCORE:', '').trim());
      if (!isNaN(score) && score >= 1 && score <= 100) {
        safetyScore = score;
      }
    }
  }

  // Ensure we always have at least one item
  if (risks.length === 0) risks.push('No critical risks detected');
  if (actions.length === 0) actions.push('Continue monitoring crowd flow');

  return { summary, risks, actions, safetyScore };
}

// ─── Fallback (No API Key / Rate Limited) ──────────────────────

function getFallbackRecommendation(input: CrowdAnalysisInput): AIRecommendation {
  const exitPercent = input.totalCrowd > 0
    ? Math.round((input.exitedCount / input.totalCrowd) * 100)
    : 0;

  const blockedGates = input.gates.filter(g => g.status === 'BLOCKED');
  const busyGates = input.gates.filter(g => g.status === 'BUSY');
  const activeZones = input.zones.filter(z => z.status === 'ACTIVE');

  const risks: string[] = [];
  const actions: string[] = [];

  if (blockedGates.length > 0) {
    risks.push(`${blockedGates.map(g => g.name).join(', ')} blocked — rerouting needed`);
    actions.push(`Redirect attendees from ${blockedGates[0].name} to nearest open gate`);
  }

  if (busyGates.length > 0) {
    risks.push(`${busyGates.map(g => g.name).join(', ')} experiencing high crowd density`);
  }

  if (activeZones.length > 2) {
    risks.push(`${activeZones.length} zones exiting simultaneously — monitor for bottlenecks`);
  }

  if (input.isPaused) {
    risks.push('All exits are paused — crowd buildup risk increasing');
    actions.push('Resume exits as soon as safely possible');
  }

  if (risks.length === 0) risks.push('No critical risks detected');
  if (actions.length === 0) actions.push('Continue monitoring — crowd flow is stable');

  let safetyScore = 85;
  if (blockedGates.length > 0) safetyScore -= 20;
  if (busyGates.length > 0) safetyScore -= 10;
  if (input.isPaused) safetyScore -= 15;
  if (exitPercent > 50) safetyScore += 5;

  return {
    summary: `${exitPercent}% exited. ${activeZones.length} zone(s) active. ${blockedGates.length > 0 ? 'Gate blockage detected.' : 'Flow is stable.'}`,
    risks,
    actions,
    safetyScore: Math.max(10, Math.min(100, safetyScore)),
  };
}

function getFallbackAnnouncement(context: AnnouncementContext): string {
  if (context.blockedGates.length > 0) {
    return `${context.blockedGates[0]} is temporarily closed. Please use alternate exits. Staff are here to help.`;
  }
  if (context.activeZones.length > 0) {
    return `${context.activeZones.join(' and ')} — please proceed to your assigned gate now. Move calmly.`;
  }
  return 'Please remain seated and wait for your zone to be called. Exit instructions will appear on your FlowPass.';
}
