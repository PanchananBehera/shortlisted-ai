import mongoose from 'mongoose';

const analysisHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resumeName: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  analysis: {
    score: Number,
    atsScore: Number,
    keywordScore: Number,
    formattingScore: Number,
    overallScore: Number,
    strengths: [String],
    weaknesses: [String],
    missingSkills: [String],
    missingKeywords: [String],
    improvements: [String],
    detectedSkills: [String],
    experienceLevel: String,
    correctedResume: String,
    roadmap: [{
      skill: String,
      priority: String,
      actionStep: String,
      timeEstimate: String,
      resources: [String]
    }],
    issues: [{
      type: { type: String },
      description: String,
      severity: String
    }],
    atsCheck: {
      overallScore: Number,
      keywordMatch: {
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
    }
  }
}, { timestamps: true });

export default mongoose.model('AnalysisHistory', analysisHistorySchema);