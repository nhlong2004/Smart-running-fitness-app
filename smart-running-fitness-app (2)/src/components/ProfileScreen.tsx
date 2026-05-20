import { useState, useEffect } from 'react';
import { UserProfile, DailyRecord } from '../types';
import {
  registerUser,
  loginUser,
  logoutUser,
  resetPassword,
  ensureCurrentUserFriendCode,
} from '../services/firebase';

interface LoggedInAccount {
  uid?: string;
  name: string;
  email: string;
  createdAt: string;
  friendCode?: string;
}

interface Props {
  profile: UserProfile;
  records: DailyRecord[];
  streak: number;
  longestStreak: number;
  totalDistance: number;
  totalSessions: number;
  onBack: () => void;
  onReset: () => void;
}

const LOGGED_IN_KEY = 'runmate_logged_in';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ProfileScreen({ profile, records, streak, longestStreak, totalDistance, totalSessions, onBack, onReset }: Props) {
  const [loggedIn, setLoggedIn] = useState<LoggedInAccount | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'login' | 'register' | 'forgot' | 'reset_sent'>('login');
  const [isLoading, setIsLoading] = useState(false);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const totalCalories = records.reduce((sum, r) => sum + r.calories, 0);
  const totalSteps = records.reduce((sum, r) => sum + r.steps, 0);
  const activeDays = records.filter(r => r.goalReached).length;
  const goalText = profile.goal === 'lose' ? 'Giảm cân' : profile.goal === 'maintain' ? 'Giữ dáng' : 'Tăng thể lực';

  useEffect(() => {
    const hydrateSession = async () => {
      try {
        const saved = localStorage.getItem(LOGGED_IN_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setLoggedIn(parsed);

          if (!parsed.friendCode) {
            const friendCode = await ensureCurrentUserFriendCode();
            const updated = { ...parsed, friendCode };
            localStorage.setItem(LOGGED_IN_KEY, JSON.stringify(updated));
            setLoggedIn(updated);
          }
        }
      } catch {}
    };

    hydrateSession();
  }, []);

  const resetForm = () => {
    setError(''); setSuccess('');
    setFormName(''); setFormEmail('');
    setFormPassword(''); setFormConfirmPassword('');
    setShowPassword(false);
  };

  const switchMode = (mode: typeof modalMode) => {
    setModalMode(mode);
    setError(''); setSuccess('');
  };

  // ═══════ ĐĂNG KÝ ═══════
  const handleRegister = async () => {
    setError('');
    if (!formName.trim()) { setError('Vui lòng nhập họ tên'); return; }
    if (!formEmail.trim()) { setError('Vui lòng nhập email'); return; }
    if (!isValidEmail(formEmail)) { setError('Email không hợp lệ'); return; }
    if (formPassword.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự'); return; }
    if (formPassword !== formConfirmPassword) { setError('Mật khẩu xác nhận không khớp'); return; }

    setIsLoading(true);
    const result = await registerUser(formEmail.trim(), formPassword, formName.trim());
    setIsLoading(false);

    if (result.success && 'user' in result && result.user) {
      const session: LoggedInAccount = {
        name: result.user.name || formName,
        email: result.user.email || formEmail,
        createdAt: new Date().toISOString(),
        friendCode: result.user.friendCode || '',
      };
      setLoggedIn(session);
      localStorage.setItem(LOGGED_IN_KEY, JSON.stringify(session));
      setSuccess('🎉 Đăng ký thành công!');
      setTimeout(() => { setShowModal(false); resetForm(); }, 1200);
    } else {
      setError('error' in result ? (result.error || 'Đăng ký thất bại') : 'Đăng ký thất bại');
    }
  };

  // ═══════ ĐĂNG NHẬP ═══════
  const handleLogin = async () => {
    setError('');
    if (!formEmail.trim()) { setError('Vui lòng nhập email'); return; }
    if (!isValidEmail(formEmail)) { setError('Email không hợp lệ'); return; }
    if (!formPassword) { setError('Vui lòng nhập mật khẩu'); return; }

    setIsLoading(true);
    const result = await loginUser(formEmail.trim(), formPassword);
    setIsLoading(false);

    if (result.success && 'user' in result && result.user) {
      const session: LoggedInAccount = {
        uid: result.user.uid || '',
        name: result.user.name || 'Người dùng',
        email: result.user.email || formEmail,
        createdAt: new Date().toISOString(),
        friendCode: result.user.friendCode || '',
      };
      setLoggedIn(session);
      localStorage.setItem(LOGGED_IN_KEY, JSON.stringify(session));
      setSuccess('✅ Đăng nhập thành công!');
      setTimeout(() => { setShowModal(false); resetForm(); }, 1200);
    } else {
      setError('error' in result ? (result.error || 'Đăng nhập thất bại') : 'Đăng nhập thất bại');
    }
  };

  // ═══════ QUÊN MẬT KHẨU ═══════
  const handleForgotPassword = async () => {
    setError('');
    if (!formEmail.trim()) { setError('Vui lòng nhập email'); return; }
    if (!isValidEmail(formEmail)) { setError('Email không hợp lệ'); return; }

    setIsLoading(true);
    const result = await resetPassword(formEmail.trim());
    setIsLoading(false);

    if (result.success) {
      switchMode('reset_sent');
    } else {
      setError('error' in result ? (result.error || 'Không thể gửi email') : 'Không thể gửi email');
    }
  };

  // ═══════ ĐĂNG XUẤT ═══════
  const handleLogout = async () => {
    await logoutUser();
    setLoggedIn(null);
    localStorage.removeItem(LOGGED_IN_KEY);
  };

  const openModal = (mode: 'login' | 'register') => {
    resetForm();
    setModalMode(mode);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white px-5 pt-12 pb-8 rounded-b-3xl">
        <button onClick={onBack} className="mb-4 text-white/80 flex items-center gap-2">
          <span>←</span> Quay lại
        </button>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl">
            {profile.gender === 'male' ? '👨' : '👩'}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{loggedIn ? loggedIn.name : profile.name}</h1>
            <p className="text-sm opacity-80">Mục tiêu: {goalText}</p>
            {loggedIn && (
              <div className="flex items-center gap-1 mt-1">
                <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
                <span className="text-xs opacity-80">{loggedIn.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {/* Tài khoản */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">🔐 Tài khoản</h3>

          {loggedIn ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-xl font-bold text-white">
                  {loggedIn.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{loggedIn.name}</div>
                  <div className="text-xs text-gray-500">{loggedIn.email}</div>
                  <div className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    Đang đăng nhập
                  </div>
                </div>
              </div>
              {loggedIn.friendCode && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                  <div className="text-xs text-indigo-600 mb-1">Mã kết bạn của bạn</div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-2xl font-black tracking-[0.35em] text-indigo-700 pl-1">{loggedIn.friendCode}</div>
                    <button
                      onClick={() => navigator.clipboard?.writeText(loggedIn.friendCode || '')}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold active:scale-95"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
              <button onClick={handleLogout} className="w-full py-2.5 rounded-xl text-sm font-medium text-red-500 bg-red-50 border border-red-100 active:scale-98 transition-transform">
                🚪 Đăng xuất
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
                <div className="text-sm text-yellow-800 font-medium mb-1">⚠️ Chưa đăng nhập</div>
                <div className="text-xs text-yellow-700">Đăng nhập để lưu dữ liệu và không bị mất khi đổi thiết bị.</div>
              </div>
              <button onClick={() => openModal('login')} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold py-3.5 rounded-xl active:scale-98 transition-transform flex items-center justify-center gap-2">
                📧 Đăng nhập bằng Email
              </button>
              <button onClick={() => openModal('register')} className="w-full bg-white text-emerald-600 font-semibold py-3.5 rounded-xl border-2 border-emerald-500 active:scale-98 transition-transform flex items-center justify-center gap-2">
                ✨ Tạo tài khoản mới
              </button>
            </div>
          )}
        </div>

        {/* Chỉ số cơ thể */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">📋 Chỉ số cơ thể</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-500">Tuổi</div><div className="font-bold text-gray-800">{profile.age}</div></div>
            <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-500">Giới tính</div><div className="font-bold text-gray-800">{profile.gender === 'male' ? 'Nam' : 'Nữ'}</div></div>
            <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-500">Chiều cao</div><div className="font-bold text-gray-800">{profile.height} cm</div></div>
            <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-500">Cân nặng</div><div className="font-bold text-gray-800">{profile.weight} kg</div></div>
            <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-500">BMI</div><div className="font-bold text-gray-800">{profile.bmi} <span className="text-xs font-normal text-gray-500">({profile.bmiCategory})</span></div></div>
            <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-500">TDEE</div><div className="font-bold text-gray-800">{profile.tdee} kcal</div></div>
          </div>
        </div>

        {/* Mục tiêu */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">🎯 Mục tiêu hàng ngày</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-sm text-gray-600">Calo tiêu thụ</span><span className="font-semibold text-orange-500">{profile.dailyCalorieTarget} kcal</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-600">Bước chân</span><span className="font-semibold text-emerald-500">{profile.dailyStepTarget.toLocaleString()} bước</span></div>
            {profile.goal === 'lose' && (
              <>
                <div className="flex justify-between"><span className="text-sm text-gray-600">Cân nặng mục tiêu</span><span className="font-semibold text-blue-500">{profile.targetWeight} kg</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-600">Thời gian</span><span className="font-semibold text-blue-500">{profile.targetMonths} tháng</span></div>
              </>
            )}
          </div>
        </div>

        {/* Thống kê */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">📊 Thống kê tổng hợp</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-emerald-600">{totalSessions}</div><div className="text-xs text-gray-500">Buổi tập</div></div>
            <div className="bg-orange-50 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-orange-600">{totalCalories.toLocaleString()}</div><div className="text-xs text-gray-500">Tổng kcal</div></div>
            <div className="bg-blue-50 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-blue-600">{totalDistance.toFixed(1)}</div><div className="text-xs text-gray-500">Tổng km</div></div>
            <div className="bg-purple-50 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-purple-600">{totalSteps.toLocaleString()}</div><div className="text-xs text-gray-500">Tổng bước</div></div>
            <div className="bg-yellow-50 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-yellow-600">{streak}</div><div className="text-xs text-gray-500">Streak hiện tại</div></div>
            <div className="bg-pink-50 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-pink-600">{longestStreak}</div><div className="text-xs text-gray-500">Streak dài nhất</div></div>
            <div className="bg-cyan-50 rounded-xl p-3 text-center col-span-2"><div className="text-2xl font-bold text-cyan-600">{activeDays}</div><div className="text-xs text-gray-500">Ngày đạt mục tiêu</div></div>
          </div>
        </div>

        <button onClick={onReset} className="w-full bg-amber-50 text-amber-600 py-3 rounded-2xl text-sm font-semibold border border-amber-200">
          🎯 Đặt lại mục tiêu của bạn
        </button>
      </div>

      {/* ═══════ MODAL ═══════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isLoading && setShowModal(false)} />

          <div className="relative bg-white w-full max-w-[430px] rounded-t-3xl p-6 pb-8 animate-bounce-in max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-5" />

            {/* ═══ ĐĂNG NHẬP / ĐĂNG KÝ ═══ */}
            {(modalMode === 'login' || modalMode === 'register') && (
              <>
                <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
                  <button onClick={() => switchMode('login')} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${modalMode === 'login' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Đăng nhập</button>
                  <button onClick={() => switchMode('register')} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${modalMode === 'register' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Đăng ký</button>
                </div>

                <div className="text-center mb-5">
                  <div className="text-4xl mb-2">{modalMode === 'login' ? '👋' : '🎉'}</div>
                  <h2 className="text-xl font-bold text-gray-800">{modalMode === 'login' ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}</h2>
                  <p className="text-sm text-gray-500 mt-1">{modalMode === 'login' ? 'Đăng nhập để đồng bộ dữ liệu' : 'Email sẽ được kiểm tra trùng lặp toàn hệ thống'}</p>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm"><span>❌</span> {error}</div>}
                {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm"><span>✅</span> {success}</div>}

                <div className="space-y-4">
                  {modalMode === 'register' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Họ và tên</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">👤</span>
                        <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nguyễn Văn A" className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 outline-none focus:border-emerald-500 transition text-gray-800" />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">📧</span>
                      <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="example@gmail.com" className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 outline-none focus:border-emerald-500 transition text-gray-800" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Mật khẩu</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                      <input type={showPassword ? 'text' : 'password'} value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder={modalMode === 'register' ? 'Tối thiểu 6 ký tự' : 'Nhập mật khẩu'} className="w-full pl-11 pr-12 py-3 rounded-xl border-2 border-gray-200 outline-none focus:border-emerald-500 transition text-gray-800" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">{showPassword ? '🙈' : '👁️'}</button>
                    </div>
                  </div>

                  {modalMode === 'register' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Xác nhận mật khẩu</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                        <input type={showPassword ? 'text' : 'password'} value={formConfirmPassword} onChange={e => setFormConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu" className={`w-full pl-11 pr-12 py-3 rounded-xl border-2 outline-none transition text-gray-800 ${formConfirmPassword && formConfirmPassword !== formPassword ? 'border-red-300' : formConfirmPassword && formConfirmPassword === formPassword ? 'border-emerald-300' : 'border-gray-200'}`} />
                        {formConfirmPassword && <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{formConfirmPassword === formPassword ? '✅' : '❌'}</span>}
                      </div>
                    </div>
                  )}

                  {modalMode === 'login' && (
                    <div className="text-right">
                      <button onClick={() => { switchMode('forgot'); }} className="text-sm text-emerald-600 font-medium">Quên mật khẩu?</button>
                    </div>
                  )}

                  <button onClick={modalMode === 'login' ? handleLogin : handleRegister} disabled={isLoading} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-3.5 rounded-xl active:scale-98 transition-transform disabled:opacity-60 flex items-center justify-center gap-2">
                    {isLoading ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang xử lý...</>) : modalMode === 'login' ? (<>📧 Đăng nhập</>) : (<>✨ Đăng ký tài khoản</>)}
                  </button>
                </div>

                <div className="mt-5 text-center">
                  {modalMode === 'login' ? (
                    <p className="text-sm text-gray-500">Chưa có tài khoản? <button onClick={() => switchMode('register')} className="text-emerald-600 font-semibold">Đăng ký ngay</button></p>
                  ) : (
                    <p className="text-sm text-gray-500">Đã có tài khoản? <button onClick={() => switchMode('login')} className="text-emerald-600 font-semibold">Đăng nhập</button></p>
                  )}
                </div>
              </>
            )}

            {/* ═══ QUÊN MẬT KHẨU ═══ */}
            {modalMode === 'forgot' && (
              <>
                <div className="text-center mb-5">
                  <div className="text-4xl mb-2">🔑</div>
                  <h2 className="text-xl font-bold text-gray-800">Quên mật khẩu?</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Nhập email để nhận link đặt lại mật khẩu
                  </p>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm"><span>❌</span> {error}</div>}
                {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm"><span>✅</span> {success}</div>}

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email đã đăng ký</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">📧</span>
                      <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="example@gmail.com" className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 outline-none focus:border-emerald-500 transition text-gray-800" />
                    </div>
                  </div>
                  <button onClick={handleForgotPassword} disabled={isLoading} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-3.5 rounded-xl active:scale-98 transition-transform disabled:opacity-60 flex items-center justify-center gap-2">
                    {isLoading ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang gửi...</>) : (<>📨 Gửi link đặt lại mật khẩu</>)}
                  </button>
                </div>
                <button onClick={() => switchMode('login')} className="w-full mt-4 py-2 text-gray-500 text-sm font-medium">← Quay lại đăng nhập</button>
              </>
            )}

            {/* ═══ ĐÃ GỬI EMAIL RESET ═══ */}
            {modalMode === 'reset_sent' && (
              <div className="text-center py-4">
                <div className="text-5xl mb-4">📬</div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Đã gửi email!</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Link đặt lại mật khẩu đã được gửi đến<br />
                  <span className="font-semibold text-emerald-600">{formEmail}</span>
                </p>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 text-left">
                  <div className="text-xs text-blue-700 space-y-1">
                    <p>📩 Kiểm tra hộp thư đến (và cả Spam/Junk)</p>
                    <p>🔗 Nhấn vào link trong email để đặt mật khẩu mới</p>
                    <p>⏰ Link có hiệu lực trong 1 giờ</p>
                  </div>
                </div>
                <button onClick={() => { switchMode('login'); }} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-3.5 rounded-xl">
                  ← Quay lại đăng nhập
                </button>
              </div>
            )}

            {/* Điều khoản + Đóng */}
            {(modalMode === 'login' || modalMode === 'register') && (
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-400">
                  Bằng việc {modalMode === 'login' ? 'đăng nhập' : 'đăng ký'}, bạn đồng ý với{' '}
                  <span className="text-emerald-600">Điều khoản sử dụng</span> và{' '}
                  <span className="text-emerald-600">Chính sách bảo mật</span>
                </p>
              </div>
            )}

            {!isLoading && (
              <button onClick={() => { setShowModal(false); resetForm(); }} className="w-full mt-3 py-2 text-gray-500 text-sm font-medium">Để sau</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
