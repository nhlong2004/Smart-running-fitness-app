const express = require('express');
const router = express.Router();
const passport = require('passport');
const Activity = require('../models/Activity');
const DailyRecord = require('../models/DailyRecord');
const User = require('../models/User');

const requireAuth = passport.authenticate('jwt', { session: false });

// Create new activity session
router.post('/', requireAuth, async (req, res) => {
  try {
    const { type, duration, distance, steps, calories, route, avgSpeed, avgPace, segments } = req.body;

    const activity = await Activity.create({
      userId: req.user._id,
      type,
      date: new Date(),
      duration,
      distance,
      steps,
      calories,
      route,
      avgSpeed,
      avgPace,
      segments,
    });

    // Update daily record
    const today = new Date().toISOString().split('T')[0];
    let dailyRecord = await DailyRecord.findOne({ userId: req.user._id, date: today });

    if (dailyRecord) {
      dailyRecord.steps += steps || 0;
      dailyRecord.distance += distance || 0;
      dailyRecord.calories += calories || 0;
      dailyRecord.activeMinutes += Math.round(duration / 60);
      dailyRecord.sessions.push(activity._id);
      
      // Check if goal reached
      const user = await User.findById(req.user._id);
      if (user.profile) {
        dailyRecord.goalReached = 
          dailyRecord.calories >= user.profile.dailyCalorieTarget ||
          dailyRecord.steps >= user.profile.dailyStepTarget;
      }
      
      await dailyRecord.save();
    } else {
      dailyRecord = await DailyRecord.create({
        userId: req.user._id,
        date: today,
        steps: steps || 0,
        distance: distance || 0,
        calories: calories || 0,
        activeMinutes: Math.round(duration / 60),
        sessions: [activity._id],
      });
    }

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: {
        'stats.totalDistance': distance || 0,
        'stats.totalSessions': 1,
        'stats.totalCalories': calories || 0,
        'stats.totalSteps': steps || 0,
      },
    });

    res.status(201).json({
      success: true,
      activity,
      dailyRecord,
    });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({ error: 'Không thể lưu hoạt động' });
  }
});

// Get activities history
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    const query = { userId: req.user._id };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const activities = await Activity.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Activity.countDocuments(query);

    res.json({
      success: true,
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Không thể tải lịch sử hoạt động' });
  }
});

// Get single activity
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!activity) {
      return res.status(404).json({ error: 'Không tìm thấy hoạt động' });
    }

    res.json({ success: true, activity });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Không thể tải hoạt động' });
  }
});

// Get daily records
router.get('/daily/records', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = { userId: req.user._id };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const records = await DailyRecord.find(query)
      .sort({ date: -1 })
      .populate('sessions');

    res.json({
      success: true,
      records,
    });
  } catch (error) {
    console.error('Get daily records error:', error);
    res.status(500).json({ error: 'Không thể tải dữ liệu hàng ngày' });
  }
});

// Update water intake
router.put('/daily/water', requireAuth, async (req, res) => {
  try {
    const { glasses, date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    let record = await DailyRecord.findOne({ userId: req.user._id, date: targetDate });

    if (record) {
      record.waterGlasses = glasses;
      await record.save();
    } else {
      record = await DailyRecord.create({
        userId: req.user._id,
        date: targetDate,
        waterGlasses: glasses,
      });
    }

    res.json({ success: true, record });
  } catch (error) {
    console.error('Update water error:', error);
    res.status(500).json({ error: 'Không thể cập nhật lượng nước' });
  }
});

// Get weekly/monthly stats
router.get('/stats/summary', requireAuth, async (req, res) => {
  try {
    const { period = 'week' } = req.query; // week or month
    const days = period === 'week' ? 7 : 30;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const records = await DailyRecord.find({
      userId: req.user._id,
      date: { $gte: startDateStr },
    }).sort({ date: 1 });

    const summary = {
      totalSteps: 0,
      totalCalories: 0,
      totalDistance: 0,
      totalMinutes: 0,
      activeDays: 0,
      goalReachedDays: 0,
      data: [],
    };

    records.forEach(record => {
      summary.totalSteps += record.steps;
      summary.totalCalories += record.calories;
      summary.totalDistance += record.distance;
      summary.totalMinutes += record.activeMinutes;
      if (record.activeMinutes > 0) summary.activeDays++;
      if (record.goalReached) summary.goalReachedDays++;
      
      summary.data.push({
        date: record.date,
        steps: record.steps,
        calories: record.calories,
        distance: record.distance,
        minutes: record.activeMinutes,
        goalReached: record.goalReached,
      });
    });

    res.json({ success: true, summary });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Không thể tải thống kê' });
  }
});

module.exports = router;
