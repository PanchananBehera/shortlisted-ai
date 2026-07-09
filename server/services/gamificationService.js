import UserProgress from '../models/UserProgress.js';

// 🌍 Timezone-safe date utilities
const getTodayUTC = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const getYesterdayUTC = () => {
  const d = getTodayUTC();
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
};

//  Streak Calculator
export const calculateStreak = (lastPracticeDate) => {
  if (!lastPracticeDate) return { current: 1, increased: true };
  
  const last = new Date(lastPracticeDate);
  const today = getTodayUTC();
  
  last.setUTCHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return { current: null, increased: false }; // Already practiced today
  if (diffDays === 1) return { increased: true }; // Continue streak
  return { current: 1, increased: true }; // Streak broken, reset to 1
};

// ⭐ XP & Level Calculator
export const calculateXP = (score, durationMinutes, currentStreak) => {
  let xp = 100; // Base completion XP
  xp += Math.floor(score * 1.5); // Score bonus
  xp += Math.floor(durationMinutes * 3); // Time bonus
  if (currentStreak >= 7) xp += 50;
  if (currentStreak >= 30) xp += 200;
  return xp;
};

export const calculateLevel = (totalXP) => Math.floor(Math.sqrt(totalXP / 150)) + 1;

// 🏆 Badge Conditions
const BADGE_CHECKS = {
  'first-interview': (progress) => progress.totalSessions >= 1,
  'perfect-score': (session) => session.overallScore >= 95,
  'week-warrior': (progress) => progress.currentStreak >= 7,
  'month-master': (progress) => progress.currentStreak >= 30,
  'xp-elite': (progress) => progress.totalXP >= 5000,
  'consistent': (progress) => progress.totalSessions >= 10
};

export const checkNewBadges = (progress, session) => {
  const newBadges = [];
  for (const [badgeId, condition] of Object.entries(BADGE_CHECKS)) {
    if (!progress.badges.includes(badgeId) && condition(progress, session)) {
      newBadges.push(badgeId);
    }
  }
  return newBadges;
};

//  Main Progress Updater
export const updateGamification = async (userId, sessionData) => {
  const today = getTodayUTC();
  let progress = await UserProgress.findOne({ userId });
  
  if (!progress) {
    progress = new UserProgress({ userId, lastPracticeDate: today });
  }

  const streakResult = calculateStreak(progress.lastPracticeDate);
  
  // Update streak
  if (streakResult.current !== null) progress.currentStreak = streakResult.current;
  if (progress.currentStreak > progress.longestStreak) {
    progress.longestStreak = progress.currentStreak;
  }

  // Calculate & add XP
  const xpGained = calculateXP(
    sessionData.overallScore || 0,
    parseInt(sessionData.duration) || 15,
    progress.currentStreak
  );
  progress.totalXP += xpGained;
  progress.level = calculateLevel(progress.totalXP);
  progress.totalSessions += 1;
  progress.lastPracticeDate = today;

  // Check for new badges
  const newBadges = checkNewBadges(progress, sessionData);
  if (newBadges.length > 0) {
    progress.badges = [...new Set([...progress.badges, ...newBadges])];
  }

  await progress.save();
  return { progress, xpGained, newBadges, streakIncreased: streakResult.increased };
};