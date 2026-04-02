import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { GameScene } from './game/scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: document.body,
  backgroundColor: '#87CEEB',
  antialias: true,
  roundPixels: true,
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
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene],
};

const game = new Phaser.Game(config);

// Force Phaser to resize on mobile orientation changes
// Mobile browsers don't always fire resize events reliably
function forceResize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  game.scale.resize(w, h);
}

window.addEventListener('resize', forceResize);
window.addEventListener('orientationchange', () => {
  // Mobile needs a delay for the viewport to settle
  setTimeout(forceResize, 100);
  setTimeout(forceResize, 300);
});
