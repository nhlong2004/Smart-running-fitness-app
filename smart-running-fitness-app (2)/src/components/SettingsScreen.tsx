import { useState } from 'react';

interface Props {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: Props) {
  const [notif, setNotif] = useState(() => localStorage.getItem('runmate_setting_notif') !== 'false');
  const [unit, setUnit] = useState<'metric' | 'imperial'>(() => (localStorage.getItem('runmate_setting_unit') as 'metric' | 'imperial') || 'metric');
  const [lang, setLang] = useState<'vi' | 'en'>(() => (localStorage.getItem('runmate_setting_lang') as 'vi' | 'en') || 'vi');
  const [keepScreen, setKeepScreen] = useState(() => localStorage.getItem('runmate_setting_screen') === 'true');
  const [autoDetect, setAutoDetect] = useState(() => localStorage.getItem('runmate_setting_autodetect') !== 'false');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const toggle = (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(!value);
    localStorage.setItem(key, String(!value));
  };

  const handleNotificationToggle = async () => {
    const next = !notif;

    if (next && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setNotif(false);
          localStorage.setItem('runmate_setting_notif', 'false');
          return;
        }
      } else if (Notification.permission === 'denied') {
        setNotif(false);
        localStorage.setItem('runmate_setting_notif', 'false');
        return;
      }
    }

    setNotif(next);
    localStorage.setItem('runmate_setting_notif', String(next));
  };

  const t = lang === 'vi'
    ? {
        title: 'Cài đặt',
        general: 'Chung',
        notification: 'Thông báo',
        notificationDesc: 'Hiện trên thanh thông báo điện thoại',
        language: 'Ngôn ngữ',
        languageDesc: 'Tiếng Việt / Tiếng Anh',
        workout: 'Vận động',
        unit: 'Đơn vị đo',
        unitDesc: unit === 'metric' ? 'Kilômét, Kilôgam' : 'Dặm, Pound',
        keepScreen: 'Luôn sáng khi tập',
        keepScreenDesc: 'Giữ màn hình sáng lúc vận động',
        autoDetect: 'Nhận diện tự động',
        autoDetectDesc: 'Phát hiện đi bộ ↔ chạy bộ theo tốc độ',
        data: 'Dữ liệu',
        clearCache: 'Xóa bộ nhớ đệm',
        clearCacheDesc: 'Xóa cache bài đăng, thử thách',
        clearConfirm: 'Bạn có chắc muốn xóa cache?',
        cancel: 'Hủy',
        confirm: 'Xóa',
        about: 'Giới thiệu',
        privacy: 'Chính sách bảo mật',
        version: 'Phiên bản',
        latest: 'Mới nhất',
      }
    : {
        title: 'Settings',
        general: 'General',
        notification: 'Notifications',
        notificationDesc: 'Show on phone notification tray',
        language: 'Language',
        languageDesc: 'Vietnamese / English',
        workout: 'Workout',
        unit: 'Measurement unit',
        unitDesc: unit === 'metric' ? 'Kilometers, Kilograms' : 'Miles, Pounds',
        keepScreen: 'Keep screen on while workout',
        keepScreenDesc: 'Keep screen awake during exercise',
        autoDetect: 'Auto detection',
        autoDetectDesc: 'Detect walking ↔ running by speed',
        data: 'Data',
        clearCache: 'Clear cache',
        clearCacheDesc: 'Clear posts and challenges cache',
        clearConfirm: 'Are you sure you want to clear cache?',
        cancel: 'Cancel',
        confirm: 'Clear',
        about: 'About',
        privacy: 'Privacy Policy',
        version: 'Version',
        latest: 'Latest',
      };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button onClick={onChange} className={`relative w-12 h-7 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}>
      <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100 pb-24 animate-slideIn">
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-bold text-gray-800">{t.title}</h1>
        </div>
      </div>

      <div className="px-5 mt-4 space-y-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">{t.general}</div>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
              <div>
                <div className="text-sm font-medium text-gray-800">{t.notification}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t.notificationDesc}</div>
              </div>
              <Toggle checked={notif} onChange={handleNotificationToggle} />
            </div>

            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <div className="text-sm font-medium text-gray-800">{t.language}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t.languageDesc}</div>
              </div>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button onClick={() => { setLang('vi'); localStorage.setItem('runmate_setting_lang', 'vi'); }} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${lang === 'vi' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500'}`}>VI</button>
                <button onClick={() => { setLang('en'); localStorage.setItem('runmate_setting_lang', 'en'); }} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${lang === 'en' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500'}`}>EN</button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">{t.workout}</div>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
              <div>
                <div className="text-sm font-medium text-gray-800">{t.unit}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t.unitDesc}</div>
              </div>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button onClick={() => { setUnit('metric'); localStorage.setItem('runmate_setting_unit', 'metric'); }} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${unit === 'metric' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500'}`}>km</button>
                <button onClick={() => { setUnit('imperial'); localStorage.setItem('runmate_setting_unit', 'imperial'); }} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${unit === 'imperial' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500'}`}>mi</button>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
              <div>
                <div className="text-sm font-medium text-gray-800">{t.keepScreen}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t.keepScreenDesc}</div>
              </div>
              <Toggle checked={keepScreen} onChange={() => toggle('runmate_setting_screen', keepScreen, setKeepScreen)} />
            </div>

            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <div className="text-sm font-medium text-gray-800">{t.autoDetect}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t.autoDetectDesc}</div>
              </div>
              <Toggle checked={autoDetect} onChange={() => toggle('runmate_setting_autodetect', autoDetect, setAutoDetect)} />
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">{t.data}</div>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <button onClick={() => setShowClearConfirm(true)} className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-gray-50 transition">
              <div>
                <div className="text-sm font-medium text-red-500">{t.clearCache}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t.clearCacheDesc}</div>
              </div>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">{t.about}</div>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <button onClick={() => window.open('/privacy-policy.html', '_blank')} className="w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-100 text-left active:bg-gray-50 transition">
              <div className="text-sm font-medium text-gray-800">{t.privacy}</div>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="text-sm font-medium text-gray-800">{t.version}</div>
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg font-semibold">v1.0.0 • {t.latest}</span>
            </div>
          </div>
        </div>
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowClearConfirm(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-bounce-in">
            <h3 className="font-bold text-gray-800 text-center mb-2">{t.clearCache}</h3>
            <p className="text-sm text-gray-500 text-center mb-5">{t.clearConfirm}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm active:scale-95">{t.cancel}</button>
              <button
                onClick={() => {
                  localStorage.removeItem('runmate_wall_posts');
                  localStorage.removeItem('runmate_accepted_challenges');
                  localStorage.removeItem('runmate_groups');
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm active:scale-95"
              >{t.confirm}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
