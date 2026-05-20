import { UserProfile, DailyRecord } from '../types';

interface Props {
  profile: UserProfile;
  records: DailyRecord[];
  onBack: () => void;
}

export default function PlannerScreen({ profile, records, onBack }: Props) {
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const today = new Date();
  const todayIdx = today.getDay();

  const goalText = profile.goal === 'lose' ? 'Giảm cân' : profile.goal === 'maintain' ? 'Giữ dáng' : 'Tăng thể lực';

  // Generate weekly plan based on goal
  const generatePlan = () => {
    const plans = [];
    for (let i = 0; i < 7; i++) {
      const dayOfWeek = (todayIdx + i) % 7;
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const record = records.find(r => r.date === dateStr);

      let activity = '';
      let detail = '';
      let icon = '';
      let intensity = '';

      if (profile.goal === 'lose') {
        if (dayOfWeek === 0) {
          activity = 'Nghỉ ngơi';
          detail = 'Đi dạo nhẹ 15 phút';
          icon = '🧘';
          intensity = 'Nhẹ';
        } else if (dayOfWeek % 2 === 0) {
          activity = 'Chạy bộ';
          detail = `Chạy ${Math.round(profile.dailyCalorieTarget / (9.8 * profile.weight / 60))} phút`;
          icon = '🏃';
          intensity = 'Cao';
        } else {
          activity = 'Đi bộ nhanh';
          detail = `Đi bộ ${profile.dailyStepTarget.toLocaleString()} bước`;
          icon = '🚶';
          intensity = 'Trung bình';
        }
      } else if (profile.goal === 'maintain') {
        if (dayOfWeek === 0 || dayOfWeek === 3) {
          activity = 'Nghỉ ngơi';
          detail = 'Yoga hoặc stretching 20 phút';
          icon = '🧘';
          intensity = 'Nhẹ';
        } else if (dayOfWeek % 2 === 0) {
          activity = 'Đạp xe';
          detail = 'Đạp xe 30 phút';
          icon = '🚴';
          intensity = 'Trung bình';
        } else {
          activity = 'Chạy bộ nhẹ';
          detail = 'Chạy bộ 20 phút';
          icon = '🏃';
          intensity = 'Trung bình';
        }
      } else {
        if (dayOfWeek === 0) {
          activity = 'Nghỉ ngơi';
          detail = 'Hồi phục cơ thể';
          icon = '🧘';
          intensity = 'Nhẹ';
        } else if (dayOfWeek <= 2) {
          activity = 'Chạy bộ cường độ cao';
          detail = `Chạy Interval: 5x(2 phút nhanh + 1 phút chậm)`;
          icon = '⚡';
          intensity = 'Rất cao';
        } else if (dayOfWeek <= 4) {
          activity = 'Đạp xe';
          detail = 'Đạp xe 45 phút, tốc độ cao';
          icon = '🚴';
          intensity = 'Cao';
        } else {
          activity = 'Chạy bộ dài';
          detail = `Chạy bền ${Math.round(profile.dailyCalorieTarget / (9.8 * profile.weight / 60) * 1.5)} phút`;
          icon = '🏃';
          intensity = 'Cao';
        }
      }

      const isToday = i === 0;
      const completed = record ? record.goalReached : false;

      plans.push({
        dayName: days[dayOfWeek],
        date: `${date.getDate()}/${date.getMonth() + 1}`,
        activity,
        detail,
        icon,
        intensity,
        isToday,
        completed,
        isPast: i < 0,
      });
    }
    return plans;
  };

  const weeklyPlan = generatePlan();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white px-5 pt-12 pb-6 rounded-b-3xl">
        <button onClick={onBack} className="mb-4 text-white/80 flex items-center gap-2">
          <span>←</span> Quay lại
        </button>
        <h1 className="text-2xl font-bold">📅 Kế hoạch tập luyện</h1>
        <p className="text-sm opacity-80">Lộ trình thông minh cho mục tiêu {goalText}</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <div className="text-xl font-bold">🎯</div>
            <div className="text-xs mt-1">{goalText}</div>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <div className="text-xl font-bold">{profile.dailyCalorieTarget}</div>
            <div className="text-xs mt-1">kcal/ngày</div>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <div className="text-xl font-bold">{profile.dailyStepTarget.toLocaleString()}</div>
            <div className="text-xs mt-1">bước/ngày</div>
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-3">
        <h3 className="font-bold text-gray-800">📋 Lịch trình 7 ngày tới</h3>
        
        {weeklyPlan.map((plan, idx) => (
          <div
            key={idx}
            className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition ${
              plan.isToday ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                plan.completed ? 'bg-emerald-100' : plan.isToday ? 'bg-emerald-50' : 'bg-gray-50'
              }`}>
                {plan.completed ? '✅' : plan.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800">{plan.dayName}</span>
                  <span className="text-xs text-gray-400">{plan.date}</span>
                  {plan.isToday && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                      Hôm nay
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">{plan.activity}</div>
                <div className="text-xs text-gray-400">{plan.detail}</div>
              </div>
              <div className={`text-xs px-2 py-1 rounded-lg font-semibold ${
                plan.intensity === 'Nhẹ' ? 'bg-green-100 text-green-700' :
                plan.intensity === 'Trung bình' ? 'bg-yellow-100 text-yellow-700' :
                plan.intensity === 'Cao' ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-700'
              }`}>
                {plan.intensity}
              </div>
            </div>
          </div>
        ))}

        {/* Coaching tip */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mt-4">
          <h4 className="font-semibold text-emerald-800 mb-2">💡 Lời khuyên từ HLV</h4>
          <p className="text-sm text-emerald-700 leading-relaxed">
            {profile.goal === 'lose' 
              ? 'Để giảm cân hiệu quả, hãy kết hợp xen kẽ giữa chạy bộ và đi bộ nhanh. Nhớ nghỉ ngơi 1 ngày/tuần để cơ thể hồi phục.'
              : profile.goal === 'maintain'
              ? 'Để duy trì dáng vóc, hãy đa dạng các hoạt động và duy trì đều đặn. Không cần quá gắt, chỉ cần kiên trì!'
              : 'Để tăng thể lực, hãy tập interval training xen kẽ với bài tập bền. Tăng dần cường độ mỗi tuần 10%.'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
