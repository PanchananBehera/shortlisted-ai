// src/models/ErrorReport.js
// ✅ Schema for storing user-submitted error reports
import mongoose from 'mongoose';
import crypto from 'crypto';


const errorReportSchema = new mongoose.Schema({
  // 🎯 Error identification
  type: {
    type: String,
    required: true,
    enum: [
      'file_too_large',
      'invalid_file_type', 
      'empty_file',
      'ai_timeout',
      'analysis_failed',
      'quota_exceeded',
      'network_error',
      'unauthorized',
      'generic'
    ],
    index: true
  },
  
  // 📝 User-facing message (for context)
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // 🔍 Technical context (sanitized, non-sensitive only)
  context: {
    fileSize: Number, // in bytes
    fileType: String, // MIME type
    targetRole: String,
    hasJobDescription: Boolean,
    includePhoto: Boolean,
    fileName: String, // filename only, NOT content
    statusCode: Number, // HTTP status if available
    // Auto-collected metadata
    timestamp: { type: Date, default: Date.now },
    path: String, // URL path where error occurred
    userAgent: String // Browser info for debugging
  },
  
  // 👤 User info (optional, for authenticated users)
  user: {
    _id: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      index: true 
    },
    email: { 
      type: String, 
      lowercase: true, 
      index: true 
    }
    // ❌ NEVER store: password, tokens, PII beyond email
  },
  
  // 🚨 Severity auto-calculated for alerting
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  
  // ✅ Status workflow
  status: {
    type: String,
    enum: ['new', 'acknowledged', 'resolved', 'dismissed'],
    default: 'new',
    index: true
  },
  
  // 📊 Analytics
  count: { 
    type: Number, 
    default: 1,
    description: 'Deduplication: increment if same error reported multiple times'
  },
  
  // 🔗 For grouping similar errors
  fingerprint: {
    type: String,
    index: true,
    description: 'Hash of type+message+context for deduplication'
  }
  
}, {
  timestamps: true, // Adds createdAt/updatedAt
  toJSON: { 
    virtuals: true,
    transform: (doc, ret) => {
      // ✅ Never expose raw user data in API responses
      delete ret.user?._id;
      delete ret.user?.email;
      return ret;
    }
  }
});

// 🔐 Indexes for efficient querying
errorReportSchema.index({ createdAt: -1 });
errorReportSchema.index({ type: 1, status: 1 });
errorReportSchema.index({ 'user._id': 1, createdAt: -1 });

// 🎯 Virtual: Human-readable severity badge
errorReportSchema.virtual('severityBadge').get(function() {
  const colors = {
    low: '🟢',
    medium: '🟡', 
    high: '🟠',
    critical: '🔴'
  };
  return `${colors[this.severity]} ${this.severity.toUpperCase()}`;
});

// 🎯 Virtual: Age in hours for dashboard
errorReportSchema.virtual('ageHours').get(function() {
  return Math.round((Date.now() - this.createdAt) / (1000 * 60 * 60));
});

// 🔍 Pre-save: Auto-calculate severity and fingerprint
errorReportSchema.pre('save', function(next) {
  // Auto-severity based on error type
  const criticalTypes = ['analysis_failed', 'network_error'];
  const highTypes = ['ai_timeout', 'quota_exceeded'];
  
  if (criticalTypes.includes(this.type)) {
    this.severity = 'critical';
  } else if (highTypes.includes(this.type)) {
    this.severity = 'high';
  } else if (this.context?.statusCode >= 500) {
    this.severity = 'high';
  } else if (this.context?.statusCode >= 400) {
    this.severity = 'medium';
  }
  
  // Auto-fingerprint for deduplication
  if (!this.fingerprint) {
    const data = `${this.type}:${this.message}:${this.context?.statusCode}:${this.context?.fileType}`;
    this.fingerprint = crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }
  
  next();
});

// 🔄 Method: Increment count for deduplication
errorReportSchema.statics.upsertReport = async function(reportData) {
  const { fingerprint, ...rest } = reportData;
  
  const existing = await this.findOne({ fingerprint });
  
  if (existing) {
    // ✅ Same error reported again: increment count, update timestamp
    return await this.findByIdAndUpdate(
      existing._id,
      { 
        $inc: { count: 1 },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );
  }
  
  // ✅ New error: create document
  return await this.create(reportData);
};

export default mongoose.model('ErrorReport', errorReportSchema);