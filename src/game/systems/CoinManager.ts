import Phaser from 'phaser';
import { Player } from '../objects/Player';

const COIN_FRAME_SIZE = 1024;

// Triangle arc heights as fraction of screen height above ground
const ARC_HEIGHTS = [0.08, 0.20, 0.27, 0.20, 0.08];

export class CoinManager {
  private scene: Phaser.Scene;
  private group: Phaser.Physics.Arcade.Group;
  private spawnTimer = 0;
  private spawnInterval = 3000;
  private score = 0;
  private groundY: number;
  private stopped = false;
  private onScoreChange?: (score: number) => void;

  constructor(scene: Phaser.Scene, groundY: number) {
    this.scene = scene;
    this.groundY = groundY;
    this.group = scene.physics.add.group({ allowGravity: false });
  }

  setupOverlap(player: Player, onScoreChange: (score: number) => void): void {
    this.onScoreChange = onScoreChange;
    this.scene.physics.add.overlap(player, this.group, (_p, coin) => {
      (coin as Phaser.Physics.Arcade.Sprite).destroy();
      this.score += 10;
      this.scene.sound.play('coin-sfx', { volume: 0.4 });
      this.onScoreChange?.(this.score);
    }, undefined, this);
  }

  stop(): void { this.stopped = true; }

  /** Spawn a triangle arc of coins at the given x position */
  spawnArcAt(x: number): void {
    if (this.stopped) return;
    // Push standalone timer back so next free arc won't overlap
    this.spawnTimer = -2000;
    const h = this.scene.scale.height;
    const coinScale = (h * 0.06) / COIN_FRAME_SIZE;
    const spacing = this.scene.scale.height * 0.12;

    for (let i = 0; i < 5; i++) {
      const cx = x + i * spacing;
      const cy = this.groundY - h * ARC_HEIGHTS[i];
      const coin = this.group.create(cx, cy, 'coin') as Phaser.Physics.Arcade.Sprite;
      coin.setScale(coinScale);
      const body = coin.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setCircle(400, 112, 112);
    }
  }

  update(delta: number, speed: number): void {
    // Standalone coin arcs (no cone)
    if (!this.stopped) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        this.spawnInterval = 2500 + Math.random() * 2000;
        this.spawnArcAt(this.scene.scale.width + 50);
      }
    }

    this.group.getChildren().forEach((obj) => {
      const s = obj as Phaser.Physics.Arcade.Sprite;
      s.x -= speed;
      if (s.x < -50) s.destroy();
    });
  }

  getScore(): number { return this.score; }

  destroy(): void {
    this.group.clear(true, true);
  }
}
