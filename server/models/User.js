import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  // 👇 ADD THESE FIELDS IF MISSING 👇
  phone: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  college: {
    type: String,
    default: ''
  },
  degree: {
    type: String,
    default: ''
  },
  graduationYear: {
    type: Number,
    default: null
  },
  skills: [{
    type: String
  }],
  github: {
    type: String,
    default: ''
  },
  linkedin: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  }
  // 👆 ADD THESE FIELDS IF MISSING 👆
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;