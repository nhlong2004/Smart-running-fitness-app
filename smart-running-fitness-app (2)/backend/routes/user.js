const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');

// Middleware: Require authentication
const requireAuth = passport.authenticate('jwt', { session: false });

// Get current user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
        profile: user.profile,
        stats: user.stats,
        badges: user.badges,
        settings: user.settings,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Không thể tải hồ sơ' });
  }
});

// Update user profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, profile, settings } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (profile) updateData.profile = { ...req.user.profile, ...profile };
    if (settings) updateData.settings = { ...req.user.settings, ...settings };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    );

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        profile: user.profile,
        stats: user.stats,
        settings: user.settings,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Không thể cập nhật hồ sơ' });
  }
});

// Update user stats
router.put('/stats', requireAuth, async (req, res) => {
  try {
    const { stats } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { stats: { ...req.user.stats, ...stats } },
      { new: true }
    );

    res.json({
      success: true,
      stats: user.stats,
    });
  } catch (error) {
    console.error('Update stats error:', error);
    res.status(500).json({ error: 'Không thể cập nhật thống kê' });
  }
});

// Add badge
router.post('/badges', requireAuth, async (req, res) => {
  try {
    const { badgeId } = req.body;

    const user = await User.findById(req.user._id);
    
    // Check if badge already earned
    const alreadyEarned = user.badges.some(b => b.badgeId === badgeId);
    if (alreadyEarned) {
      return res.status(400).json({ error: 'Huy hiệu đã được nhận' });
    }

    user.badges.push({
      badgeId,
      earnedDate: new Date(),
    });
    await user.save();

    res.json({
      success: true,
      badges: user.badges,
    });
  } catch (error) {
    console.error('Add badge error:', error);
    res.status(500).json({ error: 'Không thể thêm huy hiệu' });
  }
});

// Sync all data (for backup/restore)
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const { profile, stats, badges, settings } = req.body;

    const updateData = {};
    if (profile) updateData.profile = profile;
    if (stats) updateData.stats = stats;
    if (badges) updateData.badges = badges;
    if (settings) updateData.settings = settings;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    );

    res.json({
      success: true,
      message: 'Đồng bộ thành công',
      user: {
        id: user._id,
        profile: user.profile,
        stats: user.stats,
        badges: user.badges,
        settings: user.settings,
      },
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Không thể đồng bộ dữ liệu' });
  }
});

// Delete account
router.delete('/account', requireAuth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ success: true, message: 'Tài khoản đã được xóa' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Không thể xóa tài khoản' });
  }
});

module.exports = router;
