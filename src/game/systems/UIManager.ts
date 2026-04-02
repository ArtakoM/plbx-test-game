import Phaser from 'phaser';

export class UIManager {
  private scene: Phaser.Scene;
  private heartsText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private coinIcon!: Phaser.GameObjects.Image;
  private currentScore = 0;
  private currentHP = 3;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.buildUI();
  }

  private buildUI(): void {
    const w = this.scene.scale.width;
    const fs = Math.min(w * 0.05, 40);
    const centerY = 16 + fs / 2;

    if (this.heartsText) this.heartsText.destroy();
    if (this.scoreText) this.scoreText.destroy();
    if (this.coinIcon) this.coinIcon.destroy();

    this.heartsText = this.scene.add.text(16, centerY, this.getHeartsString(this.currentHP), {
      fontSize: `${fs}px`,
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);

    this.scoreText = this.scene.add.text(w - 20, centerY, `${this.currentScore}`, {
      fontFamily: 'Arial',
      fontSize: `${fs * 0.9}px`,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(100);

    const iconSize = fs * 1.0;
    this.coinIcon = this.scene.add.image(this.scoreText.x - this.scoreText.width - 2, centerY, 'coin')
      .setScale(iconSize / 581)
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
    this.currentHP = hp;
    this.heartsText.setText(this.getHeartsString(hp));
  }

  updateScore(score: number): void {
    this.currentScore = score;
    this.scoreText.setText(`${score}`);
    this.coinIcon.x = this.scoreText.x - this.scoreText.width - 2;
  }

  getCoinIconPosition(): { x: number; y: number } {
    return { x: this.coinIcon.x, y: this.coinIcon.y };
  }

  handleResize(): void {
    this.buildUI();
  }
}
