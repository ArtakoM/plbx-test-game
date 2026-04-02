import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { CoinManager } from './CoinManager';

// Enemy frame: 516x512, 4 frames in a row
// Cone: 119x135

export class ObstacleManager {
  private scene: Phaser.Scene;
  private staticGroup: Phaser.Physics.Arcade.Group;
  private dynamicGroup: Phaser.Physics.Arcade.Group;
  private spawnTimer = 0;
  private spawnInterval = 800;
  private stopped = false;
  private coneCount = 0;
  private enemyCount = 0;
  private groundY: number;
  private coins?: CoinManager;

  constructor(scene: Phaser.Scene, groundY: number) {
    this.scene = scene;
    this.groundY = groundY;

    this.staticGroup = scene.physics.add.group({ allowGravity: false, immovable: true });
    this.dynamicGroup = scene.physics.add.group({ allowGravity: false, immovable: true });

    if (!scene.anims.exists('enemy-run')) {
      scene.anims.create({
        key: 'enemy-run',
        frames: scene.anims.generateFrameNumbers('enemy', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1,
      });
    }
  }

  setCoinManager(coins: CoinManager): void {
    this.coins = coins;
  }

  setupCollision(player: Player, onHit: () => void): void {
    this.scene.physics.add.overlap(player, this.staticGroup, () => onHit(), undefined, this);
    this.scene.physics.add.overlap(player, this.dynamicGroup, () => onHit(), undefined, this);
  }

  stop(): void { this.stopped = true; }

  handleResize(groundY: number, oldW: number): void {
    this.groundY = groundY;
    const h = this.scene.scale.height;
    const w = this.scene.scale.width;
    const xRatio = w / oldW;

    const coneScale = (h * 0.10) / 135;
    this.staticGroup.getChildren().forEach((obj) => {
      const s = obj as Phaser.Physics.Arcade.Sprite;
      s.x *= xRatio;
      s.y = groundY;
      s.setScale(coneScale);
    });

    const enemyScale = (h * 0.20) / 512;
    this.dynamicGroup.getChildren().forEach((obj) => {
      const s = obj as Phaser.Physics.Arcade.Sprite;
      s.x *= xRatio;
      s.y = groundY;
      s.setScale(enemyScale);
    });
  }

  update(delta: number, speed: number): void {
    if (!this.stopped) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        this.spawnInterval = 1200 + Math.random() * 1200;
        this.spawnObstacle();
      }
    }

    this.staticGroup.getChildren().forEach((obj) => {
      const s = obj as Phaser.Physics.Arcade.Sprite;
      s.x -= speed;
      if (s.x < -100) s.destroy();
    });

    this.dynamicGroup.getChildren().forEach((obj) => {
      const s = obj as Phaser.Physics.Arcade.Sprite;
      s.x -= speed * 1.3;
      if (s.x < -100) s.destroy();
    });
  }

  private spawnObstacle(): void {
    const h = this.scene.scale.height;
    const w = this.scene.scale.width;
    const spacing = h * 0.12;

    // Guarantee at least 3 of each type, then randomize
    let spawnCone: boolean;
    if (this.coneCount < 3 && this.enemyCount >= 3) {
      spawnCone = true;
    } else if (this.enemyCount < 3 && this.coneCount >= 3) {
      spawnCone = false;
    } else if (this.coneCount < 3 && this.enemyCount < 3) {
      // Alternate: first cone, then enemy, etc.
      spawnCone = this.coneCount <= this.enemyCount;
    } else {
      spawnCone = Math.random() < 0.6;
    }

    if (spawnCone) {
      this.coneCount++;
      // Cone + coins above it
      // Place cone so the arc peak (3rd coin) aligns with cone, and all coins start off-screen
      const arcStart = w + 50;
      const coneX = arcStart + spacing * 2; // cone under the peak coin

      const scale = (h * 0.10) / 135;
      const cone = this.staticGroup.create(coneX, this.groundY, 'cone') as Phaser.Physics.Arcade.Sprite;
      cone.setScale(scale);
      cone.setOrigin(0.5, 1);
      const body = cone.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setSize(90, 120);
      body.setOffset(15, 15);

      this.coins?.spawnArcAt(arcStart);
    } else {
      this.enemyCount++;
      // Enemy (no coins - player must avoid)
      const scale = (h * 0.20) / 512;
      const enemy = this.dynamicGroup.create(w + 60, this.groundY, 'enemy') as Phaser.Physics.Arcade.Sprite;
      enemy.setScale(scale);
      enemy.setOrigin(0.5, 1);
      enemy.setFlipX(true);
      enemy.play('enemy-run');
      const body = enemy.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setSize(250, 400);
      body.setOffset(133, 112);
    }
  }

  destroy(): void {
    this.staticGroup.clear(true, true);
    this.dynamicGroup.clear(true, true);
  }
}
