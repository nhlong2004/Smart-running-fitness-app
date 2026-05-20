import { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile } from '../types';
import { calculateCaloriesBurned, getStepsFromDistance } from '../store';
import { loadWallPosts, saveWallPosts } from './WallScreen';
import type { WallPost } from './WallScreen';
import LiveMap from './LiveMap';

interface Props {
  profile: UserProfile;
  onBack: () => void;
  onSessionEnd: (data: { type: 'walking' | 'running' | 'cycling'; duration: number; distance: number; steps: number; calories: number }) => void;
}

type ActivityType = 'walking' | 'running' | 'cycling';

interface Position {
  lat: number;
  lng: number;
  timestamp: number;
}

function haversineDistance(pos1: Position, pos2: Position): number {
  const R = 6371;
  const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
  const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function TrackingScreen({ profile, onBack, onSessionEnd }: Props) {
  const [activityType, setActivityType] = useState<ActivityType>('walking');
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [autoDetected, setAutoDetected] = useState<string | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [gpsStatus, setGpsStatus] = useState<'waiting' | 'active' | 'error'>('waiting');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [shareCaption, setShareCaption] = useState('');
  const [shareImage, setShareImage] = useState<string | null>(null);

  // Bản đồ states
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [routePoints, setRoutePoints] = useState<{ lat: number; lng: number }[]>([]);

  const intervalRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<Position | null>(null);

  const activityLabels: Record<ActivityType, { label: string; icon: string; color: string; mapColor: string }> = {
    walking: { label: 'Đi bộ', icon: '🚶', color: 'from-blue-400 to-blue-600', mapColor: '#3b82f6' },
    running: { label: 'Chạy bộ', icon: '🏃', color: 'from-emerald-400 to-emerald-600', mapColor: '#10b981' },
    cycling: { label: 'Đạp xe', icon: '🚴', color: 'from-purple-400 to-purple-600', mapColor: '#a855f7' },
  };

  // Timer
  useEffect(() => {
    if (isTracking && !isPaused) {
      intervalRef.current = window.setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isTracking, isPaused]);

  const handlePositionUpdate = useCallback((position: GeolocationPosition) => {
    if (isPaused) return;

    const newPos: Position = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      timestamp: position.timestamp,
    };

    setGpsStatus('active');
    setGpsError(null);

    // Cập nhật vị trí bản đồ
    setMapCenter({ lat: newPos.lat, lng: newPos.lng });

    if (lastPositionRef.current) {
      const dist = haversineDistance(lastPositionRef.current, newPos);

      // Lọc nhiễu GPS: chỉ tính nếu > 3m
      if (dist > 0.003) {
        const timeDiff = (newPos.timestamp - lastPositionRef.current.timestamp) / 1000 / 3600;
        const speed = timeDiff > 0 ? dist / timeDiff : 0;

        if (speed < 50) {
          setDistance(prev => prev + dist);
          setCurrentSpeed(Math.round(speed * 10) / 10);

          // Thêm điểm vào lộ trình bản đồ
          setRoutePoints(prev => [...prev, { lat: newPos.lat, lng: newPos.lng }]);

          // Tự động nhận diện loại hoạt động
          if (activityType !== 'cycling') {
            if (speed > 8 && activityType === 'walking') {
              setAutoDetected('running');
              setTimeout(() => {
                setActivityType('running');
                setAutoDetected(null);
              }, 2000);
            } else if (speed < 5 && activityType === 'running' && speed > 0.5) {
              setAutoDetected('walking');
              setTimeout(() => {
                setActivityType('walking');
                setAutoDetected(null);
              }, 2000);
            }
          }
        }
      } else {
        setCurrentSpeed(0);
      }
    } else {
      // Điểm đầu tiên → thêm vào lộ trình
      setRoutePoints([{ lat: newPos.lat, lng: newPos.lng }]);
    }

    lastPositionRef.current = newPos;
  }, [isPaused, activityType]);

  const handlePositionError = useCallback((error: GeolocationPositionError) => {
    setGpsStatus('error');
    switch (error.code) {
      case error.PERMISSION_DENIED:
        setGpsError('Vui lòng cấp quyền truy cập vị trí');
        break;
      case error.POSITION_UNAVAILABLE:
        setGpsError('Không thể xác định vị trí');
        break;
      case error.TIMEOUT:
        setGpsError('Đang tìm tín hiệu GPS...');
        break;
      default:
        setGpsError('Lỗi GPS không xác định');
    }
  }, []);

  const startGpsTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Trình duyệt không hỗ trợ GPS');
      setGpsStatus('error');
      return;
    }

    setGpsStatus('waiting');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        lastPositionRef.current = { ...pos, timestamp: position.timestamp };
        setMapCenter(pos);
        setRoutePoints([pos]);
        setGpsStatus('active');
      },
      handlePositionError,
      { enableHighAccuracy: true, timeout: 10000 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }, [handlePositionUpdate, handlePositionError]);

  const stopGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopGpsTracking();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [stopGpsTracking]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentCalories = calculateCaloriesBurned(activityType, elapsed / 60, profile.weight);
  const currentSteps = getStepsFromDistance(distance, activityType);
  const currentPace = distance > 0 ? ((elapsed / 60) / distance).toFixed(1) : '0';
  const avgSpeed = elapsed > 0 ? (distance / (elapsed / 3600)).toFixed(1) : '0';

  const handleStart = () => {
    setIsTracking(true);
    setIsPaused(false);
    setDistance(0);
    setElapsed(0);
    setCurrentSpeed(0);
    setRoutePoints([]);
    setMapCenter(null);
    lastPositionRef.current = null;
    startGpsTracking();
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleStop = () => {
    setIsTracking(false);
    setIsPaused(false);
    stopGpsTracking();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setShowSummary(true);
  };

  const handleFinish = () => {
    onSessionEnd({
      type: activityType,
      duration: elapsed,
      distance: Math.round(distance * 100) / 100,
      steps: currentSteps,
      calories: currentCalories,
    });
  };

  // ─── Summary Screen ───
  if (showSummary) {
    const goalPercent = Math.min((currentCalories / profile.dailyCalorieTarget) * 100, 100);
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex flex-col">
        <div className="text-center pt-10 pb-4 px-6">
          <div className="text-5xl mb-3 animate-bounce-in">🎉</div>
          <h2 className="text-2xl font-bold mb-1">Tuyệt vời!</h2>
          <p className="opacity-80 text-sm">Bạn đã hoàn thành buổi tập</p>
        </div>

        {/* Bản đồ lộ trình đã chạy */}
        {routePoints.length > 1 && (
          <div className="px-5 mb-4">
            <div className="h-52 rounded-2xl overflow-hidden shadow-lg border-2 border-white/30">
              <LiveMap
                center={routePoints[routePoints.length - 1]}
                route={routePoints}
                isTracking={false}
                activityColor={activityLabels[activityType].mapColor}
                distance={distance}
              />
            </div>
            <div className="text-center text-xs opacity-70 mt-2">📍 Lộ trình buổi tập • {distance.toFixed(2)} km</div>
          </div>
        )}

        <div className="px-5 space-y-3 flex-1 overflow-y-auto pb-4">
          <div className="bg-white/20 backdrop-blur rounded-2xl p-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-3xl">{activityLabels[activityType].icon}</span>
              <span className="font-bold text-lg">{activityLabels[activityType].label}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center bg-white/10 rounded-xl p-3">
                <div className="text-xl font-bold">{formatTime(elapsed)}</div>
                <div className="text-xs opacity-80">Thời gian</div>
              </div>
              <div className="text-center bg-white/10 rounded-xl p-3">
                <div className="text-xl font-bold">{distance.toFixed(2)} km</div>
                <div className="text-xs opacity-80">Quãng đường</div>
              </div>
              <div className="text-center bg-white/10 rounded-xl p-3">
                <div className="text-xl font-bold">{currentCalories}</div>
                <div className="text-xs opacity-80">kcal đốt cháy</div>
              </div>
              <div className="text-center bg-white/10 rounded-xl p-3">
                <div className="text-xl font-bold">{currentSteps.toLocaleString()}</div>
                <div className="text-xs opacity-80">bước chân</div>
              </div>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur rounded-2xl p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm">Hoàn thành mục tiêu ngày</span>
              <span className="font-bold">{Math.round(goalPercent)}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${goalPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="px-5 pb-6 space-y-3">
          {/* Viết cảm nghĩ */}
          <div>
            <label className="text-sm opacity-80 mb-1.5 block">✏️ Viết cảm nghĩ của bạn</label>
            <textarea
              value={shareCaption}
              onChange={e => setShareCaption(e.target.value)}
              placeholder={`Cảm giác sau buổi ${activityLabels[activityType].label.toLowerCase()} thế nào? 😊`}
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 outline-none focus:border-white text-sm resize-none"
            />
          </div>

          {/* Chọn ảnh từ điện thoại */}
          <div>
            <label className="text-sm opacity-80 mb-1.5 block">📷 Thêm ảnh từ điện thoại</label>
            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === 'string') {
                      setShareImage(reader.result);
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <div className="w-full px-4 py-3 rounded-xl bg-white/10 border border-dashed border-white/40 text-white/90 text-sm text-center active:scale-[0.99] transition-transform">
                {shareImage ? '✅ Đã chọn ảnh - nhấn để đổi ảnh khác' : '➕ Chọn ảnh từ điện thoại'}
              </div>
            </label>
            {shareImage && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-white/20 bg-white/10">
                <img src={shareImage} alt="Ảnh chia sẻ" className="w-full h-44 object-cover block" />
                <button
                  onClick={() => setShareImage(null)}
                  className="w-full py-2 text-sm text-white/90 bg-black/20 active:bg-black/30"
                >
                  Xóa ảnh
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              const now = new Date();
              const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
              const typeLabel = activityType === 'walking' ? 'đi bộ' : activityType === 'running' ? 'chạy bộ' : 'đạp xe';
              const pace = distance > 0 ? ((elapsed / 60) / distance).toFixed(1) : '0';

              const session = localStorage.getItem('runmate_logged_in');
              const user = session ? JSON.parse(session) : { name: 'Tôi' };

              const caption = shareCaption.trim() || `Vừa hoàn thành buổi ${typeLabel}! 🏃‍♂️🔥`;

              const newPost: WallPost = {
                id: 'post_' + Date.now(),
                author: user.name,
                avatar: '😊',
                time: 'Vừa xong',
                content: caption,
                image: shareImage || undefined,
                activityData: {
                  type: activityType,
                  distance: Math.round(distance * 100) / 100,
                  duration: elapsed,
                  pace: `${pace}`,
                  date: dateStr,
                  calories: currentCalories,
                  route: routePoints.length > 0 ? routePoints : (mapCenter ? [mapCenter] : []),
                },
                likes: 0,
                comments: [],
                liked: false,
                category: 'friends',
              };

              const posts = loadWallPosts();
              saveWallPosts([newPost, ...posts]);
              setShareCaption('');
              setShareImage(null);

              handleFinish();
            }}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-4 rounded-2xl text-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            📤 Chia sẻ lên Tường
          </button>
          <button
            onClick={handleFinish}
            className="w-full bg-white text-emerald-700 font-bold py-4 rounded-2xl text-lg active:scale-95 transition-transform"
          >
            Lưu & Quay về 🏠
          </button>
        </div>
      </div>
    );
  }

  // ─── Activity Selection Screen ───
  if (!isTracking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white px-5 pt-12 pb-6 rounded-b-3xl">
          <button onClick={onBack} className="mb-4 text-white/80 flex items-center gap-2">
            <span>←</span> Quay lại
          </button>
          <h1 className="text-2xl font-bold mb-1">Bắt đầu vận động</h1>
          <p className="text-sm opacity-80">Chọn loại hoạt động và bắt đầu</p>
        </div>

        <div className="px-5 mt-6 space-y-4">
          <div className="text-sm font-semibold text-gray-700 mb-2">Chọn hoạt động</div>
          <div className="space-y-3">
            {(['walking', 'running', 'cycling'] as ActivityType[]).map(type => (
              <button
                key={type}
                onClick={() => setActivityType(type)}
                className={`w-full p-4 rounded-2xl flex items-center gap-4 transition border-2 ${
                  activityType === type ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-gray-100'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${activityLabels[type].color} flex items-center justify-center text-3xl`}>
                  {activityLabels[type].icon}
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-800">{activityLabels[type].label}</div>
                  <div className="text-sm text-gray-500">
                    {type === 'walking' && 'MET 3.5 • ~5 km/h'}
                    {type === 'running' && 'MET 9.8 • ~10 km/h'}
                    {type === 'cycling' && 'MET 7.5 • ~20 km/h'}
                  </div>
                </div>
                {activityType === type && <span className="ml-auto text-emerald-500 text-2xl">✓</span>}
              </button>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
            <span className="text-2xl">📍</span>
            <div>
              <div className="font-semibold text-blue-800 text-sm">Bản đồ & GPS thời gian thực</div>
              <div className="text-xs text-blue-600">Bản đồ sẽ hiển thị vị trí và vẽ lộ trình chạy trong suốt buổi tập.</div>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <div className="font-semibold text-emerald-800 text-sm">Nhận diện tự động</div>
              <div className="text-xs text-emerald-600">Tự nhận diện đi bộ / chạy bộ dựa trên tốc độ GPS thực tế.</div>
            </div>
          </div>

          <button
            onClick={handleStart}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-5 rounded-2xl text-xl shadow-lg active:scale-95 transition-transform"
          >
            ▶️ Bắt đầu {activityLabels[activityType].label}
          </button>
        </div>
      </div>
    );
  }

  // ─── Active Tracking Screen ───
  const info = activityLabels[activityType];

  // Chế độ bản đồ mở rộng = full screen
  if (mapExpanded) {
    return (
      <div className="h-screen w-full relative">
        {/* Bản đồ full screen */}
        <div className="absolute inset-0">
          <LiveMap
            center={mapCenter}
            route={routePoints}
            isTracking={isTracking}
            activityColor={info.mapColor}
            distance={distance}
            duration={elapsed}
            calories={currentCalories}
            expanded={true}
          />
        </div>

        {/* Banners */}
        <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-12 space-y-2 pointer-events-none">
          {gpsStatus === 'waiting' && (
            <div className="bg-yellow-400 text-yellow-900 rounded-2xl p-3 flex items-center gap-3 pointer-events-auto">
              <span className="text-xl animate-pulse">📍</span>
              <div className="text-sm"><strong>Đang tìm GPS...</strong></div>
            </div>
          )}
          {gpsStatus === 'error' && gpsError && (
            <div className="bg-red-400 text-white rounded-2xl p-3 flex items-center gap-3 pointer-events-auto">
              <span className="text-xl">⚠️</span>
              <div className="text-sm">{gpsError}</div>
            </div>
          )}
          {autoDetected && (
            <div className="bg-yellow-400 text-yellow-900 rounded-2xl p-3 flex items-center gap-3 animate-bounce-in pointer-events-auto">
              <span className="text-xl">🤖</span>
              <div className="text-sm"><strong>Chuyển sang {autoDetected === 'running' ? 'Chạy bộ 🏃' : 'Đi bộ 🚶'}</strong></div>
            </div>
          )}
        </div>

        {/* GPS indicator */}
        <div className="absolute top-12 left-4 z-[1000] bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${gpsStatus === 'active' ? 'bg-green-400 animate-pulse' : gpsStatus === 'waiting' ? 'bg-yellow-400' : 'bg-red-400'}`} />
          {gpsStatus === 'active' ? 'GPS' : '...'}
        </div>

        {/* Stats nổi - góc phải trên */}
        <div className="absolute top-12 right-4 z-[1000] flex flex-col gap-1.5">
          <div className="bg-black/65 backdrop-blur-sm text-white px-4 py-2.5 rounded-2xl text-center">
            <div className="text-3xl font-bold">{formatTime(elapsed)}</div>
            <div className="text-[10px] opacity-70">{info.label} {isPaused ? '• Tạm dừng' : ''}</div>
          </div>
          <div className="bg-black/65 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-center">
            <div className="text-xl font-bold">{currentSpeed} <span className="text-xs font-normal">km/h</span></div>
          </div>
        </div>

        {/* Stats nổi - góc trái dưới */}
        <div className="absolute bottom-28 left-4 z-[1000] flex flex-col gap-1.5">
          <div className="bg-black/65 backdrop-blur-sm text-white px-3 py-2 rounded-xl">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-center">
              <div>
                <div className="text-lg font-bold">{distance.toFixed(2)}</div>
                <div className="text-[9px] opacity-60">km</div>
              </div>
              <div>
                <div className="text-lg font-bold">{currentCalories}</div>
                <div className="text-[9px] opacity-60">kcal</div>
              </div>
              <div>
                <div className="text-lg font-bold">{currentSteps.toLocaleString()}</div>
                <div className="text-[9px] opacity-60">bước</div>
              </div>
              <div>
                <div className="text-lg font-bold">{activityType === 'cycling' ? avgSpeed : currentPace}</div>
                <div className="text-[9px] opacity-60">{activityType === 'cycling' ? 'km/h' : 'phút/km'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Nút thu nhỏ bản đồ */}
        <button
          onClick={() => setMapExpanded(false)}
          className="absolute bottom-28 right-4 z-[1000] bg-white text-gray-700 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-transform text-lg font-bold border border-gray-200"
        >
          ▼
        </button>

        {/* Controls nổi dưới cùng */}
        <div className="absolute bottom-6 left-0 right-0 z-[1000] flex items-center justify-center gap-6">
          {isPaused ? (
            <>
              <button onClick={handleStop} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-2xl shadow-xl active:scale-90 transition-transform border-2 border-white/30">
                ⏹️
              </button>
              <button onClick={handleResume} className="w-20 h-20 rounded-full bg-white text-emerald-600 flex items-center justify-center text-3xl shadow-xl active:scale-90 transition-transform">
                ▶️
              </button>
            </>
          ) : (
            <button onClick={handlePause} className="w-20 h-20 rounded-full bg-white/30 border-4 border-white flex items-center justify-center text-3xl shadow-xl active:scale-90 transition-transform backdrop-blur-sm">
              ⏸️
            </button>
          )}
        </div>
      </div>
    );
  }

  // Chế độ bản đồ thu nhỏ
  return (
    <div className={`min-h-screen bg-gradient-to-br ${info.color} text-white flex flex-col relative`}>

      {/* Banners */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-12 space-y-2 pointer-events-none">
        {gpsStatus === 'waiting' && (
          <div className="bg-yellow-400 text-yellow-900 rounded-2xl p-3 flex items-center gap-3 pointer-events-auto">
            <span className="text-xl animate-pulse">📍</span>
            <div className="text-sm"><strong>Đang tìm GPS...</strong><div className="text-xs">Ra nơi thoáng để nhận tín hiệu tốt hơn</div></div>
          </div>
        )}
        {gpsStatus === 'error' && gpsError && (
          <div className="bg-red-400 text-white rounded-2xl p-3 flex items-center gap-3 pointer-events-auto">
            <span className="text-xl">⚠️</span>
            <div className="text-sm">{gpsError}</div>
          </div>
        )}
        {autoDetected && (
          <div className="bg-yellow-400 text-yellow-900 rounded-2xl p-3 flex items-center gap-3 animate-bounce-in pointer-events-auto">
            <span className="text-xl">🤖</span>
            <div className="text-sm"><strong>Phát hiện thay đổi tốc độ!</strong> Chuyển sang {autoDetected === 'running' ? 'Chạy bộ 🏃' : 'Đi bộ 🚶'}...</div>
          </div>
        )}
      </div>

      {/* Bản đồ thu nhỏ */}
      <div className="relative h-52">
        <LiveMap
          center={mapCenter}
          route={routePoints}
          isTracking={isTracking}
          activityColor={info.mapColor}
          distance={distance}
          duration={elapsed}
          calories={currentCalories}
          expanded={false}
        />
        <button
          onClick={() => setMapExpanded(true)}
          className="absolute bottom-3 right-3 z-[1000] bg-white text-gray-700 w-11 h-11 rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-transform text-base font-bold border border-gray-200"
        >
          ▲
        </button>
        <div className="absolute top-3 left-3 z-[1000] bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${gpsStatus === 'active' ? 'bg-green-400 animate-pulse' : gpsStatus === 'waiting' ? 'bg-yellow-400' : 'bg-red-400'}`} />
          {gpsStatus === 'active' ? 'GPS hoạt động' : gpsStatus === 'waiting' ? 'Đang tìm...' : 'GPS lỗi'}
        </div>
      </div>

      {/* Thông tin chạy */}
      <div className="flex-1 flex flex-col px-5 pt-3 pb-1">
        <div className="text-center mb-2">
          <div className="text-4xl font-bold tracking-wider">{formatTime(elapsed)}</div>
          <div className="text-sm opacity-80">{info.label} {isPaused ? '• Tạm dừng' : ''}</div>
        </div>
        <div className="flex justify-center mb-3">
          <div className="bg-white/20 rounded-2xl px-6 py-2 text-center">
            <span className="text-2xl font-bold">{currentSpeed}</span>
            <span className="text-xs ml-1 opacity-80">km/h hiện tại</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white/15 rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold">{distance.toFixed(2)}</div>
            <div className="text-[10px] opacity-80">km</div>
          </div>
          <div className="bg-white/15 rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold">{currentCalories}</div>
            <div className="text-[10px] opacity-80">kcal</div>
          </div>
          <div className="bg-white/15 rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold">{currentSteps.toLocaleString()}</div>
            <div className="text-[10px] opacity-80">bước</div>
          </div>
          <div className="bg-white/15 rounded-xl p-2.5 text-center">
            <div className="text-lg font-bold">{activityType === 'cycling' ? avgSpeed : currentPace}</div>
            <div className="text-[10px] opacity-80">{activityType === 'cycling' ? 'km/h TB' : 'phút/km'}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-5 flex items-center justify-center gap-6">
        {isPaused ? (
          <>
            <button onClick={handleStop} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-2xl shadow-lg active:scale-90 transition-transform">⏹️</button>
            <button onClick={handleResume} className="w-20 h-20 rounded-full bg-white text-emerald-600 flex items-center justify-center text-3xl shadow-lg active:scale-90 transition-transform">▶️</button>
          </>
        ) : (
          <button onClick={handlePause} className="w-20 h-20 rounded-full bg-white/20 border-4 border-white flex items-center justify-center text-3xl shadow-lg active:scale-90 transition-transform">⏸️</button>
        )}
      </div>
    </div>
  );
}
