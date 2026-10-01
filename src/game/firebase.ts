/**
 * Frantic Battles / Retro Revival - Firebase Auth & Cloud Save Integration (firebase.ts)
 * 100% Cloud Persistence with Firestore, Google Auth via Popup,
 * Guest start without popups, and unique nickname registration for new users.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import { loadEconomy, saveEconomy, loadRoster, saveRoster, EconomyState, HeroRosterState } from './economy';
import { soundEngine } from './audio';
import { PresenceService } from './PresenceService';

import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// --- FIRESTORE HARDENED ERROR HANDLING ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export interface MatchRecord {
  id: string;
  heroId: string;
  result: 'win' | 'loss';
  timestamp: number;
  mode: string;
}

export interface UserCloudProfile {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  nickname: string;
  nickname_lower: string;
  tag: string;
  rating: number;
  rank: string;
  photoURL?: string;
  economy: EconomyState;
  roster: Record<string, HeroRosterState>;
  stats: {
    dungeonsCleared: number;
    bossesDefeated: number;
    wins: number;
  };
  avatar: string;
  friends?: string[];
  lastSeen?: number;
  matches?: MatchRecord[];
}

export function getGuestMatches(): MatchRecord[] {
  try {
    const raw = localStorage.getItem('fb_guest_matches');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load guest matches:', e);
  }
  return [];
}

const GUEST_SAVE_KEY = 'fb_guest_profile';

// Get or create local guest profile
export function getGuestProfile(): { nickname: string; rating: number; rank: string; avatar: string } {
  try {
    const raw = localStorage.getItem(GUEST_SAVE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to read guest profile:', e);
  }

  const randomTag = Math.floor(1000 + Math.random() * 9000);
  const newGuest = {
    nickname: `Гость#${randomTag}`,
    rating: 0,
    rank: 'Бродяга',
    avatar: 'avatar_sq_1'
  };
  localStorage.setItem(GUEST_SAVE_KEY, JSON.stringify(newGuest));
  return newGuest;
}

export function saveGuestProfile(profile: { nickname: string; rating: number; rank: string; avatar: string }) {
  localStorage.setItem(GUEST_SAVE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent('profile_updated', { detail: profile }));
}

// Current active profile helper
export let activeCloudProfile: UserCloudProfile | null = null;

export function getActiveUserProfile(): { nickname: string; rating: number; rank: string; avatar: string; isGoogle: boolean; photoURL?: string; matches?: MatchRecord[] } {
  if (auth.currentUser && activeCloudProfile) {
    return {
      nickname: activeCloudProfile.nickname,
      rating: activeCloudProfile.rating || 0,
      rank: activeCloudProfile.rank || 'Бродяга',
      avatar: activeCloudProfile.avatar || 'avatar_sq_1',
      isGoogle: true,
      photoURL: auth.currentUser.photoURL || activeCloudProfile.photoURL || undefined,
      matches: activeCloudProfile.matches || []
    };
  }
  const guest = getGuestProfile();
  return {
    ...guest,
    isGoogle: false,
    matches: getGuestMatches()
  };
}

// --- GOOGLE SIGN-IN ---
export async function loginWithGoogle(): Promise<{ needsRegistration: boolean; user?: User; profile?: UserCloudProfile }> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const user = credential.user;

  // Check if document exists in Firestore users
  const userDocRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userDocRef);

  if (!snap.exists()) {
    return { needsRegistration: true, user };
  } else {
    const data = snap.data() as UserCloudProfile;
    activeCloudProfile = data;

    // Load into local economy and roster
    if (data.economy) saveEconomy(data.economy);
    if (data.roster) saveRoster(data.roster);

    window.dispatchEvent(new CustomEvent('profile_updated', { detail: getActiveUserProfile() }));
    return { needsRegistration: false, user, profile: data };
  }
}

export async function logoutGoogle() {
  const user = auth.currentUser;
  if (user) {
    try {
      await updateDoc(doc(db, 'users', user.uid), { lastSeen: 0 });
    } catch (e) {}
  }
  await signOut(auth);
  activeCloudProfile = null;
  window.dispatchEvent(new CustomEvent('profile_updated', { detail: getActiveUserProfile() }));
}

// --- EMAIL & PASSWORD AUTH ---
export async function loginWithEmail(email: string, password: string): Promise<{ needsRegistration: boolean; user: User; profile?: UserCloudProfile }> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = credential.user;

    const userDocRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userDocRef);

    if (!snap.exists()) {
      return { needsRegistration: true, user };
    } else {
      const data = snap.data() as UserCloudProfile;
      activeCloudProfile = data;

      if (data.economy) saveEconomy(data.economy);
      if (data.roster) saveRoster(data.roster);

      window.dispatchEvent(new CustomEvent('profile_updated', { detail: getActiveUserProfile() }));
      return { needsRegistration: false, user, profile: data };
    }
  } catch (err: any) {
    console.error('[Firebase loginWithEmail error]:', err);
    throw err;
  }
}

export async function registerWithEmail(email: string, password: string): Promise<{ needsRegistration: boolean; user: User; profile?: UserCloudProfile }> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = credential.user;
    try {
      const actionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: true
      };
      await sendEmailVerification(user, actionCodeSettings);
    } catch (verErr) {
      console.warn('[Firebase sendEmailVerification non-fatal warning]:', verErr);
    }

    const userDocRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userDocRef);

    if (!snap.exists()) {
      return { needsRegistration: true, user };
    } else {
      const data = snap.data() as UserCloudProfile;
      activeCloudProfile = data;
      if (data.economy) saveEconomy(data.economy);
      if (data.roster) saveRoster(data.roster);
      window.dispatchEvent(new CustomEvent('profile_updated', { detail: getActiveUserProfile() }));
      return { needsRegistration: false, user, profile: data };
    }
  } catch (err: any) {
    console.error('[Firebase registerWithEmail error]:', err);
    throw err;
  }
}

export async function sendVerificationEmailAgain(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Пользователь не авторизован');
  try {
    const actionCodeSettings = {
      url: window.location.origin,
      handleCodeInApp: true
    };
    await sendEmailVerification(user, actionCodeSettings);
  } catch (err: any) {
    console.warn('[Firebase sendEmailVerification error]:', err);
    throw err;
  }
}

export function getAuthErrorMessage(err: any): string {
  if (!err) return 'Неизвестная ошибка';
  const code = (err.code || err.message || '').toString().toLowerCase();
  if (code.includes('auth/operation-not-allowed') || code.includes('operation-not-allowed')) {
    return 'Вход по Email отключен на сервере Firebase. Пожалуйста, используйте "ВОЙТИ ЧЕРЕЗ GOOGLE" для облачного профиля или играйте в режиме Гостя.';
  }
  if (code.includes('auth/email-already-in-use')) {
    return 'Этот Email уже зарегистрирован! Пожалуйста, выберите "ВХОД".';
  }
  if (code.includes('auth/invalid-email')) {
    return 'Некорректный адрес электронной почты.';
  }
  if (code.includes('auth/weak-password')) {
    return 'Слишком простой пароль. Используйте минимум 6 символов.';
  }
  if (code.includes('auth/network-request-failed')) {
    return 'Ошибка сети. Проверьте интернет-соединение.';
  }
  if (code.includes('auth/too-many-requests')) {
    return 'Слишком много попыток. Подождите пару минут.';
  }
  if (code.includes('auth/user-not-found') || code.includes('auth/wrong-password') || code.includes('auth/invalid-credential')) {
    return 'Неверный адрес почты или пароль!';
  }
  if (code.includes('auth/popup-closed-by-user')) {
    return 'Окно авторизации было закрыто.';
  }
  return 'Ошибка авторизации: ' + (err.message || 'Попробуйте позже');
}

export async function logoutAccount() {
  const user = auth.currentUser;
  if (user) {
    try {
      await updateDoc(doc(db, 'users', user.uid), { lastSeen: 0 });
    } catch (e) {}
  }
  await signOut(auth);
  activeCloudProfile = null;
  window.dispatchEvent(new CustomEvent('profile_updated', { detail: getActiveUserProfile() }));
}

export async function reloadAuthUser(): Promise<User | null> {
  const user = auth.currentUser;
  if (user) {
    await user.reload();
    const updatedUser = auth.currentUser;
    // Check if document exists now
    if (updatedUser && updatedUser.emailVerified) {
      const snap = await getDoc(doc(db, 'users', updatedUser.uid));
      if (snap.exists()) {
        const data = snap.data() as UserCloudProfile;
        activeCloudProfile = data;
        if (data.economy) saveEconomy(data.economy);
        if (data.roster) saveRoster(data.roster);
      }
    }
    window.dispatchEvent(new CustomEvent('profile_updated', { detail: getActiveUserProfile() }));
    return updatedUser;
  }
  return null;
}

// Check nickname uniqueness in Firestore
export async function checkNicknameUnique(inputNick: string): Promise<boolean> {
  const cleanNick = inputNick.trim().toLowerCase();
  if (cleanNick.length < 3 || cleanNick.length > 14) {
    return false;
  }
  const q = query(collection(db, 'users'), where('nickname_lower', '==', cleanNick));
  const querySnap = await getDocs(q);
  return querySnap.empty;
}

// Strict start from 0 for new account
export async function registerNewUserAccount(nickname: string): Promise<UserCloudProfile> {
  const user = auth.currentUser;
  if (!user) throw new Error('Пользователь не авторизован');

  const cleanNick = nickname.trim();
  const lowerNick = cleanNick.toLowerCase();

  const isUnique = await checkNicknameUnique(cleanNick);
  if (!isUnique) {
    throw new Error('Этот никнейм уже занят!');
  }

  const tag = `${cleanNick}#${user.uid.slice(-4)}`;

  // Default Roster: ONLY Grim and Burn unlocked at lvl 1
  const defaultRoster: Record<string, HeroRosterState> = {
    char_grim: { id: 'char_grim', unlocked: true, level: 1 },
    char_bjorn: { id: 'char_bjorn', unlocked: true, level: 1 },
    char_torf: { id: 'char_torf', unlocked: false, level: 1 },
    char_alrik: { id: 'char_alrik', unlocked: false, level: 1 },
    char_kraul: { id: 'char_kraul', unlocked: false, level: 1 },
    char_zaza: { id: 'char_zaza', unlocked: false, level: 1 },
    char_omen: { id: 'char_omen', unlocked: false, level: 1 },
    char_nihil: { id: 'char_nihil', unlocked: true, level: 1 }
  };

  const defaultEconomy: EconomyState = {
    rustySkulls: 500,
    voidShards: 0,
    upgradePoints: 100,
    rankedPoints: 0,
    tickets: 5
  };

  const newProfile: UserCloudProfile = {
    uid: user.uid,
    email: user.email || '',
    emailVerified: user.emailVerified || false,
    nickname: cleanNick,
    nickname_lower: lowerNick,
    tag,
    rating: 0,
    rank: 'Бродяга',
    photoURL: user.photoURL || '',
    economy: defaultEconomy,
    roster: defaultRoster,
    stats: {
      dungeonsCleared: 0,
      bossesDefeated: 0,
      wins: 0
    },
    avatar: 'avatar_sq_1',
    friends: [],
    lastSeen: Date.now()
  };

  const docPayload = JSON.parse(JSON.stringify({
    ...newProfile,
    photoURL: user.photoURL || ''
  }));

  await setDoc(doc(db, 'users', user.uid), {
    ...docPayload,
    createdAt: serverTimestamp()
  });

  activeCloudProfile = newProfile;
  saveEconomy(defaultEconomy);
  saveRoster(defaultRoster);

  window.dispatchEvent(new CustomEvent('profile_updated', { detail: getActiveUserProfile() }));
  return newProfile;
}

export async function addFriendByTag(tag: string): Promise<{ success: boolean; message: string }> {
  const user = auth.currentUser;
  if (!user || !activeCloudProfile) {
    return { success: false, message: 'Пользователь не авторизован' };
  }

  const cleanTag = tag.trim();
  if (cleanTag === activeCloudProfile.tag) {
    return { success: false, message: 'Нельзя добавить самого себя в друзья!' };
  }

  try {
    const q = query(collection(db, 'users'), where('tag', '==', cleanTag));
    const snap = await getDocs(q);
    if (snap.empty) {
      return { success: false, message: 'Игрок с таким тегом не найден' };
    }

    const friendDoc = snap.docs[0];
    const friendUid = friendDoc.id;

    const currentFriends = activeCloudProfile.friends || [];
    if (currentFriends.includes(friendUid)) {
      return { success: false, message: 'Этот игрок уже в вашем списке друзей' };
    }

    const updatedFriends = [...currentFriends, friendUid];
    activeCloudProfile.friends = updatedFriends;

    await updateDoc(doc(db, 'users', user.uid), {
      friends: updatedFriends
    });

    return { success: true, message: `Игрок ${friendDoc.data().nickname} добавлен в друзья!` };
  } catch (e: any) {
    return { success: false, message: e.message || 'Ошибка добавления в друзья' };
  }
}

export async function removeFriend(friendUid: string): Promise<{ success: boolean; message: string }> {
  const user = auth.currentUser;
  if (!user || !activeCloudProfile) {
    return { success: false, message: 'Пользователь не авторизован' };
  }

  try {
    const currentFriends = activeCloudProfile.friends || [];
    const updatedFriends = currentFriends.filter(id => id !== friendUid);
    activeCloudProfile.friends = updatedFriends;

    await updateDoc(doc(db, 'users', user.uid), {
      friends: updatedFriends
    });

    return { success: true, message: 'Друг успешно удален' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Ошибка удаления друга' };
  }
}

export async function getFriendsList(): Promise<any[]> {
  const user = auth.currentUser;
  if (!user || !activeCloudProfile) return [];
  const friendUids = activeCloudProfile.friends || [];
  if (friendUids.length === 0) return [];

  const results: any[] = [];
  for (const fUid of friendUids) {
    try {
      const snap = await getDoc(doc(db, 'users', fUid));
      if (snap.exists()) {
        const data = snap.data();
        results.push({
          uid: fUid,
          nickname: data.nickname,
          tag: data.tag,
          avatar: data.avatar || 'avatar_sq_1',
          rank: data.rank || 'Бродяга',
          lastSeen: data.lastSeen || 0,
          isOnline: Date.now() - (data.lastSeen || 0) < 60000
        });
      }
    } catch (e) {
      console.error('Error fetching friend details:', e);
    }
  }
  return results;
}

export async function sendLobbyInvite(friendUid: string, lobbyId: string, lobbyMode: 'Dungeon' | 'PVP' | 'Tavern'): Promise<void> {
  const user = auth.currentUser;
  if (!user || !activeCloudProfile) return;

  const mailboxCol = collection(db, 'users', friendUid, 'mailbox');
  const msgDoc = doc(mailboxCol);
  await setDoc(msgDoc, {
    id: msgDoc.id,
    type: 'lobby_invite',
    senderUid: user.uid,
    senderNick: activeCloudProfile.nickname,
    senderTag: activeCloudProfile.tag,
    lobbyId: lobbyId,
    lobbyMode: lobbyMode,
    title: 'Приглашение в бой!',
    text: `${activeCloudProfile.nickname} зовет вас в ${lobbyMode === 'Dungeon' ? 'Подземелье' : (lobbyMode === 'PVP' ? 'PvP Арену' : 'Таверну')}!`,
    createdAt: Date.now(),
    accepted: false,
    read: false
  });
}

export async function sendChatMessage(friendUid: string, text: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !activeCloudProfile) return;

  const mailboxCol = collection(db, 'users', friendUid, 'mailbox');
  const msgDoc = doc(mailboxCol);
  await setDoc(msgDoc, {
    id: msgDoc.id,
    type: 'chat',
    senderUid: user.uid,
    senderNick: activeCloudProfile.nickname,
    senderTag: activeCloudProfile.tag,
    title: 'Новое сообщение',
    text: text,
    createdAt: Date.now(),
    accepted: false,
    read: false
  });
}

export function subscribeToMailbox(callback: (messages: any[]) => void) {
  const user = auth.currentUser;
  if (!user) return () => {};
  const q = collection(db, 'users', user.uid, 'mailbox');
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(d => d.data()).sort((a, b) => b.createdAt - a.createdAt);
    callback(msgs);
  });
}

export async function markMailAsRead(messageId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(doc(db, 'users', user.uid, 'mailbox', messageId), { read: true }, { merge: true });
}

export async function deleteMailMessage(messageId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  await deleteDoc(doc(db, 'users', user.uid, 'mailbox', messageId));
}

// 100% Cloud Save: sync current economy, roster & stats to Firestore
export async function saveUserDataToCloud() {
  const user = auth.currentUser;
  if (!user) return;

  const currentEcon = loadEconomy();
  const currentRoster = loadRoster();

  const userDocRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userDocRef);

  if (snap.exists()) {
    const data = snap.data();
    await setDoc(userDocRef, {
      ...data,
      economy: currentEcon,
      roster: currentRoster,
      selected_bgm: localStorage.getItem('selected_bgm') || 'bgm_rune_wanderers',
      stats: activeCloudProfile?.stats || data.stats || { dungeonsCleared: 0, bossesDefeated: 0, wins: 0 },
      matches: activeCloudProfile?.matches || data.matches || [],
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}

export const stats = {
  get bossesKilled(): number {
    return activeCloudProfile?.stats?.bossesDefeated || 0;
  },
  set bossesKilled(val: number) {
    if (activeCloudProfile && activeCloudProfile.stats) {
      activeCloudProfile.stats.bossesDefeated = val;
    }
    const guest = getGuestProfile() as any;
    guest.bossesDefeated = val;
    localStorage.setItem(GUEST_SAVE_KEY, JSON.stringify(guest));
    saveUserDataToCloud().catch(err => console.error(err));
    window.dispatchEvent(new CustomEvent('profile_updated', { detail: getActiveUserProfile() }));
  },
  get dungeonsCleared(): number {
    return activeCloudProfile?.stats?.dungeonsCleared || 0;
  },
  set dungeonsCleared(val: number) {
    if (activeCloudProfile && activeCloudProfile.stats) {
      activeCloudProfile.stats.dungeonsCleared = val;
    }
    const guest = getGuestProfile() as any;
    guest.dungeonsCleared = val;
    localStorage.setItem(GUEST_SAVE_KEY, JSON.stringify(guest));
    saveUserDataToCloud().catch(err => console.error(err));
    window.dispatchEvent(new CustomEvent('profile_updated', { detail: getActiveUserProfile() }));
  }
};

export const CloudSyncManager = {
  saveAllProgress: async () => {
    try {
      await saveUserDataToCloud();
      console.log('[CloudSyncManager] Progress synchronized successfully.');
    } catch (e) {
      console.error('[CloudSyncManager] Failed to sync progress:', e);
    }
  }
};

// Listeners to auto-sync economy and roster changes to cloud
window.addEventListener('economy_updated', () => {
  if (auth.currentUser) {
    saveUserDataToCloud().catch(err => console.error('Cloud save failed:', err));
  }
});

window.addEventListener('roster_updated', () => {
  if (auth.currentUser) {
    saveUserDataToCloud().catch(err => console.error('Cloud save failed:', err));
  }
});

// Auth state observer
onAuthStateChanged(auth, async (user) => {
  if (user) {
    PresenceService.startHeartbeat();
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        activeCloudProfile = snap.data() as UserCloudProfile;
        if (activeCloudProfile.economy) saveEconomy(activeCloudProfile.economy);
        if (activeCloudProfile.roster) {
          if (activeCloudProfile.roster.char_nihil) {
            activeCloudProfile.roster.char_nihil.unlocked = true;
          }
          saveRoster(activeCloudProfile.roster);
        }
        const data = snap.data();
        if (data.selected_bgm) {
          localStorage.setItem('selected_bgm', data.selected_bgm);
          soundEngine.selectTrack(data.selected_bgm);
        }
      }
    } catch (e) {
      console.error('Error fetching user cloud profile:', e);
    }
  } else {
    PresenceService.stopHeartbeat();
    activeCloudProfile = null;
  }
  window.dispatchEvent(new CustomEvent('profile_updated', { detail: getActiveUserProfile() }));
});

// Helper to push a match to active history (cloud or guest)
export function addMatchToHistory(heroId: string, result: 'win' | 'loss', mode: string = 'Одиночный') {
  const newMatch: MatchRecord = {
    id: `match_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    heroId,
    result,
    timestamp: Date.now(),
    mode
  };

  if (auth.currentUser && activeCloudProfile) {
    if (!activeCloudProfile.matches) {
      activeCloudProfile.matches = [];
    }
    activeCloudProfile.matches.unshift(newMatch);
    // Limit to 10 entries to avoid DB bloating
    activeCloudProfile.matches = activeCloudProfile.matches.slice(0, 10);
    saveUserDataToCloud().catch(err => console.error('Failed to sync match to cloud:', err));
  } else {
    // Guest matches storage in localStorage
    const guestMatches = getGuestMatches();
    guestMatches.unshift(newMatch);
    localStorage.setItem('fb_guest_matches', JSON.stringify(guestMatches.slice(0, 10)));
  }

  window.dispatchEvent(new CustomEvent('profile_updated', { detail: getActiveUserProfile() }));
}
