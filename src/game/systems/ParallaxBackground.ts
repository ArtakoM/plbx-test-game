import Phaser from 'phaser';

export class ParallaxBackground {
  private bg: Phaser.GameObjects.TileSprite;
  private scene: Phaser.Scene;
  private static readonly IMG_H = 656;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const w = scene.scale.width;
    const h = scene.scale.height;
    const scale = h / ParallaxBackground.IMG_H;

    this.bg = scene.add.tileSprite(w / 2, h / 2, w / scale, ParallaxBackground.IMG_H, 'bg-far')
      .setScrollFactor(0)
      .setDepth(-3)
      .setScale(scale);
  }

  update(speed: number): void {
    this.bg.tilePositionX += speed * 0.5;
  }

  handleResize(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const scale = h / ParallaxBackground.IMG_H;
    this.bg.setPosition(w / 2, h / 2);
    this.bg.width = w / scale;
    this.bg.setScale(scale);
  }
}
