import { Notification } from '../types';

interface Props {
  notifications: Notification[];
  onBack: () => void;
  onClear: () => void;
}

export default function NotificationsScreen({ notifications, onBack, onClear }: Props) {
  const typeConfig = {
    reminder: { icon: '⏰', color: 'bg-orange-100 text-orange-700', label: 'Nhắc nhở' },
    achievement: { icon: '🏆', color: 'bg-yellow-100 text-yellow-700', label: 'Thành tích' },
    hydration: { icon: '💧', color: 'bg-blue-100 text-blue-700', label: 'Uống nước' },
    goal: { icon: '🎯', color: 'bg-emerald-100 text-emerald-700', label: 'Mục tiêu' },
    workout: { icon: '🏃', color: 'bg-purple-100 text-purple-700', label: 'Buổi tập' },
    tip: { icon: '💡', color: 'bg-cyan-100 text-cyan-700', label: 'Lời khuyên' },
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white px-5 pt-12 pb-6 rounded-b-3xl">
        <button onClick={onBack} className="mb-4 text-white/80 flex items-center gap-2">
          <span>←</span> Quay lại
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🔔 Thông báo</h1>
            <p className="text-sm opacity-80">{notifications.length} thông báo</p>
          </div>
          {notifications.length > 0 && (
            <button
              onClick={onClear}
              className="text-sm bg-white/20 px-3 py-1.5 rounded-xl"
            >
              Xóa tất cả
            </button>
          )}
        </div>
      </div>

      <div className="px-5 mt-5 space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔕</div>
            <div className="text-gray-500 font-medium">Chưa có thông báo nào</div>
            <div className="text-sm text-gray-400 mt-1">Hoàn thành buổi tập để nhận thông báo</div>
          </div>
        ) : (
          notifications.map(notif => {
            const config = typeConfig[notif.type as keyof typeof typeConfig] || typeConfig.reminder;
            return (
              <div
                key={notif.id}
                className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 ${
                  !notif.read ? 'border-l-4 border-l-emerald-500' : ''
                }`}
              >
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${config.color}`}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-xs text-gray-400">{notif.time}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{notif.message}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
