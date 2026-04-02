import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { GameScene } from './game/scenes/GameScene';

function createGame(): Phaser.Game {
  const BASE_H = 600;
  const aspect = window.innerWidth / window.innerHeight;
  const BASE_W = Math.round(BASE_H * aspect);

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: BASE_W,
    height: BASE_H,
    parent: document.body,
    backgroundColor: '#87CEEB',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    input: {
      activePointers: 1,
      touch: {
        capture: true,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, GameScene],
  };

  return new Phaser.Game(config);
}

let game = createGame();

let lastOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
let orientationTimer: ReturnType<typeof setTimeout>;

window.addEventListener('resize', () => {
  clearTimeout(orientationTimer);
  orientationTimer = setTimeout(() => {
    const current = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    if (current !== lastOrientation) {
      lastOrientation = current;
      game.destroy(true);
      game = createGame();
    }
  }, 400);
});
