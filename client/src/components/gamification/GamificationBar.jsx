import React from 'react';
import { motion } from 'framer-motion';

const BadgeIcon = ({ id }) => {
  const icons = {
    'first-interview': '🎯',
    'perfect-score': '⭐',
    'week-warrior': '🔥',
    'month-master': '👑',
    'xp-elite': '💎',
    'consistent': '📅'
  };
  return icons[id] || '';
};

export const GamificationBar = ({ progress }) => {
  if (!progress) return null;
  const xpForNextLevel = Math.pow(progress.level, 2) * 150;
  const xpProgress = (progress.totalXP % xpForNextLevel) / xpForNextLevel;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-4">
      {/* Streak & Level */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-xs text-slate-400">Current Streak</p>
            <p className="text-lg font-bold text-orange-400">{progress.currentStreak} days</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Level {progress.level}</p>
          <div className="w-24 h-2 bg-slate-700 rounded-full mt-1 overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {progress.badges.map(badge => (
          <div key={badge} className="flex-shrink-0 bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-center w-16">
            <span className="text-xl block">{BadgeIcon(badge)}</span>
            <span className="text-[10px] text-slate-300 mt-1 block capitalize">{badge.replace('-', ' ')}</span>
          </div>
        ))}
        {progress.badges.length === 0 && (
          <p className="text-xs text-slate-500 italic">Complete interviews to earn badges!</p>
        )}
      </div>
    </div>
  );
};