import { useState } from 'react';
import { UserProfile } from '../types';
import { calculateBMI, calculateTDEE, calculateDailyCalorieTarget } from '../store';
import {
  registerUser,
  loginUser,
  isFirebaseConfigured,
  loadFromCloud,
  getUserData,
} from '../services/firebase';

interface Props {
  onComplete: (profile: UserProfile) => void;
  onExistingLogin: () => void | Promise<void>;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function OnboardingScreen({ onComplete, onExistingLogin }: Props) {
  // Kiểm tra đã đăng nhập chưa → nếu rồi thì nhảy thẳng đến nhập chỉ số
  const savedSession = localStorage.getItem('runmate_logged_in');
  const parsedSession = savedSession ? JSON.parse(savedSession) : null;
  const alreadyLoggedIn = !!parsedSession;

  const [step, setStep] = useState(alreadyLoggedIn ? 2 : 0);
  // Auth
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loggedInName, setLoggedInName] = useState(parsedSession?.name || '');

  // Profile
  const [age, setAge] = useState('25');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [height, setHeight] = useState('170');
  const [weight, setWeight] = useState('70');
  const [targetWeight, setTargetWeight] = useState('65');
  const [targetMonths, setTargetMonths] = useState('2');
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'fitness'>('lose');
  const [showResult, setShowResult] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // ═══════ ĐĂNG KÝ ═══════
  const handleRegister = async () => {
    setAuthError('');
    if (!authName.trim()) { setAuthError('Vui lòng nhập họ tên'); return; }
    if (!authEmail.trim()) { setAuthError('Vui lòng nhập email'); return; }
    if (!isValidEmail(authEmail)) { setAuthError('Email không hợp lệ'); return; }
    if (authPassword.length < 6) { setAuthError('Mật khẩu tối thiểu 6 ký tự'); return; }
    if (authPassword !== authConfirmPassword) { setAuthError('Mật khẩu xác nhận không khớp'); return; }

    setIsLoading(true);
    const result = await registerUser(authEmail.trim(), authPassword, authName.trim());
    setIsLoading(false);

    if (result.success && 'user' in result && result.user) {
      const name = result.user.name || authName;
      setLoggedInName(name);
      // Lưu session
      localStorage.setItem('runmate_logged_in', JSON.stringify({
        uid: result.user.uid || '',
        name,
        email: result.user.email || authEmail,
        createdAt: new Date().toISOString(),
        friendCode: result.user.friendCode || '',
      }));
      setStep(2); // Chuyển đến Thông tin cá nhân
    } else {
      setAuthError('error' in result ? (result.error || 'Đăng ký thất bại') : 'Đăng ký thất bại');
    }
  };

  // ═══════ ĐĂNG NHẬP ═══════
  const handleLogin = async () => {
    setAuthError('');
    if (!authEmail.trim()) { setAuthError('Vui lòng nhập email'); return; }
    if (!isValidEmail(authEmail)) { setAuthError('Email không hợp lệ'); return; }
    if (!authPassword) { setAuthError('Vui lòng nhập mật khẩu'); return; }

    setIsLoading(true);
    const result = await loginUser(authEmail.trim(), authPassword);

    if (result.success && 'user' in result && result.user) {
      const name = result.user.name || 'Người dùng';
      localStorage.setItem('runmate_logged_in', JSON.stringify({
        uid: result.user.uid || '',
        name,
        email: result.user.email || authEmail,
        createdAt: new Date().toISOString(),
        friendCode: result.user.friendCode || '',
      }));

      // Kiểm tra tài khoản cũ đã có hồ sơ chưa
      let hasExistingProfile = false;
      try {
        const [cloudData, userDoc] = await Promise.all([
          loadFromCloud(result.user.uid || ''),
          getUserData(result.user.uid || ''),
        ]);
        hasExistingProfile = !!(userDoc?.profile || cloudData?.profile);
      } catch {
        hasExistingProfile = false;
      }

      setIsLoading(false);
      setLoggedInName(name);

      if (hasExistingProfile) {
        await onExistingLogin();
      } else {
        setStep(2);
      }
    } else {
      setIsLoading(false);
      setAuthError('error' in result ? (result.error || 'Đăng nhập thất bại') : 'Đăng nhập thất bại');
    }
  };

  // ═══════ TÍNH TOÁN ═══════
  const handleCalculate = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    const tw = parseFloat(targetWeight);
    const tm = parseInt(targetMonths);

    const { bmi, category } = calculateBMI(w, h);
    const tdee = calculateTDEE(w, h, a, gender);
    const dailyCal = goal === 'maintain' ? 300 : calculateDailyCalorieTarget(w, tw, tm, tdee);
    const dailySteps = Math.round((dailyCal / (3.5 * w / 60)) * 83);

    const p: UserProfile = {
      name: loggedInName,
      age: a,
      gender,
      height: h,
      weight: w,
      targetWeight: tw,
      targetMonths: tm,
      goal,
      bmi,
      bmiCategory: category,
      tdee,
      dailyCalorieTarget: dailyCal,
      dailyStepTarget: Math.max(dailySteps, 6000),
    };
    setProfile(p);
    setShowResult(true);
  };

  // ═══════ KẾT QUẢ PHÂN TÍCH ═══════
  if (showResult && profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-emerald-700 flex flex-col items-center justify-center p-6 text-white">
        <div className="animate-bounce-in bg-white/20 backdrop-blur-lg rounded-3xl p-6 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📊</div>
            <h2 className="text-2xl font-bold">Kết quả phân tích</h2>
          </div>
          <div className="space-y-4">
            <div className="bg-white/20 rounded-2xl p-4">
              <div className="text-sm opacity-80">Chỉ số BMI</div>
              <div className="text-3xl font-bold">{profile.bmi}</div>
              <div className={`text-sm font-semibold ${profile.bmiCategory === 'Bình thường' ? 'text-green-200' : 'text-yellow-200'}`}>
                {profile.bmiCategory}
              </div>
            </div>
            <div className="bg-white/20 rounded-2xl p-4">
              <div className="text-sm opacity-80">TDEE (Năng lượng tiêu thụ/ngày)</div>
              <div className="text-3xl font-bold">{profile.tdee} <span className="text-lg">kcal</span></div>
            </div>
            <div className="bg-white/20 rounded-2xl p-4">
              <div className="text-sm opacity-80">Mục tiêu vận động mỗi ngày</div>
              <div className="text-xl font-bold">🔥 {profile.dailyCalorieTarget} kcal</div>
              <div className="text-xl font-bold">👣 {profile.dailyStepTarget.toLocaleString()} bước</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 text-sm leading-relaxed">
              💡 Để đạt mục tiêu {goal === 'lose' ? `giảm ${profile.weight - profile.targetWeight}kg trong ${profile.targetMonths} tháng` : goal === 'maintain' ? 'giữ dáng' : 'tăng thể lực'},
              bạn cần tiêu thụ thêm <strong>{profile.dailyCalorieTarget} kcal</strong> mỗi ngày qua vận động,
              tương đương đi bộ <strong>{profile.dailyStepTarget.toLocaleString()} bước</strong> hoặc
              chạy bộ <strong>{Math.round(profile.dailyCalorieTarget / (9.8 * profile.weight / 60))} phút</strong>.
            </div>
          </div>
          <button
            onClick={() => onComplete(profile)}
            className="w-full mt-6 bg-white text-emerald-700 font-bold py-4 rounded-2xl text-lg active:scale-95 transition-transform"
          >
            Bắt đầu hành trình! 🚀
          </button>
        </div>
      </div>
    );
  }

  // ═══════ CÁC BƯỚC ═══════
  const steps = [
    // ═══ Step 0: Chào mừng ═══
    <div key="welcome" className="text-center space-y-6">
      <div className="text-7xl mb-4">🏃‍♂️</div>
      <h1 className="text-4xl font-bold">RunMate</h1>
      <p className="text-lg opacity-80">Đồng hành cùng bạn trên mỗi bước chạy</p>
      <div className="space-y-3 text-left bg-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-3"><span>📊</span> Theo dõi vận động thời gian thực</div>
        <div className="flex items-center gap-3"><span>🧠</span> Lập kế hoạch tập luyện thông minh</div>
        <div className="flex items-center gap-3"><span>🏆</span> Thử thách & Huy hiệu</div>
        <div className="flex items-center gap-3"><span>💧</span> Nhắc nhở uống nước</div>
        <div className="flex items-center gap-3"><span>📈</span> Phân tích xu hướng sức khỏe</div>
      </div>
      <button
        onClick={() => setStep(1)}
        className="w-full bg-white text-emerald-700 font-bold py-4 rounded-2xl text-lg active:scale-95 transition-transform"
      >
        Bắt đầu ngay
      </button>
    </div>,

    // ═══ Step 1: Đăng nhập / Đăng ký ═══
    <div key="auth" className="space-y-5">
      {/* Tab chuyển đổi */}
      <div className="flex bg-white/10 rounded-xl p-1">
        <button
          onClick={() => { setAuthMode('login'); setAuthError(''); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${authMode === 'login' ? 'bg-white text-emerald-700' : 'text-white/70'}`}
        >
          Đăng nhập
        </button>
        <button
          onClick={() => { setAuthMode('register'); setAuthError(''); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${authMode === 'register' ? 'bg-white text-emerald-700' : 'text-white/70'}`}
        >
          Đăng ký
        </button>
      </div>

      <div className="text-center">
        <div className="text-5xl mb-2">{authMode === 'register' ? '🎉' : '👋'}</div>
        <h2 className="text-2xl font-bold">{authMode === 'register' ? 'Tạo tài khoản' : 'Chào mừng trở lại'}</h2>
        <p className="opacity-80 text-sm mt-1">
          {authMode === 'register' ? 'Đăng ký để lưu dữ liệu trên cloud' : 'Đăng nhập để tiếp tục'}
        </p>
        {isFirebaseConfigured() && (
          <div className="inline-flex items-center gap-1 text-xs bg-white/20 px-2 py-0.5 rounded-full mt-2">
            <span className="w-1.5 h-1.5 bg-green-300 rounded-full"></span> Cloud
          </div>
        )}
      </div>

      {/* Lỗi */}
      {authError && (
        <div className="bg-red-500/30 border border-red-300/50 text-white rounded-xl p-3 text-sm flex items-center gap-2">
          <span>❌</span> {authError}
        </div>
      )}

      <div className="space-y-3">
        {/* Họ tên (chỉ đăng ký) */}
        {authMode === 'register' && (
          <div>
            <label className="text-sm opacity-80 mb-1 block">Họ và tên</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-60">👤</span>
              <input
                type="text"
                value={authName}
                onChange={e => setAuthName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full pl-11 pr-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 outline-none focus:border-white"
              />
            </div>
          </div>
        )}

        {/* Email */}
        <div>
          <label className="text-sm opacity-80 mb-1 block">Email</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-60">📧</span>
            <input
              type="email"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              placeholder="example@gmail.com"
              className="w-full pl-11 pr-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 outline-none focus:border-white"
            />
          </div>
        </div>

        {/* Mật khẩu */}
        <div>
          <label className="text-sm opacity-80 mb-1 block">Mật khẩu</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-60">🔒</span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              placeholder={authMode === 'register' ? 'Tối thiểu 6 ký tự' : 'Nhập mật khẩu'}
              className="w-full pl-11 pr-12 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 outline-none focus:border-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-60"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Xác nhận mật khẩu (đăng ký) */}
        {authMode === 'register' && (
          <div>
            <label className="text-sm opacity-80 mb-1 block">Xác nhận mật khẩu</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-60">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={authConfirmPassword}
                onChange={e => setAuthConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className={`w-full pl-11 pr-12 py-3 bg-white/20 border rounded-xl text-white placeholder-white/50 outline-none ${
                  authConfirmPassword && authConfirmPassword !== authPassword
                    ? 'border-red-400' : authConfirmPassword && authConfirmPassword === authPassword
                    ? 'border-green-400' : 'border-white/30 focus:border-white'
                }`}
              />
              {authConfirmPassword && (
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  {authConfirmPassword === authPassword ? '✅' : '❌'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Nút Submit */}
      <button
        onClick={authMode === 'register' ? handleRegister : handleLogin}
        disabled={isLoading}
        className="w-full bg-white text-emerald-700 font-bold py-4 rounded-2xl text-lg active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <><div className="w-5 h-5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" /> Đang xử lý...</>
        ) : authMode === 'register' ? (
          <>✨ Đăng ký</>
        ) : (
          <>📧 Đăng nhập</>
        )}
      </button>

      {/* Chuyển mode */}
      <div className="text-center text-sm">
        {authMode === 'register' ? (
          <p className="opacity-80">Đã có tài khoản? <button onClick={() => { setAuthMode('login'); setAuthError(''); }} className="font-bold underline">Đăng nhập</button></p>
        ) : (
          <p className="opacity-80">Chưa có tài khoản? <button onClick={() => { setAuthMode('register'); setAuthError(''); }} className="font-bold underline">Đăng ký ngay</button></p>
        )}
      </div>

      {/* Quay lại */}
      <button
        onClick={() => setStep(0)}
        className="w-full bg-white/10 font-semibold py-3 rounded-2xl text-sm active:scale-95 transition-transform"
      >
        ← Quay lại
      </button>
    </div>,

    // ═══ Step 2: Thông tin cá nhân (KHÔNG có ô Tên) ═══
    <div key="basic" className="space-y-5">
      <div className="text-center">
        <div className="text-5xl mb-2">👤</div>
        <h2 className="text-2xl font-bold">Thông tin cá nhân</h2>
        <p className="opacity-80 text-sm">Xin chào <strong>{loggedInName}</strong>! Nhập chỉ số cơ thể của bạn</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm opacity-80 mb-1 block">Tuổi</label>
          <input
            type="number"
            value={age}
            onChange={e => setAge(e.target.value)}
            className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white outline-none focus:border-white"
          />
        </div>
        <div>
          <label className="text-sm opacity-80 mb-1 block">Giới tính</label>
          <div className="flex gap-2">
            <button
              onClick={() => setGender('male')}
              className={`flex-1 py-3 rounded-xl font-semibold transition ${gender === 'male' ? 'bg-white text-emerald-700' : 'bg-white/20'}`}
            >
              👨 Nam
            </button>
            <button
              onClick={() => setGender('female')}
              className={`flex-1 py-3 rounded-xl font-semibold transition ${gender === 'female' ? 'bg-white text-emerald-700' : 'bg-white/20'}`}
            >
              👩 Nữ
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm opacity-80 mb-1 block">Chiều cao (cm)</label>
          <input
            type="number"
            value={height}
            onChange={e => setHeight(e.target.value)}
            className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white outline-none focus:border-white"
          />
        </div>
        <div>
          <label className="text-sm opacity-80 mb-1 block">Cân nặng (kg)</label>
          <input
            type="number"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white outline-none focus:border-white"
          />
        </div>
      </div>
      <button
        onClick={() => setStep(3)}
        className="w-full bg-white text-emerald-700 font-bold py-4 rounded-2xl text-lg active:scale-95 transition-transform"
      >
        Tiếp theo →
      </button>
    </div>,

    // ═══ Step 3: Mục tiêu ═══
    <div key="goals" className="space-y-5">
      <div className="text-center">
        <div className="text-5xl mb-2">🎯</div>
        <h2 className="text-2xl font-bold">Mục tiêu của bạn</h2>
        <p className="opacity-80 text-sm">Chọn mục tiêu phù hợp</p>
      </div>

      <div className="space-y-3">
        {([
          { value: 'lose' as const, icon: '⬇️', label: 'Giảm cân', desc: 'Giảm cân một cách khoa học' },
          { value: 'maintain' as const, icon: '⚖️', label: 'Giữ dáng', desc: 'Duy trì cân nặng hiện tại' },
          { value: 'fitness' as const, icon: '💪', label: 'Tăng thể lực', desc: 'Nâng cao sức bền và thể lực' },
        ]).map(g => (
          <button
            key={g.value}
            onClick={() => setGoal(g.value)}
            className={`w-full text-left p-4 rounded-2xl transition flex items-center gap-4 ${
              goal === g.value ? 'bg-white text-emerald-700' : 'bg-white/15'
            }`}
          >
            <span className="text-3xl">{g.icon}</span>
            <div>
              <div className="font-bold text-lg">{g.label}</div>
              <div className={`text-sm ${goal === g.value ? 'text-emerald-600' : 'opacity-70'}`}>{g.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {goal === 'lose' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm opacity-80 mb-1 block">Cân nặng mục tiêu (kg)</label>
            <input
              type="number"
              value={targetWeight}
              onChange={e => setTargetWeight(e.target.value)}
              className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white outline-none focus:border-white"
            />
          </div>
          <div>
            <label className="text-sm opacity-80 mb-1 block">Thời gian (tháng)</label>
            <input
              type="number"
              value={targetMonths}
              onChange={e => setTargetMonths(e.target.value)}
              className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white outline-none focus:border-white"
            />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setStep(2)}
          className="flex-1 bg-white/20 font-bold py-4 rounded-2xl text-lg active:scale-95 transition-transform"
        >
          ← Quay lại
        </button>
        <button
          onClick={handleCalculate}
          className="flex-1 bg-white text-emerald-700 font-bold py-4 rounded-2xl text-lg active:scale-95 transition-transform"
        >
          Phân tích 📊
        </button>
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-emerald-700 flex flex-col items-center justify-center p-6 text-white">
      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === step ? 'w-8 bg-white' : i < step ? 'w-2 bg-white/80' : 'w-2 bg-white/30'
            }`}
          />
        ))}
      </div>
      <div className="w-full max-w-sm">{steps[step]}</div>
    </div>
  );
}
