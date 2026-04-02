import Phaser from 'phaser';
import { Player } from '../objects/Player';

export class FinishLine {
  private scene: Phaser.Scene;
  private triggered = false;
  private x: number;
  private graphics: Phaser.GameObjects.Graphics;
  private zone: Phaser.GameObjects.Zone;
  private groundY: number;
  private playerRef?: Player;
  private breakTime = 0;
  private readonly RIBBON_THICKNESS = 6;
  private readonly RIBBON_SEGMENTS = 20;

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
  }

  private get poleGap(): number {
    return Math.min(this.scene.scale.width * 0.15, 120);
  }

  private get poleHeight(): number {
    return this.scene.scale.height * 0.30;
  }

  private get ribbonY(): number {
    return this.groundY - this.poleHeight * 0.45;
  }

  private get leftPoleX(): number {
    return this.x - this.poleGap / 2;
  }

  private get rightPoleX(): number {
    return this.x + this.poleGap / 2;
  }

  private drawPoles(): void {
    const g = this.graphics;
    const top = this.groundY - this.poleHeight;
    const bottom = this.groundY;
    const poleW = 8;
    const stripeH = 14;

    // Draw both poles with red/white stripes
    const poles = [this.leftPoleX, this.rightPoleX];
    for (const px of poles) {
      for (let y = top; y < bottom; y += stripeH) {
        const stripe = Math.floor((y - top) / stripeH);
        g.fillStyle(stripe % 2 === 0 ? 0xffffff : 0xff0000);
        g.fillRect(px - poleW / 2, y, poleW, Math.min(stripeH, bottom - y));
      }
      // Pole cap (gold ball)
      g.fillStyle(0xffd700);
      g.fillCircle(px, top, 6);
    }

    // Checkerboard banner at top between poles
    const bannerH = 20;
    const cellSize = 10;
    const left = this.leftPoleX + poleW / 2;
    const right = this.rightPoleX - poleW / 2;
    const cols = Math.ceil((right - left) / cellSize);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < cols; c++) {
        g.fillStyle((r + c) % 2 === 0 ? 0x000000 : 0xffffff);
        const cx = left + c * cellSize;
        const cw = Math.min(cellSize, right - cx);
        if (cw > 0) {
          g.fillRect(cx, top + 2 + r * cellSize, cw, cellSize);
        }
      }
    }
  }

  private drawRibbon(): void {
    const g = this.graphics;
    const leftX = this.leftPoleX;
    const rightX = this.rightPoleX;
    const ry = this.ribbonY;
    const playerX = this.playerRef?.x ?? 0;

    // Calculate how much the player is pushing the ribbon
    let pushAmount = 0;
    if (playerX > leftX && playerX < rightX + 30) {
      pushAmount = Math.max(0, (playerX - leftX) / (rightX - leftX));
      pushAmount = Math.min(pushAmount, 1.2);
    }

    // Draw ribbon as a curve (pushed by player)
    const segments = this.RIBBON_SEGMENTS;

    // Top ribbon (red)
    this.drawRibbonCurve(g, leftX, rightX, ry, pushAmount, 0xff0000, this.RIBBON_THICKNESS);
    // Bottom ribbon (gold, slightly below)
    this.drawRibbonCurve(g, leftX, rightX, ry + 10, pushAmount, 0xffcc00, this.RIBBON_THICKNESS - 2);
  }

  private drawRibbonCurve(
    g: Phaser.GameObjects.Graphics,
    leftX: number, rightX: number, baseY: number,
    pushAmount: number, color: number, thickness: number
  ): void {
    const segments = this.RIBBON_SEGMENTS;
    g.lineStyle(thickness, color);
    g.beginPath();

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const segX = leftX + (rightX - leftX) * t;

      // Rope sag (catenary-like curve)
      const sag = Math.sin(t * Math.PI) * 6;

      // Player push deformation - ribbon bends forward at player position
      let pushDeform = 0;
      if (pushAmount > 0) {
        const pushCenter = pushAmount;
        const dist = Math.abs(t - pushCenter);
        if (dist < 0.4) {
          pushDeform = (1 - dist / 0.4) * pushAmount * 25;
        }
      }

      // Small wave wobble for rope feel
      const wobble = Math.sin(t * Math.PI * 4 + this.scene.time.now * 0.003) * 1.5;

      const segY = baseY + sag + wobble;
      const finalX = segX + pushDeform;

      if (i === 0) {
        g.moveTo(finalX, segY);
      } else {
        g.lineTo(finalX, segY);
      }
    }
    g.strokePath();
  }

  private drawBrokenRibbon(): void {
    const g = this.graphics;
    const t = this.breakTime;
    const leftX = this.leftPoleX;
    const rightX = this.rightPoleX;
    const ry = this.ribbonY;
    const alpha = Math.max(0, 1 - t * 0.7);

    // Left half - swings back and curls to the left pole
    this.drawBrokenHalf(g, leftX, ry, -1, t, 0xff0000, this.RIBBON_THICKNESS, alpha);
    this.drawBrokenHalf(g, leftX, ry + 10, -1, t, 0xffcc00, this.RIBBON_THICKNESS - 2, alpha);

    // Right half - swings back and curls to the right pole
    this.drawBrokenHalf(g, rightX, ry, 1, t, 0xff0000, this.RIBBON_THICKNESS, alpha);
    this.drawBrokenHalf(g, rightX, ry + 10, 1, t, 0xffcc00, this.RIBBON_THICKNESS - 2, alpha);
  }

  private drawBrokenHalf(
    g: Phaser.GameObjects.Graphics,
    poleX: number, baseY: number,
    dir: number, t: number, color: number, thickness: number, alpha: number
  ): void {
    const segments = 10;
    const ribbonLen = this.poleGap * 0.6;

    g.lineStyle(thickness, color, alpha);
    g.beginPath();

    for (let i = 0; i <= segments; i++) {
      const s = i / segments;

      // Ribbon hangs from pole, swings with gravity over time
      const swingAngle = Math.PI * 0.5 + Math.sin(t * 3 - s * 2) * Math.max(0, 0.8 - t * 0.3);
      const gravity = s * s * t * 40;
      const curl = Math.sin(s * Math.PI * 2 + t * 4) * (10 * s);

      const px = poleX + dir * s * ribbonLen * Math.cos(swingAngle) * Math.max(0, 1 - t * 0.5);
      const py = baseY + s * ribbonLen * Math.sin(swingAngle) * 0.3 + gravity + curl;

      if (i === 0) {
        g.moveTo(px, py);
      } else {
        g.lineTo(px, py);
      }
    }
    g.strokePath();
  }

  setupOverlap(player: Player, onFinish: () => void): void {
    this.playerRef = player;
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

    this.graphics.clear();
    this.drawPoles();

    if (!this.triggered) {
      this.drawRibbon();
    } else {
      this.breakTime += 0.02;
      if (this.breakTime < 3) {
        this.drawBrokenRibbon();
      }
    }
  }

  isTriggered(): boolean {
    return this.triggered;
  }
}
