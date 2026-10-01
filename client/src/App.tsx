/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { createFranticGame } from './game';
import { soundEngine } from './game/audio';
import { ReactLootboxModal } from './components/ReactLootboxModal';
import { Volume2, VolumeX, Shield, Swords, Gamepad2, Maximize2, Minimize2, LogIn, LogOut, UserCheck, Copy, Check, Users, Trophy, Flame } from 'lucide-react';

const CheckIcon = Check as any;
const CopyIcon = Copy as any;
const LogInIcon = LogIn as any;
const UserCheckIcon = UserCheck as any;
import { doc, getDoc } from 'firebase/firestore';
import {
  loginWithGoogle,
  logoutGoogle,
  checkNicknameUnique,
  registerNewUserAccount,
  getActiveUserProfile,
  auth,
  db,
  saveUserDataToCloud,
  loginWithEmail,
  registerWithEmail,
  sendVerificationEmailAgain,
  getAuthErrorMessage,
  logoutAccount,
  reloadAuthUser,
  addFriendByTag,
  sendChatMessage
} from './game/firebase';
import {
  CANONICAL_ROSTER,
  loadRoster,
  saveRoster,
  loadEconomy,
  saveEconomy,
  levelUpHero,
  buyHeroFromShop,
  getHeroUpgradeCost,
  getHeroStatMultipliers
} from './game/economy';
import { HEROES } from './game/players';
import { MatchHistoryManager, MatchHistoryDoc, PlayerExtendedStats, PublicProfileInfo } from './game/MatchHistoryManager';

interface PublicProfileData {
  uid?: string;
  nickname: string;
  tag?: string;
  rank: string;
  rating: number;
  isOnline?: boolean;
  lastSeen?: number;
  wins?: number;
  pvpLosses?: number;
  pvpMatches?: number;
  bestWinStreak?: number;
  dungeonsCleared?: number;
  roomsCleared?: number;
  bossesDefeated?: number;
  maxFloor?: number;
  favoriteHero?: string;
  avatar: string;
  photoURL?: string;
  stats?: PlayerExtendedStats;
  matches?: MatchHistoryDoc[];
}

const CloudSyncManager = {
  saveAllProgress: async () => {
    try {
      await saveUserDataToCloud();
      console.log('[CloudSyncManager] Progress synchronized successfully.');
    } catch (e) {
      console.error('[CloudSyncManager] Failed to sync progress:', e);
    }
  }
};

function PhaserTextureImage({ textureKey, width, height, className }: { textureKey: string; width: number; height: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    const drawTexture = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const game = (window as any).phaserGame;
      if (!game) {
        if (active) setTimeout(drawTexture, 100);
        return;
      }

      const texture = game.textures.get(textureKey);
      if (texture && texture.key !== '__MISSING') {
        const source = texture.getSourceImage();
        if (source) {
          ctx.clearRect(0, 0, width, height);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(source, 0, 0, width, height);
          setLoaded(true);
          return;
        }
      }

      if (active) setTimeout(drawTexture, 100);
    };

    drawTexture();

    return () => {
      active = false;
    };
  }, [textureKey, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}
      style={{ imageRendering: 'pixelated', width: `${width}px`, height: `${height}px` }}
    />
  );
}

function PedestalShowcase({ heroKey }: { heroKey: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animId: number;
    let active = true;

    const render = () => {
      if (!active) return;
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(render);
        return;
      }

      const game = (window as any).phaserGame;
      if (!game) {
        animId = requestAnimationFrame(render);
        return;
      }

      const texture = game.textures.get(heroKey);
      if (texture && texture.key !== '__MISSING') {
        const source = texture.getSourceImage() as HTMLCanvasElement | HTMLImageElement;
        if (source) {
          const w = source.width || 48;
          const h = source.height || 56;

          // Normalized canvas bounds (target height 96px, with extra overhead headroom for bouncy jumps)
          const baseHeight = 96;
          const ratio = w / h;
          const baseWidth = Math.round(baseHeight * ratio);

          // Extra canvas headroom for smooth cartoon jump arc
          const canvasH = 120;
          const canvasW = Math.max(baseWidth * 1.3, 110);

          if (canvas.width !== canvasW || canvas.height !== canvasH) {
            canvas.width = canvasW;
            canvas.height = canvasH;
          }

          ctx.clearRect(0, 0, canvasW, canvasH);
          ctx.imageSmoothingEnabled = false;

          // Cartoon Animation Timeline (2000ms loop)
          const cycleDuration = 2000;
          const time = Date.now() % cycleDuration;
          const t = time / cycleDuration;

          let scaleX = 1.0;
          let scaleY = 1.0;
          let jumpY = 0;

          if (t < 0.18) {
            // 1. Gentle Squash Down (Anticipation / compression)
            const p = t / 0.18;
            const ease = Math.sin(p * Math.PI * 0.5);
            scaleY = 1.0 - ease * 0.16; // down to 0.84
            scaleX = 1.0 + ease * 0.14; // spreads to 1.14
            jumpY = 0;
          } else if (t < 0.44) {
            // 2. Launch & Stretch Up into small quick jump (Bouncy stretch arc)
            const p = (t - 0.18) / 0.26;
            const jumpArc = Math.sin(p * Math.PI);
            jumpY = -jumpArc * 14; // Jump up by 14px

            // Stretches tall at take-off, returns to normal at apex
            if (p < 0.5) {
              const stretchP = p / 0.5;
              scaleY = 0.84 + stretchP * 0.28; // up to 1.12
              scaleX = 1.14 - stretchP * 0.22; // narrow to 0.92
            } else {
              const relaxP = (p - 0.5) / 0.5;
              scaleY = 1.12 - relaxP * 0.12; // back to 1.0
              scaleX = 0.92 + relaxP * 0.08; // back to 1.0
            }
          } else if (t < 0.58) {
            // 3. Smooth Landing & Impact Squash
            const p = (t - 0.44) / 0.14;
            const landSquash = Math.sin(p * Math.PI);
            scaleY = 1.0 - landSquash * 0.14; // impact squash to 0.86
            scaleX = 1.0 + landSquash * 0.12; // spread to 1.12
            jumpY = 0;
          } else if (t < 0.72) {
            // 4. Elastic Rebound & Settling
            const p = (t - 0.58) / 0.14;
            const rebound = Math.sin(p * Math.PI);
            scaleY = 1.0 + rebound * 0.05; // slight upward pop
            scaleX = 1.0 - rebound * 0.04;
            jumpY = 0;
          } else {
            // 5. Subtle idle cartoon breathing before next bounce
            const p = (t - 0.72) / 0.28;
            const breath = Math.sin(p * Math.PI * 2);
            scaleY = 1.0 + breath * 0.02;
            scaleX = 1.0 - breath * 0.015;
            jumpY = 0;
          }

          // Anchor sprite so its feet touch the base ground line (y = canvasH - 6)
          const groundY = canvasH - 6;
          const dw = baseWidth * scaleX;
          const dh = baseHeight * scaleY;
          const dx = (canvasW - dw) / 2;
          const dy = groundY - dh + jumpY;

          ctx.drawImage(source, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      active = false;
      cancelAnimationFrame(animId);
    };
  }, [heroKey]);

  return (
    <div className="flex flex-col items-center justify-center select-none relative w-48 h-40">
      {/* Animated shadow ring below feet */}
      <div className="absolute bottom-1 w-24 h-5 bg-slate-900/60 border border-slate-700 rounded-full scale-y-[0.35] blur-sm animate-pulse" />
      {/* Levitating Pedestal */}
      <div className="absolute bottom-2 w-24 h-5 border-2 border-sky-500 bg-sky-950/40 rounded-full scale-y-[0.35] flex items-center justify-center shadow-lg animate-pulse" />
      {/* Bobbing Sprite Container */}
      <div className="absolute bottom-4 flex items-center justify-center animate-bounce">
        <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }} />
      </div>
    </div>
  );
}

function AvatarIcon({ id }: { id: string }) {
  if (id === 'avatar_sq_1' || id === 'char_grim') {
    return (
      <svg className="w-full h-full" viewBox="0 0 64 64">
        <rect width="64" height="64" fill="#0f172a" />
        <rect x="2" y="2" width="60" height="60" fill="none" stroke="#facc15" strokeWidth="2" />
        <rect x="16" y="14" width="32" height="38" fill="#1e293b" />
        <rect x="20" y="24" width="24" height="18" fill="#020617" />
        <rect x="24" y="28" width="6" height="5" fill="#ef4444" />
        <rect x="34" y="28" width="6" height="5" fill="#ef4444" />
        <rect x="26" y="29" width="2" height="2" fill="#ffffff" />
        <rect x="36" y="29" width="2" height="2" fill="#ffffff" />
      </svg>
    );
  }
  if (id === 'avatar_sq_2' || id === 'char_zaza') {
    return (
      <svg className="w-full h-full" viewBox="0 0 64 64">
        <rect width="64" height="64" fill="#051f12" />
        <rect x="2" y="2" width="60" height="60" fill="none" stroke="#22c55e" strokeWidth="2" />
        <rect x="16" y="14" width="32" height="38" fill="#14532d" />
        <rect x="20" y="24" width="24" height="18" fill="#052e16" />
        <rect x="24" y="28" width="6" height="5" fill="#4ade80" />
        <rect x="34" y="28" width="6" height="5" fill="#4ade80" />
        <circle cx="32" cy="12" r="4" fill="#84cc16" />
      </svg>
    );
  }
  if (id === 'avatar_sq_3' || id === 'char_bjorn') {
    return (
      <svg className="w-full h-full" viewBox="0 0 64 64">
        <rect width="64" height="64" fill="#1c0a0a" />
        <rect x="2" y="2" width="60" height="60" fill="none" stroke="#f97316" strokeWidth="2" />
        <rect x="10" y="10" width="6" height="16" fill="#fde047" />
        <rect x="48" y="10" width="6" height="16" fill="#fde047" />
        <rect x="16" y="14" width="32" height="38" fill="#7f1d1d" />
        <rect x="20" y="24" width="24" height="18" fill="#450a0a" />
        <rect x="24" y="28" width="6" height="5" fill="#facc15" />
        <rect x="34" y="28" width="6" height="5" fill="#facc15" />
      </svg>
    );
  }
  if (id === 'avatar_sq_4' || id === 'char_alrik') {
    return (
      <svg className="w-full h-full" viewBox="0 0 64 64">
        <rect width="64" height="64" fill="#081726" />
        <rect x="2" y="2" width="60" height="60" fill="none" stroke="#38bdf8" strokeWidth="2" />
        <rect x="16" y="14" width="32" height="38" fill="#1e3a8a" />
        <rect x="18" y="20" width="28" height="5" fill="#94a3b8" />
        <rect x="20" y="26" width="24" height="16" fill="#172554" />
        <rect x="24" y="28" width="6" height="5" fill="#38bdf8" />
        <rect x="34" y="28" width="6" height="5" fill="#38bdf8" />
      </svg>
    );
  }
  if (id === 'avatar_sq_5' || id === 'char_omen') {
    return (
      <svg className="w-full h-full" viewBox="0 0 64 64">
        <rect width="64" height="64" fill="#1c051d" />
        <rect x="2" y="2" width="60" height="60" fill="none" stroke="#c084fc" strokeWidth="2" />
        <polygon points="16,18 24,8 32,16 40,8 48,18" fill="#facc15" />
        <rect x="16" y="18" width="32" height="36" fill="#581c87" />
        <rect x="20" y="26" width="24" height="16" fill="#3b0764" />
        <rect x="24" y="28" width="6" height="5" fill="#f43f5e" />
        <rect x="34" y="28" width="6" height="5" fill="#f43f5e" />
      </svg>
    );
  }
  if (id === 'avatar_sq_8' || id === 'char_nihil') {
    return (
      <svg className="w-full h-full" viewBox="0 0 64 64">
        <rect width="64" height="64" fill="#020004" />
        <rect x="2" y="2" width="60" height="60" fill="none" stroke="#d8b4fe" strokeWidth="2" />
        <polygon points="32,6 26,18 38,18" fill="#d8b4fe" />
        <polygon points="18,12 14,24 24,20" fill="#c084fc" />
        <polygon points="46,12 50,24 40,20" fill="#c084fc" />
        <path d="M 16,22 L 48,22 L 48,52 L 16,52 Z" fill="#09090b" />
        <circle cx="32" cy="36" r="10" fill="#1e1035" />
        <circle cx="12" cy="40" r="4" fill="#a855f7" />
        <circle cx="52" cy="40" r="4" fill="#a855f7" />
      </svg>
    );
  }
  if (id === 'char_torf') {
    return (
      <svg className="w-full h-full" viewBox="0 0 64 64">
        <rect width="64" height="64" fill="#1e1b20" />
        <rect x="2" y="2" width="60" height="60" fill="none" stroke="#7c2d12" strokeWidth="2" />
        <rect x="12" y="14" width="40" height="38" fill="#78350f" />
        <rect x="18" y="24" width="28" height="18" fill="#451a03" />
        <rect x="22" y="28" width="6" height="5" fill="#fbbf24" />
        <rect x="36" y="28" width="6" height="5" fill="#fbbf24" />
      </svg>
    );
  }
  if (id === 'char_kraul') {
    return (
      <svg className="w-full h-full" viewBox="0 0 64 64">
        <rect width="64" height="64" fill="#0f051d" />
        <rect x="2" y="2" width="60" height="60" fill="none" stroke="#a855f7" strokeWidth="2" />
        <rect x="14" y="14" width="36" height="38" fill="#581c87" />
        <rect x="20" y="24" width="24" height="18" fill="#3b0764" />
        <circle cx="26" cy="30" r="3" fill="#a855f7" />
        <circle cx="38" cy="30" r="3" fill="#a855f7" />
      </svg>
    );
  }
  return (
    <svg className="w-full h-full" viewBox="0 0 64 64">
      <rect width="64" height="64" fill="#1e1b4b" />
      <rect x="2" y="2" width="60" height="60" fill="none" stroke="#c084fc" strokeWidth="2" />
      <polygon points="16,20 24,8 32,18 40,8 48,20" fill="#e879f9" />
      <rect x="14" y="20" width="36" height="38" fill="#0f051d" />
      <rect x="8" y="32" width="6" height="14" fill="#a855f7" />
      <rect x="50" y="32" width="6" height="14" fill="#a855f7" />
      <rect x="22" y="28" width="6" height="4" fill="#fae8ff" />
      <rect x="36" y="28" width="6" height="4" fill="#fae8ff" />
      <rect x="18" y="52" width="4" height="4" fill="#facc15" />
      <rect x="24" y="52" width="4" height="4" fill="#facc15" />
      <rect x="30" y="52" width="4" height="4" fill="#facc15" />
      <rect x="36" y="52" width="4" height="4" fill="#facc15" />
      <rect x="42" y="52" width="4" height="4" fill="#facc15" />
    </svg>
  );
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Profile Modal State
  const [showProfile, setShowProfile] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [userProfile, setUserProfile] = useState(getActiveUserProfile());
  const [authErrorMessage, setAuthErrorMessage] = useState('');

  // Invites State
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [inviteNotice, setInviteNotice] = useState('');

  // Public Profile Modal State
  const [publicProfile, setPublicProfile] = useState<PublicProfileData | null>(null);

  // Registration Modal State
  const [showNickModal, setShowNickModal] = useState(false);
  const [nickInput, setNickInput] = useState('');
  const [nickError, setNickError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Email & Password Auth State
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCheckNotice, setVerificationCheckNotice] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Hero Selection & Upgrade Modal State (100% Crisp HTML, no canvas blur!)
  const [showHeroSelect, setShowHeroSelect] = useState(false);
  const [selectedHeroId, setSelectedHeroId] = useState('char_zaza');
  const [economyState, setEconomyState] = useState({ rustySkulls: 0, voidShards: 0, upgradePoints: 0 });
  const [rosterState, setRosterState] = useState<any>({});
  const [heroMessageText, setHeroMessageText] = useState('');
  const [heroMessageColor, setHeroMessageColor] = useState('#4ade80');

  // Shop Modal State (100% Crisp HTML, matching Hero Select style!)
  const [showShop, setShowShop] = useState(false);
  const [shopTab, setShopTab] = useState<'chests' | 'roster'>('chests');
  const [shopMessageText, setShopMessageText] = useState('');
  const [shopMessageColor, setShopMessageColor] = useState('#4ade80');
  const [activeChestType, setActiveChestType] = useState<'coffin' | 'sarcophagus' | null>(null);

  // Profile & Public Inspection Tabs & Match History
  const [profileTab, setProfileTab] = useState<'stats' | 'history' | 'account'>('stats');
  const [publicProfileTab, setPublicProfileTab] = useState<'stats' | 'history'>('stats');
  const [profileMatches, setProfileMatches] = useState<MatchHistoryDoc[]>([]);
  const [extendedStats, setExtendedStats] = useState<PlayerExtendedStats>(MatchHistoryManager.loadLocalStats());
  const [publicProfileMatches, setPublicProfileMatches] = useState<MatchHistoryDoc[]>([]);
  const [friendActionStatus, setFriendActionStatus] = useState('');
  const [publicMsgInput, setPublicMsgInput] = useState('');
  const [showPublicMsgPrompt, setShowPublicMsgPrompt] = useState(false);
  const [publicMsgNotice, setPublicMsgNotice] = useState('');

  const squareAvatars = [
    { id: 'avatar_sq_1', label: 'Гром' },
    { id: 'avatar_sq_2', label: 'Заза' },
    { id: 'avatar_sq_3', label: 'Бьёрн' },
    { id: 'avatar_sq_4', label: 'Рыцарь' },
    { id: 'avatar_sq_5', label: 'Маг' },
    { id: 'avatar_sq_6', label: 'Следопыт' },
    { id: 'avatar_sq_7', label: 'Проклятый' },
    { id: 'avatar_sq_8', label: 'Властелин' }
  ];

  const rosterList = [
    'char_grim',
    'char_bjorn',
    'char_torf',
    'char_alrik',
    'char_kraul',
    'char_zaza',
    'char_omen',
    'char_nihil'
  ];

  useEffect(() => {
    const handleProfileUpdate = () => {
      setUserProfile(getActiveUserProfile());
    };
    window.addEventListener('profile_updated', handleProfileUpdate);

    const handlePublicProfile = async (e: CustomEvent<PublicProfileData>) => {
      if (e.detail) {
        setPublicProfile(e.detail);
        setPublicProfileTab('stats');
        setFriendActionStatus('');
        setPublicMsgNotice('');
        setShowPublicMsgPrompt(false);
        if (e.detail.uid) {
          const m = await MatchHistoryManager.fetchUserMatchHistory(e.detail.uid);
          setPublicProfileMatches(m);
        } else {
          setPublicProfileMatches([]);
        }
      }
    };
    window.addEventListener('open-public-profile' as any, handlePublicProfile as any);

    if (!containerRef.current || gameRef.current) return;

    // Initialize Phaser
    const game = createFranticGame('game-container');
    gameRef.current = game;
    (window as any).phaserGame = game;

    const onOpenProfile = async () => {
      setUserProfile(getActiveUserProfile());
      setAuthErrorMessage('');
      setProfileTab('stats');
      const stats = MatchHistoryManager.loadLocalStats();
      setExtendedStats(stats);
      const matches = await MatchHistoryManager.fetchUserMatchHistory();
      setProfileMatches(matches);
      setShowProfile(true);
    };

    const onOpenHeroSelect = () => {
      setEconomyState(loadEconomy());
      setRosterState(loadRoster());
      const saved = localStorage.getItem('fb_current_hero') || 'char_zaza';
      setSelectedHeroId(saved);
      setHeroMessageText('');
      setShowHeroSelect(true);
    };

    const onOpenShop = () => {
      setEconomyState(loadEconomy());
      setRosterState(loadRoster());
      setShopMessageText('');
      setShowShop(true);
    };

    const onTriggerLootbox = (data: { chestType: 'coffin' | 'sarcophagus' }) => {
      setActiveChestType(data.chestType);
    };
    gameRef.current.events.on('open-profile-modal', onOpenProfile);
    gameRef.current.events.on('open-hero-select-modal', onOpenHeroSelect);
    gameRef.current.events.on('open-shop-modal', onOpenShop);
    gameRef.current.events.on('trigger-lootbox-open', onTriggerLootbox);

    const onWindowLootbox = (e: any) => {
      if (e.detail?.chestType) {
        setActiveChestType(e.detail.chestType);
      }
    };
    window.addEventListener('trigger-lootbox-open' as any, onWindowLootbox);

    const handleWindowResize = () => {
      if (gameRef.current && gameRef.current.scale) {
        gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleWindowResize);
    const handleOrientationChange = () => {
      setTimeout(handleWindowResize, 150);
      setTimeout(handleWindowResize, 400);
    };
    window.addEventListener('orientationchange', handleOrientationChange);

    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(handleWindowResize, 100);
    };
    document.addEventListener('fullscreenchange', handleFsChange);

    return () => {
      window.removeEventListener('profile_updated', handleProfileUpdate);
      window.removeEventListener('open-public-profile' as any, handlePublicProfile as any);
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('trigger-lootbox-open' as any, onWindowLootbox);
      document.removeEventListener('fullscreenchange', handleFsChange);
      if (gameRef.current) {
        gameRef.current.events.off('open-profile-modal', onOpenProfile);
        gameRef.current.events.off('open-hero-select-modal', onOpenHeroSelect);
        gameRef.current.events.off('open-shop-modal', onOpenShop);
        gameRef.current.events.off('trigger-lootbox-open', onTriggerLootbox);
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const isAnyOpen = showHeroSelect || showShop || showProfile || showNickModal || showAvatarPicker || !!publicProfile || !!activeChestType;
    if (gameRef.current) {
      gameRef.current.events.emit(isAnyOpen ? 'modal-opened' : 'modal-closed');
    }
  }, [showHeroSelect, showShop, showProfile, showNickModal, showAvatarPicker, publicProfile, activeChestType]);

  const handleGoogleLogin = async () => {
    try {
      setNickError('');
      setAuthErrorMessage('');
      const res = await loginWithGoogle();
      if (res.needsRegistration) {
        setShowNickModal(true);
      } else {
        setUserProfile(getActiveUserProfile());
      }
    } catch (err: any) {
      console.error('[FIREBASE ERROR]:', err?.code, err?.message);
      setAuthErrorMessage(`Ошибка входа Google: ${err?.message || err}`);
    }
  };

  const handleEmailLogin = async () => {
    const email = authEmail.trim();
    const password = authPassword.trim();
    if (!email || !password) {
      setAuthErrorMessage('Заполните все поля (Email и пароль)!');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setAuthErrorMessage('Некорректный формат почты (нужен @ и домен)!');
      return;
    }
    try {
      setNickError('');
      setAuthErrorMessage('');
      setVerificationSent(false);
      setVerificationCheckNotice('');

      const res = await loginWithEmail(email, password);
      if (!res.user.emailVerified) {
        setVerificationSent(true);
        setAuthErrorMessage('Ваша почта еще не подтверждена! Пожалуйста, перейдите по ссылке из письма.');
        return;
      }

      if (res.needsRegistration) {
        setShowNickModal(true);
      } else {
        setUserProfile(getActiveUserProfile());
      }
    } catch (err: any) {
      console.error('[FIREBASE LOGIN ERROR]:', err?.code, err?.message);
      setAuthErrorMessage(getAuthErrorMessage(err));
    }
  };

  const handleEmailSignUp = async () => {
    const email = authEmail.trim();
    const password = authPassword.trim();
    if (!email || !password) {
      setAuthErrorMessage('Заполните все поля (Email и пароль)!');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setAuthErrorMessage('Некорректный формат почты (нужен @ и домен)!');
      return;
    }
    if (password.length < 6) {
      setAuthErrorMessage('Пароль должен быть не менее 6 символов!');
      return;
    }
    try {
      setNickError('');
      setAuthErrorMessage('');
      setVerificationCheckNotice('');
      
      await registerWithEmail(email, password);
      // Strictly require email verification before allowing nickname creation!
      setVerificationSent(true);
      setResendCooldown(30);
      setAuthErrorMessage('');
    } catch (err: any) {
      console.error('[FIREBASE SIGNUP ERROR]:', err?.code, err?.message);
      setAuthErrorMessage(getAuthErrorMessage(err));
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    try {
      await sendVerificationEmailAgain();
      setVerificationCheckNotice('✉ Письмо успешно отправлено повторно! Проверьте входящие и папку "Спам".');
      setResendCooldown(30);
    } catch (err: any) {
      setVerificationCheckNotice(getAuthErrorMessage(err));
    }
  };

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerifyCheck = async () => {
    setVerificationCheckNotice('');
    try {
      const updatedUser = await reloadAuthUser();
      if (updatedUser && updatedUser.emailVerified) {
        setVerificationSent(false);
        setAuthErrorMessage('');
        
        // Check if user has profile document in Firestore
        const userDocRef = doc(db, 'users', updatedUser.uid);
        const snap = await getDoc(userDocRef);

        if (!snap.exists()) {
          // Email confirmed! Now open Nickname modal to create character
          setShowNickModal(true);
        } else {
          // Existing profile, sync state
          const data = snap.data();
          if (data?.economy) saveEconomy(data.economy);
          if (data?.roster) saveRoster(data.roster);
          setUserProfile(getActiveUserProfile());
        }
      } else {
        setVerificationCheckNotice('Почта всё ещё не подтверждена! Пожалуйста, перейдите по ссылке в отправленном письме.');
      }
    } catch (err: any) {
      setVerificationCheckNotice(`Ошибка проверки: ${err?.message || err}`);
    }
  };

  const handleGoogleLogout = async () => {
    await logoutAccount();
    setVerificationSent(false);
    setVerificationCheckNotice('');
    setAuthEmail('');
    setAuthPassword('');
    setUserProfile(getActiveUserProfile());
  };

  const handleCreateNickname = async () => {
    if (!nickInput || nickInput.trim().length < 3 || nickInput.trim().length > 14) {
      setNickError('Никнейм должен содержать от 3 до 14 символов!');
      return;
    }
    setIsRegistering(true);
    setNickError('');

    try {
      const isFree = await checkNicknameUnique(nickInput.trim());
      if (!isFree) {
        setNickError('Этот никнейм уже занят!');
        setIsRegistering(false);
        return;
      }

      await registerNewUserAccount(nickInput.trim());
      setShowNickModal(false);
      setNickInput('');
      setUserProfile(getActiveUserProfile());
    } catch (err: any) {
      setNickError(err?.message || 'Ошибка регистрации никнейма');
    } finally {
      setIsRegistering(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const showHeroMessage = (msg: string, color: string) => {
    setHeroMessageText(msg);
    setHeroMessageColor(color);
  };

  const currentHero = HEROES[selectedHeroId] || HEROES.char_zaza;
  const currentCanonConfig = CANONICAL_ROSTER[selectedHeroId] || CANONICAL_ROSTER.char_zaza;
  const currentRosterState = rosterState[selectedHeroId] || { unlocked: false, level: 1 };
  const isAlreadyActive = selectedHeroId === (localStorage.getItem('fb_current_hero') || 'char_zaza');

  const maxHpRef = 1600;
  const hpPct = Math.min(100, Math.round((currentHero.hp / maxHpRef) * 100));
  const dmgPct = Math.min(100, Math.round((currentHero.hp / maxHpRef) * 90));

  const upgradeCostVal = getHeroUpgradeCost(currentRosterState.level);
  const canLevelUpRight = currentRosterState.unlocked && currentRosterState.level < 10;

  const skillsDescMap: Record<string, string[]> = {
    char_grim: [
      'Колбы: Алхимический взрыв снаряда с токсичным облаком.',
      'Смола: Бомба, замедляющая противников в зоне взрыва.',
      'Ульт: Телепортация с невидимостью и критическим уроном.'
    ],
    char_bjorn: [
      'Секира: Тяжелый круговой удар секирой по области.',
      'Земля: Трещина в земле, оглушающая врагов в линии.',
      'Ульт: Берсерк-бафф: +50% к скорости и похищение жизни.'
    ],
    char_torf: [
      'Кулаки: Сокрушительные АОЕ удары каменными кулаками.',
      'Валун: Швыряет тяжелый камень, оглушающий противников.',
      'Ульт: Барьер, полностью поглощающий урон на 6 сек.'
    ],
    char_alrik: [
      'Выпад: Длинный пробивающий выпад копьем вперед.',
      'Рывок: Быстрый рывок со щитом, отбрасывающий врагов.',
      'Ульт: Создает защитную ауру, снижающую урон на 40%.'
    ],
    char_kraul: [
      'Плети: Быстрая длинная атака плетьми-щупальцами.',
      'Рывок: Телепорт за спину цели с нанесением яда.',
      'Ульт: Призывает воронку, стягивающую всех врагов.'
    ],
    char_zaza: [
      'Укус: Быстрый укус вблизи с отравлением на 3 сек.',
      'Плевок: Запуск сгустка кислоты с токсичной лужей.',
      'Ульт: Трансформация в танка со сверхвысоким здоровьем.'
    ],
    char_omen: [
      'Перья: Скоростной обстрел режущими теневыми перьями.',
      'Вихрь: Создает бурю, наносящую урон по области.',
      'Ульт: Взмывает в воздух и совершает таранный пике-удар.'
    ],
    char_nihil: [
      'Серп: Пробивающий спектральный снаряд (85 урона).',
      'Сингулярность: Черная дыра, стягивающая врагов к центру.',
      'Ульт: Три клинка вонзаются с неба (380 урона, оглушение).'
    ]
  };

  const passiveDescMap: Record<string, string> = {
    char_grim: '«Теневая Алхимия» — Смоляные колбы оставляют ловушки, замедляющие врагов.',
    char_bjorn: '«Северная Ярость» — При низком HP урон увеличивается на +30%.',
    char_torf: '«Каменный Монолит» — Невосприимчивость к отбросу и +15% брони.',
    char_alrik: '«Длинный Размах» — Копье бьет на +50% дальше и пробивает ряды врагов.',
    char_kraul: '«Жажда Крови» — Восстанавливает 15% HP от урона плетью.',
    char_zaza: '«Токсичная Аура» — Наносит урон ядом всем врагам вблизи.',
    char_omen: '«Призрачный Полет» — Парит над землей со скоростью +10%.',
    char_nihil: '«Левитация Бездны» — Парит над препятствиями, скорость бега 220.'
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05070a] font-mono select-none">
      {/* Phaser Canvas Container */}
      <div id="game-container" ref={containerRef} className="w-full h-full absolute inset-0" />

      {/* 100% CRISP HTML/CSS HERO SELECT MODAL */}
      {showHeroSelect && (
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150"
        >
          <div className="bg-[#18201a] border-4 border-[#4ade80] outline outline-2 outline-[#14532d] outline-offset-[-6px] p-5 max-w-4xl w-full shadow-2xl rounded-none text-white max-h-[95vh] overflow-y-auto relative flex flex-col">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-emerald-800 mb-4 shrink-0 gap-2">
              <span className="text-[#facc15] font-bold text-xs sm:text-sm tracking-wider whitespace-nowrap">✦ ВЫБОР И ПРОКАЧКА БОЙЦА ✦</span>
              <div className="flex items-center gap-3 shrink-0">
                {/* Compact Player Balances on the same line */}
                <div className="flex items-center gap-2 bg-slate-950/80 border border-emerald-950 px-2 py-1 text-[10px] font-mono tracking-tight font-bold select-none whitespace-nowrap">
                  <span className="flex items-center gap-0.5"><span className="text-amber-400">💀</span> {economyState.rustySkulls}</span>
                  <span className="text-emerald-800">·</span>
                  <span className="flex items-center gap-0.5"><span className="text-purple-400">🔮</span> {economyState.voidShards}</span>
                  <span className="text-emerald-800">·</span>
                  <span className="flex items-center gap-0.5"><span className="text-sky-400">⚡</span> {economyState.upgradePoints}</span>
                </div>
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setShowHeroSelect(false);
                    if (gameRef.current) {
                      gameRef.current.events.emit('close-hero-select-modal');
                    }
                  }}
                  className="text-red-400 hover:text-red-300 font-bold text-sm px-2 cursor-pointer transition-transform active:scale-95 shrink-0 whitespace-nowrap"
                >
                  [✕]
                </button>
              </div>
            </div>

            {/* Status notification banner inside modal */}
            {heroMessageText && (
              <div
                className="text-xs font-bold p-2 mb-3 border text-center animate-in fade-in shrink-0"
                style={{ color: heroMessageColor, backgroundColor: 'rgba(0,0,0,0.5)', borderColor: heroMessageColor }}
              >
                {heroMessageText}
              </div>
            )}

            {/* Main Columns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 overflow-y-auto">
              
              {/* Left Column: Heroes Roster List with scrolling */}
              <div className="md:col-span-3 flex flex-col min-w-0">
                <h4 className="text-sky-400 font-bold text-xs mb-2 text-center uppercase tracking-wide shrink-0">👥 РОСТЕР</h4>
                
                {/* Visual scroll container */}
                <div className="space-y-1.5 overflow-y-auto max-h-[350px] pr-1 scrollbar-thin scrollbar-thumb-amber-500 scrollbar-track-slate-900">
                  {rosterList.map((heroId) => {
                    const hero = HEROES[heroId];
                    const config = CANONICAL_ROSTER[heroId];
                    const rState = rosterState[heroId] || { unlocked: false, level: 1 };
                    const isSelected = heroId === selectedHeroId;
                    const isActive = heroId === (localStorage.getItem('fb_current_hero') || 'char_zaza');

                    let borderClass = 'border-slate-700 hover:border-slate-500';
                    if (config.rarity === 'РЕДКИЙ') borderClass = 'border-sky-500 hover:border-sky-400';
                    else if (config.rarity === 'ЭПИЧЕСКИЙ') borderClass = 'border-purple-500 hover:border-purple-400';
                    else if (config.rarity === 'МИФИЧЕСКИЙ') borderClass = 'border-red-500 hover:border-red-400';
                    if (isSelected) borderClass = 'border-amber-400';

                    return (
                      <button
                        key={heroId}
                        onClick={() => {
                          soundEngine.playClick();
                          setSelectedHeroId(heroId);
                        }}
                        className={`w-full text-left p-2 border-2 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 rounded-none ${
                          isSelected ? 'bg-slate-800' : 'bg-slate-900/60'
                        } ${borderClass} ${!rState.unlocked ? 'opacity-70' : ''}`}
                      >
                        <div className="w-8 h-8 border border-slate-700 bg-slate-950 flex items-center justify-center shrink-0 overflow-hidden p-0.5">
                          <PhaserTextureImage textureKey={hero.texture} width={28} height={28} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-bold truncate ${isSelected ? 'text-[#facc15]' : 'text-white'}`}>
                            {hero.name.split(' ')[0]}
                          </div>
                          <div className={`text-[10px] ${rState.unlocked ? 'text-emerald-400' : 'text-red-400'}`}>
                            {rState.unlocked ? `Ур. ${rState.level}` : `🔒 Закрыт`}
                          </div>
                        </div>
                        {isActive && <span className="text-amber-400 font-bold text-xs shrink-0">★</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Center Column: Model showcase, pedestal and primary unlock/combat select */}
              <div className="md:col-span-5 flex flex-col items-center bg-slate-950/40 p-4 border border-emerald-950/60 min-w-0 justify-between">
                <div className="text-center">
                  <h3 className="font-bold text-sm tracking-wider" style={{ color: currentCanonConfig.colorHex }}>
                    {currentHero.name.toUpperCase()}
                  </h3>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">{currentCanonConfig.rarity}</div>
                </div>

                {/* Pedestal and Avatar with continuous bouncing effect */}
                <div className="my-2 select-none relative flex justify-center items-center shrink-0">
                  <PedestalShowcase heroKey={selectedHeroId} />
                  {!currentRosterState.unlocked && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 flex items-center justify-center text-4xl w-20 h-20 rounded-full z-10 border border-red-500/40 select-none pointer-events-none">
                      🔒
                    </div>
                  )}
                </div>

                {/* Progress bar container */}
                <div className="w-full text-center mb-4 shrink-0">
                  <div className="text-xs font-bold text-slate-300 mb-1">
                    УРОВЕНЬ БОЙЦА: {currentRosterState.level} / 10
                  </div>
                  <div className="w-full bg-slate-900 border border-slate-700 h-3 p-0.5 rounded-none overflow-hidden relative">
                    <div
                      className="bg-emerald-500 h-full rounded-none transition-[width] duration-500 ease-out"
                      style={{ width: `${currentRosterState.level * 10}%`, transition: 'width 0.45s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    />
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-1 font-bold">
                    Бонус характеристик: +{Math.round((getHeroStatMultipliers(currentRosterState.level).hpMult - 1) * 100)}% ОЗ / ОУ
                  </div>
                </div>

                {/* Primary Button options */}
                <div className="w-full shrink-0">
                  {currentRosterState.unlocked ? (
                    <button
                      disabled={isAlreadyActive}
                      onClick={() => {
                        soundEngine.playLevelUp();
                        localStorage.setItem('fb_current_hero', selectedHeroId);
                        window.dispatchEvent(new CustomEvent('hero_selected', { detail: { heroKey: selectedHeroId } }));
                        setRosterState(loadRoster()); // trigger update
                        showHeroMessage(`⚔️ ${currentHero.name} готов к битве!`, '#facc15');
                        CloudSyncManager.saveAllProgress();
                      }}
                      className={`w-full py-2 font-bold text-xs border cursor-pointer transition-all hover:scale-[1.01] active:scale-95 rounded-none ${
                        isAlreadyActive
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400 cursor-default'
                          : 'bg-amber-600 hover:bg-amber-500 border-amber-400 text-white shadow-md'
                      }`}
                    >
                      {isAlreadyActive ? '▶ БОЕЦ ВЫБРАН В ОТРЯД ✓' : '⚔️ ВЫБРАТЬ БОЙЦА В ОТРЯД'}
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={async () => {
                          soundEngine.playClick();
                          const res = buyHeroFromShop(selectedHeroId, 'skulls');
                          if (res.success) {
                            soundEngine.playLevelUp();
                            showHeroMessage(`🎉 ${res.message}`, '#4ade80');
                            await CloudSyncManager.saveAllProgress();
                            setRosterState(loadRoster());
                            setEconomyState(loadEconomy());
                          } else {
                            showHeroMessage(`⚠ ${res.message}`, '#ef4444');
                          }
                        }}
                        className="py-1.5 px-1 bg-amber-700 hover:bg-amber-600 border border-amber-400 text-white font-bold text-[10px] cursor-pointer transition-all active:scale-95 text-center flex flex-col justify-center items-center rounded-none"
                      >
                        <span>РАЗБЛОКИРОВАТЬ</span>
                        <span className="text-amber-300 mt-0.5">{currentCanonConfig.costSkulls} 💀</span>
                      </button>

                      <button
                        onClick={async () => {
                          soundEngine.playClick();
                          const res = buyHeroFromShop(selectedHeroId, 'shards');
                          if (res.success) {
                            soundEngine.playLevelUp();
                            showHeroMessage(`🎉 ${res.message}`, '#4ade80');
                            await CloudSyncManager.saveAllProgress();
                            setRosterState(loadRoster());
                            setEconomyState(loadEconomy());
                          } else {
                            showHeroMessage(`⚠ ${res.message}`, '#ef4444');
                          }
                        }}
                        className="py-1.5 px-1 bg-purple-700 hover:bg-purple-600 border border-purple-400 text-white font-bold text-[10px] cursor-pointer transition-all active:scale-95 text-center flex flex-col justify-center items-center rounded-none"
                      >
                        <span>РАЗБЛОКИРОВАТЬ</span>
                        <span className="text-purple-300 mt-0.5">{currentCanonConfig.costShards} 💎</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: HP/Damage Stats and 4 formatted cards */}
              <div className="md:col-span-4 flex flex-col min-w-0">
                <h4 className="text-[#facc15] font-bold text-xs mb-2 text-center uppercase tracking-wide shrink-0">📊 ХАРАКТЕРИСТИКИ</h4>
                
                {/* Stats and level up block */}
                <div className="bg-slate-950/60 p-2 border border-slate-800 space-y-2 mb-3 shrink-0">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-emerald-400">Здоровье {hpPct}%</span>
                    <div className="w-24 bg-slate-900 border border-slate-700 h-2.5 rounded-none overflow-hidden shrink-0 relative">
                      <div className="bg-emerald-500 h-full transition-[width] duration-500 ease-out" style={{ width: `${hpPct}%`, transition: 'width 0.45s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-red-400">Урон {dmgPct}%</span>
                    <div className="w-24 bg-slate-900 border border-slate-700 h-2.5 rounded-none overflow-hidden shrink-0 relative">
                      <div className="bg-red-500 h-full transition-[width] duration-500 ease-out" style={{ width: `${dmgPct}%`, transition: 'width 0.45s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                    </div>
                  </div>

                  <button
                    disabled={!canLevelUpRight}
                    onClick={async () => {
                      soundEngine.playClick();
                      const res = levelUpHero(selectedHeroId);
                      if (res.success) {
                        soundEngine.playLevelUp();
                        showHeroMessage(`✅ ${res.message}`, '#4ade80');
                        await CloudSyncManager.saveAllProgress();
                        setRosterState(loadRoster());
                        setEconomyState(loadEconomy());
                      } else {
                        showHeroMessage(`⚠ ${res.message}`, '#ef4444');
                      }
                    }}
                    className={`w-full py-1.5 font-bold text-[9px] border cursor-pointer mt-1.5 transition-all active:scale-95 rounded-none ${
                      !currentRosterState.unlocked
                        ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                        : (canLevelUpRight
                          ? 'bg-sky-700 hover:bg-sky-600 border-sky-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 cursor-default')
                    }`}
                  >
                    {!currentRosterState.unlocked
                      ? '🔒 ТРЕБУЕТСЯ РАЗБЛОКИРОВКА'
                      : (canLevelUpRight
                        ? `⚡ УЛУЧШИТЬ ДО LVL ${currentRosterState.level + 1} (${upgradeCostVal.upgradePts}⚡, ${upgradeCostVal.skulls}💀)`
                        : '★ МАКСИМАЛЬНЫЙ УРОВЕНЬ ★')}
                  </button>
                </div>

                {/* 3 Active Skill Cards + 1 Passive (Strict 2-lines max description layout) */}
                <div className="space-y-2 overflow-y-auto pr-1">
                  {currentHero.skills.map((sk, idx) => {
                    const isUlt = idx === 2;
                    const strokeClass = isUlt ? 'border-amber-500' : 'border-[#38bdf8]';
                    const nameColorClass = isUlt ? 'text-amber-300' : 'text-sky-300';
                    const displayDesc = (skillsDescMap[selectedHeroId] && skillsDescMap[selectedHeroId][idx]) || sk.desc;

                    return (
                      <div key={idx} className={`bg-slate-900/90 border p-2 flex gap-2 items-start rounded-none ${strokeClass}`}>
                        <div className={`w-8 h-8 flex items-center justify-center shrink-0 border p-0.5 ${isUlt ? 'border-amber-500 bg-red-950/40' : 'border-sky-500 bg-sky-950/40'}`}>
                          <PhaserTextureImage textureKey={sk.icon} width={24} height={24} />
                        </div>
                        <div className="min-w-0 flex-1 leading-tight">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className={nameColorClass}>{isUlt ? '🔥 УЛЬТА' : '⚡ НАВЫК'}: {sk.name}</span>
                            <span className="text-slate-400 shrink-0 text-[10px]">КД: {sk.cooldown}с</span>
                          </div>
                          <p className="text-[10px] text-slate-300 leading-tight mt-0.5 line-clamp-2">
                            {displayDesc}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Passive Card */}
                  <div className="bg-[#131d31]/80 border border-purple-500 p-2 flex gap-2 items-start rounded-none">
                    <div className="w-6 h-6 flex items-center justify-center shrink-0 border border-purple-500 bg-purple-950/40 text-xs font-bold">
                      ✦
                    </div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="text-[11px] font-bold text-purple-300">ПАССИВНЫЙ НАВЫК</div>
                      <p className="text-[10px] text-slate-300 leading-tight mt-0.5 line-clamp-2">
                        {passiveDescMap[selectedHeroId] || currentHero.style}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* 100% CRISP HTML/CSS SHOP MODAL */}
      {showShop && (
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150"
        >
          <div className="bg-[#18201a] border-4 border-[#facc15] outline outline-2 outline-[#854d0e] outline-offset-[-6px] p-5 max-w-4xl w-full shadow-2xl rounded-none text-white max-h-[95vh] overflow-y-auto relative flex flex-col">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-amber-800 mb-4 shrink-0 gap-2">
              <span className="text-[#facc15] font-bold text-xs sm:text-sm tracking-wider whitespace-nowrap">🛒 МАГАЗИН АРЕНЫ</span>
              <div className="flex items-center gap-3 shrink-0">
                {/* Compact Player Balances on the same line */}
                <div className="flex items-center gap-2 bg-slate-950/80 border border-amber-950 px-2 py-1 text-[10px] font-mono tracking-tight font-bold select-none whitespace-nowrap">
                  <span className="flex items-center gap-0.5"><span className="text-amber-400">💀</span> {economyState.rustySkulls}</span>
                  <span className="text-amber-800">·</span>
                  <span className="flex items-center gap-0.5"><span className="text-purple-400">🔮</span> {economyState.voidShards}</span>
                  <span className="text-amber-800">·</span>
                  <span className="flex items-center gap-0.5"><span className="text-sky-400">⚡</span> {economyState.upgradePoints}</span>
                </div>
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setShowShop(false);
                    if (gameRef.current) {
                      gameRef.current.events.emit('close-shop-modal');
                    }
                  }}
                  className="text-red-400 hover:text-red-300 font-bold text-sm px-2 cursor-pointer transition-transform active:scale-95 shrink-0 whitespace-nowrap"
                >
                  [✕]
                </button>
              </div>
            </div>

            {/* Tab controls */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-none mb-4 shrink-0">
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setShopTab('chests');
                }}
                className={`flex-1 py-2 text-xs font-bold transition-colors cursor-pointer rounded-none text-center ${
                  shopTab === 'chests'
                    ? 'bg-[#1e293b] text-[#fef08a] border border-[#facc15]'
                    : 'bg-[#0f172a] text-[#94a3b8] border border-transparent hover:bg-[#1e293b]'
                }`}
              >
                📦 СУНДУКИ
              </button>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setShopTab('roster');
                }}
                className={`flex-1 py-2 text-xs font-bold transition-colors cursor-pointer rounded-none text-center ${
                  shopTab === 'roster'
                    ? 'bg-[#1e293b] text-[#fef08a] border border-[#facc15]'
                    : 'bg-[#0f172a] text-[#94a3b8] border border-transparent hover:bg-[#1e293b]'
                }`}
              >
                ⚔️ БОЙЦЫ И УРОВНИ
              </button>
            </div>

            {/* Shop Message Notification Banner */}
            {shopMessageText && (
              <div
                className="text-xs font-bold p-2 mb-4 border text-center animate-in fade-in shrink-0"
                style={{ color: shopMessageColor, backgroundColor: 'rgba(0,0,0,0.5)', borderColor: shopMessageColor }}
              >
                {shopMessageText}
              </div>
            )}

            {/* Tab Content rendering */}
            <div className="overflow-y-auto">
              {shopTab === 'chests' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Old Coffin */}
                  <div className="bg-[#180e08]/90 border-2 border-amber-700/80 p-4 flex flex-col items-center justify-between min-h-[300px]">
                    <div className="text-center">
                      <h4 className="text-[#facc15] font-bold text-sm tracking-wide">СКАРБ: СТАРЫЙ ГРОБ</h4>
                      <p className="text-[10px] text-amber-500/80 mt-0.5 font-bold uppercase tracking-widest">[ ОБЫЧНЫЙ ]</p>
                    </div>

                    <div className="my-3 flex items-center justify-center bg-slate-950/40 p-2 border border-amber-950/40">
                      <PhaserTextureImage textureKey="chest_coffin" width={48} height={48} />
                    </div>

                    <div className="text-center text-xs text-slate-300 space-y-1 mb-4 leading-tight">
                      <p className="font-bold text-amber-100">Содержит 2 случайные награды:</p>
                      <p>• 15–30 Очков прокачки ⚡</p>
                      <p>• 40–90 Черепов 💀 (шанс 70%)</p>
                      <p>• 1 Осколок пустоты 🔮 (шанс 5%)</p>
                    </div>

                    <button
                      onClick={async () => {
                        soundEngine.playClick();
                        const currentEcon = loadEconomy();
                        if (currentEcon.rustySkulls < 300) {
                          setShopMessageText('Недостаточно ржавых черепов! Нужно 300 💀');
                          setShopMessageColor('#ef4444');
                          return;
                        }
                        // Deduct skulls and save
                        currentEcon.rustySkulls -= 300;
                        saveEconomy(currentEcon);
                        try { saveUserDataToCloud(); } catch (e) {}
                        
                        // Close Shop and open gorgeous React LootboxModal!
                        setShowShop(false);
                        setActiveChestType('coffin');
                        if (gameRef.current) {
                          gameRef.current.events.emit('trigger-lootbox-open', { chestType: 'coffin' });
                        }
                      }}
                      className="w-full py-2 bg-amber-700 hover:bg-amber-600 border border-amber-400 text-white font-bold text-xs cursor-pointer transition-all active:scale-95 text-center shadow-lg"
                    >
                      КУПИТЬ ЗА 300 💀
                    </button>
                  </div>

                  {/* Heroic Sarcophagus */}
                  <div className="bg-[#2e1065]/90 border-2 border-purple-600 p-4 flex flex-col items-center justify-between min-h-[300px]">
                    <div className="text-center">
                      <h4 className="text-purple-300 font-bold text-sm tracking-wide">ГЕРОИЧЕСКИЙ САРКОФАГ</h4>
                      <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">[ ЭПИЧЕСКИЙ ]</p>
                    </div>

                    <div className="my-3 flex items-center justify-center bg-slate-950/40 p-2 border border-purple-950/40">
                      <PhaserTextureImage textureKey="chest_sarcophagus" width={48} height={48} />
                    </div>

                    <div className="text-center text-xs text-slate-300 space-y-1 mb-4 leading-tight">
                      <p className="font-bold text-purple-200">Содержит 3 ценные награды:</p>
                      <p>• 50–100 Очков прокачки ⚡</p>
                      <p>• 200–450 Черепов 💀</p>
                      <p className="text-amber-300 font-bold">★ 15% ШАНС НА НОВОГО БОЙЦА!</p>
                      <p className="text-[9px] text-slate-400">(Торф, Аларик, Крал, Заза, Омен)</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 w-full">
                      <button
                        onClick={async () => {
                          soundEngine.playClick();
                          const currentEcon = loadEconomy();
                          if (currentEcon.rustySkulls < 1500) {
                            setShopMessageText('Недостаточно ржавых черепов! Нужно 1500 💀');
                            setShopMessageColor('#ef4444');
                            return;
                          }
                          currentEcon.rustySkulls -= 1500;
                          saveEconomy(currentEcon);
                          try { saveUserDataToCloud(); } catch (e) {}
                          
                          setShowShop(false);
                          setActiveChestType('sarcophagus');
                          if (gameRef.current) {
                            gameRef.current.events.emit('trigger-lootbox-open', { chestType: 'sarcophagus' });
                          }
                        }}
                        className="py-2 bg-purple-700 hover:bg-purple-600 border border-purple-400 text-white font-bold text-xs cursor-pointer transition-all active:scale-95 text-center shadow-md flex flex-col items-center justify-center gap-0.5"
                      >
                        <span>КУПИТЬ ЗА</span>
                        <span className="text-yellow-300">1500 💀</span>
                      </button>

                      <button
                        onClick={async () => {
                          soundEngine.playClick();
                          const currentEcon = loadEconomy();
                          if (currentEcon.voidShards < 5) {
                            setShopMessageText('Недостаточно осколков пустоты! Нужно 5 🔮');
                            setShopMessageColor('#ef4444');
                            return;
                          }
                          currentEcon.voidShards -= 5;
                          saveEconomy(currentEcon);
                          try { saveUserDataToCloud(); } catch (e) {}
                          
                          setShowShop(false);
                          setActiveChestType('sarcophagus');
                          if (gameRef.current) {
                            gameRef.current.events.emit('trigger-lootbox-open', { chestType: 'sarcophagus' });
                          }
                        }}
                        className="py-2 bg-indigo-800 hover:bg-indigo-700 border border-indigo-400 text-white font-bold text-xs cursor-pointer transition-all active:scale-95 text-center shadow-md flex flex-col items-center justify-center gap-0.5"
                      >
                        <span>КУПИТЬ ЗА</span>
                        <span className="text-cyan-300">5 🔮</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Fighters level up list in Shop tab */
                <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1 scrollbar-thin">
                  {rosterList.map((heroId) => {
                    const hero = HEROES[heroId];
                    const config = CANONICAL_ROSTER[heroId];
                    const rState = rosterState[heroId] || { unlocked: false, level: 1 };
                    const cost = getHeroUpgradeCost(rState.level);

                    let borderClass = 'border-slate-800';
                    if (config.rarity === 'РЕДКИЙ') borderClass = 'border-sky-800/80';
                    else if (config.rarity === 'ЭПИЧЕСКИЙ') borderClass = 'border-purple-800/80';
                    else if (config.rarity === 'МИФИЧЕСКИЙ') borderClass = 'border-red-800/80';

                    return (
                      <div
                        key={heroId}
                        className={`p-3 bg-slate-900/90 border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-none ${borderClass}`}
                      >
                        {/* Left: Avatar & Basic Details */}
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-slate-950 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 p-0.5">
                            <PhaserTextureImage textureKey={hero.texture} width={40} height={40} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm" style={{ color: config.colorHex }}>
                                {hero.name}
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                {config.rarity}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-300 truncate">{hero.title}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className={`text-[10px] font-bold ${rState.unlocked ? 'text-emerald-400' : 'text-red-400'}`}>
                                {rState.unlocked ? `Уровень ${rState.level} / 10` : '🔒 Заблокирован'}
                              </span>
                              {rState.unlocked && (
                                <span className="text-[9px] text-slate-400">
                                  (+{Math.round((getHeroStatMultipliers(rState.level).hpMult - 1) * 100)}% ОЗ / АТК)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="shrink-0 flex items-center">
                          {rState.unlocked ? (
                            rState.level < 10 ? (
                              <button
                                onClick={async () => {
                                  soundEngine.playClick();
                                  const res = levelUpHero(heroId);
                                  if (res.success) {
                                    soundEngine.playLevelUp();
                                    setShopMessageText(`✅ ${res.message}`);
                                    setShopMessageColor('#4ade80');
                                    await CloudSyncManager.saveAllProgress();
                                    setRosterState(loadRoster());
                                    setEconomyState(loadEconomy());
                                  } else {
                                    setShopMessageText(`⚠ ${res.message}`);
                                    setShopMessageColor('#ef4444');
                                  }
                                }}
                                className="py-2 px-3 bg-emerald-700 hover:bg-emerald-600 border border-emerald-400 text-white font-bold text-[10px] cursor-pointer transition-all active:scale-95"
                              >
                                УЛУЧШИТЬ ДО LVL {rState.level + 1} ({cost.upgradePts}⚡ · {cost.skulls}💀)
                              </button>
                            ) : (
                              <span className="text-[#facc15] font-bold text-xs uppercase tracking-widest border border-amber-500/30 px-3 py-1.5 bg-amber-950/20">
                                ★ МАКСИМУМ ★
                              </span>
                            )
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={async () => {
                                  soundEngine.playClick();
                                  const res = buyHeroFromShop(heroId, 'skulls');
                                  if (res.success) {
                                    soundEngine.playLevelUp();
                                    setShopMessageText(`🎉 ${res.message}`);
                                    setShopMessageColor('#4ade80');
                                    await CloudSyncManager.saveAllProgress();
                                    setRosterState(loadRoster());
                                    setEconomyState(loadEconomy());
                                  } else {
                                    setShopMessageText(`⚠ ${res.message}`);
                                    setShopMessageColor('#ef4444');
                                  }
                                }}
                                className="py-1.5 px-2 bg-amber-700 hover:bg-amber-600 border border-amber-400 text-white font-bold text-[9px] cursor-pointer flex flex-col justify-center items-center"
                              >
                                <span>КУПИТЬ ЗА</span>
                                <span className="text-amber-200 font-bold">{config.costSkulls} 💀</span>
                              </button>

                              <button
                                onClick={async () => {
                                  soundEngine.playClick();
                                  const res = buyHeroFromShop(heroId, 'shards');
                                  if (res.success) {
                                    soundEngine.playLevelUp();
                                    setShopMessageText(`🎉 ${res.message}`);
                                    setShopMessageColor('#4ade80');
                                    await CloudSyncManager.saveAllProgress();
                                    setRosterState(loadRoster());
                                    setEconomyState(loadEconomy());
                                  } else {
                                    setShopMessageText(`⚠ ${res.message}`);
                                    setShopMessageColor('#ef4444');
                                  }
                                }}
                                className="py-1.5 px-2 bg-purple-700 hover:bg-purple-600 border border-purple-400 text-white font-bold text-[9px] cursor-pointer flex flex-col justify-center items-center"
                              >
                                <span>КУПИТЬ ЗА</span>
                                <span className="text-purple-200 font-bold">{config.costShards} 🔮</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* FULL EDITABLE PROFILE MODAL (100% CRISP HTML/CSS) */}
      {showProfile && (
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none font-mono"
        >
          <div className="bg-[#090d16] border-4 border-[#38bdf8] outline outline-2 outline-[#0369a1] outline-offset-[-6px] shadow-[0_0_0_4px_#000,0_12px_35px_rgba(0,0,0,0.95)] p-4 max-w-[620px] w-full text-white max-h-[90vh] flex flex-col relative box-border overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b-2 border-[#38bdf8]/40 mb-3 shrink-0">
              <span className="text-[#38bdf8] font-bold text-xs sm:text-sm tracking-wider uppercase">✦ ПРОФИЛЬ АВАНТЮРИСТА ✦</span>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setShowProfile(false);
                }}
                className="text-red-400 hover:text-red-300 active:scale-95 font-bold text-xs sm:text-sm px-2 py-0.5 border border-red-500/40 bg-red-950/40 hover:bg-red-900/60 cursor-pointer transition-colors"
                title="Закрыть"
              >
                [✕]
              </button>
            </div>

            {/* Top User Summary Card */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-[#0d1424] p-2.5 border border-slate-800 shrink-0 mb-3">
              <div className="w-13 h-13 bg-[#020617] border-2 border-[#38bdf8] flex items-center justify-center overflow-hidden shrink-0">
                {userProfile.photoURL ? (
                  <img src={userProfile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <AvatarIcon id={userProfile.avatar || 'avatar_sq_1'} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                  <span>{userProfile.nickname}</span>
                  <span className="text-[10.5px] text-slate-400 font-normal">
                    {userProfile.nickname.includes('#') ? '' : '#1001'}
                  </span>
                </div>
                <div className="text-xs text-[#facc15] font-bold mt-0.5">
                  ★ {userProfile.rank || 'Бродяга'} [{userProfile.rating || extendedStats.rating || 1000} MMR]
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">🟢 В сети</span>
                  <span>•</span>
                  <span>{userProfile.isGoogle ? '🌐 Google Облако ✓' : '🎮 Локальный Гость'}</span>
                </div>
              </div>

              {/* Copy My Code Button */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  const code = `REV-${userProfile.nickname.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'HOST'}`;
                  navigator.clipboard.writeText(code);
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 2000);
                }}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-sky-400 border border-sky-500/40 text-[11px] font-bold cursor-pointer flex items-center gap-1 shrink-0 transition-colors"
              >
                {copySuccess ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
                <span>{copySuccess ? 'СКОПИРОВАНО' : 'МОЙ КОД'}</span>
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-3 gap-1 mb-3 shrink-0 text-xs">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setProfileTab('stats');
                }}
                className={`py-1.5 font-bold border transition-colors cursor-pointer text-center ${
                  profileTab === 'stats'
                    ? 'bg-[#1e293b] text-[#38bdf8] border-[#38bdf8]'
                    : 'bg-[#0b1220] text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                📊 СТАТИСТИКА
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setProfileTab('history');
                }}
                className={`py-1.5 font-bold border transition-colors cursor-pointer text-center ${
                  profileTab === 'history'
                    ? 'bg-[#1e293b] text-[#facc15] border-[#facc15]'
                    : 'bg-[#0b1220] text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                📜 ИСТОРИЯ БОЕВ
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setProfileTab('account');
                }}
                className={`py-1.5 font-bold border transition-colors cursor-pointer text-center ${
                  profileTab === 'account'
                    ? 'bg-[#1e293b] text-[#4ade80] border-[#4ade80]'
                    : 'bg-[#0b1220] text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                ⚙️ АККАУНТ
              </button>
            </div>

            {/* Scrollable Tab Content Area */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1.5 text-xs space-y-2.5">
              {/* TAB 1: 📊 ДЕТАЛЬНАЯ СТАТИСТИКА */}
              {profileTab === 'stats' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Block: Подземелье */}
                    <div className="bg-[#0c1322] p-3 border border-slate-800 space-y-1.5">
                      <div className="text-[#38bdf8] font-bold text-xs flex items-center gap-1.5 pb-1 border-b border-slate-800">
                        <span>🌀</span>
                        <span>ПОДЗЕМЕЛЬЕ КАТАКОМБ</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Пройдено подземелий:</span>
                        <span className="text-emerald-400 font-bold">{extendedStats.dungeonsCleared} 🏆</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Зачищено комнат:</span>
                        <span className="text-slate-200 font-bold">{extendedStats.roomsCleared} 🚪</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Убито боссов:</span>
                        <span className="text-rose-400 font-bold">{extendedStats.bossesKilled} ☠</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Рекорд этажа:</span>
                        <span className="text-amber-400 font-bold">Этаж {extendedStats.maxFloor}/7</span>
                      </div>
                    </div>

                    {/* Block: PvP Арена */}
                    <div className="bg-[#0c1322] p-3 border border-slate-800 space-y-1.5">
                      <div className="text-[#facc15] font-bold text-xs flex items-center gap-1.5 pb-1 border-b border-slate-800">
                        <span>⚔️</span>
                        <span>PVP АРЕНА И ДУЭЛИ</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Текущий рейтинг:</span>
                        <span className="text-amber-400 font-bold">{extendedStats.rating} MMR</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Матчей сыграно:</span>
                        <span className="text-slate-200 font-bold">{Math.max(extendedStats.pvpMatches, extendedStats.pvpWins + extendedStats.pvpLosses)} ⚔</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Побед / Поражений:</span>
                        <span className="text-emerald-400 font-bold">
                          {extendedStats.pvpWins}W / {extendedStats.pvpLosses}L ({Math.max(extendedStats.pvpMatches, extendedStats.pvpWins + extendedStats.pvpLosses) > 0 ? Math.round((extendedStats.pvpWins / Math.max(extendedStats.pvpMatches, extendedStats.pvpWins + extendedStats.pvpLosses)) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Лучший стрик:</span>
                        <span className="text-orange-400 font-bold">{extendedStats.bestWinStreak} подряд 🔥</span>
                      </div>
                    </div>
                  </div>

                  {/* Favorite Fighter Badge */}
                  <div className="bg-[#0c1322] p-2.5 border border-purple-900/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⭐</span>
                      <span className="text-slate-300 font-bold text-[11px]">Любимый боец:</span>
                      <span className="text-purple-400 font-bold text-[11px]">
                        {HEROES[extendedStats.favoriteHeroId || 'char_zaza']?.name || 'Заза'} ({HEROES[extendedStats.favoriteHeroId || 'char_zaza']?.style || 'Танк-Мутант'})
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Игр: {extendedStats.heroMatchCounts?.[extendedStats.favoriteHeroId || 'char_zaza'] || 1}
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: 📜 ИСТОРИЯ ПОСЛЕДНИХ БОЕВ */}
              {profileTab === 'history' && (
                <div className="space-y-2">
                  {profileMatches.length === 0 ? (
                    <div className="bg-[#0c1322] p-6 border border-slate-800 text-center text-slate-400 space-y-1">
                      <div className="text-sm font-bold text-slate-300">📜 История матчей пока пуста</div>
                      <div className="text-[10px]">Завершите забег в Подземелье или сыграйте PvP матч на Арене!</div>
                    </div>
                  ) : (
                    profileMatches.map((m, idx) => {
                      const hero = HEROES[m.heroId] || { name: 'Боец', style: 'Герой' };
                      const isWin = m.result === 'VICTORY' || (m.result as string) === 'win';
                      const isDungeon = m.mode === 'dungeon' || (m.mode as string) === 'Одиночный';
                      const modeName = isDungeon ? 'ПОДЗЕМЕЛЬЕ' : (m.mode === 'pvp_2v2' ? 'АРЕНА 2v2' : 'ДУЭЛЬ 1v1');
                      const dateStr = new Date(m.timestamp).toLocaleDateString() + ' ' + new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const mins = Math.floor((m.durationSeconds || 120) / 60);
                      const secs = (m.durationSeconds || 120) % 60;
                      const durStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

                      return (
                        <div
                          key={m.matchId || idx}
                          className={`p-2.5 bg-[#0d1424] border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                            isWin ? 'border-emerald-700/60 bg-emerald-950/20' : 'border-rose-800/60 bg-rose-950/20'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase shrink-0 ${
                              isWin ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50' : 'bg-rose-950 text-rose-400 border border-rose-500/50'
                            }`}>
                              {isWin ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}
                            </span>
                            <div>
                              <div className="font-bold text-[11px] text-white flex items-center gap-1.5">
                                <span className={isDungeon ? 'text-purple-400' : 'text-amber-400'}>[{modeName}]</span>
                                <span>{hero.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {isDungeon ? (
                                  <span>Этажи: {m.floorsCleared ?? 7}/7 • 💀 +{m.skullsEarned ?? 250}</span>
                                ) : (
                                  <span>Рейтинг: {m.ratingDelta !== undefined ? (m.ratingDelta > 0 ? `+${m.ratingDelta}` : `${m.ratingDelta}`) : (isWin ? '+25' : '-15')} MMR</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-400 sm:text-right shrink-0">
                            <div className="font-semibold text-slate-300">⏱ {durStr}</div>
                            <div className="text-[9px] text-slate-500">{dateStr}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 3: ⚙️ АККАУНТ, АВАТАРКА И ИНВАЙТ-КОДЫ */}
              {profileTab === 'account' && (
                <div className="space-y-3">
                  {/* Auth Suite */}
                  {!userProfile.isGoogle ? (
                    <div className="bg-[#0c1322] p-3 border border-slate-800 space-y-2.5">
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-xs border border-[#60a5fa] flex items-center justify-center gap-2 cursor-pointer transition-colors shadow"
                      >
                        <LogInIcon className="w-4 h-4" />
                        [ 🌐 ВОЙТИ ЧЕРЕЗ GOOGLE ]
                      </button>

                      <div className="flex items-center justify-center gap-2 my-1 text-slate-500 font-bold text-[10px]">
                        <span className="h-[1px] bg-slate-800 flex-1"></span>
                        <span>ИЛИ ПО EMAIL</span>
                        <span className="h-[1px] bg-slate-800 flex-1"></span>
                      </div>

                      {/* Toggle */}
                      <div className="flex border-b border-slate-700 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setIsSignUpMode(false);
                            setAuthErrorMessage('');
                            setVerificationSent(false);
                          }}
                          className={`flex-1 py-1 font-bold ${!isSignUpMode ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-800/40' : 'text-slate-400'}`}
                        >
                          ВХОД
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setIsSignUpMode(true);
                            setAuthErrorMessage('');
                            setVerificationSent(false);
                          }}
                          className={`flex-1 py-1 font-bold ${isSignUpMode ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-800/40' : 'text-slate-400'}`}
                        >
                          РЕГИСТРАЦИЯ
                        </button>
                      </div>

                      {!verificationSent ? (
                        <div className="space-y-2">
                          <input
                            type="email"
                            placeholder="Email..."
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                          />
                          <input
                            type="password"
                            placeholder="Пароль..."
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                          />
                          <button
                            type="button"
                            onClick={isSignUpMode ? handleEmailSignUp : handleEmailLogin}
                            className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer border border-amber-400"
                          >
                            {isSignUpMode ? 'СОЗДАТЬ АККАУНТ' : 'ВОЙТИ'}
                          </button>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-[#020617] border border-amber-500/70 text-left space-y-1.5">
                          <div className="text-[11px] text-amber-400 font-bold">✉ ПРОВЕРЬТЕ ПОЧТУ {authEmail}</div>
                          <button
                            type="button"
                            onClick={handleVerifyCheck}
                            className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                          >
                            🔄 Я ПОДТВЕРДИЛ ПОЧТУ
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-emerald-950/60 border border-emerald-500/60 p-2.5 text-xs text-emerald-300">
                      <span className="flex items-center gap-1.5 font-bold">
                        <UserCheckIcon className="w-4 h-4 text-emerald-400" />
                        Google Облако Активно
                      </span>
                      <button
                        type="button"
                        onClick={handleGoogleLogout}
                        className="px-2.5 py-1 bg-red-950/80 hover:bg-red-800 text-red-200 text-[10px] font-bold border border-red-500 cursor-pointer"
                      >
                        🚪 ВЫЙТИ
                      </button>
                    </div>
                  )}

                  {/* Nickname & Avatar selection */}
                  <div className="bg-[#0c1322] p-3 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-bold text-xs">АВАТАРКА БОЙЦА:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNickModal(true);
                          setAuthErrorMessage('');
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-[10px] font-bold cursor-pointer"
                      >
                        👤 СМЕНИТЬ НИКНЕЙМ
                      </button>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-1">
                      {squareAvatars.map(av => (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            const updated = { ...userProfile, avatar: av.id };
                            setUserProfile(updated);
                            localStorage.setItem('adv_avatar', av.id);
                          }}
                          className={`flex flex-col items-center p-1 border cursor-pointer transition-colors ${
                            userProfile.avatar === av.id ? 'border-[#38bdf8] bg-slate-800 shadow' : 'border-slate-800 hover:border-slate-600 bg-slate-950'
                          }`}
                        >
                          <div className="w-7 h-7">
                            <AvatarIcon id={av.id} />
                          </div>
                          <span className="text-[8.5px] text-slate-300 mt-0.5 font-bold truncate w-full text-center">{av.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Connect by Friend Code */}
                  <div className="bg-[#0c1322] p-3 border border-slate-800 space-y-2">
                    <div className="text-slate-300 font-bold text-xs">👥 ПОДКЛЮЧЕНИЕ К ДРУГУ ПО КОДУ:</div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Ввести код друга (например REV-ZAZA)..."
                        value={inviteCodeInput}
                        onChange={(e) => {
                          setInviteCodeInput(e.target.value.toUpperCase());
                          setInviteNotice('');
                        }}
                        className="flex-1 px-2 py-1.5 bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!inviteCodeInput.trim()) {
                            setInviteNotice('Введите код друга!');
                            return;
                          }
                          setInviteNotice(`✅ Подключено к лобби игрока [${inviteCodeInput.trim()}]!`);
                          setTimeout(() => setInviteNotice(''), 3000);
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
                      >
                        ВХОД
                      </button>
                    </div>
                    {inviteNotice && (
                      <div className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 p-1 border border-emerald-500/50 text-center">
                        {inviteNotice}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PUBLIC PROFILE MODAL (ПРОСМОТР ЧУЖОГО ПРОФИЛЯ — 100% CRISP HTML/CSS) */}
      {publicProfile && (
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none font-mono"
        >
          <div className="bg-[#090d16] border-4 border-[#facc15] outline outline-2 outline-[#854d0e] outline-offset-[-6px] shadow-[0_0_0_4px_#000,0_12px_35px_rgba(0,0,0,0.95)] p-4 max-w-[600px] w-full text-white max-h-[90vh] flex flex-col relative box-border overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b-2 border-amber-500/40 mb-3 shrink-0">
              <span className="text-[#facc15] font-bold text-xs sm:text-sm tracking-wider uppercase">✦ ПУБЛИЧНЫЙ ПРОФИЛЬ ИГРОКА ✦</span>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setPublicProfile(null);
                }}
                className="text-red-400 hover:text-red-300 active:scale-95 font-bold text-xs sm:text-sm px-2 py-0.5 border border-red-500/40 bg-red-950/40 hover:bg-red-900/60 cursor-pointer transition-colors"
                title="Закрыть"
              >
                [✕]
              </button>
            </div>

            {/* Target Player Card */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-[#0d1424] p-2.5 border border-slate-800 shrink-0 mb-3">
              <div className="w-13 h-13 bg-[#020617] border-2 border-[#facc15] flex items-center justify-center overflow-hidden shrink-0">
                {publicProfile.photoURL ? (
                  <img src={publicProfile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <AvatarIcon id={publicProfile.avatar || 'avatar_sq_1'} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                  <span>{publicProfile.nickname}</span>
                  <span className="text-[10.5px] text-slate-400 font-normal">{publicProfile.tag || '#4421'}</span>
                </div>
                <div className="text-xs text-[#facc15] font-bold mt-0.5">
                  ★ {publicProfile.rank} [{publicProfile.rating} MMR]
                </div>
                <div className="text-[10px] mt-0.5 flex items-center gap-2">
                  <span className={publicProfile.isOnline ? 'text-emerald-400 font-bold' : 'text-slate-400 font-semibold'}>
                    {publicProfile.isOnline ? '🟢 В сети (Онлайн)' : '⚪ Был в сети недавно'}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Add Friend & Message */}
              <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    soundEngine.playLevelUp();
                    if (publicProfile.tag) {
                      await addFriendByTag(publicProfile.tag);
                    }
                    setFriendActionStatus('ДОБАВЛЕН В ДРУЗЬЯ ✓');
                  }}
                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs border border-emerald-400 cursor-pointer transition-colors text-center"
                >
                  {friendActionStatus || '➕ В ДРУЗЬЯ'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setShowPublicMsgPrompt(true);
                  }}
                  className="px-2.5 py-1 bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs border border-sky-400 cursor-pointer transition-colors text-center"
                >
                  ✉ НАПИСАТЬ
                </button>
              </div>
            </div>

            {/* Inline Message Prompt if clicked Write */}
            {showPublicMsgPrompt && (
              <div className="mb-3 p-2.5 bg-slate-900 border border-sky-500/60 shrink-0 space-y-1.5">
                <div className="text-[11px] text-sky-400 font-bold">Написать {publicProfile.nickname}:</div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Введите сообщение..."
                    value={publicMsgInput}
                    onChange={(e) => setPublicMsgInput(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (publicMsgInput.trim() && publicProfile.uid) {
                        await sendChatMessage(publicProfile.uid, publicMsgInput.trim());
                        setPublicMsgNotice('Сообщение отправлено ✓');
                        setPublicMsgInput('');
                        setTimeout(() => {
                          setShowPublicMsgPrompt(false);
                          setPublicMsgNotice('');
                        }, 1800);
                      }
                    }}
                    className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs cursor-pointer"
                  >
                    ОТПРАВИТЬ
                  </button>
                </div>
                {publicMsgNotice && (
                  <div className="text-[10px] text-emerald-400 font-bold">{publicMsgNotice}</div>
                )}
              </div>
            )}

            {/* Public Profile Tab Switcher */}
            <div className="grid grid-cols-2 gap-1 mb-3 shrink-0 text-xs">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setPublicProfileTab('stats');
                }}
                className={`py-1.5 font-bold border transition-colors cursor-pointer text-center ${
                  publicProfileTab === 'stats'
                    ? 'bg-[#1e293b] text-[#facc15] border-[#facc15]'
                    : 'bg-[#0b1220] text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                📊 СТАТИСТИКА
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setPublicProfileTab('history');
                }}
                className={`py-1.5 font-bold border transition-colors cursor-pointer text-center ${
                  publicProfileTab === 'history'
                    ? 'bg-[#1e293b] text-[#38bdf8] border-[#38bdf8]'
                    : 'bg-[#0b1220] text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                📜 ИСТОРИЯ БОЕВ
              </button>
            </div>

            {/* Public Tab Content Area */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1.5 text-xs space-y-2.5">
              {publicProfileTab === 'stats' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="bg-[#0c1322] p-3 border border-slate-800 space-y-1.5">
                      <div className="text-[#38bdf8] font-bold text-xs pb-1 border-b border-slate-800">
                        🌀 ПОДЗЕМЕЛЬЕ КАТАКОМБ
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Пройдено:</span>
                        <span className="text-emerald-400 font-bold">{publicProfile.stats?.dungeonsCleared ?? publicProfile.dungeonsCleared ?? 0} 🏆</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Комнат:</span>
                        <span className="text-slate-200 font-bold">{publicProfile.stats?.roomsCleared ?? 0} 🚪</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Убито боссов:</span>
                        <span className="text-rose-400 font-bold">{publicProfile.stats?.bossesKilled ?? publicProfile.bossesDefeated ?? 0} ☠</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Рекорд:</span>
                        <span className="text-amber-400 font-bold">Этаж {publicProfile.stats?.maxFloor ?? 7}/7</span>
                      </div>
                    </div>

                    <div className="bg-[#0c1322] p-3 border border-slate-800 space-y-1.5">
                      <div className="text-[#facc15] font-bold text-xs pb-1 border-b border-slate-800">
                        ⚔️ PVP АРЕНА
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Рейтинг:</span>
                        <span className="text-amber-400 font-bold">{publicProfile.rating} MMR</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Матчей:</span>
                        <span className="text-slate-200 font-bold">{publicProfile.stats?.pvpMatches ?? ((publicProfile.wins ?? 0) + (publicProfile.pvpLosses ?? 0))} ⚔</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Победы:</span>
                        <span className="text-emerald-400 font-bold">{publicProfile.stats?.pvpWins ?? publicProfile.wins ?? 0}W / {publicProfile.stats?.pvpLosses ?? publicProfile.pvpLosses ?? 0}L</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Лучший стрик:</span>
                        <span className="text-orange-400 font-bold">{publicProfile.stats?.bestWinStreak ?? 5} 🔥</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0c1322] p-2.5 border border-purple-900/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⭐</span>
                      <span className="text-slate-300 font-bold text-[11px]">Любимый боец:</span>
                      <span className="text-purple-400 font-bold text-[11px]">{publicProfile.favoriteHero || HEROES[publicProfile.stats?.favoriteHeroId || 'char_zaza']?.name || 'Заза'}</span>
                    </div>
                  </div>
                </div>
              )}

              {publicProfileTab === 'history' && (
                <div className="space-y-2">
                  {publicProfileMatches.length === 0 ? (
                    <div className="bg-[#0c1322] p-6 border border-slate-800 text-center text-slate-400 space-y-1">
                      <div className="text-sm font-bold text-slate-300">📜 История матчей пока пуста</div>
                      <div className="text-[10px]">У данного игрока еще нет записанных матчей.</div>
                    </div>
                  ) : (
                    publicProfileMatches.map((m, idx) => {
                      const hero = HEROES[m.heroId] || { name: 'Боец' };
                      const isWin = m.result === 'VICTORY' || (m.result as string) === 'win';
                      const isDungeon = m.mode === 'dungeon' || (m.mode as string) === 'Одиночный';
                      const modeName = isDungeon ? 'ПОДЗЕМЕЛЬЕ' : (m.mode === 'pvp_2v2' ? 'АРЕНА 2v2' : 'ДУЭЛЬ 1v1');
                      const dateStr = new Date(m.timestamp).toLocaleDateString() + ' ' + new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const mins = Math.floor((m.durationSeconds || 120) / 60);
                      const secs = (m.durationSeconds || 120) % 60;
                      const durStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

                      return (
                        <div
                          key={m.matchId || idx}
                          className={`p-2.5 bg-[#0d1424] border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                            isWin ? 'border-emerald-700/60 bg-emerald-950/20' : 'border-rose-800/60 bg-rose-950/20'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase shrink-0 ${
                              isWin ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50' : 'bg-rose-950 text-rose-400 border border-rose-500/50'
                            }`}>
                              {isWin ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}
                            </span>
                            <div>
                              <div className="font-bold text-[11px] text-white flex items-center gap-1.5">
                                <span className={isDungeon ? 'text-purple-400' : 'text-amber-400'}>[{modeName}]</span>
                                <span>{hero.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {isDungeon ? (
                                  <span>Этажи: {m.floorsCleared ?? 7}/7 • 💀 +{m.skullsEarned ?? 250}</span>
                                ) : (
                                  <span>Рейтинг: {m.ratingDelta !== undefined ? (m.ratingDelta > 0 ? `+${m.ratingDelta}` : `${m.ratingDelta}`) : (isWin ? '+25' : '-15')} MMR</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-400 sm:text-right shrink-0">
                            <div className="font-semibold text-slate-300">⏱ {durStr}</div>
                            <div className="text-[9px] text-slate-500">{dateStr}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REGISTRATION NICKNAME MODAL ("СОЗДАНИЕ БОЙЦА") */}
      {showNickModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3">
          <div className="bg-[#0f172a] border-2 border-[#facc15] p-5 max-w-sm w-full shadow-2xl rounded-none text-white text-center animate-in zoom-in-95 duration-150">
            <h3 className="text-[#facc15] font-bold text-base tracking-wide mb-2">⚔ СОЗДАНИЕ БОЙЦА ⚔</h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Придумайте свой уникальный никнейм для ладдера и облачного сохранения (3–14 символов):
            </p>

            <input
              type="text"
              value={nickInput}
              onChange={(e) => {
                setNickInput(e.target.value);
                setNickError('');
              }}
              placeholder="Введите ник..."
              maxLength={14}
              className={`w-full px-3 py-2 bg-[#1e293b] border text-white font-mono text-center text-sm focus:outline-none mb-2 ${
                nickError ? 'border-red-500 bg-red-950/30' : 'border-slate-600 focus:border-[#facc15]'
              }`}
            />

            {nickError && (
              <div className="text-red-400 text-xs font-bold mb-3 bg-red-950/60 p-1.5 border border-red-500/50">
                ⚠ {nickError}
              </div>
            )}

            <button
              type="button"
              disabled={isRegistering}
              onClick={handleCreateNickname}
              className="w-full py-2.5 bg-[#16a34a] hover:bg-[#15803d] disabled:bg-slate-700 text-white font-bold text-xs border border-[#86efac] cursor-pointer transition-colors mt-2"
            >
              {isRegistering ? 'ПРОВЕРКА...' : '[ СОЗДАТЬ БОЙЦА ]'}
            </button>
          </div>
        </div>
      )}

      {/* 100% Crisp React Lootbox Opening System (Zero Canvas Blurring) */}
      {activeChestType && (
        <ReactLootboxModal
          chestType={activeChestType}
          onClose={() => {
            setActiveChestType(null);
            setEconomyState(loadEconomy());
            setRosterState(loadRoster());
            try { saveUserDataToCloud(); } catch (e) {}
          }}
        />
      )}
    </div>
  );
}
