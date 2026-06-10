// server/models/interviewSession.js
import mongoose from 'mongoose';

const InterviewSessionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  targetRole: { type: String, required: true },  // ✅ Made required
  dreamCompany: String,
  experienceLevel: { 
    type: String, 
    enum: ['junior', 'mid', 'senior'],
    default: 'mid'
  },
  overallScore: Number,
  questionCount: Number,
  duration: String, // e.g., "12m 34s"
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
  }]
}, { timestamps: true });  // ✅ Adds createdAt and updatedAt automatically

// Add virtual for formatted date display
InterviewSessionSchema.virtual('completedAtFormatted').get(function() {
  return this.createdAt?.toLocaleDateString('en-US', {
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Ensure virtuals are included when converting to JSON
InterviewSessionSchema.set('toJSON', { virtuals: true });
InterviewSessionSchema.set('toObject', { virtuals: true });

export default mongoose.model('InterviewSession', InterviewSessionSchema);