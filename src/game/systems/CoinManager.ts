import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { UIManager } from './UIManager';

const COIN_FRAME_SIZE = 581;

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
  private lastSpawnX = -Infinity;
  private onScoreChange?: (score: number) => void;
  private ui?: UIManager;
  private static readonly PHRASES = ['Nice!', 'Awesome!', 'You are a pro!', 'Perfect!', 'Fantastic!'];

  constructor(scene: Phaser.Scene, groundY: number) {
    this.scene = scene;
    this.groundY = groundY;
    this.group = scene.physics.add.group({ allowGravity: false });
  }

  setupOverlap(player: Player, onScoreChange: (score: number) => void): void {
    this.onScoreChange = onScoreChange;
    this.scene.physics.add.overlap(player, this.group, (_p, coin) => {
      const c = coin as Phaser.Physics.Arcade.Sprite;
      const cx = c.x;
      const cy = c.y;
      const coinScale = c.scaleX;

      // Remove from physics group but keep sprite visible for animation
      this.group.remove(c, false, false);
      if (c.body) (c.body as Phaser.Physics.Arcade.Body).enable = false;
      c.setScrollFactor(0);
      c.setDepth(150);

      this.score += 10;
      this.scene.sound.play('coin-sfx', { volume: 0.3 });
      this.onScoreChange?.(this.score);

      // Fly coin to score icon
      const target = this.ui?.getCoinIconPosition() ?? { x: this.scene.scale.width - 50, y: 30 };
      this.scene.tweens.add({
        targets: c,
        x: target.x,
        y: target.y,
        scaleX: coinScale * 0.3,
        scaleY: coinScale * 0.3,
        duration: 500,
        ease: 'Quad.easeIn',
      });
      // Fade out with delay
      this.scene.tweens.add({
        targets: c,
        alpha: 0,
        delay: 300,
        duration: 200,
        onComplete: () => c.destroy(),
      });

      if (Math.random() < 0.45) {
        this.showPhrase(cx, cy);
      }
    }, undefined, this);
  }

  stop(): void { this.stopped = true; }

  setUI(ui: UIManager): void { this.ui = ui; }

  handleResize(groundY: number, oldW: number, oldH: number): void {
    const oldGroundY = this.groundY;
    this.groundY = groundY;
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const newScale = (h * 0.06) / COIN_FRAME_SIZE;
    const oldSpacing = oldH * 0.12;
    const newSpacing = h * 0.12;
    const xRatio = w / oldW;

    const coins = this.group.getChildren() as Phaser.Physics.Arcade.Sprite[];
    for (let i = 0; i < coins.length; i += 5) {
      const arc = coins.slice(i, i + 5);
      if (arc.length === 0) break;
      const anchorX = arc[0].x * xRatio;
      for (let j = 0; j < arc.length; j++) {
        const s = arc[j];
        s.x = anchorX + j * newSpacing;
        const aboveGround = oldGroundY - s.y;
        s.y = groundY - aboveGround * (groundY / oldGroundY);
        s.setScale(newScale);
      }
    }
  }

  /** Spawn a triangle arc of coins at the given x position */
  spawnArcAt(x: number): void {
    if (this.stopped) return;
    // Skip if too close to the last arc
    const spacing = this.scene.scale.height * 0.12;
    const arcWidth = spacing * 5;
    if (Math.abs(x - this.lastSpawnX) < arcWidth * 1.5) return;
    this.lastSpawnX = x;
    // Push standalone timer back
    this.spawnTimer = -2000;
    const h = this.scene.scale.height;
    const coinScale = (h * 0.06) / COIN_FRAME_SIZE;

    for (let i = 0; i < 5; i++) {
      const cx = x + i * spacing;
      const cy = this.groundY - h * ARC_HEIGHTS[i];
      const coin = this.group.create(cx, cy, 'coin') as Phaser.Physics.Arcade.Sprite;
      coin.setScale(coinScale);
      const body = coin.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setCircle(230, 60, 60);
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

    // Scroll coins and track last spawn position
    this.lastSpawnX -= speed;

    this.group.getChildren().forEach((obj) => {
      const s = obj as Phaser.Physics.Arcade.Sprite;
      s.x -= speed;
      if (s.x < -50) s.destroy();
    });
  }

  private showPhrase(x: number, y: number): void {
    const phrase = CoinManager.PHRASES[Math.floor(Math.random() * CoinManager.PHRASES.length)];
    const h = this.scene.scale.height;
    const fs = Math.min(h * 0.05, 28);

    const text = this.scene.add.text(x, y - 20, phrase, {
      fontFamily: 'Arial',
      fontStyle: '900',
      fontSize: `${fs}px`,
      color: '#ffdd00',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(150);

    this.scene.tweens.add({
      targets: text,
      y: y - 80,
      alpha: 0,
      duration: 800,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  getScore(): number { return this.score; }

  destroy(): void {
    this.group.clear(true, true);
  }
}
