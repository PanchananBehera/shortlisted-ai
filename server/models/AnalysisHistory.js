// server/models/AnalysisHistory.js
import mongoose from 'mongoose';

const analysisHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetRole: { type: String, required: true },
  jobDescription: { type: String, trim: true },
  
  // Analysis results
  score: { type: Number, required: true },
  strengths: [String],
  weaknesses: [String],
  missingSkills: [String],
  improvements: [String],
  issues: [{
    type: { type: String },
    description: String,
    severity: { type: String, enum: ['Low', 'Medium', 'High'] }
  }],
  
  // ATS Check data
  atsCheck: {
    overallScore: Number,
    keywordMatch: {
      score: Number,
      matchedKeywords: [String],
      missingKeywords: [String]
    },
    formatting: {
      hasTables: Boolean,
      hasGraphics: Boolean,
      hasColumns: Boolean,
      usesStandardHeadings: Boolean,
      fontCompatibility: String,
      issues: [String]
    },
    recommendations: [String]
  },
  
  // Roadmap
  roadmap: [{
    skill: String,
    actionStep: String,
    priority: { type: String, enum: ['Critical', 'Important', 'Optional'] },
    timeEstimate: String,
    resources: [String]
  }],
  
  // Optimized resume text
  correctedResume: { type: String, required: true },
  
  // Metadata
  fileName: String,
  createdAt: { type: Date, default: Date.now }
});

// Index for faster queries
analysisHistorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('AnalysisHistory', analysisHistorySchema);