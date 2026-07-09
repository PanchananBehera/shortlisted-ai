import mongoose from 'mongoose';

const interviewSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetRole: { type: String, required: true, index: true },
  dreamCompany: String,
  experienceLevel: { type: String, enum: ['junior', 'mid', 'senior'], default: 'mid' },
  overallScore: Number,
  questionCount: Number,
  duration: String,
  
  // ✅ NEW: Session Recording Fields
  audioRecordingUrl: String, // MongoDB GridFS or cloud storage URL
  transcript: [{
    timestamp: Number, // milliseconds from start
    speaker: { type: String, enum: ['ai', 'user'] },
    text: String,
    confidence: Number, // for speech recognition confidence
    sentimentScore: Number, // -1 to 1 (negative to positive)
    toneTags: [String] // ['confident', 'hesitant', 'professional', etc.]
  }],
  recordingDuration: Number, // in seconds
  audioBlobId: mongoose.Schema.Types.ObjectId, // Reference to GridFS file
  
  // ✅ NEW: Real-Time Coaching Data
  coachingHints: [{
    timestamp: Number,
    questionIndex: Number,
    hint: String,
    category: { type: String, enum: ['structure', 'content', 'delivery', 'confidence'] }
  }],
  
  // Existing fields
  strengths: [String],
  weaknesses: [String],
  suggestions: [String],
  detailedAssessment: [{
    question: String,
    answer: String,
    score: Number,
    assessment: String,
    idealAnswer: String
  }],
  roadmap: [{
    skill: String,
    actionStep: String,
    priority: { type: String, enum: ['Critical', 'Important', 'Optional'] },
    timeEstimate: String
  }],
  
  // Metadata
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Index for fast playback queries
interviewSessionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('InterviewSession', interviewSessionSchema);