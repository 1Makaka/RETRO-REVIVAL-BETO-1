/**
 * Frantic Battles - Match History & Player Statistics Manager (MatchHistoryManager.ts)
 * Persistent match logging (Dungeons & PvP) with Firestore sync and public inspection.
 */

import { doc, setDoc, getDocs, collection, query, orderBy, limit, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth, activeCloudProfile } from './firebase';

export interface MatchHistoryDoc {
  matchId: string;
  mode: 'dungeon' | 'pvp_1v1' | 'pvp_2v2';
  result: 'VICTORY' | 'DEFEAT';
  heroId: string;
  timestamp: number;
  durationSeconds: number;
  // Dungeon specific:
  floorsCleared?: number;
  skullsEarned?: number;
  bossesKilled?: number;
  // PvP specific:
  ratingDelta?: number;
  currentRating?: number;
  opponentNick?: string;
  opponentHero?: string;
  teammateNick?: string | null;
}

export interface PlayerExtendedStats {
  // Dungeon Block
  dungeonsCleared: number;
  roomsCleared: number;
  bossesKilled: number;
  maxFloor: number;
  // PvP Block
  rating: number;
  pvpMatches: number;
  pvpWins: number;
  pvpLosses: number;
  bestWinStreak: number;
  currentWinStreak: number;
  // Favorite Hero
  heroMatchCounts: Record<string, number>;
  favoriteHeroId: string;
}

export interface PublicProfileInfo {
  uid: string;
  nickname: string;
  tag: string;
  rating: number;
  rank: string;
  avatar: string;
  photoURL?: string;
  isOnline: boolean;
  lastSeen?: number;
  stats: PlayerExtendedStats;
  matches: MatchHistoryDoc[];
}

const LOCAL_STATS_KEY = 'fb_player_extended_stats';
const LOCAL_MATCH_HISTORY_KEY = 'fb_guest_match_history_v2';

export class MatchHistoryManager {
  /**
   * Load local or cached extended statistics
   */
  public static loadLocalStats(): PlayerExtendedStats {
    try {
      const raw = localStorage.getItem(LOCAL_STATS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          const counts: Record<string, number> = parsed.heroMatchCounts || {};
          const favHero = this.calculateFavoriteHero(counts);
          return {
            ...parsed,
            heroMatchCounts: counts,
            favoriteHeroId: favHero
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse local player stats:', e);
    }

    return {
      dungeonsCleared: 0,
      roomsCleared: 0,
      bossesKilled: 0,
      maxFloor: 1,
      rating: 1000,
      pvpMatches: 0,
      pvpWins: 0,
      pvpLosses: 0,
      bestWinStreak: 0,
      currentWinStreak: 0,
      heroMatchCounts: {},
      favoriteHeroId: ''
    };
  }

  /**
   * Save local stats
   */
  public static saveLocalStats(stats: PlayerExtendedStats) {
    try {
      localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(stats));
    } catch (e) {
      console.warn('Failed to save local stats:', e);
    }
  }

  /**
   * Calculate favorite hero based on match count breakdown
   * Returns empty string if no matches have been played yet
   */
  public static calculateFavoriteHero(counts: Record<string, number>): string {
    let max = 0;
    let fav = '';
    for (const [heroId, count] of Object.entries(counts || {})) {
      if (typeof count === 'number' && count > max) {
        max = count;
        fav = heroId;
      }
    }
    return fav;
  }

  /**
   * Log a Dungeon match completion
   */
  public static async logDungeonMatch(params: {
    result: 'VICTORY' | 'DEFEAT';
    heroId: string;
    durationSeconds: number;
    floorsCleared: number;
    skullsEarned: number;
    bossesKilled: number;
    roomsCleared?: number;
  }) {
    const matchId = `match_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const docData: MatchHistoryDoc = {
      matchId,
      mode: 'dungeon',
      result: params.result,
      heroId: params.heroId,
      timestamp: Date.now(),
      durationSeconds: Math.max(1, Math.round(params.durationSeconds)),
      floorsCleared: params.floorsCleared,
      skullsEarned: params.skullsEarned,
      bossesKilled: params.bossesKilled
    };

    // 1. Update stats
    const stats = this.loadLocalStats();
    if (params.result === 'VICTORY') {
      stats.dungeonsCleared += 1;
    }
    stats.roomsCleared += params.roomsCleared || (params.floorsCleared * 4);
    stats.bossesKilled += params.bossesKilled;
    stats.maxFloor = Math.max(stats.maxFloor, params.floorsCleared);

    stats.heroMatchCounts[params.heroId] = (stats.heroMatchCounts[params.heroId] || 0) + 1;
    stats.favoriteHeroId = this.calculateFavoriteHero(stats.heroMatchCounts);
    this.saveLocalStats(stats);

    // 2. Local storage match history
    this.saveLocalMatch(docData);

    // 3. Cloud Firestore sync
    if (auth.currentUser) {
      try {
        const uid = auth.currentUser.uid;
        await setDoc(doc(db, 'users', uid, 'match_history', matchId), docData);

        // Update user stats doc
        await updateDoc(doc(db, 'users', uid), {
          stats: {
            dungeonsCleared: stats.dungeonsCleared,
            roomsCleared: stats.roomsCleared,
            bossesKilled: stats.bossesKilled,
            maxFloor: stats.maxFloor,
            pvpMatches: stats.pvpMatches,
            pvpWins: stats.pvpWins,
            pvpLosses: stats.pvpLosses,
            bestWinStreak: stats.bestWinStreak,
            currentWinStreak: stats.currentWinStreak,
            favoriteHeroId: stats.favoriteHeroId,
            heroMatchCounts: stats.heroMatchCounts
          }
        });
      } catch (err) {
        console.error('Failed to sync dungeon match to cloud:', err);
      }
    }

    window.dispatchEvent(new CustomEvent('match_history_updated'));
  }

  /**
   * Log a PvP Duel match completion
   */
  public static async logPvPMatch(params: {
    result: 'VICTORY' | 'DEFEAT';
    heroId: string;
    mode: 'pvp_1v1' | 'pvp_2v2';
    durationSeconds: number;
    ratingDelta: number;
    currentRating: number;
    opponentNick: string;
    opponentHero: string;
    teammateNick?: string | null;
  }) {
    const matchId = `match_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const docData: MatchHistoryDoc = {
      matchId,
      mode: params.mode,
      result: params.result,
      heroId: params.heroId,
      timestamp: Date.now(),
      durationSeconds: Math.max(1, Math.round(params.durationSeconds)),
      ratingDelta: params.ratingDelta,
      currentRating: params.currentRating,
      opponentNick: params.opponentNick,
      opponentHero: params.opponentHero,
      teammateNick: params.teammateNick || null
    };

    // 1. Update stats
    const stats = this.loadLocalStats();
    stats.pvpMatches += 1;
    stats.rating = params.currentRating;

    if (params.result === 'VICTORY') {
      stats.pvpWins += 1;
      stats.currentWinStreak += 1;
      stats.bestWinStreak = Math.max(stats.bestWinStreak, stats.currentWinStreak);
    } else {
      stats.pvpLosses += 1;
      stats.currentWinStreak = 0;
    }

    stats.heroMatchCounts[params.heroId] = (stats.heroMatchCounts[params.heroId] || 0) + 1;
    stats.favoriteHeroId = this.calculateFavoriteHero(stats.heroMatchCounts);
    this.saveLocalStats(stats);

    // 2. Local storage match history
    this.saveLocalMatch(docData);

    // 3. Cloud Firestore sync
    if (auth.currentUser) {
      try {
        const uid = auth.currentUser.uid;
        await setDoc(doc(db, 'users', uid, 'match_history', matchId), docData);

        await updateDoc(doc(db, 'users', uid), {
          rating: params.currentRating,
          stats: {
            dungeonsCleared: stats.dungeonsCleared,
            roomsCleared: stats.roomsCleared,
            bossesKilled: stats.bossesKilled,
            maxFloor: stats.maxFloor,
            pvpMatches: stats.pvpMatches,
            pvpWins: stats.pvpWins,
            pvpLosses: stats.pvpLosses,
            bestWinStreak: stats.bestWinStreak,
            currentWinStreak: stats.currentWinStreak,
            favoriteHeroId: stats.favoriteHeroId,
            heroMatchCounts: stats.heroMatchCounts
          }
        });
      } catch (err) {
        console.error('Failed to sync PvP match to cloud:', err);
      }
    }

    window.dispatchEvent(new CustomEvent('match_history_updated'));
  }

  /**
   * Save local match to guest storage
   */
  private static saveLocalMatch(match: MatchHistoryDoc) {
    try {
      const raw = localStorage.getItem(LOCAL_MATCH_HISTORY_KEY);
      const list: MatchHistoryDoc[] = raw ? JSON.parse(raw) : [];
      list.unshift(match);
      // Retain latest 25 matches locally
      localStorage.setItem(LOCAL_MATCH_HISTORY_KEY, JSON.stringify(list.slice(0, 25)));
    } catch (e) {
      console.warn('Failed to save local match history:', e);
    }
  }

  /**
   * Fetch match history for a user (cloud or local)
   */
  public static async fetchUserMatchHistory(uid?: string): Promise<MatchHistoryDoc[]> {
    const targetUid = uid || auth.currentUser?.uid;

    if (targetUid) {
      try {
        const q = query(
          collection(db, 'users', targetUid, 'match_history'),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const list: MatchHistoryDoc[] = [];
          snap.forEach(docSnap => {
            list.push(docSnap.data() as MatchHistoryDoc);
          });
          return list;
        }
      } catch (err) {
        console.warn(`Could not load cloud match history for ${targetUid}:`, err);
      }
    }

    // Fallback to local guest matches
    try {
      const raw = localStorage.getItem(LOCAL_MATCH_HISTORY_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse local match history:', e);
    }

    return [];
  }

  /**
   * Fetch public player profile with statistics & match history
   */
  public static async fetchPublicProfile(uid: string): Promise<PublicProfileInfo | null> {
    if (!uid) return null;

    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const data = snap.data();
        const matches = await this.fetchUserMatchHistory(uid);
        
        const now = Date.now();
        const lastSeen = data.lastSeen || 0;
        const isOnline = (now - lastSeen) < (2 * 60 * 1000); // online if heartbeat within 2 min

        const rawStats = data.stats || {};
        const stats: PlayerExtendedStats = {
          dungeonsCleared: rawStats.dungeonsCleared || 0,
          roomsCleared: rawStats.roomsCleared || (rawStats.dungeonsCleared ? rawStats.dungeonsCleared * 6 : 0),
          bossesKilled: rawStats.bossesKilled || rawStats.bossesDefeated || 0,
          maxFloor: rawStats.maxFloor || (rawStats.dungeonsCleared ? 7 : 1),
          rating: data.rating || 1000,
          pvpMatches: rawStats.pvpMatches || (rawStats.wins ? rawStats.wins + 4 : 0),
          pvpWins: rawStats.pvpWins || rawStats.wins || 0,
          pvpLosses: rawStats.pvpLosses || 0,
          bestWinStreak: rawStats.bestWinStreak || Math.min(5, rawStats.pvpWins || 0),
          currentWinStreak: rawStats.currentWinStreak || 0,
          heroMatchCounts: rawStats.heroMatchCounts || {},
          favoriteHeroId: rawStats.favoriteHeroId || this.calculateFavoriteHero(rawStats.heroMatchCounts || {})
        };

        return {
          uid,
          nickname: data.nickname || 'Неизвестный',
          tag: data.tag || '#0000',
          rating: data.rating || 1000,
          rank: data.rank || 'Бродяга',
          avatar: data.avatar || 'avatar_sq_1',
          photoURL: data.photoURL,
          isOnline,
          lastSeen,
          stats,
          matches
        };
      }
    } catch (err) {
      console.error('Failed to fetch public profile:', err);
    }

    return null;
  }
}
