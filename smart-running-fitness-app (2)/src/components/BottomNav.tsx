import { AppScreen } from '../types';

interface Props {
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}

export default function BottomNav({ activeScreen, onNavigate }: Props) {
  const items = [
    { screen: 'home' as AppScreen, icon: '🏠', label: 'Trang chủ' },
    { screen: 'tracking' as AppScreen, icon: '▶️', label: 'Vận động' },
    { screen: 'challenges' as AppScreen, icon: '🎯', label: 'Thử thách' },
    { screen: 'wall' as AppScreen, icon: '📸', label: 'Tường' },
    { screen: 'profile' as AppScreen, icon: '👤', label: 'Hồ sơ' },
  ];

  if (activeScreen === 'onboarding' || activeScreen === 'tracking' || activeScreen === 'ai_coach' || activeScreen === 'settings') return null;

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-2 pb-4 pt-2 z-[5000]">
      <div className="flex justify-around">
        {items.map(item => {
          const isActive = activeScreen === item.screen;
          return (
            <button
              key={item.screen}
              onClick={() => onNavigate(item.screen)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
                isActive ? 'text-emerald-600' : 'text-gray-400'
              }`}
            >
              <span className={`text-xl ${isActive ? 'scale-110' : ''} transition-transform`}>{item.icon}</span>
              <span className={`text-[10px] ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
              {isActive && <div className="w-1 h-1 bg-emerald-500 rounded-full" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
