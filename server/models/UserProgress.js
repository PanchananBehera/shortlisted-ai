import mongoose from 'mongoose';

const userProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastPracticeDate: { type: Date },
  totalXP: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  badges: [{ type: String }], // e.g., ['first-interview', 'week-warrior']
  totalSessions: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('UserProgress', userProgressSchema);