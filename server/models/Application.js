import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  companyName: { type: String, required: true, trim: true },
  jobRole: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['Applied', 'Interview Scheduled', 'HR Round', 'Offer Received', 'Rejected', 'Withdrawn'],
    default: 'Applied',
    required: true
  },
  dateApplied: { type: Date, required: true },
  jobDescription: { type: String, trim: true },
  followUpDate: { type: Date },
  ctc: { type: String, trim: true },
  location: { type: String, trim: true },
  applicationLink: { type: String, trim: true },
  notes: { type: String, trim: true },
  coverLetter: { type: String }
}, { 
  timestamps: true
});

export default mongoose.model('Application', applicationSchema);