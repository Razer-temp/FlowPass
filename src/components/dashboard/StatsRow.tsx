import { motion } from 'motion/react';
import { Users, CheckCircle2, AlertTriangle, TrendingDown } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

interface StatsRowProps {
  total: number;
  exited: number;
  remaining: number;
  chaosScore: number;
}

// Mock data for the sparkline
const mockSparklineData = [
  { value: 90 }, { value: 88 }, { value: 85 }, { value: 82 }, 
  { value: 80 }, { value: 78 }, { value: 75 }, { value: 72 }
];

export default function StatsRow({ total, exited, remaining, chaosScore }: StatsRowProps) {
  const percentExited = Math.round((exited / total) * 100) || 0;
  
  // ETE Predictor (Mocked calculation for prototype)
  const exitRatePerMin = 1200; // Mock rate
  const minsToEmpty = Math.ceil(remaining / exitRatePerMin);
  const eteTime = new Date(Date.now() + minsToEmpty * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" aria-live="polite">
      
      {/* TOTAL PASSES */}
      <div className="bg-surface border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-dim text-sm font-bold tracking-wider">TOTAL PASSES</h3>
          <Users className="w-5 h-5 text-dim" />
        </div>
        <div className="text-3xl font-black mb-1">{total.toLocaleString()}</div>
        <div className="text-sm text-dim">All passes generated</div>
      </div>

      {/* EXITED */}
      <div className="bg-surface border border-white/10 rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 h-1 bg-go" style={{ width: `${percentExited}%` }} />
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-dim text-sm font-bold tracking-wider">EXITED <CheckCircle2 className="inline w-4 h-4 text-go" /></h3>
        </div>
        <div className="text-3xl font-black text-go mb-1">{exited.toLocaleString()}</div>
        <div className="text-sm text-dim">{percentExited}% cleared</div>
      </div>

      {/* REMAINING */}
      <div className="bg-surface border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-dim text-sm font-bold tracking-wider">REMAINING</h3>
          <AlertTriangle className={`w-5 h-5 ${remaining > total * 0.5 ? 'text-amber-500' : 'text-go'}`} />
        </div>
        <div className="text-3xl font-black mb-1">{remaining.toLocaleString()}</div>
        <div className="text-sm text-dim">
          Est. empty by <span className="text-white font-bold">{eteTime}</span>
        </div>
      </div>

      {/* CHAOS SCORE */}
      <div className="bg-surface border border-white/10 rounded-2xl p-5 relative">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-dim text-sm font-bold tracking-wider">CHAOS SCORE</h3>
          <div className="text-xs font-bold px-2 py-1 rounded bg-white/5 text-dim flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-go" /> 5%
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div className={`text-3xl font-black ${
            chaosScore > 60 ? 'text-stop' : chaosScore > 30 ? 'text-amber-500' : 'text-go'
          }`}>
            {chaosScore}%
          </div>
          
          {/* Sparkline */}
          <div className="w-24 h-10 opacity-50">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockSparklineData}>
                <YAxis domain={[0, 100]} hide />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={chaosScore > 60 ? '#ef4444' : '#22c55e'} 
                  fill={chaosScore > 60 ? '#ef4444' : '#22c55e'} 
                  fillOpacity={0.2} 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
}
