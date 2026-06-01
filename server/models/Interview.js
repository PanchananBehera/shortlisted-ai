import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetRole: { type: String, required: true },
  jobDescription: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  conversation: [{
    role: { type: String, enum: ['ai', 'user'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  feedback: {
    overallScore: Number,
    strengths: [String],
    weaknesses: [String],
    suggestions: [String],
    detailedAssessment: [{
      question: String,
      answer: String,
      assessment: String,
      score: Number,
      idealAnswer: String
    }],
    roadmap: [{
      skill: String,
      priority: String,
      actionStep: String,
      timeEstimate: String
    }]
  }
}, { timestamps: true });

export default mongoose.model('Interview', interviewSchema);
