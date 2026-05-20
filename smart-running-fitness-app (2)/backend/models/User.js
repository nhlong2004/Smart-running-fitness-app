const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    select: false,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  avatar: {
    type: String,
  },
  provider: {
    type: String,
    enum: ['local', 'google', 'facebook'],
    default: 'local',
  },
  googleId: String,
  facebookId: String,

  // Profile data
  profile: {
    age: Number,
    gender: {
      type: String,
      enum: ['male', 'female'],
    },
    height: Number, // cm
    weight: Number, // kg
    targetWeight: Number,
    targetMonths: Number,
    goal: {
      type: String,
      enum: ['lose', 'maintain', 'fitness'],
    },
    bmi: Number,
    bmiCategory: String,
    tdee: Number,
    dailyCalorieTarget: Number,
    dailyStepTarget: Number,
  },

  // Stats
  stats: {
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalDistance: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 },
    totalCalories: { type: Number, default: 0 },
    totalSteps: { type: Number, default: 0 },
  },

  // Badges earned
  badges: [{
    badgeId: String,
    earnedDate: Date,
  }],

  // Settings
  settings: {
    notifications: { type: Boolean, default: true },
    units: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
    language: { type: String, default: 'vi' },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update timestamp
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('User', userSchema);
