import { UserProfile, DailyRecord } from '../types';
import { getSmartPlan, getWaterTarget } from '../store';

interface Props {
  profile: UserProfile;
  todayRecord: DailyRecord;
  streak: number;
  onNavigate: (screen: string) => void;
}

export default function HomeScreen({ profile, todayRecord, streak, onNavigate }: Props) {
  const stepProgress = Math.min((todayRecord.steps / profile.dailyStepTarget) * 100, 100);
  const calProgress = Math.min((todayRecord.calories / profile.dailyCalorieTarget) * 100, 100);
  const waterTarget = getWaterTarget(todayRecord.activeMinutes);
  const waterProgress = Math.min((todayRecord.waterGlasses / waterTarget) * 100, 100);

  const now = new Date();
  const hour = now.getHours();
  let greeting = 'Chào buổi sáng';
  if (hour >= 12 && hour < 18) greeting = 'Chào buổi chiều';
  else if (hour >= 18) greeting = 'Chào buổi tối';

  const smartPlan = getSmartPlan(profile, todayRecord);

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white px-5 pt-12 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm opacity-80">{greeting} 👋</div>
            <div className="text-2xl font-bold">{profile.name}</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => onNavigate('notifications')} className="relative">
              <span className="text-2xl">🔔</span>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>
            <button onClick={() => onNavigate('settings')} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>
            </button>
            <button onClick={() => onNavigate('profile')} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg">
              {profile.gender === 'male' ? '👨' : '👩'}
            </button>
          </div>
        </div>

        {/* Steps Circle */}
        <div className="flex items-center justify-center my-4">
          <div className="relative w-44 h-44">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="12" />
              <circle
                cx="80" cy="80" r="70" fill="none" stroke="white" strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${stepProgress * 4.4} ${440 - stepProgress * 4.4}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl">👣</span>
              <span className="text-3xl font-bold">{todayRecord.steps.toLocaleString()}</span>
              <span className="text-xs opacity-80">/ {profile.dailyStepTarget.toLocaleString()} bước</span>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          <div className="bg-white/15 rounded-2xl p-3 text-center">
            <div className="text-xl">🔥</div>
            <div className="text-lg font-bold">{todayRecord.calories}</div>
            <div className="text-xs opacity-80">kcal</div>
          </div>
          <div className="bg-white/15 rounded-2xl p-3 text-center">
            <div className="text-xl">📏</div>
            <div className="text-lg font-bold">{todayRecord.distance.toFixed(1)}</div>
            <div className="text-xs opacity-80">km</div>
          </div>
          <div className="bg-white/15 rounded-2xl p-3 text-center">
            <div className="text-xl">⏱️</div>
            <div className="text-lg font-bold">{todayRecord.activeMinutes}</div>
            <div className="text-xs opacity-80">phút</div>
          </div>
        </div>
      </div>

      {/* Streak & Goal */}
      <div className="px-5 mt-5 space-y-4">
        {streak > 0 && (
          <div className="bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-2xl p-4 flex items-center gap-3">
            <span className="text-3xl">🔥</span>
            <div>
              <div className="font-bold text-lg">{streak} ngày liên tiếp!</div>
              <div className="text-sm opacity-90">Tiếp tục phát huy nhé!</div>
            </div>
          </div>
        )}

        {/* Smart Plan */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🧠</span>
            <span className="font-bold text-gray-800">Kế hoạch hôm nay</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{smartPlan}</p>
        </div>

        {/* Progress Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Calories */}
          <button onClick={() => onNavigate('tracking')} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔥</span>
              <span className="text-sm font-semibold text-gray-700">Calo</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${calProgress}%` }} />
            </div>
            <div className="text-xs text-gray-500">{todayRecord.calories}/{profile.dailyCalorieTarget} kcal</div>
          </button>

          {/* Water */}
          <button onClick={() => onNavigate('hydration')} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💧</span>
              <span className="text-sm font-semibold text-gray-700">Nước</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${waterProgress}%` }} />
            </div>
            <div className="text-xs text-gray-500">{todayRecord.waterGlasses}/{waterTarget} ly</div>
          </button>
        </div>

        {/* Start Workout Button */}
        <button
          onClick={() => onNavigate('tracking')}
          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl p-5 flex items-center justify-center gap-3 shadow-lg active:scale-98 transition-transform"
        >
          <span className="text-3xl">▶️</span>
          <div className="text-left">
            <div className="font-bold text-lg">Bắt đầu vận động</div>
            <div className="text-sm opacity-80">Đi bộ • Chạy bộ • Đạp xe</div>
          </div>
        </button>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: '📊', label: 'Thống kê', screen: 'analytics' },
            { icon: '🏆', label: 'Huy hiệu', screen: 'badges' },
            { icon: '🏅', label: 'Xếp hạng', screen: 'leaderboard' },
            { icon: '📅', label: 'Kế hoạch', screen: 'planner' },
          ].map(item => (
            <button
              key={item.screen}
              onClick={() => onNavigate(item.screen)}
              className="bg-white rounded-2xl p-3 flex flex-col items-center gap-1 shadow-sm border border-gray-100 active:scale-95 transition-transform"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs text-gray-600">{item.label}</span>
            </button>
          ))}
        </div>

        {/* AI Coach */}
        <button
          onClick={() => onNavigate('ai_coach')}
          className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-2xl p-4 flex items-center gap-3 shadow-lg active:scale-98 transition-transform"
        >
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">🤖</div>
          <div className="text-left flex-1">
            <div className="font-bold">AI Coach</div>
            <div className="text-sm opacity-80">Hỏi đáp, gợi ý tập luyện, dinh dưỡng</div>
          </div>
          <span className="text-2xl">💬</span>
        </button>
      </div>
    </div>
  );
}
