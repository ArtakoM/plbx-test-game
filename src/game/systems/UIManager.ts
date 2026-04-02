import Phaser from 'phaser';

export class UIManager {
  private scene: Phaser.Scene;
  private heartsText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private coinIcon!: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const w = scene.scale.width;
    const fs = Math.min(w * 0.05, 40);
    const centerY = 16 + fs / 2;

    this.heartsText = scene.add.text(16, centerY, this.getHeartsString(3), {
      fontSize: `${fs}px`,
    })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(100);

    const iconSize = fs * 1.0;
    const coinScale = iconSize / 581;

    this.scoreText = scene.add.text(w - 20, centerY, '0', {
      fontFamily: 'Arial',
      fontSize: `${fs * 0.9}px`,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(100);

    this.coinIcon = scene.add.image(this.scoreText.x - this.scoreText.width - 2, centerY, 'coin')
      .setScale(coinScale)
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(100);
  }

  private getHeartsString(hp: number): string {
    let s = '';
    for (let i = 0; i < 3; i++) {
      s += i < hp ? '\u2764\uFE0F' : '\u{1F5A4}';
    }
    return s;
  }

  updateHP(hp: number): void {
    this.heartsText.setText(this.getHeartsString(hp));
  }

  updateScore(score: number): void {
    this.scoreText.setText(`${score}`);
    this.coinIcon.x = this.scoreText.x - this.scoreText.width - 2;
  }

  getCoinIconPosition(): { x: number; y: number } {
    return { x: this.coinIcon.x, y: this.coinIcon.y };
  }
}
