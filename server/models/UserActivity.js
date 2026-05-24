// server/models/UserActivity.js - User Activity Tracking Schema
import mongoose from 'mongoose';

const userActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  event: {
    type: String,
    required: true,
    index: true
  },
  
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  processed: {
    type: Boolean,
    default: false,
    index: true
  },
  
  sessionId: {
    type: String,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userActivitySchema.virtual('eventLabel').get(function() {
  const labels = {
    'user:online': '🟢 User Online',
    'user:offline': '⚪ User Offline',
    'page:view': '👁️ Page View',
    'feature:interact': '🎯 Feature Used',
    'ai:request': '🤖 AI Request',
    'app:error': '🔥 Error Occurred'
  };
  return labels[this.event] || this.event;
});

userActivitySchema.index({ userId: 1, timestamp: -1 });
userActivitySchema.index({ event: 1, timestamp: -1 });

// Optional: Auto-delete after 30 days
// userActivitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model('UserActivity', userActivitySchema);