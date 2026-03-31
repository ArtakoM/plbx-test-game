import Phaser from 'phaser';
import { Player } from '../objects/Player';

export class FinishLine {
  private scene: Phaser.Scene;
  private triggered = false;
  private x: number;
  private graphics: Phaser.GameObjects.Graphics;
  private ropeProgress = 0;
  private zone: Phaser.GameObjects.Zone;
  private groundY: number;

  constructor(scene: Phaser.Scene, x: number, groundY: number) {
    this.scene = scene;
    this.x = x;
    this.groundY = groundY;

    this.graphics = scene.add.graphics().setDepth(5);

    // Invisible trigger zone
    const zoneH = scene.scale.height * 0.3;
    this.zone = scene.add.zone(x, groundY - zoneH / 2, 20, zoneH);
    scene.physics.add.existing(this.zone, false);
    (this.zone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.zone.body as Phaser.Physics.Arcade.Body).setImmovable(true);

    this.draw();
  }

  private draw(): void {
    const g = this.graphics;
    const h = this.scene.scale.height;
    g.clear();

    const poleH = h * 0.35;
    const top = this.groundY - poleH;
    const bottom = this.groundY;
    const poleW = 6;
    const gap = 60;

    // Left pole (white with red stripes)
    for (let y = top; y < bottom; y += 16) {
      g.fillStyle(Math.floor((y - top) / 16) % 2 === 0 ? 0xffffff : 0xff0000);
      g.fillRect(this.x - gap / 2 - poleW / 2, y, poleW, Math.min(16, bottom - y));
    }
    // Right pole
    for (let y = top; y < bottom; y += 16) {
      g.fillStyle(Math.floor((y - top) / 16) % 2 === 0 ? 0xffffff : 0xff0000);
      g.fillRect(this.x + gap / 2 - poleW / 2, y, poleW, Math.min(16, bottom - y));
    }

    // Checkerboard banner between poles at top
    const bannerH = 24;
    const cellSize = 12;
    const bannerLeft = this.x - gap / 2;
    const bannerRight = this.x + gap / 2;
    const cols = Math.ceil((bannerRight - bannerLeft) / cellSize);
    const rows = Math.ceil(bannerH / cellSize);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        g.fillStyle((r + c) % 2 === 0 ? 0x000000 : 0xffffff);
        const cx = bannerLeft + c * cellSize;
        const cy = top + r * cellSize;
        const cw = Math.min(cellSize, bannerRight - cx);
        g.fillRect(cx, cy, cw, cellSize);
      }
    }

    // "FINISH" text above banner
    // (use a second banner line as visual indicator since graphics can't do text easily)
    g.fillStyle(0xffcc00);
    g.fillRect(bannerLeft, top - 8, bannerRight - bannerLeft, 6);

    // Red ribbon/tape across the middle
    if (!this.triggered) {
      const ribbonY = top + bannerH + (bottom - top - bannerH) * 0.35;
      g.lineStyle(4, 0xff0000);
      g.beginPath();
      g.moveTo(this.x - gap / 2, ribbonY);
      g.lineTo(this.x + gap / 2, ribbonY);
      g.strokePath();

      // Second ribbon slightly lower
      g.lineStyle(2, 0xffcc00);
      g.beginPath();
      g.moveTo(this.x - gap / 2, ribbonY + 8);
      g.lineTo(this.x + gap / 2, ribbonY + 8);
      g.strokePath();
    }
  }

  private drawBrokenRibbon(): void {
    const g = this.graphics;
    const h = this.scene.scale.height;
    const poleH = h * 0.35;
    const top = this.groundY - poleH;
    const bannerH = 24;
    const gap = 60;
    const ribbonY = top + bannerH + (this.groundY - top - bannerH) * 0.35;
    const alpha = Math.max(0, 1 - this.ropeProgress);

    // Broken ribbon flying apart
    g.lineStyle(4, 0xff0000, alpha);
    g.beginPath();
    g.moveTo(this.x - gap / 2 - this.ropeProgress * 80, ribbonY - this.ropeProgress * 30);
    g.lineTo(this.x - 5, ribbonY + this.ropeProgress * 15);
    g.strokePath();

    g.beginPath();
    g.moveTo(this.x + 5, ribbonY + this.ropeProgress * 10);
    g.lineTo(this.x + gap / 2 + this.ropeProgress * 80, ribbonY - this.ropeProgress * 40);
    g.strokePath();
  }

  setupOverlap(player: Player, onFinish: () => void): void {
    this.scene.physics.add.overlap(player, this.zone, () => {
      if (!this.triggered) {
        this.triggered = true;
        onFinish();
      }
    });
  }

  update(speed: number): void {
    if (!this.triggered) {
      this.x -= speed;
      this.zone.x = this.x;
    }

    this.draw();

    if (this.triggered && this.ropeProgress < 1) {
      this.ropeProgress += 0.03;
      this.drawBrokenRibbon();
    }
  }

  isTriggered(): boolean {
    return this.triggered;
  }
}
