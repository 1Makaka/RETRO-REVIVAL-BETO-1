import React, { useState, useEffect } from 'react';
import {
  loadRoster,
  addCurrencies,
  unlockHeroWithAntiDuplicate,
  CANONICAL_ROSTER
} from '../game/economy';
import { soundEngine } from '../game/audio';

export interface RewardItem {
  type: 'skulls' | 'shards' | 'upgradePts' | 'hero';
  amount: number;
  label: string;
  subLabel?: string;
  heroId?: string;
  isJackpot?: boolean;
  isDuplicate?: boolean;
}

interface ReactLootboxModalProps {
  chestType: 'coffin' | 'sarcophagus';
  onClose: () => void;
}

export const ReactLootboxModal: React.FC<ReactLootboxModalProps> = ({ chestType, onClose }) => {
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [revealedRewards, setRevealedRewards] = useState<RewardItem[]>([]);
  const [isWiggling, setIsWiggling] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Generate rewards on mount
  useEffect(() => {
    const list: RewardItem[] = [];
    const roster = loadRoster();

    if (chestType === 'coffin') {
      // OLD COFFIN (2 REWARDS)
      const pts = Math.floor(Math.random() * 16) + 15; // 15-30
      list.push({
        type: 'upgradePts',
        amount: pts,
        label: `+${pts} ОЧКОВ ПРОКАЧКИ`,
        subLabel: '⚡ УСИЛЕНИЕ БОЙЦОВ'
      });

      const roll = Math.random();
      if (roll < 0.08) {
        list.push({
          type: 'shards',
          amount: 1,
          label: '+1 ОСКОЛОК ПУСТОТЫ',
          subLabel: '✨ ДЖЕКПОТ! РЕДКАЯ ВАЛЮТА',
          isJackpot: true
        });
      } else if (roll < 0.75) {
        const skulls = Math.floor(Math.random() * 51) + 40; // 40-90
        list.push({
          type: 'skulls',
          amount: skulls,
          label: `+${skulls} РЖАВЫХ ЧЕРЕПОВ`,
          subLabel: '💀 МОНЕТЫ ПОДЗЕМЕЛЬЯ'
        });
      } else {
        list.push({
          type: 'upgradePts',
          amount: 25,
          label: '+25 ОЧКОВ ПРОКАЧКИ',
          subLabel: '⚡ УСИЛЕНИЕ БОЙЦОВ'
        });
      }
    } else {
      // HEROIC SARCOPHAGUS (3-4 REWARDS)
      const pts = Math.floor(Math.random() * 36) + 40; // 40-75
      list.push({
        type: 'upgradePts',
        amount: pts,
        label: `+${pts} ОЧКОВ ПРОКАЧКИ`,
        subLabel: '⚡ УСИЛЕНИЕ БОЙЦОВ'
      });

      const skulls = Math.floor(Math.random() * 161) + 120; // 120-280
      list.push({
        type: 'skulls',
        amount: skulls,
        label: `+${skulls} РЖАВЫХ ЧЕРЕПОВ`,
        subLabel: '💀 МОНЕТЫ ПОДЗЕМЕЛЬЯ'
      });

      const shards = Math.floor(Math.random() * 3) + 1; // 1-3
      list.push({
        type: 'shards',
        amount: shards,
        label: `+${shards} ОСКОЛКОВ ПУСТОТЫ`,
        subLabel: '✨ МИФИЧЕСКАЯ ВАЛЮТА',
        isJackpot: true
      });

      // 15% Chance to unlock a locked hero or convert to shards
      const lockedHeroes = Object.keys(CANONICAL_ROSTER).filter(k => !roster[k]?.unlocked);
      if (Math.random() < 0.20 && lockedHeroes.length > 0) {
        const heroId = lockedHeroes[Math.floor(Math.random() * lockedHeroes.length)];
        const heroName = CANONICAL_ROSTER[heroId]?.name || 'НОВЫЙ ГЕРОЙ';
        list.push({
          type: 'hero',
          amount: 1,
          heroId,
          label: `БОЕЦ РАЗБЛОКИРОВАН: ${heroName}`,
          subLabel: '👑 ГЕРОИЧЕСКИЙ ДЖЕКПОТ!',
          isJackpot: true
        });
      }
    }

    setRewards(list);
  }, [chestType]);

  const claimAll = () => {
    soundEngine.playLevelUp();
    // Claim all rewards in list
    rewards.forEach(r => {
      if (r.type === 'skulls') addCurrencies({ skulls: r.amount });
      else if (r.type === 'shards') addCurrencies({ shards: r.amount });
      else if (r.type === 'upgradePts') addCurrencies({ upgradePts: r.amount });
      else if (r.type === 'hero' && r.heroId) unlockHeroWithAntiDuplicate(r.heroId);
    });
    onClose();
  };

  const handleTap = () => {
    if (isFinished) {
      claimAll();
      return;
    }

    if (currentIndex >= rewards.length) {
      claimAll();
      return;
    }

    soundEngine.playLevelUp();
    setIsWiggling(true);
    setTimeout(() => setIsWiggling(false), 200);

    const nextReward = rewards[currentIndex];
    setRevealedRewards(prev => [nextReward, ...prev]);

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);

    if (nextIndex >= rewards.length) {
      setIsFinished(true);
    }
  };

  const itemsLeft = Math.max(0, rewards.length - currentIndex);
  const nextIsJackpot = rewards[currentIndex]?.isJackpot;

  return (
    <div
      onClick={handleTap}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/90 backdrop-blur-md p-4 select-none font-mono text-white transition-opacity duration-200"
    >
      {/* Top Header */}
      <div className="w-full max-w-xl flex items-center justify-between pt-2 px-2 z-10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <span className="text-xl">
            {chestType === 'coffin' ? '⚰️' : '👑'}
          </span>
          <span className={`text-base md:text-lg font-bold tracking-wider ${chestType === 'coffin' ? 'text-amber-400' : 'text-purple-400'}`}>
            {chestType === 'coffin' ? 'ОТКРЫТИЕ: СТАРЫЙ ГРОБ' : 'ОТКРЫТИЕ: ГЕРОИЧЕСКИЙ САРКОФАГ'}
          </span>
        </div>

        {/* Prominent High-Contrast Close Button */}
        <button
          onClick={claimAll}
          className="px-3.5 py-1.5 bg-red-950/80 hover:bg-red-800 border-2 border-red-500 rounded-lg text-red-200 font-bold text-xs tracking-wider flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
        >
          <span>✕</span>
          <span>ЗАКРЫТЬ</span>
        </button>
      </div>

      {/* Center Stage: Wiggling Chest & Reward Cards */}
      <div className="relative flex flex-col items-center justify-center my-auto w-full max-w-md">
        {/* Chest Visual Area */}
        <div className="relative flex items-center justify-center">
          {/* Glowing Aura Behind Chest */}
          <div className={`absolute w-44 h-44 rounded-full blur-2xl opacity-40 animate-pulse pointer-events-none ${
            nextIsJackpot ? 'bg-amber-400' : (chestType === 'coffin' ? 'bg-amber-600' : 'bg-purple-600')
          }`} />

          {/* Chest Container */}
          <div className={`transform transition-transform duration-150 cursor-pointer ${
            isWiggling ? 'scale-115 rotate-3' : 'scale-100 hover:scale-105'
          }`}>
            <div className={`w-32 h-32 md:w-36 md:h-36 rounded-2xl flex flex-col items-center justify-center border-4 shadow-2xl ${
              chestType === 'coffin'
                ? 'bg-gradient-to-b from-stone-800 to-amber-950 border-amber-600'
                : 'bg-gradient-to-b from-purple-950 to-slate-950 border-purple-500'
            }`}>
              <span className="text-6xl md:text-7xl drop-shadow-lg">
                {chestType === 'coffin' ? '⚰️' : '👑'}
              </span>
            </div>

            {/* Remaining Items Badge */}
            {!isFinished && itemsLeft > 0 && (
              <div className={`absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 shadow-lg ${
                nextIsJackpot
                  ? 'bg-amber-500 text-black border-yellow-200 animate-bounce'
                  : 'bg-red-600 text-white border-white'
              }`}>
                {itemsLeft}
              </div>
            )}
          </div>
        </div>

        {/* Revealed Rewards Stream */}
        <div className="w-full mt-6 flex flex-col items-center gap-2 max-h-52 overflow-y-auto px-2">
          {revealedRewards.map((reward, i) => (
            <div
              key={i}
              className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-between border shadow-lg transform transition-all duration-300 animate-in fade-in zoom-in-95 ${
                reward.isJackpot
                  ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-amber-500/30'
                  : (reward.type === 'hero'
                    ? 'bg-purple-950/80 border-purple-400 text-purple-200 shadow-purple-500/30'
                    : 'bg-slate-900/80 border-slate-700 text-slate-200')
              }`}
            >
              <div className="flex flex-col text-left">
                <span className="font-bold text-sm tracking-wide">{reward.label}</span>
                {reward.subLabel && (
                  <span className="text-xs opacity-75 font-sans font-medium">{reward.subLabel}</span>
                )}
              </div>
              <span className="text-2xl">
                {reward.type === 'skulls' && '💀'}
                {reward.type === 'shards' && '🔮'}
                {reward.type === 'upgradePts' && '⚡'}
                {reward.type === 'hero' && '👑'}
              </span>
            </div>
          ))}
        </div>

        {/* Tap Prompt Hint */}
        {!isFinished && (
          <div className="mt-4 text-xs text-slate-400 tracking-wider animate-pulse text-center">
            НАЖИМАЙТЕ НА ЭКРАН, ЧТОБЫ ОТКРЫВАТЬ НАГРАДЫ!
          </div>
        )}
      </div>

      {/* Bottom Claim Button */}
      <div className="w-full max-w-sm pb-3 z-10" onClick={e => e.stopPropagation()}>
        {isFinished ? (
          <button
            onClick={claimAll}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-bold text-base rounded-xl border-2 border-emerald-300 shadow-xl shadow-green-900/50 active:scale-98 transition-all cursor-pointer uppercase tracking-wider"
          >
            [ ЗАБРАТЬ ВСЕ НАГРАДЫ ]
          </button>
        ) : (
          <button
            onClick={claimAll}
            className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-600 transition-all cursor-pointer tracking-wider"
          >
            ПРОПУСТИТЬ И ЗАБРАТЬ ВСЁ
          </button>
        )}
      </div>
    </div>
  );
};
