import { useState } from 'react';
import { UserProfile } from '../types';
import { saveWallPosts, loadWallPosts } from './WallScreen';
import type { WallPost } from './WallScreen';

interface Challenge {
  id: string; title: string; description: string; icon: string;
  type: 'daily' | 'weekly' | 'custom' | 'group';
  target: number; unit: string; current: number; reward: string;
  difficulty: 'Dễ' | 'Trung bình' | 'Khó' | 'Rất khó';
  participants?: number; daysLeft?: number;
}

export interface Group {
  id: string; name: string; icon: string; members: number; joined: boolean;
  description?: string; tags?: string[]; privacy?: 'public' | 'private';
  location?: string; createdBy?: string; createdAt?: string;
  posts?: GroupPost[];
}

interface GroupPost {
  id: string; author: string; avatar: string; time: string;
  content: string; likes: number; liked: boolean;
  comments: { id: string; author: string; text: string; time: string }[];
}

interface Props { profile: UserProfile; onBack: () => void; }

const GROUPS_KEY = 'runmate_groups';

function loadGroups(): Group[] {
  try { return JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]'); } catch { return []; }
}
function saveGroups(groups: Group[]) {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

const TAGS = ['Giải trí', 'Thương hiệu/Tổ chức', 'Sức khỏe', 'Chạy bộ', 'Đạp xe', 'Giảm cân', 'Thể thao', 'Cộng đồng', 'Trường học', 'Công ty'];

export default function ChallengeScreen({ profile, onBack }: Props) {
  const [tab, setTab] = useState<'suggested' | 'my' | 'groups'>('suggested');
  const [groups, setGroups] = useState<Group[]>(loadGroups);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('runmate_accepted_challenges') || '[]')); } catch { return new Set(); }
  });

  // Tạo nhóm flow
  const [createStep, setCreateStep] = useState(0); // 0=hidden, 1=tags, 2=info, 3=privacy, 4=location
  const [cTags, setCTags] = useState<string[]>([]);
  const [cName, setCName] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cPrivacy, setCPrivacy] = useState<'public' | 'private'>('public');
  const [cLocation, setCLocation] = useState('Toàn cầu');

  // Trang nhóm
  const [viewGroup, setViewGroup] = useState<Group | null>(null);
  const [groupPostText, setGroupPostText] = useState('');
  const [groupCommentText, setGroupCommentText] = useState('');
  const [commentingGroupPost, setCommentingGroupPost] = useState<string | null>(null);

  const me = (() => { try { return JSON.parse(localStorage.getItem('runmate_logged_in') || '{}'); } catch { return { name: 'Bạn' }; } })();

  // ═══ Thử thách ═══
  const suggestedChallenges: Challenge[] = [
    { id: 'daily_5k', title: 'Chinh phục 5km', description: 'Chạy hoặc đi bộ 5km trong ngày', icon: '🏃', type: 'daily', target: 5, unit: 'km', current: 0, reward: '+50 XP', difficulty: 'Dễ', daysLeft: 1 },
    { id: 'daily_10k_steps', title: '10.000 bước chân', description: 'Đạt 10.000 bước trong ngày', icon: '👣', type: 'daily', target: 10000, unit: 'bước', current: 0, reward: '+80 XP', difficulty: 'Trung bình', daysLeft: 1 },
    { id: 'weekly_30km', title: 'Tuần năng động', description: 'Chạy tổng 30km trong tuần', icon: '📅', type: 'weekly', target: 30, unit: 'km', current: 0, reward: 'Huy hiệu Tuần Vàng 🏅', difficulty: 'Khó', daysLeft: 7 },
    { id: 'weekly_500cal', title: 'Đốt cháy 3500 kcal', description: 'Tiêu thụ 3500 kcal trong tuần', icon: '🔥', type: 'weekly', target: 3500, unit: 'kcal', current: 0, reward: 'Huy hiệu Lửa 🔥', difficulty: 'Khó', daysLeft: 7 },
    { id: 'streak_7', title: '7 ngày liên tiếp', description: 'Đạt mục tiêu 7 ngày liên tiếp', icon: '⚡', type: 'weekly', target: 7, unit: 'ngày', current: 0, reward: 'Huy hiệu Chiến Binh ⚔️', difficulty: 'Trung bình', daysLeft: 7 },
    { id: 'marathon_month', title: 'Marathon tháng', description: 'Chạy tổng 42km trong 1 tháng', icon: '🏅', type: 'custom', target: 42, unit: 'km', current: 0, reward: 'Huy hiệu Marathon 🏅', difficulty: 'Rất khó', daysLeft: 30 },
  ];
  const personalChallenges: Challenge[] = [
    { id: `p_cal`, title: `Đốt ${profile.dailyCalorieTarget} kcal hôm nay`, description: 'Hoàn thành mục tiêu calo cá nhân', icon: '🎯', type: 'daily', target: profile.dailyCalorieTarget, unit: 'kcal', current: 0, reward: 'Streak +1', difficulty: 'Trung bình', daysLeft: 1 },
    { id: `p_steps`, title: `${profile.dailyStepTarget.toLocaleString()} bước hôm nay`, description: 'Đạt mục tiêu bước chân', icon: '👟', type: 'daily', target: profile.dailyStepTarget, unit: 'bước', current: 0, reward: 'Streak +1', difficulty: 'Trung bình', daysLeft: 1 },
    { id: 'p_morning', title: 'Chim sớm', description: 'Tập trước 7h sáng', icon: '🐦', type: 'daily', target: 1, unit: 'buổi', current: 0, reward: 'Huy hiệu 🐦', difficulty: 'Dễ', daysLeft: 1 },
    { id: 'p_water', title: 'Uống đủ nước', description: 'Đạt mục tiêu uống nước', icon: '💧', type: 'daily', target: 8, unit: 'ly', current: 0, reward: '+20 XP', difficulty: 'Dễ', daysLeft: 1 },
  ];

  const handleAccept = (id: string) => { const n = new Set(acceptedIds); n.has(id) ? n.delete(id) : n.add(id); setAcceptedIds(n); localStorage.setItem('runmate_accepted_challenges', JSON.stringify([...n])); };

  // ═══ Tạo nhóm ═══
  const handleFinishCreate = () => {
    const g: Group = {
      id: 'grp_' + Date.now(), name: cName.trim(), icon: '👥', members: 1, joined: true,
      description: cDesc.trim(), tags: cTags, privacy: cPrivacy, location: cLocation,
      createdBy: me.name || 'Bạn', createdAt: new Date().toISOString(), posts: [],
    };
    const updated = [g, ...groups];
    setGroups(updated); saveGroups(updated);
    setCTags([]); setCName(''); setCDesc(''); setCPrivacy('public'); setCLocation('Toàn cầu');
    setCreateStep(0);
  };

  // ═══ Đăng bài nhóm ═══
  const handleGroupPost = () => {
    if (!groupPostText.trim() || !viewGroup) return;
    const post: GroupPost = { id: 'gp_' + Date.now(), author: me.name, avatar: '😊', time: 'Vừa xong', content: groupPostText.trim(), likes: 0, liked: false, comments: [] };
    const updatedGroup = { ...viewGroup, posts: [post, ...(viewGroup.posts || [])] };
    setViewGroup(updatedGroup);
    const updatedGroups = groups.map(g => g.id === updatedGroup.id ? updatedGroup : g);
    setGroups(updatedGroups); saveGroups(updatedGroups);

    // Đồng thời đăng lên Tường → tab Nhóm
    const wallPost: WallPost = { id: 'post_' + Date.now(), author: me.name, avatar: '😊', time: 'Vừa xong', content: groupPostText.trim(), likes: 0, comments: [], liked: false, category: 'group', group: viewGroup.name };
    const allPosts = loadWallPosts(); saveWallPosts([wallPost, ...allPosts]);

    setGroupPostText('');
  };

  const handleGroupLike = (postId: string) => {
    if (!viewGroup) return;
    const updatedPosts = (viewGroup.posts || []).map(p => p.id === postId ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p);
    const updatedGroup = { ...viewGroup, posts: updatedPosts };
    setViewGroup(updatedGroup);
    setGroups(prev => { const u = prev.map(g => g.id === updatedGroup.id ? updatedGroup : g); saveGroups(u); return u; });
  };

  const handleGroupComment = (postId: string) => {
    if (!groupCommentText.trim() || !viewGroup) return;
    const c = { id: 'gc_' + Date.now(), author: me.name, text: groupCommentText.trim(), time: 'Vừa xong' };
    const updatedPosts = (viewGroup.posts || []).map(p => p.id === postId ? { ...p, comments: [...p.comments, c] } : p);
    const updatedGroup = { ...viewGroup, posts: updatedPosts };
    setViewGroup(updatedGroup);
    setGroups(prev => { const u = prev.map(g => g.id === updatedGroup.id ? updatedGroup : g); saveGroups(u); return u; });
    setGroupCommentText(''); setCommentingGroupPost(null);
  };

  const diffColors: Record<string, string> = { 'Dễ': 'bg-green-100 text-green-700', 'Trung bình': 'bg-yellow-100 text-yellow-700', 'Khó': 'bg-orange-100 text-orange-700', 'Rất khó': 'bg-red-100 text-red-700' };
  const renderChallenge = (c: Challenge) => {
    const accepted = acceptedIds.has(c.id);
    return (
      <div key={c.id} className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition ${accepted ? 'border-emerald-400' : 'border-transparent'}`}>
        <div className="flex items-start gap-3">
          <div className="text-3xl">{c.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-800 text-sm">{c.title}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${diffColors[c.difficulty]}`}>{c.difficulty}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>🎁 {c.reward}</span>
              {c.daysLeft && <span>⏳ {c.daysLeft} ngày</span>}
            </div>
          </div>
        </div>
        <button onClick={() => handleAccept(c.id)} className={`w-full mt-3 py-2.5 rounded-xl text-sm font-semibold transition active:scale-98 ${accepted ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'}`}>
          {accepted ? '✅ Đã tham gia' : '🎯 Tham gia'}
        </button>
      </div>
    );
  };

  // ═══════ TRANG NHÓM ═══════
  if (viewGroup) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24 animate-slideIn">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-5 pt-12 pb-6 rounded-b-3xl">
          <button onClick={() => setViewGroup(null)} className="mb-3 text-white/80 flex items-center gap-2 text-sm"><span>←</span> Quay lại</button>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">{viewGroup.icon}</div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{viewGroup.name}</h1>
              <div className="text-xs opacity-80 flex items-center gap-2 mt-0.5">
                <span>👥 {viewGroup.members} thành viên</span>
                <span>• {viewGroup.privacy === 'public' ? '🌐 Công khai' : '🔒 Riêng tư'}</span>
              </div>
            </div>
          </div>
          {viewGroup.description && <p className="text-sm opacity-80 mt-3">{viewGroup.description}</p>}
          {viewGroup.tags && viewGroup.tags.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {viewGroup.tags.map(t => <span key={t} className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{t}</span>)}
            </div>
          )}
        </div>

        <div className="px-5 mt-4 space-y-3">
          {/* Đăng bài */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-sm">😊</div>
              <input value={groupPostText} onChange={e => setGroupPostText(e.target.value)} placeholder="Chia sẻ với nhóm..." className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300" onKeyDown={e => e.key === 'Enter' && handleGroupPost()} />
              <button onClick={handleGroupPost} disabled={!groupPostText.trim()} className="bg-indigo-500 text-white px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 active:scale-95">Đăng</button>
            </div>
          </div>

          {/* Bài đăng */}
          {(!viewGroup.posts || viewGroup.posts.length === 0) && (
            <div className="text-center py-10">
              <div className="text-4xl mb-2">📝</div>
              <div className="text-sm text-gray-500">Chưa có bài đăng. Hãy là người đầu tiên!</div>
            </div>
          )}

          {(viewGroup.posts || []).map(post => (
            <div key={post.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-sm">{post.avatar}</div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{post.author}</div>
                    <div className="text-[10px] text-gray-400">{post.time}</div>
                  </div>
                </div>
              </div>
              <div className="px-4 pb-2">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{post.content}</p>
              </div>
              <div className="border-t border-gray-100 px-4 py-2 flex gap-2">
                <button onClick={() => handleGroupLike(post.id)} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${post.liked ? 'text-red-500 bg-red-50' : 'text-gray-500'}`}>{post.liked ? '❤️' : '🤍'} {post.likes}</button>
                <button onClick={() => setCommentingGroupPost(commentingGroupPost === post.id ? null : post.id)} className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm text-gray-500">💬 {post.comments.length}</button>
              </div>
              {(commentingGroupPost === post.id || post.comments.length > 0) && (
                <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 space-y-2">
                  {post.comments.slice(-3).map(c => (
                    <div key={c.id} className="flex gap-2">
                      <div className="flex-1"><span className="text-xs font-semibold text-gray-700">{c.author}</span><span className="text-xs text-gray-400 ml-2">{c.time}</span><p className="text-xs text-gray-600">{c.text}</p></div>
                    </div>
                  ))}
                  {commentingGroupPost === post.id && (
                    <div className="flex gap-2">
                      <input value={groupCommentText} onChange={e => setGroupCommentText(e.target.value)} placeholder="Bình luận..." className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" onKeyDown={e => e.key === 'Enter' && handleGroupComment(post.id)} />
                      <button onClick={() => handleGroupComment(post.id)} className="bg-emerald-500 text-white px-3 py-2 rounded-xl text-sm font-semibold">Gửi</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ═══════ FLOW TẠO NHÓM ═══════
  if (createStep > 0) {
    return (
      <div className="min-h-screen bg-gray-50 pb-10 animate-slideIn">
        <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <button onClick={() => setCreateStep(cs => cs > 1 ? cs - 1 : 0)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-90">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 className="text-lg font-bold text-gray-800">Tạo nhóm mới ({createStep}/4)</h1>
          </div>
          <div className="flex gap-1 mt-3">{[1,2,3,4].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${i <= createStep ? 'bg-indigo-500' : 'bg-gray-200'}`} />)}</div>
        </div>

        <div className="px-5 mt-5">
          {/* Step 1: Chọn thẻ */}
          {createStep === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-bold text-gray-800 mb-1">Mô tả nhóm của bạn</h2>
                <p className="text-sm text-gray-500">Chọn tối đa 3 thẻ phù hợp nhất</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {TAGS.map(tag => {
                  const selected = cTags.includes(tag);
                  return <button key={tag} onClick={() => { if (selected) setCTags(cTags.filter(t => t !== tag)); else if (cTags.length < 3) setCTags([...cTags, tag]); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition active:scale-95 ${selected ? 'bg-indigo-500 text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>{tag}</button>;
                })}
              </div>
              <button onClick={() => setCreateStep(2)} disabled={cTags.length === 0} className="w-full bg-indigo-500 text-white font-bold py-3.5 rounded-xl active:scale-98 disabled:opacity-40 mt-4">Tiếp theo</button>
            </div>
          )}

          {/* Step 2: Tên + Mô tả */}
          {createStep === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-bold text-gray-800 mb-1">Thông tin nhóm</h2>
                <p className="text-sm text-gray-500">Đặt tên và mô tả cho nhóm</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Tên nhóm</label>
                <input value={cName} onChange={e => setCName(e.target.value)} placeholder="VD: Hội chạy bộ buổi tối" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none focus:border-indigo-500 text-gray-800" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Mô tả nhóm</label>
                <textarea value={cDesc} onChange={e => setCDesc(e.target.value)} placeholder="Nhóm dành cho những ai yêu thích chạy bộ..." rows={3} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none focus:border-indigo-500 text-gray-800 resize-none" />
              </div>
              <button onClick={() => setCreateStep(3)} disabled={!cName.trim()} className="w-full bg-indigo-500 text-white font-bold py-3.5 rounded-xl active:scale-98 disabled:opacity-40">Tiếp theo</button>
            </div>
          )}

          {/* Step 3: Quyền riêng tư */}
          {createStep === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-bold text-gray-800 mb-1">Quyền riêng tư</h2>
                <p className="text-sm text-gray-500">Ai có thể tìm thấy và tham gia nhóm?</p>
              </div>
              <div className="space-y-3">
                <button onClick={() => setCPrivacy('public')} className={`w-full text-left p-4 rounded-2xl border-2 transition ${cPrivacy === 'public' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                  <div className="font-bold text-gray-800">🌐 Công khai</div>
                  <div className="text-xs text-gray-500 mt-0.5">Mọi người đều có thể tìm thấy và tham gia nhóm</div>
                </button>
                <button onClick={() => setCPrivacy('private')} className={`w-full text-left p-4 rounded-2xl border-2 transition ${cPrivacy === 'private' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                  <div className="font-bold text-gray-800">🔒 Riêng tư</div>
                  <div className="text-xs text-gray-500 mt-0.5">Chỉ thành viên được mời mới thấy nhóm</div>
                </button>
              </div>
              <button onClick={() => setCreateStep(4)} className="w-full bg-indigo-500 text-white font-bold py-3.5 rounded-xl active:scale-98">Tiếp theo</button>
            </div>
          )}

          {/* Step 4: Vị trí */}
          {createStep === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-bold text-gray-800 mb-1">Vị trí nhóm</h2>
                <p className="text-sm text-gray-500">Chọn phạm vi hoạt động</p>
              </div>
              <div className="space-y-3">
                <button onClick={() => setCLocation('Toàn cầu')} className={`w-full text-left p-4 rounded-2xl border-2 transition ${cLocation === 'Toàn cầu' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                  <div className="font-bold text-gray-800">🌍 Toàn cầu</div>
                  <div className="text-xs text-gray-500 mt-0.5">Không giới hạn khu vực</div>
                </button>
                {['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng'].map(city => (
                  <button key={city} onClick={() => setCLocation(city)} className={`w-full text-left p-4 rounded-2xl border-2 transition ${cLocation === city ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                    <div className="font-bold text-gray-800">📍 {city}</div>
                  </button>
                ))}
              </div>
              <button onClick={handleFinishCreate} disabled={!cName.trim()} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-4 rounded-xl active:scale-98 disabled:opacity-40 text-lg">✨ Tạo nhóm</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════ MAIN ═══════
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-orange-400 to-red-500 text-white px-5 pt-12 pb-6 rounded-b-3xl">
        <button onClick={onBack} className="mb-4 text-white/80 flex items-center gap-2"><span>←</span> Quay lại</button>
        <h1 className="text-2xl font-bold">🎯 Thử thách</h1>
        <p className="text-sm opacity-80">Vượt qua giới hạn bản thân</p>
      </div>

      <div className="px-5 mt-5 space-y-4">
        <div className="flex bg-white rounded-xl p-1 shadow-sm">
          <button onClick={() => setTab('suggested')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === 'suggested' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}>🔥 Đề xuất</button>
          <button onClick={() => setTab('my')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === 'my' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}>⭐ Cho bạn</button>
          <button onClick={() => setTab('groups')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === 'groups' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}>👥 Nhóm</button>
        </div>

        {tab === 'suggested' && <div className="space-y-3">{suggestedChallenges.map(renderChallenge)}</div>}
        {tab === 'my' && (
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4">
              <h3 className="font-bold text-emerald-800 text-sm mb-1">⭐ Thử thách riêng cho bạn</h3>
              <p className="text-xs text-emerald-600">Dựa trên mục tiêu {profile.goal === 'lose' ? 'giảm cân' : profile.goal === 'maintain' ? 'giữ dáng' : 'tăng thể lực'}</p>
            </div>
            {personalChallenges.map(renderChallenge)}
          </div>
        )}
        {tab === 'groups' && (
          <div className="space-y-3">
            <button onClick={() => setCreateStep(1)} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3.5 rounded-xl active:scale-98 transition-transform flex items-center justify-center gap-2">
              ➕ Tạo nhóm mới
            </button>
            {groups.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">👥</div>
                <div className="text-sm text-gray-500">Chưa có nhóm nào. Tạo nhóm đầu tiên!</div>
              </div>
            )}
            {groups.map(group => (
              <button key={group.id} onClick={() => setViewGroup(group)} className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 text-left active:bg-gray-50 transition">
                <div className="text-3xl">{group.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800 text-sm truncate">{group.name}</div>
                  <div className="text-xs text-gray-400">👥 {group.members} • {group.privacy === 'public' ? '🌐' : '🔒'} {group.location || ''}</div>
                </div>
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
