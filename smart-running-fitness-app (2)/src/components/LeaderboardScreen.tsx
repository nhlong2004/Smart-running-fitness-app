import { useState, useEffect } from 'react';
import { UserProfile, DailyRecord } from '../types';
import { findUserByFriendCode, getUserData, ensureCurrentUserFriendCode } from '../services/firebase';

interface Friend {
  id: string;
  uid: string;
  name: string;
  email: string;
  friendCode: string;
  avatar: string;
  addedAt: string;
}

interface FriendData {
  todaySteps: number;
  monthSteps: number;
  todayCalories: number;
  monthCalories: number;
  streak: number;
}

interface Props {
  profile: UserProfile;
  todayRecord: DailyRecord;
  records: DailyRecord[];
  streak: number;
  onBack: () => void;
}

const FRIENDS_KEY = 'runmate_friends';

function loadFriends(): Friend[] {
  try {
    const data = localStorage.getItem(FRIENDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveFriends(friends: Friend[]) {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
}

function generateFallbackData(seedKey: string): FriendData {
  const seed = seedKey.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const random = (min: number, max: number, n: number) => {
    const x = Math.sin(seed + n) * 10000;
    return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
  };
  return {
    todaySteps: random(1500, 13000, 1),
    monthSteps: random(35000, 240000, 2),
    todayCalories: random(80, 700, 3),
    monthCalories: random(2500, 18000, 4),
    streak: random(0, 30, 5),
  };
}

function getCurrentSession() {
  try {
    const raw = localStorage.getItem('runmate_logged_in');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export default function LeaderboardScreen({ profile, todayRecord, records, streak, onBack }: Props) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsData, setFriendsData] = useState<Record<string, FriendData>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState<'today' | 'month'>('today');
  const [sortBy, setSortBy] = useState<'steps' | 'calories'>('steps');
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [myFriendCode, setMyFriendCode] = useState(() => getCurrentSession()?.friendCode || '------');

  const loadFriendStats = async (friendList: Friend[]) => {
    const nextData: Record<string, FriendData> = {};

    for (const friend of friendList) {
      try {
        const cloud = await getUserData(friend.uid);
        const appData = cloud?.appData as { dailyRecords?: Array<{ date: string; steps: number; calories: number }>; stats?: { currentStreak?: number } } | undefined;

        if (appData?.dailyRecords) {
          const today = new Date().toISOString().split('T')[0];
          const monthPrefix = today.slice(0, 7);
          const todayData = appData.dailyRecords.find(r => r.date === today);
          const monthRecords = appData.dailyRecords.filter(r => r.date.startsWith(monthPrefix));

          nextData[friend.id] = {
            todaySteps: todayData?.steps || 0,
            monthSteps: monthRecords.reduce((sum, r) => sum + (r.steps || 0), 0),
            todayCalories: todayData?.calories || 0,
            monthCalories: monthRecords.reduce((sum, r) => sum + (r.calories || 0), 0),
            streak: appData.stats?.currentStreak || 0,
          };
        } else {
          nextData[friend.id] = generateFallbackData(friend.friendCode);
        }
      } catch {
        nextData[friend.id] = generateFallbackData(friend.friendCode);
      }
    }

    setFriendsData(nextData);
  };

  useEffect(() => {
    const init = async () => {
      const code = await ensureCurrentUserFriendCode();
      setMyFriendCode(code || '------');

      const loaded = loadFriends();
      setFriends(loaded);
      loadFriendStats(loaded);
    };

    init();
  }, []);

  const getUserMonthStats = () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthRecords = records.filter(r => r.date.startsWith(thisMonth));
    return {
      steps: monthRecords.reduce((sum, r) => sum + r.steps, 0),
      calories: monthRecords.reduce((sum, r) => sum + r.calories, 0),
    };
  };

  const userMonthStats = getUserMonthStats();

  const handleAddFriend = async () => {
    setError('');
    setSuccess('');
    const code = normalizeCode(friendCodeInput);

    if (code.length !== 6) {
      setError('Vui lòng nhập đúng mã kết bạn gồm 6 ký tự');
      return;
    }
    if (code === myFriendCode) {
      setError('Bạn không thể tự thêm chính mình');
      return;
    }
    if (friends.some(f => f.friendCode === code)) {
      setError('Mã này đã có trong danh sách bạn bè');
      return;
    }

    setLoadingAdd(true);
    const result = await findUserByFriendCode(code);
    setLoadingAdd(false);

    if (!result.success || !('user' in result) || !result.user) {
      setError('error' in result ? (result.error || 'Không tìm thấy người dùng') : 'Không tìm thấy người dùng');
      return;
    }

    const user = result.user as { uid: string; name: string; email: string; friendCode: string };
    const newFriend: Friend = {
      id: user.uid,
      uid: user.uid,
      name: user.name,
      email: user.email,
      friendCode: user.friendCode,
      avatar: ['🧑', '👩', '👨', '🧔', '👱', '👧', '🧒'][Math.floor(Math.random() * 7)],
      addedAt: new Date().toISOString(),
    };

    const updatedFriends = [...friends, newFriend];
    setFriends(updatedFriends);
    saveFriends(updatedFriends);
    await loadFriendStats(updatedFriends);

    setSuccess(`🎉 Đã kết bạn với ${user.name}!`);
    setFriendCodeInput('');
    setTimeout(() => {
      setShowAddModal(false);
      setSuccess('');
    }, 1400);
  };

  const handleRemoveFriend = (friendId: string) => {
    const updated = friends.filter(f => f.id !== friendId);
    setFriends(updated);
    saveFriends(updated);
    setFriendsData(prev => {
      const next = { ...prev };
      delete next[friendId];
      return next;
    });
  };

  const getLeaderboard = () => {
    const entries: Array<{
      id: string;
      name: string;
      sub: string;
      avatar: string;
      steps: number;
      calories: number;
      streak: number;
      isUser: boolean;
      rank?: number;
    }> = [];

    entries.push({
      id: 'user',
      name: profile.name,
      sub: `Mã: ${myFriendCode}`,
      avatar: profile.gender === 'male' ? '🙋‍♂️' : '🙋‍♀️',
      steps: viewMode === 'today' ? todayRecord.steps : userMonthStats.steps,
      calories: viewMode === 'today' ? todayRecord.calories : userMonthStats.calories,
      streak,
      isUser: true,
    });

    friends.forEach(friend => {
      const data = friendsData[friend.id] || generateFallbackData(friend.friendCode);
      entries.push({
        id: friend.id,
        name: friend.name,
        sub: `ID: ${friend.friendCode}`,
        avatar: friend.avatar,
        steps: viewMode === 'today' ? data.todaySteps : data.monthSteps,
        calories: viewMode === 'today' ? data.todayCalories : data.monthCalories,
        streak: data.streak,
        isUser: false,
      });
    });

    const sortField = sortBy === 'steps' ? 'steps' : 'calories';
    entries.sort((a, b) => b[sortField] - a[sortField]);
    return entries.map((entry, i) => ({ ...entry, rank: i + 1 }));
  };

  const leaderboard = getLeaderboard();
  const userRank = leaderboard.find(e => e.isUser)?.rank || 1;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-5 pt-12 pb-6 rounded-b-3xl">
        <button onClick={onBack} className="mb-4 text-white/80 flex items-center gap-2">
          <span>←</span> Quay lại
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🏅 Bảng xếp hạng</h1>
            <p className="text-sm opacity-80">Kết bạn bằng mã ID 6 ký tự</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-white/20 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 active:scale-95 transition-transform"
          >
            ➕ Thêm bạn
          </button>
        </div>

        <div className="mt-4 bg-white/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="text-4xl">{profile.gender === 'male' ? '🙋‍♂️' : '🙋‍♀️'}</div>
          <div className="flex-1">
            <div className="font-bold">{profile.name}</div>
            <div className="text-sm opacity-80">
              {viewMode === 'today' ? `${todayRecord.steps.toLocaleString()} bước hôm nay` : `${userMonthStats.steps.toLocaleString()} bước tháng này`}
            </div>
            <div className="text-xs mt-1 opacity-90">ID của bạn: <span className="font-bold tracking-[0.18em]">{myFriendCode}</span></div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">#{userRank}</div>
            <div className="text-xs opacity-80">/ {leaderboard.length} người</div>
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">
        <div className="flex gap-2">
          <div className="flex bg-white rounded-xl p-1 shadow-sm flex-1">
            <button onClick={() => setViewMode('today')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${viewMode === 'today' ? 'bg-indigo-500 text-white' : 'text-gray-500'}`}>
              📅 Hôm nay
            </button>
            <button onClick={() => setViewMode('month')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${viewMode === 'month' ? 'bg-indigo-500 text-white' : 'text-gray-500'}`}>
              📆 Tháng này
            </button>
          </div>
          <div className="flex bg-white rounded-xl p-1 shadow-sm">
            <button onClick={() => setSortBy('steps')} className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${sortBy === 'steps' ? 'bg-emerald-500 text-white' : 'text-gray-500'}`}>👣</button>
            <button onClick={() => setSortBy('calories')} className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${sortBy === 'calories' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}>🔥</button>
          </div>
        </div>

        {friends.length === 0 && (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
            <div className="text-5xl mb-3">👥</div>
            <h3 className="font-bold text-gray-800 mb-2">Chưa có bạn bè</h3>
            <p className="text-sm text-gray-500 mb-4">Hãy gửi mã ID của bạn cho bạn bè và nhập đúng mã ID của họ để kết bạn.</p>
            <button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold px-6 py-3 rounded-xl active:scale-95 transition-transform">
              ➕ Thêm bạn bè đầu tiên
            </button>
          </div>
        )}

        {leaderboard.length >= 3 && (
          <div className="flex items-end justify-center gap-2 py-4">
            {leaderboard.slice(0, 3).map((entry, i) => {
              const heights = [80, 100, 60];
              const sizes = ['text-4xl', 'text-5xl', 'text-3xl'];
              const order = [1, 0, 2];
              const medals = ['🥈', '🥇', '🥉'];
              const colors = ['bg-gray-300', 'bg-yellow-400', 'bg-amber-600'];
              const idx = order[i];
              const value = sortBy === 'steps' ? entry.steps : entry.calories;
              const unit = sortBy === 'steps' ? '' : ' kcal';
              return (
                <div key={entry.id} className="flex flex-col items-center" style={{ order: i }}>
                  <span className={sizes[idx]}>{entry.avatar}</span>
                  <span className={`text-xs font-semibold mt-1 text-center max-w-[80px] truncate ${entry.isUser ? 'text-emerald-600' : 'text-gray-700'}`}>
                    {entry.isUser ? 'Bạn' : entry.name}
                  </span>
                  <div className={`w-20 rounded-t-xl flex flex-col items-center justify-center text-white mt-2 ${colors[idx]}`} style={{ height: `${heights[idx]}px` }}>
                    <span className="text-xl">{medals[idx]}</span>
                    <span className="text-xs font-bold">{value.toLocaleString()}{unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {leaderboard.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {leaderboard.map(entry => {
              const value = sortBy === 'steps' ? entry.steps : entry.calories;
              const unit = sortBy === 'steps' ? 'bước' : 'kcal';
              return (
                <div key={entry.id} className={`flex items-center gap-3 p-4 border-b border-gray-50 last:border-0 ${entry.isUser ? 'bg-emerald-50' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${entry.rank <= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                    {entry.rank}
                  </div>
                  <span className="text-2xl">{entry.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold truncate ${entry.isUser ? 'text-emerald-700' : 'text-gray-800'}`}>
                      {entry.isUser ? `${entry.name} (Bạn)` : entry.name}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{entry.isUser ? entry.sub : `${entry.sub} • 🔥 ${entry.streak} ngày`}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-800">{value.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">{unit}</div>
                  </div>
                  {!entry.isUser && (
                    <button onClick={() => handleRemoveFriend(entry.id)} className="text-gray-300 hover:text-red-500 transition p-1">✕</button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {friends.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4">
            <h4 className="font-semibold text-indigo-800 mb-2">📊 Thống kê {viewMode === 'today' ? 'hôm nay' : 'tháng này'}</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-600">Tổng bạn bè:</span><span className="font-bold text-indigo-600 ml-2">{friends.length}</span></div>
              <div><span className="text-gray-600">Hạng của bạn:</span><span className="font-bold text-indigo-600 ml-2">#{userRank}/{leaderboard.length}</span></div>
              <div><span className="text-gray-600">Bạn hơn:</span><span className="font-bold text-emerald-600 ml-2">{leaderboard.length - userRank} người</span></div>
              <div><span className="text-gray-600">Cần vượt:</span><span className="font-bold text-orange-600 ml-2">{userRank - 1} người</span></div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <h4 className="font-semibold text-blue-800 mb-2">💡 Mẹo kết bạn</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Mỗi tài khoản có 1 mã kết bạn cố định gồm 6 ký tự</li>
            <li>• Gửi mã của bạn cho bạn bè để họ nhập và kết nối</li>
            <li>• Sau khi kết bạn, bảng xếp hạng sẽ hiển thị bạn và bạn bè theo ngày/tháng</li>
          </ul>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white w-full max-w-[430px] rounded-t-3xl p-6 pb-8 animate-bounce-in">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-5" />
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">👥</div>
              <h2 className="text-xl font-bold text-gray-800">Thêm bạn bè</h2>
              <p className="text-sm text-gray-500 mt-1">Nhập đúng mã kết bạn 6 ký tự của bạn bè</p>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm"><span>❌</span> {error}</div>}
            {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm"><span>✅</span> {success}</div>}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Mã kết bạn</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🆔</span>
                  <input
                    type="text"
                    value={friendCodeInput}
                    onChange={e => setFriendCodeInput(normalizeCode(e.target.value))}
                    placeholder="VD: A7K9P2"
                    maxLength={6}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 outline-none focus:border-indigo-500 transition text-gray-800 tracking-[0.3em] font-bold uppercase"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
                ID của bạn: <span className="font-bold text-indigo-700 tracking-[0.2em]">{myFriendCode}</span>
              </div>

              <button
                onClick={handleAddFriend}
                disabled={loadingAdd}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3.5 rounded-xl active:scale-98 transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loadingAdd ? 'Đang tìm...' : '➕ Kết bạn bằng ID'}
              </button>
            </div>

            <button onClick={() => setShowAddModal(false)} className="w-full mt-3 py-2 text-gray-500 text-sm font-medium">Hủy</button>
          </div>
        </div>
      )}
    </div>
  );
}
