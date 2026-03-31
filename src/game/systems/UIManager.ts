import Phaser from 'phaser';

export class UIManager {
  private scene: Phaser.Scene;
  private heartsText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const w = scene.scale.width;
    const fs = Math.min(w * 0.035, 28);

    this.heartsText = scene.add.text(16, 16, this.getHeartsString(3), {
      fontSize: `${fs}px`,
    })
      .setScrollFactor(0)
      .setDepth(100);

    this.scoreText = scene.add.text(w - 20, 20, 'Score: 0', {
      fontFamily: 'Arial',
      fontSize: `${fs * 0.8}px`,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    })
      .setOrigin(1, 0)
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
    this.scoreText.setText(`Score: ${score}`);
  }
}
