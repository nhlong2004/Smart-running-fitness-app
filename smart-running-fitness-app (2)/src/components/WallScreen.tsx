import { useState, useEffect } from 'react';
import { getCurrentUid, waitForAuthUid, loadWallPostsFromCloud, syncWallPostsToCloud } from '../services/firebase';

export interface WallPost {
  id: string;
  author: string;
  avatar: string;
  time: string;
  content: string;
  image?: string;
  activityData?: {
    type: string;
    distance: number;
    duration: number;
    pace: string;
    date: string;
    calories: number;
    route?: Array<{ lat: number; lng: number }>;
  };
  likes: number;
  comments: WallComment[];
  liked: boolean;
  category: 'friends' | 'popular' | 'group';
  group?: string;
}

interface WallComment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
}

interface Props {
  onBack: () => void;
}

const WALL_POSTS_KEY = 'runmate_wall_posts';

export function loadWallPosts(): WallPost[] {
  try {
    const data = localStorage.getItem(WALL_POSTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export function saveWallPosts(posts: WallPost[]) {
  localStorage.setItem(WALL_POSTS_KEY, JSON.stringify(posts));

  // Đồng bộ cloud bất đồng bộ
  const uid = getCurrentUid();
  if (uid) {
    syncWallPostsToCloud(uid, posts);
  }
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('runmate_logged_in');
    return raw ? JSON.parse(raw) : { name: 'Bạn' };
  } catch { return { name: 'Bạn' }; }
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function mergePosts(localPosts: WallPost[], cloudPosts: WallPost[]) {
  const map = new Map<string, WallPost>();

  // Cloud trước
  cloudPosts.forEach(post => map.set(post.id, post));
  // Local đè lên cloud nếu trùng id (ưu tiên local mới/chỉnh sửa mới)
  localPosts.forEach(post => map.set(post.id, post));

  return Array.from(map.values()).sort((a, b) => {
    const aNum = Number(String(a.id).replace(/\D/g, '')) || 0;
    const bNum = Number(String(b.id).replace(/\D/g, '')) || 0;
    return bNum - aNum;
  });
}

function RoutePreview({ route, color, distance }: { route: Array<{ lat: number; lng: number }>; color: string; distance: number }) {
  const width = 320;
  const height = 176;

  if (!route.length) {
    return (
      <div className="h-44 rounded-2xl border-2 border-white/30 bg-white/10 flex items-center justify-center text-white/80 text-xs">
        Chưa có dữ liệu GPS
      </div>
    );
  }

  const lats = route.map(p => p.lat);
  const lngs = route.map(p => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat || 0.001;
  const lngRange = maxLng - minLng || 0.001;
  const pad = 18;

  const pts = route.map(p => {
    const x = pad + ((p.lng - minLng) / lngRange) * (width - pad * 2);
    const y = height - pad - ((p.lat - minLat) / latRange) * (height - pad * 2);
    return { x, y };
  });

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const start = pts[0];
  const end = pts[pts.length - 1];

  return (
    <div className="h-44 rounded-2xl overflow-hidden border-2 border-white/30 bg-white/10 relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full block">
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          </pattern>
          <linearGradient id="bgMap" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={width} height={height} fill="url(#bgMap)" />
        <rect x="0" y="0" width={width} height={height} fill="url(#grid)" />
        {pts.length > 1 ? (
          <polyline points={polyline} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
        <circle cx={start.x} cy={start.y} r="8" fill="#22c55e" stroke="white" strokeWidth="3" />
        <circle cx={end.x} cy={end.y} r="8" fill={color} stroke="white" strokeWidth="3" />
      </svg>
      <div className="absolute top-2 left-2 bg-black/35 text-white text-[10px] px-2 py-1 rounded-full">START</div>
      <div className="absolute top-2 right-2 bg-black/35 text-white text-[10px] px-2 py-1 rounded-full">END</div>
      <div className="absolute bottom-2 left-2 bg-black/45 text-white text-xs px-2.5 py-1 rounded-full font-semibold">🗺️ {distance.toFixed(2)} km</div>
      {pts.length === 1 && (
        <div className="absolute inset-x-0 bottom-10 text-center text-[11px] text-white/85 font-medium">
          Đã ghi nhận 1 điểm GPS
        </div>
      )}
    </div>
  );
}

export default function WallScreen({ onBack }: Props) {
  const [tab, setTab] = useState<'friends' | 'popular' | 'group'>('friends');
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [commentingPost, setCommentingPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');

  const me = getCurrentUser();

  useEffect(() => {
    const localPosts = loadWallPosts();
    setPosts(localPosts);

    const hydrateCloudPosts = async () => {
      const uid = await waitForAuthUid();
      if (!uid) return;
      const cloudPosts = await loadWallPostsFromCloud(uid);
      if (Array.isArray(cloudPosts)) {
        const typedCloud = cloudPosts as WallPost[];
        const merged = mergePosts(localPosts, typedCloud);
        setPosts(merged);
        localStorage.setItem(WALL_POSTS_KEY, JSON.stringify(merged));

        // Nếu local có bài mới hơn cloud thì sync ngược lên cloud luôn
        if (merged.length !== typedCloud.length || merged.some((p, i) => typedCloud[i]?.id !== p.id)) {
          saveWallPosts(merged);
        }
      }
    };

    hydrateCloudPosts();
  }, []);

  const handleLike = (postId: string) => {
    setPosts(prev => {
      const updated = prev.map(p => p.id === postId ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p);
      saveWallPosts(updated);
      return updated;
    });
  };

  const handleComment = (postId: string) => {
    if (!commentText.trim()) return;
    const newComment: WallComment = {
      id: 'cmt_' + Date.now(),
      author: me.name,
      avatar: '😊',
      text: commentText.trim(),
      time: 'Vừa xong',
    };
    setPosts(prev => {
      const updated = prev.map(p => p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p);
      saveWallPosts(updated);
      return updated;
    });
    setCommentText('');
    setCommentingPost(null);
  };

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return;
    const newPost: WallPost = {
      id: 'post_' + Date.now(),
      author: me.name,
      avatar: '😊',
      time: 'Vừa xong',
      content: newPostContent.trim(),
      likes: 0,
      comments: [],
      liked: false,
      category: 'friends',
    };
    setPosts(prev => {
      const updated = [newPost, ...prev];
      saveWallPosts(updated);
      return updated;
    });
    setNewPostContent('');
    setShowCompose(false);
  };

  const handleDeletePost = (postId: string) => {
    setPosts(prev => {
      const updated = prev.filter(p => p.id !== postId);
      saveWallPosts(updated);
      return updated;
    });
  };

  const handleStartEdit = (post: WallPost) => {
    setEditingPost(post.id);
    setEditCaption(post.content);
  };

  const handleSaveEdit = (postId: string) => {
    if (!editCaption.trim()) return;
    setPosts(prev => {
      const updated = prev.map(p => p.id === postId ? { ...p, content: editCaption.trim() } : p);
      saveWallPosts(updated);
      return updated;
    });
    setEditingPost(null);
    setEditCaption('');
  };

  const getFilteredPosts = () => {
    switch (tab) {
      case 'friends': return posts.filter(p => p.category === 'friends');
      case 'popular': return posts.filter(p => p.category === 'popular');
      case 'group': return posts.filter(p => p.category === 'group');
      default: return [];
    }
  };

  const filteredPosts = getFilteredPosts();

  const renderActivityCard = (data: WallPost['activityData']) => {
    if (!data) return null;
    const typeLabel = data.type === 'walking' ? 'Đi bộ' : data.type === 'running' ? 'Chạy bộ' : 'Đạp xe';
    const typeIcon = data.type === 'walking' ? '🚶' : data.type === 'running' ? '🏃' : '🚴';
    const mapColor = data.type === 'walking' ? '#3b82f6' : data.type === 'running' ? '#10b981' : '#a855f7';
    const hasRoute = !!data.route && data.route.length >= 1;

    return (
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl p-4 mt-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{typeIcon}</span>
          <span className="font-bold">{typeLabel}</span>
          <span className="text-xs opacity-80 ml-auto">{data.date}</span>
        </div>

        {/* Route preview ổn định cho Tường */}
        {hasRoute && data.route && (
          <div className="mb-3">
            <div className="text-[11px] font-semibold opacity-90 mb-1">🗺️ Lộ trình đã chạy</div>
            <RoutePreview route={data.route} color={mapColor} distance={data.distance} />
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-lg font-bold">{data.distance.toFixed(2)}</div>
            <div className="text-[10px] opacity-80">km</div>
          </div>
          <div>
            <div className="text-lg font-bold">{formatDuration(data.duration)}</div>
            <div className="text-[10px] opacity-80">thời gian</div>
          </div>
          <div>
            <div className="text-lg font-bold">{data.pace}</div>
            <div className="text-[10px] opacity-80">phút/km</div>
          </div>
          <div>
            <div className="text-lg font-bold">{data.calories}</div>
            <div className="text-[10px] opacity-80">kcal</div>
          </div>
        </div>
      </div>
    );
  };

  const renderPost = (post: WallPost) => {
    const isMyPost = post.author === me.name;
    const isEditing = editingPost === post.id;

    return (
      <div key={post.id} className="bg-white rounded-2xl shadow-sm overflow-hidden relative" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-lg">
              {post.avatar}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-800 text-sm">{post.author}</div>
              <div className="text-xs text-gray-400 flex items-center gap-2">
                <span>{post.time}</span>
                {post.group && <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[10px]">📌 {post.group}</span>}
              </div>
            </div>
            {/* Menu bài viết của mình */}
            {isMyPost && !isEditing && (
              <div className="flex items-center gap-1">
                <button onClick={() => handleStartEdit(post)} className="text-gray-400 hover:text-blue-500 p-1 text-sm" title="Chỉnh sửa">✏️</button>
                <button onClick={() => handleDeletePost(post.id)} className="text-gray-400 hover:text-red-500 p-1 text-sm" title="Xóa">🗑️</button>
              </div>
            )}
          </div>
        </div>

        {/* Content / Edit */}
        <div className="px-4 pb-2">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editCaption}
                onChange={e => setEditCaption(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl border-2 border-blue-300 outline-none focus:border-blue-500 text-sm text-gray-800 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveEdit(post.id)}
                  className="flex-1 bg-blue-500 text-white py-2 rounded-xl text-sm font-semibold active:scale-95"
                >
                  💾 Lưu
                </button>
                <button
                  onClick={() => setEditingPost(null)}
                  className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm font-semibold active:scale-95"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{post.content}</p>
          )}
          {!isEditing && post.image && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
              <img src={post.image} alt="Ảnh chia sẻ" className="w-full h-auto max-h-96 object-cover block" />
            </div>
          )}
          {!isEditing && renderActivityCard(post.activityData)}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-1">
            <button
              onClick={() => handleLike(post.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition active:scale-95 ${post.liked ? 'text-red-500 bg-red-50' : 'text-gray-500'}`}
            >
              {post.liked ? '❤️' : '🤍'} {post.likes}
            </button>
            <button
              onClick={() => setCommentingPost(commentingPost === post.id ? null : post.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 transition active:scale-95"
            >
              💬 {post.comments.length}
            </button>
          </div>
        )}

        {/* Comments */}
        {!isEditing && (commentingPost === post.id || post.comments.length > 0) && (
          <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 space-y-2">
            {post.comments.slice(-3).map(c => (
              <div key={c.id} className="flex gap-2">
                <span className="text-sm">{c.avatar}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-gray-700">{c.author}</span>
                  <span className="text-xs text-gray-400 ml-2">{c.time}</span>
                  <p className="text-xs text-gray-600 mt-0.5">{c.text}</p>
                </div>
              </div>
            ))}
            {commentingPost === post.id && (
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Viết bình luận..."
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  onKeyDown={e => e.key === 'Enter' && handleComment(post.id)}
                />
                <button
                  onClick={() => handleComment(post.id)}
                  className="bg-emerald-500 text-white px-3 py-2 rounded-xl text-sm font-semibold active:scale-95"
                >
                  Gửi
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-pink-500 to-purple-600 text-white px-5 pt-12 pb-6 rounded-b-3xl relative" style={{ zIndex: 2 }}>
        <button onClick={onBack} className="mb-4 text-white/80 flex items-center gap-2">
          <span>←</span> Quay lại
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">📸 Tường</h1>
            <p className="text-sm opacity-80">Chia sẻ khoảnh khắc cùng cộng đồng</p>
          </div>
          <button
            onClick={() => setShowCompose(true)}
            className="bg-white/20 px-4 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
          >
            ✏️ Đăng
          </button>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4 relative" style={{ zIndex: 1 }}>
        <div className="flex bg-white rounded-xl p-1 shadow-sm">
          <button onClick={() => setTab('friends')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === 'friends' ? 'bg-pink-500 text-white' : 'text-gray-500'}`}>
            👥 Bạn bè
          </button>
          <button onClick={() => setTab('popular')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === 'popular' ? 'bg-pink-500 text-white' : 'text-gray-500'}`}>
            🔥 Phổ biến
          </button>
          <button onClick={() => setTab('group')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === 'group' ? 'bg-pink-500 text-white' : 'text-gray-500'}`}>
            📌 Nhóm
          </button>
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">{tab === 'friends' ? '👥' : tab === 'popular' ? '🔥' : '📌'}</div>
            <h3 className="font-bold text-gray-700 mb-1">Chưa có bài đăng nào</h3>
            <p className="text-sm text-gray-400">
              {tab === 'friends'
                ? 'Hoàn thành buổi tập và nhấn "Chia sẻ" để đăng bài đầu tiên!'
                : tab === 'popular'
                ? 'Chưa có bài đăng phổ biến'
                : 'Tham gia nhóm và chia sẻ bài đăng'}
            </p>
            {tab === 'friends' && (
              <button onClick={() => setShowCompose(true)} className="mt-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold px-6 py-3 rounded-xl active:scale-95">
                ✏️ Đăng bài đầu tiên
              </button>
            )}
          </div>
        )}

        {filteredPosts.map(renderPost)}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCompose(false)} />
          <div className="relative bg-white w-full max-w-[430px] rounded-t-3xl p-6 pb-8 animate-bounce-in">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-lg">😊</div>
              <div>
                <div className="font-semibold text-gray-800 text-sm">{me.name}</div>
                <div className="text-xs text-gray-400">Đăng công khai</div>
              </div>
            </div>
            <textarea
              value={newPostContent}
              onChange={e => setNewPostContent(e.target.value)}
              placeholder="Chia sẻ khoảnh khắc chạy bộ của bạn... 🏃‍♂️"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none focus:border-pink-500 transition text-gray-800 text-sm resize-none"
            />
            <button
              onClick={handleCreatePost}
              disabled={!newPostContent.trim()}
              className="w-full mt-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-3.5 rounded-xl active:scale-98 transition-transform disabled:opacity-40"
            >
              📤 Đăng bài
            </button>
            <button onClick={() => setShowCompose(false)} className="w-full mt-2 py-2 text-gray-500 text-sm font-medium">Hủy</button>
          </div>
        </div>
      )}
    </div>
  );
}
