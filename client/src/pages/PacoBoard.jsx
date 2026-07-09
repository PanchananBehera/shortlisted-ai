import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axios';
import { motion } from 'framer-motion';

const PacoBoard = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredBadge, setHoveredBadge] = useState(null);

  useEffect(() => {
    fetchProgressData();
    fetchLeaderboard();
  }, [user]);

  const fetchProgressData = async () => {
    try {
      const res = await api.get('/user/progress');
      setProgress(res.data);
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get('/user/leaderboard');
      setLeaderboard(res.data);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (!progress) return null;

  const weeklyXP = progress.totalXP % 300;
  const weeklyProgress = (weeklyXP / 300) * 100;
  const myRank = leaderboard.findIndex((p) => p.userId === user?._id);
  
  const badges = [
    { id: 'first-interview', name: 'Career Starter', icon: '🚀', desc: 'First mock interview', target: 1, type: 'sessions' },
    { id: 'week-warrior', name: 'Consistent Practicer', icon: '', desc: '7-day practice streak', target: 7, type: 'streak' },
    { id: 'month-master', name: 'Interview Pro', icon: '👑', desc: '30-day practice streak', target: 30, type: 'streak' },
    { id: 'perfect-score', name: 'Precision Answerer', icon: '💎', desc: 'Score 95%+ on interview', target: 95, type: 'score' },
    { id: 'consistent', name: 'Dedicated Learner', icon: '📅', desc: 'Complete 10 interviews', target: 10, type: 'sessions' },
    { id: 'xp-elite', name: 'Mastery Achieved', icon: '', desc: 'Reach 5,000 skill XP', target: 5000, type: 'xp' },
  ];

  const earnedBadges = badges.filter((b) => progress.badges?.includes(b.id));
  const completionRate = Math.round((earnedBadges.length / badges.length) * 100);

  const missions = [
    {
      id: 1,
      title: 'Interview Starter',
      desc: 'Complete 1 mock interview',
      current: progress.totalSessions,
      target: 1,
      reward: '+50 XP',
      icon: '',
      color: 'bg-green-500',
    },
    {
      id: 2,
      title: 'Knowledge Builder',
      desc: 'Earn 500 total skill XP',
      current: progress.totalXP,
      target: 500,
      reward: '+100 XP',
      icon: '📚',
      color: 'bg-teal-500',
    },
    {
      id: 3,
      title: 'Consistency Champion',
      desc: 'Maintain 3-day practice streak',
      current: progress.currentStreak,
      target: 3,
      reward: 'Badge',
      icon: '🔥',
      color: 'bg-amber-500',
    },
  ];

  const getBadgeProgress = (badge) => {
    if (badge.type === 'sessions') return progress.totalSessions;
    if (badge.type === 'streak') return progress.currentStreak;
    if (badge.type === 'xp') return progress.totalXP;
    return 0;
  };

  const displayName = (user?.name || user?.fullName || 'Learner').split(' ')[0];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* HERO SECTION */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 sm:gap-8">
              
              {/* Avatar & Info */}
              <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-md">
                    {displayName[0]}
                  </div>
                  <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border-2 border-white dark:border-slate-900 shadow-sm">
                    LVL {progress.level}
                  </div>
                </div>
                
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{displayName}</h1>
                  <div className="flex items-center gap-2 sm:gap-3 mt-2 flex-wrap">
                    <span className="px-2 sm:px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs sm:text-sm font-semibold rounded-full border border-green-200 dark:border-green-800">
                      {myRank >= 0 ? `Rank #${myRank + 1}` : 'Building Foundation'}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{progress.totalSessions} interviews completed</span>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
                <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl sm:text-2xl">🔥</span>
                    <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{progress.currentStreak}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Day Streak</p>
                </div>
                
                <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl sm:text-2xl">⭐</span>
                    <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{progress.totalXP}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total XP</p>
                </div>
                
                <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl sm:text-2xl">🏆</span>
                    <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{earnedBadges.length}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Badges Earned</p>
                </div>
                
                <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl sm:text-2xl"></span>
                    <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{completionRate}%</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Completion</p>
                </div>
              </div>
            </div>

            {/* Weekly Progress Bar */}
            <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Weekly Practice Goal</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{weeklyXP} / 300 XP</span>
              </div>
              <div className="h-2.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, weeklyProgress)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">Keep practicing to unlock weekly rewards! </p>
            </div>
          </div>
        </motion.div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          
          {/* LEFT: MISSIONS & RECENT ACHIEVEMENTS */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Daily Missions */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm"
            >
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
                <span className="text-xl sm:text-2xl">🎯</span> Daily Missions
              </h3>
              
              <div className="space-y-3 sm:space-y-4">
                {missions.map((mission, idx) => {
                  const isComplete = mission.current >= mission.target;
                  const pct = Math.min(100, (mission.current / mission.target) * 100);
                  
                  return (
                    <motion.div
                      key={mission.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + idx * 0.1 }}
                      whileHover={{ y: -2 }}
                      className={`relative p-3 sm:p-4 rounded-lg border transition-all ${
                        isComplete
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2 sm:mb-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-lg sm:text-xl">{mission.icon}</span>
                          <div>
                            <h4 className={`text-xs sm:text-sm font-bold ${isComplete ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                              {mission.title}
                            </h4>
                            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-0.5">{mission.desc}</p>
                          </div>
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">{mission.reward}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex-1 h-1.5 sm:h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${mission.color}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6 }}
                          />
                        </div>
                        <span className="text-[9px] sm:text-xs text-gray-600 dark:text-gray-400 font-mono whitespace-nowrap">
                          {mission.current}/{mission.target}
                        </span>
                      </div>
                      
                      {isComplete && (
                        <div className="absolute top-2 right-2 text-green-600 dark:text-green-400 text-sm sm:text-lg">✓</div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Recent Achievements */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm"
            >
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
                <span className="text-xl sm:text-2xl">🎉</span> Recent Achievements
              </h3>
              
              <div className="space-y-2 sm:space-y-3">
                {earnedBadges.length > 0 ? (
                  earnedBadges.slice(-3).map((badge, idx) => (
                    <motion.div
                      key={badge.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-base sm:text-xl shadow-sm">
                        {badge.icon}
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">{badge.name}</p>
                        <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">Just unlocked!</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🏆</div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Complete your first interview to earn badges!</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* CENTER: LEADERBOARD */}
          <div className="lg:col-span-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm h-full flex flex-col"
            >
              <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-xl sm:text-2xl">🏆</span> Performance Leaderboard
                  </h3>
                  <span className="text-[10px] sm:text-xs font-semibold text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 px-2 sm:px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30">
                    Global Rankings
                  </span>
                </div>
              </div>

              <div className="p-3 sm:p-4 space-y-2 flex-1 overflow-y-auto max-h-[600px] sm:max-h-[700px]">
                {leaderboard.length > 0 ? (
                  leaderboard.map((p, index) => {
                    const isMe = p.userId === user?._id;
                    const rankColors = {
                      0: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
                      1: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700',
                      2: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                    };
                    
                    return (
                      <motion.div
                        key={p._id || index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ x: 2 }}
                        className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-all ${
                          isMe
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 shadow-sm'
                            : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700'
                        }`}
                      >
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-sm sm:text-lg font-bold border ${
                          index < 3 ? rankColors[index] : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-600'
                        }`}>
                          {index === 0 ? '🥇' : index === 1 ? '' : index === 2 ? '' : `#${index + 1}`}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`text-xs sm:text-sm font-bold truncate ${isMe ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                            {p.name || 'Anonymous'}
                            {isMe && <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs text-green-600 dark:text-green-400">(You)</span>}
                          </p>
                          <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                            <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Level {p.level}</span>
                            <span className="w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full" />
                            <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">{p.currentStreak}-day streak</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className={`text-sm sm:text-lg font-bold ${isMe ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>{p.totalXP.toLocaleString()}</p>
                          <p className="text-[9px] sm:text-xs text-gray-600 dark:text-gray-400">Skill XP</p>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-gray-500 dark:text-gray-400">
                    <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📊</div>
                    <p className="text-xs sm:text-sm">Loading leaderboard data...</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* RIGHT: ACHIEVEMENT SHOWCASE */}
          <div className="lg:col-span-3">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm h-full"
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-xl sm:text-2xl">🏅</span> Achievement Showcase
                </h3>
                <span className="text-[10px] sm:text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 px-2 sm:px-3 py-1 rounded-full">
                  {earnedBadges.length}/{badges.length}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
                {badges.map((badge, idx) => {
                  const isEarned = !!earnedBadges.find((b) => b.id === badge.id);
                  const currentVal = getBadgeProgress(badge);
                  const pct = Math.min(100, (currentVal / badge.target) * 100);

                  return (
                    <motion.div
                      key={badge.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + idx * 0.05 }}
                      onMouseEnter={() => setHoveredBadge(badge.id)}
                      onMouseLeave={() => setHoveredBadge(null)}
                      whileHover={{ y: -2 }}
                      className={`relative rounded-lg sm:rounded-xl border p-3 sm:p-4 flex flex-col items-center text-center cursor-pointer transition-all ${
                        isEarned
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 shadow-sm'
                          : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700'
                      }`}
                    >
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-2xl mb-2 ${
                        isEarned ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-sm' : 'bg-gray-200 dark:bg-slate-700 text-gray-400'
                      }`}>
                        {isEarned ? badge.icon : '🔒'}
                      </div>
                      
                      <p className={`text-[10px] sm:text-xs font-bold leading-tight mb-1 ${
                        isEarned ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {badge.name}
                      </p>
                      
                      {!isEarned && (
                        <>
                          <div className="w-full h-1 sm:h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1 sm:mt-2">
                            <motion.div
                              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                          <p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                            {currentVal}/{badge.target}
                          </p>
                        </>
                      )}

                      {hoveredBadge === badge.id && !isEarned && (
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-slate-700 text-white text-[9px] sm:text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-10 shadow-md">
                          {badge.desc}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Completion Progress */}
              <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 sm:p-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Skill Coverage</span>
                  <span className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">{completionRate}%</span>
                </div>
                <div className="h-2 sm:h-2.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionRate}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="text-center p-2 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700">
                    <div className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">{earnedBadges.length}</div>
                    <div className="text-[8px] sm:text-[9px] text-gray-600 dark:text-gray-400 uppercase font-semibold">Earned</div>
                  </div>
                  <div className="text-center p-2 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700">
                    <div className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">{badges.length - earnedBadges.length}</div>
                    <div className="text-[8px] sm:text-[9px] text-gray-600 dark:text-gray-400 uppercase font-semibold">In Progress</div>
                  </div>
                  <div className="text-center p-2 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700">
                    <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">{badges.length}</div>
                    <div className="text-[8px] sm:text-[9px] text-gray-600 dark:text-gray-400 uppercase font-semibold">Total</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PacoBoard;