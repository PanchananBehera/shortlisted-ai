// client/src/components/LiveActivityFeed.jsx - Live User Activity Feed
import React, { useState, useEffect } from 'react';
import { useRealTimeTrack } from '../hooks/useRealTimeTrack';

const EVENT_ICONS = {
  'user:online': '🟢',
  'user:offline': '⚪',
  'page:view': '👁️',
  'feature:interact': '🎯',
  'ai:request': '🤖',
  'ai:response': '✅',
  'app:error': '🔥'
};

const EVENT_COLORS = {
  'user:online': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'user:offline': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  'page:view': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'feature:interact': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'ai:request': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'app:error': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
};

const LiveActivityFeed = ({ limit = 20, userId = null }) => {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({ activeUsers: 0, eventsPerMinute: 0 });
  const { onLiveUpdate, isConnected } = useRealTimeTrack();

  // ✅ Listen for real-time updates
  useEffect(() => {
    const cleanup = onLiveUpdate('live-update', (data) => {
      // Filter by userId if specified
      if (userId && data.userId !== userId) return;
      
      setActivities(prev => {
        const newActivity = {
          id: `${data.userId}-${data.timestamp}-${data.event}`,
          ...data,
          time: new Date(data.timestamp).toLocaleTimeString()
        };
        const updated = [newActivity, ...prev].slice(0, limit);
        return updated;
      });
      
      // Update stats
      setStats(prev => ({
        ...prev,
        eventsPerMinute: prev.eventsPerMinute + 1
      }));
    });
    
    return cleanup;
  }, [onLiveUpdate, userId, limit]);

  // ✅ Reset stats every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({ ...prev, eventsPerMinute: 0 }));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!isConnected) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl text-center text-gray-500">
        🔌 Connecting to real-time feed...
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/50 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200/50 dark:border-slate-800 flex justify-between items-center">
        <h3 className="font-serif font-bold text-gray-900 dark:text-white">
          📡 Live Activity Feed
        </h3>
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
            🟢 {stats.activeUsers} active
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            ⚡ {stats.eventsPerMinute}/min
          </span>
        </div>
      </div>

      {/* Activity List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
        {activities.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Waiting for activity...
          </div>
        ) : (
          activities.map((activity) => (
            <div 
              key={activity.id}
              className="p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <span className="text-xl mt-0.5">
                  {EVENT_ICONS[activity.event] || '📍'}
                </span>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVENT_COLORS[activity.event] || 'bg-gray-100'}`}>
                      {activity.event}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {activity.time}
                    </span>
                  </div>
                  
                  {/* Metadata */}
                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                      {activity.metadata.feature && (
                        <p>🎯 Feature: <span className="font-medium">{activity.metadata.feature}</span></p>
                      )}
                      {activity.metadata.path && (
                        <p>📄 Page: <span className="font-medium">{activity.metadata.path}</span></p>
                      )}
                      {activity.metadata.action && (
                        <p>⚡ Action: <span className="font-medium">{activity.metadata.action}</span></p>
                      )}
                      {activity.metadata.duration && (
                        <p>⏱️ Duration: <span className="font-medium">{activity.metadata.duration}ms</span></p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* User Avatar (if global feed) */}
                {!userId && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                    {activity.userId?.slice(-2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LiveActivityFeed;