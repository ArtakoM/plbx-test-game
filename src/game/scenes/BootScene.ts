import Phaser from 'phaser';

import playerImg from '../../../assets/player.png';
import enemyImg from '../../../assets/enemy.webp';
import coneImg from '../../../assets/cone.webp';
import coinImg from '../../../assets/coin.webp';
import bgFarImg from '../../../assets/runner-background.webp';
import bgMusic from '../../../audio/background.mp3';
import coinSfx from '../../../audio/coin.mp3';
import jumpSfx from '../../../audio/jump.mp3';
import failSfx from '../../../audio/fail.mp3';
import winSfx from '../../../audio/win.mp3';

const PLAYER_COLS = 4;
const PLAYER_ROWS = 4;
const PLAYER_FW = 187;
const PLAYER_FH = 192;

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.image('player-raw', playerImg);
    this.load.spritesheet('enemy', enemyImg, {
      frameWidth: 516,
      frameHeight: 512,
    });
    this.load.image('cone', coneImg);
    this.load.image('coin', coinImg);
    this.load.image('bg-far', bgFarImg);
    this.load.audio('bg-music', bgMusic);
    this.load.audio('coin-sfx', coinSfx);
    this.load.audio('jump-sfx', jumpSfx);
    this.load.audio('fail-sfx', failSfx);
    this.load.audio('win-sfx', winSfx);
  }

  create(): void {
    // Process player sheet: center each character within its frame
    const src = this.textures.get('player-raw').getSourceImage() as HTMLImageElement;

    const outW = PLAYER_COLS * PLAYER_FW;
    const outH = PLAYER_ROWS * PLAYER_FH;
    const out = document.createElement('canvas');
    out.width = outW;
    out.height = outH;
    const outCtx = out.getContext('2d')!;

    // Temp canvas for reading individual frames
    const tmp = document.createElement('canvas');
    tmp.width = PLAYER_FW;
    tmp.height = PLAYER_FH;
    const tmpCtx = tmp.getContext('2d')!;

    for (let row = 0; row < PLAYER_ROWS; row++) {
      for (let col = 0; col < PLAYER_COLS; col++) {
        // Extract frame
        tmpCtx.clearRect(0, 0, PLAYER_FW, PLAYER_FH);
        tmpCtx.drawImage(
          src,
          col * PLAYER_FW, row * PLAYER_FH, PLAYER_FW, PLAYER_FH,
          0, 0, PLAYER_FW, PLAYER_FH
        );

        // Find bounding box of non-transparent pixels
        const imgData = tmpCtx.getImageData(0, 0, PLAYER_FW, PLAYER_FH);
        // Use margin to avoid picking up pixels from adjacent rows/cols
        const bounds = this.findBounds(imgData, PLAYER_FW, PLAYER_FH, 12);

        if (bounds) {
          const charW = bounds.right - bounds.left;
          const charH = bounds.bottom - bounds.top;
          // Center horizontally, keep vertical bottom-aligned
          const destX = col * PLAYER_FW + Math.floor((PLAYER_FW - charW) / 2);
          const destY = row * PLAYER_FH + (PLAYER_FH - charH);

          outCtx.drawImage(
            tmp,
            bounds.left, bounds.top, charW, charH,
            destX, destY, charW, charH
          );
        }
      }
    }

    this.textures.addSpriteSheet('player', out as unknown as HTMLImageElement, {
      frameWidth: PLAYER_FW,
      frameHeight: PLAYER_FH,
    });

    this.textures.remove('player-raw');
    this.scene.start('GameScene');
  }

  private findBounds(
    imgData: ImageData, w: number, h: number, margin = 0
  ): { left: number; top: number; right: number; bottom: number } | null {
    const d = imgData.data;
    let left = w, top = h, right = 0, bottom = 0;
    let found = false;

    for (let y = margin; y < h - margin; y++) {
      for (let x = margin; x < w - margin; x++) {
        const a = d[(y * w + x) * 4 + 3];
        // Also skip near-white pixels (background)
        const r = d[(y * w + x) * 4];
        const g = d[(y * w + x) * 4 + 1];
        const b = d[(y * w + x) * 4 + 2];
        if (a > 20 && !(r > 240 && g > 240 && b > 240)) {
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
          found = true;
        }
      }
    }

    return found ? { left, top, right: right + 1, bottom: bottom + 1 } : null;
  }
}
