import { Badge } from '../types';

interface Props {
  badges: Badge[];
  onBack: () => void;
}

export default function BadgesScreen({ badges, onBack }: Props) {
  const earned = badges.filter(b => b.earned);
  const locked = badges.filter(b => !b.earned);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white px-5 pt-12 pb-6 rounded-b-3xl">
        <button onClick={onBack} className="mb-4 text-white/80 flex items-center gap-2">
          <span>←</span> Quay lại
        </button>
        <h1 className="text-2xl font-bold">🏆 Huy hiệu & Thử thách</h1>
        <p className="text-sm opacity-80">Thu thập huy hiệu để ghi nhận thành tích</p>
        <div className="mt-4 bg-white/20 rounded-2xl p-3 flex items-center gap-3">
          <div className="text-3xl font-bold">{earned.length}/{badges.length}</div>
          <div>
            <div className="text-sm font-semibold">Huy hiệu đã đạt</div>
            <div className="h-2 bg-white/20 rounded-full w-40 overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${(earned.length / badges.length) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {/* Earned badges */}
        {earned.length > 0 && (
          <>
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <span>✨</span> Đã đạt được
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {earned.map(badge => (
                <div
                  key={badge.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border-2 border-amber-200 animate-bounce-in"
                >
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <div className="font-bold text-sm text-gray-800">{badge.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{badge.description}</div>
                  {badge.earnedDate && (
                    <div className="text-xs text-amber-500 mt-2">🗓️ {badge.earnedDate}</div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Locked badges */}
        <h3 className="font-bold text-gray-800 flex items-center gap-2 mt-6">
          <span>🔒</span> Chưa đạt được
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {locked.map(badge => (
            <div
              key={badge.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 opacity-60"
            >
              <div className="text-4xl mb-2 grayscale">{badge.icon}</div>
              <div className="font-bold text-sm text-gray-600">{badge.name}</div>
              <div className="text-xs text-gray-400 mt-1">{badge.description}</div>
              <div className="text-xs text-gray-400 mt-2 bg-gray-100 rounded-lg px-2 py-1 inline-block">
                🎯 {badge.condition}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
