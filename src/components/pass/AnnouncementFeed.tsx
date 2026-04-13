import { useState, useEffect } from 'react';
import { Megaphone } from 'lucide-react';

interface AnnouncementFeedProps {
  announcements: any[];
}

export default function AnnouncementFeed({ announcements }: AnnouncementFeedProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const getTimeAgo = (dateString: string) => {
    const diff = now - new Date(dateString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins === 1) return '1 min ago';
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  };

  const isNew = (dateString: string) => {
    const diff = now - new Date(dateString).getTime();
    return diff < 5 * 60000; // 5 mins
  };

  return (
    <div className="mt-12 mb-12 px-2">
      <div className="flex items-center gap-3 mb-6">
        <Megaphone className="w-6 h-6 text-blue-400" />
        <h3 className="text-xl font-heading font-bold uppercase tracking-wide">From the Organiser</h3>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-surface border border-white/5 rounded-xl p-6 text-center text-dim">
          <p>No announcements yet.</p>
          <p className="text-sm mt-1">Check back here for live updates from the organiser.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann, idx) => {
            const newItem = isNew(ann.created_at);
            return (
              <div key={ann.id} className="bg-surface border border-white/10 rounded-xl p-5 relative overflow-hidden">
                {newItem && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 animate-pulse" />
                )}
                <p className="text-lg leading-relaxed mb-3">{ann.message}</p>
                <div className="flex items-center gap-3 text-xs text-dim font-medium">
                  <span>{getTimeAgo(ann.created_at)}</span>
                  {newItem && (
                    <>
                      <span>·</span>
                      <span className="text-amber-500 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> NEW
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
