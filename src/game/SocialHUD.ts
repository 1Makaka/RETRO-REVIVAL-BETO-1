import Phaser from 'phaser';
import { soundEngine } from './audio';
import { subscribeToMailbox } from './firebase';
import { FriendsModal } from './FriendsModal';
import { MailModal } from './MailModal';

export class SocialHUD {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private unreadCount = 0;
  private badgeText?: Phaser.GameObjects.Text;
  private badgeBg?: Phaser.GameObjects.Arc;
  private unsubscribeMail?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
  }

  private createUI() {
    const w = this.scene.scale.width;
    this.container = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(3500);

    const rightMargin = 40;
    const topMargin = 30;

    // 1. Friends button [btn_icon_friends]
    const friendsImg = this.scene.add.image(w - rightMargin - 52, topMargin, 'btn_icon_friends')
      .setScale(0.72)
      .setInteractive({ useHandCursor: true });

    friendsImg.on('pointerdown', (p: any, _x: number, _y: number, ev: { stopPropagation: () => void }) => {
      if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
      soundEngine.playClick();
      new FriendsModal(this.scene);
    });

    // 2. Mail button [btn_icon_mail]
    const mailImg = this.scene.add.image(w - rightMargin, topMargin, 'btn_icon_mail')
      .setScale(0.72)
      .setInteractive({ useHandCursor: true });

    mailImg.on('pointerdown', (p: any, _x: number, _y: number, ev: { stopPropagation: () => void }) => {
      if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
      soundEngine.playClick();
      new MailModal(this.scene);
    });

    this.container.add([friendsImg, mailImg]);

    // 3. Pulsing Red Badge
    this.badgeBg = this.scene.add.arc(w - rightMargin + 12, topMargin - 12, 10, 0, 360, false, 0xef4444)
      .setScrollFactor(0)
      .setDepth(3501);
    this.badgeText = this.scene.add.text(w - rightMargin + 12, topMargin - 12, '0', {
      fontSize: '10px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3502);

    this.container.add([this.badgeBg, this.badgeText]);

    // Simple Pulsing Tween
    this.scene.tweens.add({
      targets: [this.badgeBg, this.badgeText],
      scale: 1.15,
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    // Sub to Firestore mailbox
    this.unsubscribeMail = subscribeToMailbox((messages) => {
      const unreads = messages.filter(m => !m.read).length;
      this.unreadCount = unreads;
      if (this.badgeText && this.badgeBg) {
        this.badgeText.setText(String(unreads));
        const visible = unreads > 0;
        this.badgeBg.setVisible(visible);
        this.badgeText.setVisible(visible);
      }
    });

    // Handle viewport resize safely
    const resizeHandler = () => {
      if (!this.scene || !this.scene.sys || !this.scene.scale) return;
      const newW = this.scene.scale.width;
      friendsImg.setPosition(newW - rightMargin - 52, topMargin);
      mailImg.setPosition(newW - rightMargin, topMargin);
      this.badgeBg?.setPosition(newW - rightMargin + 12, topMargin - 12);
      this.badgeText?.setPosition(newW - rightMargin + 12, topMargin - 12);
    };

    this.scene.scale.on('resize', resizeHandler);

    // Clean up on scene shutdown or destroy to prevent memory leaks or undefined camera errors
    this.scene.events.once('shutdown', () => {
      if (this.scene && this.scene.scale) {
        this.scene.scale.off('resize', resizeHandler);
      }
      this.destroy();
    });

    this.scene.events.once('destroy', () => {
      if (this.scene && this.scene.scale) {
        this.scene.scale.off('resize', resizeHandler);
      }
      this.destroy();
    });
  }

  public destroy() {
    if (this.unsubscribeMail) {
      this.unsubscribeMail();
      this.unsubscribeMail = undefined;
    }
    if (this.container && this.container.active) {
      this.container.destroy();
    }
  }
}
