const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['walking', 'running', 'cycling'],
    required: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  duration: {
    type: Number, // seconds
    required: true,
  },
  distance: {
    type: Number, // km
    required: true,
  },
  steps: {
    type: Number,
    default: 0,
  },
  calories: {
    type: Number,
    required: true,
  },
  
  // GPS Route
  route: [{
    lat: Number,
    lng: Number,
    timestamp: Date,
  }],

  // Pace/Speed
  avgSpeed: Number, // km/h
  avgPace: Number, // min/km

  // Auto-detected segments
  segments: [{
    type: {
      type: String,
      enum: ['walking', 'running', 'cycling'],
    },
    duration: Number,
    distance: Number,
    calories: Number,
  }],

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient queries
activitySchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Activity', activitySchema);
