import Phaser from 'phaser';

export class ParallaxBackground {
  private bg: Phaser.GameObjects.TileSprite;

  constructor(scene: Phaser.Scene) {
    const w = scene.scale.width;
    const h = scene.scale.height;

    // bg-far.png is 1707x704. Scale tile to fill screen height.
    const imgHeight = 656;
    const scale = h / imgHeight;

    this.bg = scene.add.tileSprite(w / 2, h / 2, w / scale, imgHeight, 'bg-far')
      .setScrollFactor(0)
      .setDepth(-3)
      .setScale(scale);
  }

  update(speed: number): void {
    this.bg.tilePositionX += speed * 0.5;
  }
}
