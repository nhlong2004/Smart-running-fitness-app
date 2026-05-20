import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppScreen, UserProfile, DailyRecord, Badge, Notification as AppNotification } from './types';
import {
  loadData, saveData, getTodayString, getWaterTarget,
} from './store';
import { syncToCloud, loadFromCloud, getCurrentUid, waitForAuthUid, getUserData, saveUserData } from './services/firebase';
import OnboardingScreen from './components/OnboardingScreen';
import HomeScreen from './components/HomeScreen';
import TrackingScreen from './components/TrackingScreen';
import AnalyticsScreen from './components/AnalyticsScreen';
import HydrationScreen from './components/HydrationScreen';
import BadgesScreen from './components/BadgesScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import PlannerScreen from './components/PlannerScreen';
import NotificationsScreen from './components/NotificationsScreen';
import ProfileScreen from './components/ProfileScreen';
import ChallengeScreen from './components/ChallengeScreen';
import WallScreen from './components/WallScreen';
import AICoachScreen from './components/AICoachScreen';
import SettingsScreen from './components/SettingsScreen';
import BottomNav from './components/BottomNav';


function App() {
  const [screen, setScreen] = useState<AppScreen>('onboarding');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);

  const syncTimerRef = useRef<number | null>(null);
  const uidRef = useRef<string | null>(null);
  const lastNotificationIdRef = useRef<string | null>(null);

  // ═══════ Hàm sync lên cloud ═══════
  const doSyncToCloud = useCallback((
    p: UserProfile,
    dr: DailyRecord[],
    b: Badge[],
    cs: number, ls: number, td: number, ts: number,
  ) => {
    const uid = uidRef.current || getCurrentUid();
    if (!uid || !p) return;

    const totalCalories = dr.reduce((s, r) => s + r.calories, 0);
    const totalSteps = dr.reduce((s, r) => s + r.steps, 0);
    const statsPayload = {
      currentStreak: cs,
      longestStreak: ls,
      totalDistance: td,
      totalSessions: ts,
      totalCalories,
      totalSteps,
    };

    // Lưu NGAY vào users/{uid}.stats
    saveUserData(uid, {
      profile: p,
      stats: statsPayload,
      lastSyncAt: new Date().toISOString(),
    });

    // Đồng thời lưu backup chi tiết vào appData/{uid}
    syncToCloud(uid, {
      profile: p,
      dailyRecords: dr,
      badges: b,
      stats: statsPayload,
      lastSyncAt: new Date().toISOString(),
    });
  }, []);

  const restoreCurrentUserData = useCallback(async () => {
    const localData = loadData();

    const uid = await waitForAuthUid();
    uidRef.current = uid;

    if (uid) {
      try {
        const [cloudData, userDoc] = await Promise.all([
          loadFromCloud(uid),
          getUserData(uid),
        ]);

        const mergedProfile = (userDoc?.profile || cloudData?.profile) as UserProfile | null;
        const mergedStats = userDoc?.stats || cloudData?.stats;
        const dr = ((cloudData?.dailyRecords || []) as DailyRecord[]);
        const b = ((cloudData?.badges || localData.badges) as Badge[]);

        if (mergedProfile) {
          const cs = mergedStats?.currentStreak || 0;
          const ls = mergedStats?.longestStreak || 0;
          const td = mergedStats?.totalDistance || 0;
          const ts = mergedStats?.totalSessions || 0;

          setProfile(mergedProfile);
          setDailyRecords(dr);
          setBadges(b);
          setCurrentStreak(cs);
          setLongestStreak(ls);
          setTotalDistance(td);
          setTotalSessions(ts);
          setNotifications(localData.notifications);
          setScreen('home');

          saveData({
            profile: mergedProfile,
            dailyRecords: dr,
            badges: b,
            notifications: localData.notifications,
            currentStreak: cs,
            longestStreak: ls,
            totalDistance: td,
            totalSessions: ts,
          });
          return true;
        }
      } catch {
        // ignore, fallback local below
      }
    }

    if (localData.profile) { setProfile(localData.profile); setScreen('home'); }
    setDailyRecords(localData.dailyRecords);
    setBadges(localData.badges);
    setNotifications(localData.notifications);
    setCurrentStreak(localData.currentStreak);
    setLongestStreak(localData.longestStreak);
    setTotalDistance(localData.totalDistance);
    setTotalSessions(localData.totalSessions);
    return false;
  }, []);

  // ═══════ Load data khi mở app ═══════
  useEffect(() => {
    restoreCurrentUserData();
  }, [restoreCurrentUserData]);

  // ═══════ Lưu local + sync cloud mỗi khi data thay đổi ═══════
  const persistData = useCallback(() => {
    if (!profile) return;

    // Lưu local ngay
    saveData({ profile, dailyRecords, badges, notifications, currentStreak, longestStreak, totalDistance, totalSessions });

    // Sync cloud (debounce 1 giây)
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      doSyncToCloud(profile, dailyRecords, badges, currentStreak, longestStreak, totalDistance, totalSessions);
    }, 1000);
  }, [profile, dailyRecords, badges, notifications, currentStreak, longestStreak, totalDistance, totalSessions, doSyncToCloud]);

  useEffect(() => {
    persistData();
  }, [persistData]);

  // ═══════ Hiện thông báo hệ thống trên điện thoại/browser ═══════
  useEffect(() => {
    if (!notifications.length) return;

    const latest = notifications[0];
    const notifEnabled = localStorage.getItem('runmate_setting_notif') !== 'false';

    // Bỏ qua thông báo cũ lúc load app lần đầu
    if (!lastNotificationIdRef.current) {
      lastNotificationIdRef.current = latest.id;
      return;
    }

    if (lastNotificationIdRef.current === latest.id) return;
    lastNotificationIdRef.current = latest.id;

    if (!notifEnabled) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      new Notification('RunMate', {
        body: latest.message,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: latest.id,
      });
    } catch {
      // Ignore
    }
  }, [notifications]);

  // ═══════ Sync ngay khi thoát app / chuyển tab ═══════
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (profile) {
        // Sync đồng bộ lần cuối trước khi thoát
        doSyncToCloud(profile, dailyRecords, badges, currentStreak, longestStreak, totalDistance, totalSessions);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && profile) {
        doSyncToCloud(profile, dailyRecords, badges, currentStreak, longestStreak, totalDistance, totalSessions);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [profile, dailyRecords, badges, currentStreak, longestStreak, totalDistance, totalSessions, doSyncToCloud]);

  // Không tự động tạo notification - chỉ tạo sau buổi tập

  const getTodayRecord = (): DailyRecord => {
    const today = getTodayString();
    const existing = dailyRecords.find(r => r.date === today);
    if (existing) return existing;
    return {
      date: today,
      steps: 0,
      distance: 0,
      calories: 0,
      activeMinutes: 0,
      waterGlasses: 0,
      waterTarget: profile ? getWaterTarget(0) : 8,
      goalReached: false,
      sessions: [],
    };
  };

  const updateTodayRecord = (updater: (record: DailyRecord) => DailyRecord) => {
    const today = getTodayString();
    setDailyRecords(prev => {
      const existingIdx = prev.findIndex(r => r.date === today);
      const current = existingIdx >= 0 ? prev[existingIdx] : getTodayRecord();
      const updated = updater(current);
      
      // Check if goal reached
      if (profile) {
        updated.goalReached = updated.calories >= profile.dailyCalorieTarget || updated.steps >= profile.dailyStepTarget;
      }

      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = updated;
        return next;
      }
      return [...prev, updated];
    });
  };

  const checkBadges = (record: DailyRecord) => {
    if (!profile) return;
    const today = getTodayString();

    setBadges(prev => {
      const next = [...prev];

      // First step
      const firstStep = next.find(b => b.id === 'first_step');
      if (firstStep && !firstStep.earned && totalSessions >= 1) {
        firstStep.earned = true;
        firstStep.earnedDate = today;
        addAchievementNotif(firstStep.name);
      }

      // Calorie crusher
      const calCrusher = next.find(b => b.id === 'calorie_crusher');
      if (calCrusher && !calCrusher.earned && record.calories >= 1000) {
        calCrusher.earned = true;
        calCrusher.earnedDate = today;
        addAchievementNotif(calCrusher.name);
      }

      // Marathon hero (42km)
      const marathon = next.find(b => b.id === 'marathon_hero');
      if (marathon && !marathon.earned && totalDistance >= 42) {
        marathon.earned = true;
        marathon.earnedDate = today;
        addAchievementNotif(marathon.name);
      }

      // Century km
      const century = next.find(b => b.id === 'century_km');
      if (century && !century.earned && totalDistance >= 100) {
        century.earned = true;
        century.earnedDate = today;
        addAchievementNotif(century.name);
      }

      // Warrior 7
      const w7 = next.find(b => b.id === 'warrior_7');
      if (w7 && !w7.earned && currentStreak >= 7) {
        w7.earned = true;
        w7.earnedDate = today;
        addAchievementNotif(w7.name);
      }

      // Warrior 30
      const w30 = next.find(b => b.id === 'warrior_30');
      if (w30 && !w30.earned && currentStreak >= 30) {
        w30.earned = true;
        w30.earnedDate = today;
        addAchievementNotif(w30.name);
      }

      // Early bird
      const early = next.find(b => b.id === 'early_bird');
      if (early && !early.earned && new Date().getHours() < 6) {
        early.earned = true;
        early.earnedDate = today;
        addAchievementNotif(early.name);
      }

      return next;
    });
  };

  const addAchievementNotif = (badgeName: string) => {
    const now = new Date();
    setNotifications(prev => [{
      id: `badge_${Date.now()}`,
      message: `🎉 Chúc mừng! Bạn đã đạt huy hiệu "${badgeName}"!`,
      time: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
      type: 'achievement' as const,
      read: false,
    }, ...prev]);
  };

  const updateStreak = () => {
    const today = getTodayString();
    const todayRecord = dailyRecords.find(r => r.date === today);
    if (todayRecord?.goalReached) {
      // Check yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const yesterdayRecord = dailyRecords.find(r => r.date === yesterdayStr);

      if (yesterdayRecord?.goalReached || currentStreak === 0) {
        const newStreak = currentStreak + 1;
        setCurrentStreak(newStreak);
        if (newStreak > longestStreak) {
          setLongestStreak(newStreak);
        }
      }
    }
  };

  // Handlers
  const handleOnboardingComplete = (p: UserProfile) => {
    // Chỉ cập nhật hồ sơ/mục tiêu, KHÔNG reset thống kê cũ
    setProfile(p);
    setScreen('home');
  };

  const handleSessionEnd = (data: { type: 'walking' | 'running' | 'cycling'; duration: number; distance: number; steps: number; calories: number }) => {
    updateTodayRecord(record => ({
      ...record,
      steps: record.steps + data.steps,
      distance: record.distance + data.distance,
      calories: record.calories + data.calories,
      activeMinutes: record.activeMinutes + Math.round(data.duration / 60),
      waterTarget: getWaterTarget(record.activeMinutes + Math.round(data.duration / 60)),
    }));

    setTotalDistance(prev => prev + data.distance);
    setTotalSessions(prev => prev + 1);

    // Check badges & streak after update
    setTimeout(() => {
      const record = getTodayRecord();
      checkBadges(record);
      updateStreak();

      // ═══════ TẠO THÔNG BÁO SAU BUỔI TẬP ═══════
      if (!profile) return;
      const now = new Date();
      const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
      const activityName = data.type === 'walking' ? 'đi bộ' : data.type === 'running' ? 'chạy bộ' : 'đạp xe';
      const durationMin = Math.round(data.duration / 60);
      const newNotifs: AppNotification[] = [];

      // 1. Tổng kết buổi tập
      newNotifs.push({
        id: `workout_${Date.now()}`,
        message: `Bạn vừa ${activityName} ${durationMin} phút, đi được ${data.distance.toFixed(2)} km và đốt cháy ${data.calories} kcal. ${data.calories > 300 ? 'Tuyệt vời! 💪' : 'Cố gắng hơn lần sau nhé! 🔥'}`,
        time: timeStr,
        type: 'reminder',
        read: false,
      });

      // 2. Kiểm tra mục tiêu ngày
      const totalCalToday = record.calories + data.calories;
      const totalStepsToday = record.steps + data.steps;
      const calPercent = Math.round((totalCalToday / profile.dailyCalorieTarget) * 100);
      const stepPercent = Math.round((totalStepsToday / profile.dailyStepTarget) * 100);
      const goalReached = totalCalToday >= profile.dailyCalorieTarget || totalStepsToday >= profile.dailyStepTarget;

      if (goalReached) {
        newNotifs.push({
          id: `goal_done_${Date.now()}`,
          message: `🎉 Chúc mừng! Bạn đã hoàn thành mục tiêu ngày hôm nay! (${calPercent}% calo, ${stepPercent}% bước chân). Hãy nghỉ ngơi và bổ sung nước nhé!`,
          time: timeStr,
          type: 'goal',
          read: false,
        });
      } else {
        const remainCal = Math.max(profile.dailyCalorieTarget - totalCalToday, 0);
        const remainSteps = Math.max(profile.dailyStepTarget - totalStepsToday, 0);
        newNotifs.push({
          id: `goal_progress_${Date.now()}`,
          message: `Đã hoàn thành ${calPercent}% mục tiêu calo và ${stepPercent}% bước chân. Bạn cần thêm ${remainCal} kcal (~${remainSteps.toLocaleString()} bước) nữa để hoàn thành mục tiêu ngày!`,
          time: timeStr,
          type: 'goal',
          read: false,
        });
      }

      // 3. Nhắc uống nước sau tập
      const waterTarget = getWaterTarget(record.activeMinutes + durationMin);
      const waterNeeded = Math.max(waterTarget - record.waterGlasses, 0);
      if (waterNeeded > 0) {
        newNotifs.push({
          id: `water_${Date.now()}`,
          message: `Sau buổi tập ${durationMin} phút, hãy bổ sung nước ngay! Bạn cần uống thêm ${waterNeeded} ly nước (${waterNeeded * 250}ml) hôm nay để bù nước. 💧`,
          time: timeStr,
          type: 'hydration',
          read: false,
        });
      }

      // 4. Lời khuyên dựa trên buổi tập
      const tips: string[] = [];
      if (durationMin < 15) {
        tips.push('Buổi tập khá ngắn. Cố gắng duy trì ít nhất 20-30 phút mỗi lần để đạt hiệu quả tốt nhất.');
      }
      if (durationMin > 60) {
        tips.push('Buổi tập dài hơn 1 tiếng! Nhớ stretching kỹ sau tập để tránh đau cơ. Nghỉ ngơi đầy đủ trước buổi tập tiếp theo.');
      }
      if (data.type === 'running' && data.distance > 5) {
        tips.push('Bạn đã chạy hơn 5km! Hãy ăn nhẹ trong vòng 30 phút sau tập (chuối, bánh mì) để hồi phục năng lượng.');
      }
      if (data.type === 'walking') {
        tips.push('Đi bộ là bài tập tuyệt vời! Để tăng hiệu quả, hãy thử đi nhanh hơn hoặc xen kẽ chạy nhẹ.');
      }
      if (data.type === 'running') {
        tips.push('Nhớ khởi động trước khi chạy và giãn cơ sau tập. Tăng quãng đường tối đa 10% mỗi tuần để tránh chấn thương.');
      }
      if (data.type === 'cycling') {
        tips.push('Đạp xe rất tốt cho khớp gối. Nhớ điều chỉnh yên xe đúng chiều cao và đội mũ bảo hiểm khi ra đường.');
      }

      // Chọn 1 tip ngẫu nhiên
      const tip = tips[Math.floor(Math.random() * tips.length)];
      if (tip) {
        newNotifs.push({
          id: `tip_${Date.now()}`,
          message: `💡 ${tip}`,
          time: timeStr,
          type: 'reminder',
          read: false,
        });
      }

      setNotifications(prev => [...newNotifs, ...prev]);
    }, 200);

    setScreen('home');
  };

  const handleDrinkWater = () => {
    updateTodayRecord(record => ({
      ...record,
      waterGlasses: record.waterGlasses + 1,
    }));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const handleReset = () => {
    // Chỉ đặt lại MỤC TIÊU / HỒ SƠ, KHÔNG xóa thống kê tổng hợp
    // Giữ nguyên: dailyRecords, badges, notifications, streak, totalDistance, totalSessions

    // Lưu local với profile = null để quay lại bước nhập chỉ số cơ thể
    saveData({
      profile: null,
      dailyRecords,
      badges,
      notifications,
      currentStreak,
      longestStreak,
      totalDistance,
      totalSessions,
    });

    // Đồng bộ lên Firestore: xóa profile nhưng GIỮ stats
    const uid = uidRef.current || getCurrentUid();
    if (uid) {
      const totalCalories = dailyRecords.reduce((s, r) => s + r.calories, 0);
      const totalSteps = dailyRecords.reduce((s, r) => s + r.steps, 0);
      syncToCloud(uid, {
        profile: null,
        dailyRecords,
        badges,
        stats: {
          currentStreak,
          longestStreak,
          totalDistance,
          totalSessions,
          totalCalories,
          totalSteps,
        },
        lastSyncAt: new Date().toISOString(),
      });
    }

    // Chỉ reset profile trong state để vào lại onboarding step nhập chỉ số
    setProfile(null);
    setScreen('onboarding');
  };

  const handleNavigate = (s: string) => {
    setScreen(s as AppScreen);
  };

  const todayRecord = getTodayRecord();

  // Render screens
  const renderScreen = () => {
    if (!profile || screen === 'onboarding') {
      return (
        <OnboardingScreen
          onComplete={handleOnboardingComplete}
          onExistingLogin={async () => {
            await restoreCurrentUserData();
          }}
        />
      );
    }

    switch (screen) {
      case 'home':
        return (
          <HomeScreen
            profile={profile}
            todayRecord={todayRecord}
            streak={currentStreak}
            onNavigate={handleNavigate}
          />
        );
      case 'tracking':
        return (
          <TrackingScreen
            profile={profile}
            onBack={() => setScreen('home')}
            onSessionEnd={handleSessionEnd}
          />
        );
      case 'analytics':
        return (
          <AnalyticsScreen
            records={dailyRecords}
            onBack={() => setScreen('home')}
          />
        );
      case 'hydration':
        return (
          <HydrationScreen
            todayRecord={todayRecord}
            onBack={() => setScreen('home')}
            onDrink={handleDrinkWater}
          />
        );
      case 'badges':
        return (
          <BadgesScreen
            badges={badges}
            onBack={() => setScreen('home')}
          />
        );
      case 'leaderboard':
        return (
          <LeaderboardScreen
            profile={profile}
            todayRecord={todayRecord}
            records={dailyRecords}
            streak={currentStreak}
            onBack={() => setScreen('home')}
          />
        );
      case 'planner':
        return (
          <PlannerScreen
            profile={profile}
            records={dailyRecords}
            onBack={() => setScreen('home')}
          />
        );
      case 'notifications':
        return (
          <NotificationsScreen
            notifications={notifications}
            onBack={() => setScreen('home')}
            onClear={handleClearNotifications}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            profile={profile}
            records={dailyRecords}
            streak={currentStreak}
            longestStreak={longestStreak}
            totalDistance={totalDistance}
            totalSessions={totalSessions}
            onBack={() => setScreen('home')}
            onReset={handleReset}
          />
        );
      case 'challenges':
        return (
          <ChallengeScreen
            profile={profile}
            onBack={() => setScreen('home')}
          />
        );
      case 'wall':
        return (
          <WallScreen
            onBack={() => setScreen('home')}
          />
        );
      case 'ai_coach':
        return (
          <AICoachScreen
            profile={profile}
            todayRecord={todayRecord}
            records={dailyRecords}
            streak={currentStreak}
            totalDistance={totalDistance}
            totalSessions={totalSessions}
            onBack={() => setScreen('home')}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            onBack={() => setScreen('home')}
          />
        );
      default:
        return null;
    }
  };

  // ═══════ Vuốt trái/phải chuyển trang ═══════
  const mainTabs: AppScreen[] = ['home', 'tracking', 'challenges', 'wall', 'profile'];
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | ''>('');
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Chỉ xử lý vuốt ngang (dx lớn hơn dy) và đủ xa (>60px)
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    const currentIdx = mainTabs.indexOf(screen);
    if (currentIdx < 0) return; // Không phải tab chính

    if (dx < 0 && currentIdx < mainTabs.length - 1) {
      // Vuốt trái → tab tiếp theo
      setSwipeDir('left');
      setTimeout(() => {
        setScreen(mainTabs[currentIdx + 1]);
        setSwipeDir('');
      }, 200);
    } else if (dx > 0 && currentIdx > 0) {
      // Vuốt phải → tab trước
      setSwipeDir('right');
      setTimeout(() => {
        setScreen(mainTabs[currentIdx - 1]);
        setSwipeDir('');
      }, 200);
    }
  };

  const swipeClass = swipeDir === 'left'
    ? 'animate-swipeOutLeft'
    : swipeDir === 'right'
    ? 'animate-swipeOutRight'
    : mainTabs.includes(screen)
    ? 'animate-swipeIn'
    : '';

  return (
    <div className="relative">
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={swipeClass}
        key={screen}
      >
        {renderScreen()}
      </div>
      {profile && <BottomNav activeScreen={screen} onNavigate={(s) => {
        const fromIdx = mainTabs.indexOf(screen);
        const toIdx = mainTabs.indexOf(s);
        if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
          setSwipeDir(toIdx > fromIdx ? 'left' : 'right');
          setTimeout(() => {
            setScreen(s);
            setSwipeDir('');
          }, 200);
        } else {
          setScreen(s);
        }
      }} />}
    </div>
  );
}

export default App;
