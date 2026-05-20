const mongoose = require('mongoose');

const dailyRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  date: {
    type: String, // YYYY-MM-DD format
    required: true,
  },
  steps: {
    type: Number,
    default: 0,
  },
  distance: {
    type: Number, // km
    default: 0,
  },
  calories: {
    type: Number,
    default: 0,
  },
  activeMinutes: {
    type: Number,
    default: 0,
  },
  waterGlasses: {
    type: Number,
    default: 0,
  },
  waterTarget: {
    type: Number,
    default: 8,
  },
  goalReached: {
    type: Boolean,
    default: false,
  },
  sessions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient user+date queries
dailyRecordSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyRecord', dailyRecordSchema);
