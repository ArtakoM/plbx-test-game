import Phaser from 'phaser';

export class UIManager {
  private scene: Phaser.Scene;
  private heartsText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private coinIcon!: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const w = scene.scale.width;
    const h = scene.scale.height;
    const fs = Math.min(w * 0.05, 40);

    this.heartsText = scene.add.text(16, 16, this.getHeartsString(3), {
      fontSize: `${fs}px`,
    })
      .setScrollFactor(0)
      .setDepth(100);

    // Coin icon + score number (top-right, vertically centered on same line)
    const iconSize = fs * 1.6;
    const coinScale = iconSize / 1024;
    const centerY = 20 + fs / 2;

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
    // Reposition icon to stay left of the score text
    this.coinIcon.x = this.scoreText.x - this.scoreText.width - 2;
  }
}
