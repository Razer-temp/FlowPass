/**
 * FlowPass — ActivityLog Dashboard Component
 *
 * Displays a real-time timeline of all event activity (zone changes,
 * pass scans, gate reassignments, announcements). Supports CSV export.
 */

import { Download } from 'lucide-react';
import type { FlowActivityLog } from '../../types';

interface ActivityLogProps {
  /** The event to show logs for */
  eventId: string;
  /** Activity log entries, newest-first */
  logs: FlowActivityLog[];
}

export default function ActivityLog({ eventId, logs }: ActivityLogProps) {
  
  const handleDownloadCSV = () => {
    if (logs.length === 0) return;
    
    const headers = ['Timestamp', 'Type', 'Action'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        new Date(log.created_at).toISOString(),
        log.type,
        `"${log.action.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `flowpass-log-${eventId.substring(0,8)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[400px]">
      <div className="p-3 border-b border-white/10 flex justify-end bg-background/50">
        <button 
          onClick={handleDownloadCSV}
          className="text-xs flex items-center gap-1 text-dim hover:text-white transition-colors"
        >
          <Download className="w-3 h-3" /> Download CSV
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {logs.length === 0 ? (
          <p className="text-sm text-dim italic text-center mt-4">Waiting for activity...</p>
        ) : (
          logs.map((log, idx) => {
            let dotColor = 'bg-white/20';
            if (log.type === 'REASSIGN') dotColor = 'bg-purple-500';
            if (log.type === 'BLOCK') dotColor = 'bg-stop';
            if (log.type === 'PASS') dotColor = 'bg-go';
            if (log.type === 'ANNOUNCE') dotColor = 'bg-blue-500';

            return (
              <div key={idx} className="flex gap-3 text-sm">
                <div className="flex flex-col items-center mt-1">
                  <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                  {idx !== logs.length - 1 && <div className="w-px h-full bg-white/10 my-1" />}
                </div>
                <div className="pb-4">
                  <div className="text-xs text-dim mb-0.5">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  <div className="text-white">{log.action}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
