// server/models/AIUsageLog.js
import mongoose from 'mongoose';

const aiUsageLogSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  userEmail: { 
    type: String, 
    required: true,
    lowercase: true,
    index: true 
  },
  featureUsed: { 
    type: String, 
    required: true,
    enum: ['cover-letter', 'interview-qa', 'resume-analysis'],
    index: true 
  },
  // Context about what they were applying for
  companyName: { type: String },
  jobRole: { type: String },
  applicationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Application' 
  },
  
  // Result tracking
  success: { type: Boolean, required: true, default: false },
  errorMessage: { type: String },
  
  // Performance & cost metrics
  tokenCount: { type: Number }, // Approximate tokens used
  responseTime: { type: Number }, // In milliseconds
  modelUsed: { type: String, default: 'gemini-flash-latest' },
  
  // Metadata
  ipAddress: { type: String },
  userAgent: { type: String },
  
  createdAt: { type: Date, default: Date.now, expires: '90d' } // Auto-delete after 90 days
});

// Compound index for analytics queries
aiUsageLogSchema.index({ userId: 1, createdAt: -1 });
aiUsageLogSchema.index({ featureUsed: 1, createdAt: -1 });

export default mongoose.model('AIUsageLog', aiUsageLogSchema);