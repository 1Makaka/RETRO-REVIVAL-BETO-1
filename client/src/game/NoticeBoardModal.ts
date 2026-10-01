import Phaser from 'phaser';
import { showHTMLNoticeBoardModal } from '../utils/domInput';

export interface DailyContract {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  rewardSkulls: number;
  rewardPoints: number;
  rewardShards: number;
  claimed: boolean;
}

export interface NewsItem {
  id: string;
  date: string;
  badge: string;
  badgeColor: string;
  badgeTextColor: string;
  title: string;
  content: string;
}

export class NoticeBoardModal {
  constructor(_scene: Phaser.Scene, initialTab: 'contracts' | 'ladder' | 'news' = 'contracts') {
    showHTMLNoticeBoardModal({ initialTab });
  }

  public close() {
    const modal = document.getElementById('game-dom-notice-board-modal');
    if (modal) modal.remove();
  }
}
