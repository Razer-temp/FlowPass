/**
 * AI Crowd Advisor Panel — Powered by Google Gemini
 *
 * Displays real-time AI-powered crowd safety analysis on the
 * Organizer Dashboard. Uses Gemini 2.0 Flash to evaluate live
 * event data and provide actionable recommendations.
 *
 * Google Service: Google Generative AI (Gemini API)
 */

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, ShieldCheck, AlertTriangle, RefreshCw, Loader2, Brain, ChevronRight } from 'lucide-react';
import { analyzeCrowdSafety, isGeminiAvailable } from '../../lib/gemini';
import type { CrowdAnalysisInput, AIRecommendation } from '../../lib/gemini';
import type { FlowZone, GateDisplay } from '../../types';

interface AIAdvisorProps {
  eventName: string;
  venue: string;
  totalCrowd: number;
  exitedCount: number;
  remainingCount: number;
  zones: FlowZone[];
  gates: GateDisplay[];
  isPaused: boolean;
}

export default function AIAdvisorPanel({
  eventName, venue, totalCrowd, exitedCount, remainingCount,
  zones, gates, isPaused
}: AIAdvisorProps) {
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const geminiReady = isGeminiAvailable();

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const input: CrowdAnalysisInput = {
        eventName,
        venue,
        totalCrowd,
        exitedCount,
        remainingCount,
        zones: zones.map(z => ({
          name: z.name,
          status: z.status,
          estimatedPeople: z.estimated_people,
          exitTime: z.exit_time,
          gates: z.gates,
        })),
        gates: gates.map(g => ({
          name: g.name,
          status: g.status,
        })),
        isPaused,
      };

      const result = await analyzeCrowdSafety(input);
      setRecommendation(result);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[AI Advisor] Analysis failed:', err);
      setError('Analysis failed. Will retry automatically.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [eventName, venue, totalCrowd, exitedCount, remainingCount, zones, gates, isPaused]);

  // Auto-analyze on mount and every 30 seconds
  useEffect(() => {
    runAnalysis();
    const interval = setInterval(runAnalysis, 30000);
    return () => clearInterval(interval);
  }, [runAnalysis]);

  // Safety score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-go';
    if (score >= 50) return 'text-amber-500';
    return 'text-stop';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-go/10 border-go/30';
    if (score >= 50) return 'bg-amber-500/10 border-amber-500/30';
    return 'bg-stop/10 border-stop/30';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 75) return 'GOOD';
    if (score >= 50) return 'CAUTION';
    return 'CRITICAL';
  };

  return (
    <div className="bg-surface border border-purple-500/20 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-purple-500/10 border-b border-purple-500/20 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">AI Crowd Advisor</h3>
            <p className="text-[10px] text-purple-400 font-mono">Powered by Google Gemini</p>
          </div>
        </div>
        <button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          aria-label="Refresh AI analysis"
          className="p-2 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
        >
          {isAnalyzing ? (
            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 text-dim" />
          )}
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Loading State */}
        {isAnalyzing && !recommendation && (
          <div className="flex flex-col items-center py-6 text-center">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
            <p className="text-sm text-dim">Analyzing crowd data with Gemini AI...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-stop/10 border border-stop/20 rounded-xl p-3 text-sm text-stop">
            {error}
          </div>
        )}

        {/* Results */}
        {recommendation && (
          <>
            {/* Safety Score */}
            <div className={`border rounded-xl p-4 text-center ${getScoreBg(recommendation.safetyScore)}`}>
              <div className="text-xs font-mono text-dim tracking-widest mb-1">SAFETY SCORE</div>
              <div className={`text-4xl font-timer tracking-wider ${getScoreColor(recommendation.safetyScore)}`}>
                {recommendation.safetyScore}
              </div>
              <div className={`text-xs font-bold mt-1 ${getScoreColor(recommendation.safetyScore)}`}>
                {getScoreLabel(recommendation.safetyScore)}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-sm text-white leading-relaxed">{recommendation.summary}</p>
            </div>

            {/* Risks */}
            {recommendation.risks.length > 0 && recommendation.risks[0] !== 'No critical risks detected' && (
              <div>
                <h4 className="text-xs font-bold text-dim tracking-wider mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500" /> RISKS DETECTED
                </h4>
                <div className="space-y-1.5">
                  {recommendation.risks.map((risk, i) => (
                    <div key={i} className="bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2 text-xs text-amber-200 flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">⚠</span>
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div>
              <h4 className="text-xs font-bold text-dim tracking-wider mb-2 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-go" /> RECOMMENDED ACTIONS
              </h4>
              <div className="space-y-1.5">
                {recommendation.actions.map((action, i) => (
                  <div key={i} className="bg-go/5 border border-go/10 rounded-lg px-3 py-2 text-xs text-green-200 flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 text-go mt-0.5 shrink-0" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[10px] text-dim pt-2 border-t border-white/5">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                {geminiReady ? 'Google Gemini 2.0 Flash' : 'Built-in Analyzer'}
              </span>
              {lastUpdated && (
                <span>Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
