import { DailyRecord } from '../types';
import { getWaterTarget } from '../store';

interface Props {
  todayRecord: DailyRecord;
  onBack: () => void;
  onDrink: () => void;
}

export default function HydrationScreen({ todayRecord, onBack, onDrink }: Props) {
  const target = getWaterTarget(todayRecord.activeMinutes);
  const current = todayRecord.waterGlasses;
  const progress = Math.min((current / target) * 100, 100);
  const remaining = Math.max(target - current, 0);

  const getMotivation = () => {
    if (current >= target) return '🎉 Tuyệt vời! Bạn đã uống đủ nước hôm nay!';
    if (current >= target * 0.75) return '💪 Gần đến mục tiêu rồi! Cố thêm chút nữa!';
    if (current >= target * 0.5) return '👍 Tốt lắm! Đã được nửa chặng đường!';
    return '💧 Hãy uống nước đều đặn để giữ sức khỏe nhé!';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-blue-400 to-blue-600 text-white px-5 pt-12 pb-8 rounded-b-3xl">
        <button onClick={onBack} className="mb-4 text-white/80 flex items-center gap-2">
          <span>←</span> Quay lại
        </button>
        <h1 className="text-2xl font-bold">💧 Theo dõi uống nước</h1>
        <p className="text-sm opacity-80">Giữ cơ thể luôn đủ nước</p>
      </div>

      <div className="px-5 mt-5 space-y-5">
        {/* Water bottle visualization */}
        <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col items-center">
          <div className="relative w-32 h-56 border-4 border-blue-300 rounded-b-3xl rounded-t-xl overflow-hidden mb-4">
            <div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-blue-300 transition-all duration-500"
              style={{ height: `${progress}%` }}
            >
              <div className="absolute top-0 left-0 right-0 h-3 bg-blue-200/50 rounded-full mx-1" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-800">{current}</div>
                <div className="text-sm text-blue-700">/ {target} ly</div>
              </div>
            </div>
          </div>

          <div className="text-center mb-4">
            <div className="text-lg font-bold text-gray-800">{Math.round(progress)}% mục tiêu</div>
            <div className="text-sm text-gray-500">{getMotivation()}</div>
          </div>

          <button
            onClick={onDrink}
            disabled={current >= target}
            className="bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold py-4 px-8 rounded-2xl text-lg shadow-lg active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-2"
          >
            💧 Uống 1 ly (250ml)
          </button>
        </div>

        {/* Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">📋 Thông tin uống nước</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Mục tiêu hôm nay</span>
              <span className="font-semibold text-blue-600">{target} ly ({target * 250}ml)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Đã uống</span>
              <span className="font-semibold text-blue-600">{current} ly ({current * 250}ml)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Còn lại</span>
              <span className="font-semibold text-orange-500">{remaining} ly ({remaining * 250}ml)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Phút vận động hôm nay</span>
              <span className="font-semibold text-emerald-600">{todayRecord.activeMinutes} phút</span>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <h3 className="font-semibold text-blue-800 mb-2">💡 Mẹo uống nước</h3>
          <ul className="text-sm text-blue-700 space-y-2">
            <li>• Uống 1 ly nước ngay khi thức dậy</li>
            <li>• Uống trước, trong và sau khi tập luyện</li>
            <li>• Mang theo bình nước khi ra ngoài</li>
            <li>• Uống thêm khi trời nóng hoặc vận động nhiều</li>
            {todayRecord.activeMinutes > 30 && (
              <li className="font-semibold">⚠️ Bạn đã vận động {todayRecord.activeMinutes} phút hôm nay - cần uống thêm nước!</li>
            )}
          </ul>
        </div>

        {/* Water glasses grid */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">Tiến trình hôm nay</h3>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: target }, (_, i) => (
              <div
                key={i}
                className={`aspect-square rounded-xl flex items-center justify-center text-2xl transition ${
                  i < current ? 'bg-blue-100' : 'bg-gray-100'
                }`}
              >
                {i < current ? '💧' : '○'}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
