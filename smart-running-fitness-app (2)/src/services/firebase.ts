import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  collection,
  where,
} from 'firebase/firestore';

// ═══════════════════════════════════════════════════════
// 👉 THAY CÁC GIÁ TRỊ NÀY BẰNG CỦA BẠN
//    (Xem file FIREBASE_SETUP_GUIDE.md để biết cách lấy)
// ═══════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyAAT0M9M33ZONcEKBhfw-Doq94-ZTGDBaM",
  authDomain: "runmate-7224d.firebaseapp.com",
  projectId: "runmate-7224d",
  storageBucket: "runmate-7224d.firebasestorage.app",
  messagingSenderId: "366417403388",
  appId: "1:366417403388:web:ae586b2ef29ee3a8d92679"
};

// Kiểm tra đã cấu hình chưa
const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";

// Khởi tạo Firebase (chỉ khi đã cấu hình)
let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

if (isConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

// ═══════ AUTH FUNCTIONS ═══════

const FRIEND_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomFriendCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += FRIEND_CODE_CHARS[Math.floor(Math.random() * FRIEND_CODE_CHARS.length)];
  }
  return code;
}

async function createUniqueFriendCode(): Promise<string> {
  if (!db) return randomFriendCode();

  for (let i = 0; i < 20; i++) {
    const code = randomFriendCode();
    const q = query(collection(db, 'users'), where('friendCode', '==', code));
    const snap = await getDocs(q);
    if (snap.empty) return code;
  }

  return `${Date.now().toString().slice(-6)}`;
}

export async function registerUser(email: string, password: string, name: string) {
  if (!auth || !db) {
    return localRegister(email, password, name);
  }

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });

    const friendCode = await createUniqueFriendCode();

    await setDoc(doc(db, 'users', result.user.uid), {
      uid: result.user.uid,
      email: email.toLowerCase(),
      name,
      friendCode,
      createdAt: new Date().toISOString(),
      profile: null,
      stats: {
        currentStreak: 0,
        longestStreak: 0,
        totalDistance: 0,
        totalSessions: 0,
        totalCalories: 0,
        totalSteps: 0,
      },
      friends: [],
    });

    return {
      success: true,
      user: {
        uid: result.user.uid,
        email: result.user.email,
        name,
        friendCode,
      },
    };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    let message = 'Đã xảy ra lỗi';

    switch (err.code) {
      case 'auth/email-already-in-use':
        message = 'Email này đã được đăng ký bởi người dùng khác';
        break;
      case 'auth/weak-password':
        message = 'Mật khẩu quá yếu (tối thiểu 6 ký tự)';
        break;
      case 'auth/invalid-email':
        message = 'Email không hợp lệ';
        break;
      default:
        message = err.message || 'Đã xảy ra lỗi';
    }

    return { success: false, error: message };
  }
}

export async function loginUser(email: string, password: string) {
  if (!auth || !db) {
    return localLogin(email, password);
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const userRef = doc(db, 'users', result.user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : null;

    let friendCode = (userData?.friendCode as string) || '';
    if (!friendCode) {
      friendCode = await createUniqueFriendCode();
      await setDoc(userRef, { friendCode }, { merge: true });
    }

    return {
      success: true,
      user: {
        uid: result.user.uid,
        email: result.user.email,
        name: (userData?.name as string) || result.user.displayName || 'Người dùng',
        friendCode,
      },
    };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    let message = 'Đã xảy ra lỗi';

    switch (err.code) {
      case 'auth/user-not-found':
        message = 'Email chưa được đăng ký';
        break;
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        message = 'Mật khẩu không đúng';
        break;
      case 'auth/too-many-requests':
        message = 'Quá nhiều lần thử. Vui lòng đợi vài phút.';
        break;
      default:
        message = err.message || 'Đã xảy ra lỗi';
    }

    return { success: false, error: message };
  }
}

export async function logoutUser() {
  if (!auth) {
    localStorage.removeItem('runmate_logged_in');
    return { success: true };
  }

  try {
    await signOut(auth);
    return { success: true };
  } catch {
    return { success: false, error: 'Không thể đăng xuất' };
  }
}

export async function resetPassword(email: string) {
  if (!auth) {
    return localResetPassword(email);
  }

  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: unknown) {
    const err = error as { code?: string };

    switch (err.code) {
      case 'auth/user-not-found':
        return { success: false, error: 'Email chưa được đăng ký' };
      default:
        return { success: false, error: 'Không thể gửi email đặt lại mật khẩu' };
    }
  }
}

// ═══════ USER DATA ═══════

export async function saveUserData(uid: string, data: Record<string, unknown>) {
  if (!db) return;

  try {
    await updateDoc(doc(db, 'users', uid), data);
  } catch {
    // Nếu doc chưa tồn tại thì tạo mới
    try {
      await setDoc(doc(db, 'users', uid), data, { merge: true });
    } catch {
      // Ignore
    }
  }
}

export async function getUserData(uid: string) {
  if (!db) return null;

  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

// ═══════ SYNC APP DATA (Firestore) ═══════

export interface SyncData {
  profile: unknown;
  dailyRecords: unknown[];
  badges: unknown[];
  stats: {
    currentStreak: number;
    longestStreak: number;
    totalDistance: number;
    totalSessions: number;
    totalCalories: number;
    totalSteps: number;
  };
  lastSyncAt: string;
}

export async function syncToCloud(uid: string, data: SyncData) {
  if (!db) {
    const session = localStorage.getItem('runmate_logged_in');
    if (session) {
      const email = JSON.parse(session).email;
      localStorage.setItem(`runmate_cloud_${email}`, JSON.stringify(data));
    }
    return;
  }

  try {
    // Lưu profile + stats riêng vào document user (dễ query cho leaderboard)
    await setDoc(doc(db, 'users', uid), {
      profile: data.profile,
      stats: data.stats,
      lastSyncAt: new Date().toISOString(),
    }, { merge: true });

    // Lưu toàn bộ appData (dailyRecords, badges...) 
    await setDoc(doc(db, 'appData', uid), {
      profile: data.profile,
      dailyRecords: data.dailyRecords,
      badges: data.badges,
      stats: data.stats,
      lastSyncAt: new Date().toISOString(),
    });
  } catch {
    // Ignore
  }
}

export async function loadFromCloud(uid: string): Promise<SyncData | null> {
  if (!db) {
    const session = localStorage.getItem('runmate_logged_in');
    if (session) {
      const email = JSON.parse(session).email;
      const saved = localStorage.getItem(`runmate_cloud_${email}`);
      if (saved) {
        try { return JSON.parse(saved); } catch { return null; }
      }
    }
    return null;
  }

  try {
    // Ưu tiên đọc từ collection appData
    const appSnap = await getDoc(doc(db, 'appData', uid));
    if (appSnap.exists()) {
      return appSnap.data() as SyncData;
    }

    // Fallback: đọc từ users (dữ liệu cũ)
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (userSnap.exists()) {
      const d = userSnap.data();
      if (d.appData) return d.appData as SyncData;
      if (d.profile) {
        return {
          profile: d.profile,
          dailyRecords: d.dailyRecords || [],
          badges: d.badges || [],
          stats: d.stats || { currentStreak: 0, longestStreak: 0, totalDistance: 0, totalSessions: 0, totalCalories: 0, totalSteps: 0 },
          lastSyncAt: d.lastSyncAt || '',
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ═══════ WALL POSTS SYNC ═══════

export async function syncWallPostsToCloud(uid: string, posts: unknown[]) {
  if (!db) {
    const session = localStorage.getItem('runmate_logged_in');
    if (session) {
      const email = JSON.parse(session).email;
      localStorage.setItem(`runmate_wall_cloud_${email}`, JSON.stringify(posts));
    }
    return;
  }

  try {
    await setDoc(doc(db, 'wallPosts', uid), {
      posts,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch {
    // ignore
  }
}

export async function loadWallPostsFromCloud(uid: string): Promise<unknown[] | null> {
  if (!db) {
    const session = localStorage.getItem('runmate_logged_in');
    if (session) {
      const email = JSON.parse(session).email;
      const saved = localStorage.getItem(`runmate_wall_cloud_${email}`);
      if (saved) {
        try { return JSON.parse(saved); } catch { return null; }
      }
    }
    return null;
  }

  try {
    const snap = await getDoc(doc(db, 'wallPosts', uid));
    if (snap.exists()) {
      const data = snap.data();
      return Array.isArray(data.posts) ? data.posts : [];
    }
    return null;
  } catch {
    return null;
  }
}

// Lấy UID hiện tại (sync)
export function getCurrentUid(): string | null {
  if (auth && auth.currentUser) {
    return auth.currentUser.uid;
  }
  const session = localStorage.getItem('runmate_logged_in');
  if (session) {
    const parsed = JSON.parse(session);
    if (parsed?.uid) return parsed.uid;
    return 'local_' + parsed.email;
  }
  return null;
}

// Đợi Firebase Auth sẵn sàng rồi trả về UID
export function waitForAuthUid(): Promise<string | null> {
  return new Promise((resolve) => {
    // Không có Firebase → dùng local
    if (!auth) {
      resolve(getCurrentUid());
      return;
    }

    // Nếu đã có currentUser → trả ngay
    if (auth.currentUser) {
      resolve(auth.currentUser.uid);
      return;
    }

    // Đợi Firebase Auth restore session (tối đa 5 giây)
    const timeout = setTimeout(() => {
      unsubscribe();
      resolve(getCurrentUid()); // fallback local
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeout);
      unsubscribe();
      if (user) {
        resolve(user.uid);
      } else {
        resolve(getCurrentUid()); // fallback local
      }
    });
  });
}

export async function ensureCurrentUserFriendCode(): Promise<string> {
  const sessionRaw = localStorage.getItem('runmate_logged_in');
  const session = sessionRaw ? JSON.parse(sessionRaw) : null;

  if (session?.friendCode) {
    return session.friendCode;
  }

  if (auth && db && auth.currentUser) {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const snap = await getDoc(userRef);
      const data = snap.exists() ? snap.data() : null;

      let friendCode = (data?.friendCode as string) || '';
      if (!friendCode) {
        friendCode = await createUniqueFriendCode();
        await setDoc(userRef, { friendCode }, { merge: true });
      }

      if (session) {
        localStorage.setItem('runmate_logged_in', JSON.stringify({
          ...session,
          uid: auth.currentUser?.uid || session.uid || '',
          friendCode,
        }));
      }
      return friendCode;
    } catch {
      // ignore and fallback below
    }
  }

  // local fallback / migrate old local account
  const accounts = getLocalAccounts();
  if (session?.email) {
    const idx = accounts.findIndex(a => a.email.toLowerCase() === String(session.email).toLowerCase());
    let friendCode = '';

    if (idx >= 0) {
      friendCode = accounts[idx].friendCode || createLocalUniqueFriendCode();
      accounts[idx] = { ...accounts[idx], friendCode };
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
    } else {
      friendCode = createLocalUniqueFriendCode();
    }

    localStorage.setItem('runmate_logged_in', JSON.stringify({
      ...session,
      uid: session?.uid || ('local_' + session.email),
      friendCode,
    }));
    return friendCode;
  }

  return '------';
}

// ═══════ FRIENDS ═══════

export async function findUserByFriendCode(friendCode: string) {
  const normalizedCode = friendCode.trim().toUpperCase();

  if (!db) {
    return localFindByFriendCode(normalizedCode);
  }

  try {
    const q = query(collection(db, 'users'), where('friendCode', '==', normalizedCode));
    const snap = await getDocs(q);

    if (snap.empty) {
      return { success: false, error: 'Không tìm thấy người dùng với mã này' };
    }

    const userData = snap.docs[0].data();
    return {
      success: true,
      user: {
        uid: snap.docs[0].id,
        name: userData.name,
        email: userData.email,
        friendCode: userData.friendCode,
      },
    };
  } catch {
    return { success: false, error: 'Không thể tìm kiếm' };
  }
}

export async function addFriend(currentUid: string, friendUid: string) {
  if (!db) return;

  try {
    const userDoc = await getDoc(doc(db, 'users', currentUid));
    if (userDoc.exists()) {
      const friends: string[] = userDoc.data().friends || [];
      if (!friends.includes(friendUid)) {
        friends.push(friendUid);
        await updateDoc(doc(db, 'users', currentUid), { friends });
      }
    }
  } catch {
    // Ignore
  }
}

export async function getFriendsData(friendUids: string[]) {
  if (!db || friendUids.length === 0) return [];

  const results = [];
  for (const uid of friendUids) {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        results.push({ uid, ...snap.data() });
      }
    } catch {
      // Skip
    }
  }
  return results;
}

// ═══════ AUTH STATE LISTENER ═══════

export function onAuthChange(callback: (user: User | null) => void) {
  if (!auth) {
    // Fallback: check localStorage
    const saved = localStorage.getItem('runmate_logged_in');
    if (saved) {
      callback({ displayName: JSON.parse(saved).name, email: JSON.parse(saved).email } as unknown as User);
    } else {
      callback(null);
    }
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

export function isFirebaseConfigured(): boolean {
  return isConfigured;
}

// ═══════════════════════════════════════════
// FALLBACK: localStorage khi chưa có Firebase
// ═══════════════════════════════════════════

const LOCAL_ACCOUNTS_KEY = 'runmate_accounts';

interface LocalAccount {
  name: string;
  email: string;
  password: string;
  createdAt: string;
  friendCode: string;
}

function getLocalAccounts(): LocalAccount[] {
  try {
    const data = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function createLocalUniqueFriendCode(): string {
  const accounts = getLocalAccounts();
  let code = randomFriendCode();
  while (accounts.some(a => a.friendCode === code)) {
    code = randomFriendCode();
  }
  return code;
}

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hashed_' + Math.abs(hash).toString(36) + '_' + password.length;
}

function localRegister(email: string, password: string, name: string) {
  const accounts = getLocalAccounts();

  if (accounts.find(a => a.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, error: 'Email này đã được đăng ký' };
  }

  const friendCode = createLocalUniqueFriendCode();

  accounts.push({
    name,
    email: email.toLowerCase(),
    password: hashPassword(password),
    createdAt: new Date().toISOString(),
    friendCode,
  });

  localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));

  const session = { name, email: email.toLowerCase(), createdAt: new Date().toISOString(), friendCode, uid: 'local_' + email.toLowerCase() };
  localStorage.setItem('runmate_logged_in', JSON.stringify(session));

  return {
    success: true,
    user: { uid: 'local_' + Date.now(), email: email.toLowerCase(), name, friendCode },
  };
}

function localLogin(email: string, password: string) {
  const accounts = getLocalAccounts();
  const idx = accounts.findIndex(a => a.email.toLowerCase() === email.toLowerCase());
  const account = idx >= 0 ? accounts[idx] : undefined;

  if (!account) return { success: false, error: 'Email chưa được đăng ký' };
  if (account.password !== hashPassword(password)) return { success: false, error: 'Mật khẩu không đúng' };

  const friendCode = account.friendCode || createLocalUniqueFriendCode();
  if (!account.friendCode) {
    accounts[idx] = { ...account, friendCode };
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  const session = { name: account.name, email: account.email, createdAt: account.createdAt, friendCode, uid: 'local_' + account.email };
  localStorage.setItem('runmate_logged_in', JSON.stringify(session));

  return {
    success: true,
    user: { uid: 'local_' + account.email, email: account.email, name: account.name, friendCode },
  };
}

function localResetPassword(email: string) {
  const accounts = getLocalAccounts();
  const account = accounts.find(a => a.email.toLowerCase() === email.toLowerCase());

  if (!account) return { success: false, error: 'Email chưa được đăng ký' };

  // Tạo mã xác nhận 6 số
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  localStorage.setItem('runmate_reset_code', JSON.stringify({
    code,
    email: email.toLowerCase(),
    expiry: Date.now() + 5 * 60 * 1000,
  }));

  return { success: true, code };
}

function localFindByFriendCode(friendCode: string) {
  const accounts = getLocalAccounts();
  const account = accounts.find(a => a.friendCode === friendCode.toUpperCase());

  if (!account) {
    return { success: false, error: 'Không tìm thấy người dùng với mã này' };
  }

  return {
    success: true,
    user: {
      uid: 'local_' + account.email,
      name: account.name,
      email: account.email,
      friendCode: account.friendCode,
    },
  };
}
