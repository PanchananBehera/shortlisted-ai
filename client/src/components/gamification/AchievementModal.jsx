import React, { useEffect } from 'react';
import Confetti from 'react-confetti';

export const AchievementModal = ({ show, onClose, xpGained, newBadges, streakIncreased }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <Confetti recycle={false} numberOfPieces={300} className="pointer-events-none" />
      <div className="bg-slate-900 border border-purple-500/50 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 animate-bounce-in" onClick={e => e.stopPropagation()}>
        <div className="text-4xl mb-2">🎉</div>
        <h3 className="text-xl font-bold text-white">Session Complete!</h3>
        
        {xpGained > 0 && (
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3">
            <p className="text-purple-300 font-semibold">+{xpGained} XP Earned</p>
          </div>
        )}
        
        {streakIncreased && (
          <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3">
            <p className="text-orange-300 font-semibold"> Streak Increased!</p>
          </div>
        )}
        
        {newBadges?.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-slate-300">New Badges Unlocked:</p>
            <div className="flex justify-center gap-3">
              {newBadges.map(badge => (
                <div key={badge} className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-2 animate-pulse">
                  <span className="text-2xl"></span>
                  <p className="text-xs text-yellow-200 capitalize mt-1">{badge.replace('-', ' ')}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <button onClick={onClose} className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold transition">
          Awesome!
        </button>
      </div>
    </div>
  );
};