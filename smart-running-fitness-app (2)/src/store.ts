import { UserProfile, DailyRecord, Badge, Notification, WeeklyData } from './types';

const STORAGE_KEY = 'runmate_data';

interface AppData {
  profile: UserProfile | null;
  dailyRecords: DailyRecord[];
  badges: Badge[];
  notifications: Notification[];
  currentStreak: number;
  longestStreak: number;
  totalDistance: number;
  totalSessions: number;
}

const defaultBadges: Badge[] = [
  {
    id: 'first_step',
    name: 'Bước Chân Đầu Tiên',
    description: 'Hoàn thành buổi tập đầu tiên',
    icon: '👟',
    earned: false,
    condition: 'Hoàn thành 1 buổi tập'
  },
  {
    id: 'iron_lungs',
    name: 'Người Không Phổi',
    description: 'Chạy liên tục 10km',
    icon: '🫁',
    earned: false,
    condition: 'Chạy 10km liên tục'
  },
  {
    id: 'warrior_7',
    name: 'Chiến Binh Bền Bỉ',
    description: 'Đạt mục tiêu 7 ngày liên tiếp',
    icon: '⚔️',
    earned: false,
    condition: 'Streak 7 ngày'
  },
  {
    id: 'marathon_hero',
    name: 'Anh Hùng Marathon',
    description: 'Tổng quãng đường đạt 42km',
    icon: '🏅',
    earned: false,
    condition: 'Tổng 42km'
  },
  {
    id: 'calorie_crusher',
    name: 'Đốt Cháy Calo',
    description: 'Đốt cháy 1000 kcal trong 1 ngày',
    icon: '🔥',
    earned: false,
    condition: '1000 kcal/ngày'
  },
  {
    id: 'early_bird',
    name: 'Chim Sớm',
    description: 'Tập luyện trước 6 giờ sáng',
    icon: '🐦',
    earned: false,
    condition: 'Tập trước 6h sáng'
  },
  {
    id: 'hydration_master',
    name: 'Bậc Thầy Uống Nước',
    description: 'Đạt mục tiêu uống nước 7 ngày liên tiếp',
    icon: '💧',
    earned: false,
    condition: 'Uống đủ nước 7 ngày'
  },
  {
    id: 'speed_demon',
    name: 'Tốc Độ Bàn Thờ',
    description: 'Chạy với tốc độ trung bình trên 12 km/h',
    icon: '⚡',
    earned: false,
    condition: 'Tốc độ > 12km/h'
  },
  {
    id: 'century_km',
    name: '100km Vinh Quang',
    description: 'Tổng quãng đường đạt 100km',
    icon: '🏆',
    earned: false,
    condition: 'Tổng 100km'
  },
  {
    id: 'warrior_30',
    name: 'Chiến Binh 30 Ngày',
    description: 'Đạt mục tiêu 30 ngày liên tiếp',
    icon: '👑',
    earned: false,
    condition: 'Streak 30 ngày'
  }
];

// Đã xóa defaultLeaderboard - dùng hệ thống bạn bè thực

function getDefaultData(): AppData {
  return {
    profile: null,
    dailyRecords: [],
    badges: [...defaultBadges],
    notifications: [],
    currentStreak: 0,
    longestStreak: 0,
    totalDistance: 0,
    totalSessions: 0,
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...getDefaultData(), ...parsed };
    }
  } catch {}
  return getDefaultData();
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function calculateBMI(weight: number, heightCm: number): { bmi: number; category: string } {
  const heightM = heightCm / 100;
  const bmi = weight / (heightM * heightM);
  let category = '';
  if (bmi < 18.5) category = 'Thiếu cân';
  else if (bmi < 25) category = 'Bình thường';
  else if (bmi < 30) category = 'Thừa cân';
  else category = 'Béo phì';
  return { bmi: Math.round(bmi * 10) / 10, category };
}

export function calculateTDEE(weight: number, heightCm: number, age: number, gender: 'male' | 'female'): number {
  // Harris-Benedict
  let bmr: number;
  if (gender === 'male') {
    bmr = 88.362 + (13.397 * weight) + (4.799 * heightCm) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * heightCm) - (4.330 * age);
  }
  // Sedentary multiplier
  return Math.round(bmr * 1.375);
}

export function calculateDailyCalorieTarget(
  weight: number, targetWeight: number, targetMonths: number, _tdee: number
): number {
  const totalDeficit = (weight - targetWeight) * 7700; // 7700 kcal per kg fat
  const dailyDeficit = totalDeficit / (targetMonths * 30);
  return Math.round(Math.min(Math.max(dailyDeficit, 200), 800));
}

export function calculateCaloriesBurned(
  activityType: 'walking' | 'running' | 'cycling',
  durationMinutes: number,
  weightKg: number
): number {
  // MET values
  const metValues = {
    walking: 3.5,
    running: 9.8,
    cycling: 7.5,
  };
  const met = metValues[activityType];
  // Calories = MET × weight(kg) × duration(hours)
  return Math.round(met * weightKg * (durationMinutes / 60));
}

export function getStepsFromDistance(distanceKm: number, activityType: 'walking' | 'running' | 'cycling'): number {
  const stepsPerKm = {
    walking: 1320,
    running: 1100,
    cycling: 0,
  };
  return Math.round(distanceKm * stepsPerKm[activityType]);
}

export function getWaterTarget(activeMinutes: number): number {
  // Base 8 glasses, +1 for every 15 mins of activity
  return 8 + Math.floor(activeMinutes / 15);
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function generateWeeklyData(records: DailyRecord[]): WeeklyData[] {
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const today = new Date();
  const result: WeeklyData[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const record = records.find(r => r.date === dateStr);
    result.push({
      day: days[d.getDay()],
      steps: record?.steps || 0,
      calories: record?.calories || 0,
      distance: record ? Math.round(record.distance * 100) / 100 : 0,
      minutes: record?.activeMinutes || 0,
    });
  }

  return result;
}

export function generateMonthlyData(records: DailyRecord[]): WeeklyData[] {
  const today = new Date();
  const result: WeeklyData[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const record = records.find(r => r.date === dateStr);
    result.push({
      day: `${d.getDate()}/${d.getMonth() + 1}`,
      steps: record?.steps || 0,
      calories: record?.calories || 0,
      distance: record ? Math.round(record.distance * 100) / 100 : 0,
      minutes: record?.activeMinutes || 0,
    });
  }

  return result;
}

export function getSmartPlan(profile: UserProfile, todayRecord?: DailyRecord): string {
  const remaining = profile.dailyCalorieTarget - (todayRecord?.calories || 0);
  if (remaining <= 0) return 'Bạn đã hoàn thành mục tiêu hôm nay! Nghỉ ngơi hoặc tập nhẹ nhàng.';
  
  const walkingMinutes = Math.round(remaining / (3.5 * profile.weight / 60));
  const runningMinutes = Math.round(remaining / (9.8 * profile.weight / 60));
  const walkingKm = Math.round(walkingMinutes * 0.083 * 10) / 10;
  const runningKm = Math.round(runningMinutes * 0.15 * 10) / 10;

  return `Để đạt mục tiêu, bạn cần tiêu thụ thêm ${remaining} kcal, tương đương đi bộ ${walkingKm}km (~${walkingMinutes} phút) hoặc chạy bộ ${runningKm}km (~${runningMinutes} phút).`;
}

export { defaultBadges };
