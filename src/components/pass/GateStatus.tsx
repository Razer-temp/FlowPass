import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface GateStatusProps {
  gates: any[];
  userGate: string;
}

export default function GateStatus({ gates, userGate }: GateStatusProps) {
  if (!gates || gates.length === 0) return null;

  return (
    <div className="mt-12 mb-8 px-2">
      <h3 className="text-xl font-heading font-bold mb-1">Right Now at Your Gates</h3>
      <p className="text-sm text-dim mb-6">Updated live — no refresh needed</p>
      
      <div className="space-y-3" role="list">
        {gates.map((gate, idx) => {
          const isUserGate = gate.name === userGate;
          
          let statusIcon = <CheckCircle2 className="w-5 h-5 text-go" />;
          let statusColor = 'text-go';
          let statusText = 'Clear';
          let statusDesc = 'Flowing smoothly — go here';

          if (gate.status === 'BUSY') {
            statusIcon = <Clock className="w-5 h-5 text-amber-500" />;
            statusColor = 'text-amber-500';
            statusText = 'Moderate';
            statusDesc = 'Moving but slow — allow extra time';
          } else if (gate.status === 'BLOCKED') {
            statusIcon = <AlertTriangle className="w-5 h-5 text-stop" />;
            statusColor = 'text-stop';
            statusText = 'Closed';
            statusDesc = 'Do not use — gate is blocked';
          }

          return (
            <div 
              key={idx} 
              className={`bg-surface border rounded-xl p-4 flex items-center justify-between transition-colors ${isUserGate ? 'border-go/50 bg-go/5' : 'border-white/5'}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold">{gate.name}</span>
                  {isUserGate && (
                    <span className="text-[10px] font-bold bg-go/20 text-go px-2 py-0.5 rounded-full border border-go/30">
                      ← YOUR GATE
                    </span>
                  )}
                </div>
                <p className="text-xs text-dim">{statusDesc}</p>
              </div>
              <div className={`flex items-center gap-2 font-bold ${statusColor}`}>
                {statusIcon} {statusText}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
