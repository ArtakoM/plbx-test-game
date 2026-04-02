import Phaser from 'phaser';

type PlayerState = 'idle' | 'running' | 'jumping' | 'damaged';

const FRAME_H = 188;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private currentState: PlayerState = 'idle';
  private hp = 3;
  private invulnerable = false;
  private invulnerabilityTimer = 0;
  private static readonly INVULNERABILITY_DURATION = 1500;
  private jumpVelocity: number;

  constructor(scene: Phaser.Scene, x: number, groundY: number) {
    super(scene, x, groundY, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const h = scene.scale.height;
    const scale = (h * 0.20) / FRAME_H;
    this.setScale(scale);
    this.setOrigin(0.5, 1);
    this.setCollideWorldBounds(false);

    this.jumpVelocity = -(h * 1.05);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(80, 158);
    body.setOffset(46, 30);

    this.createAnimations();
    this.play('player-idle');
  }

  private createAnimations(): void {
    const anims = this.scene.anims;

    if (!anims.exists('player-idle')) {
      anims.create({
        key: 'player-idle',
        frames: anims.generateFrameNumbers('player', { start: 0, end: 3 }),
        frameRate: 4,
        repeat: -1,
      });
    }
    if (!anims.exists('player-run')) {
      anims.create({
        key: 'player-run',
        frames: anims.generateFrameNumbers('player', { start: 8, end: 15 }),
        frameRate: 6,
        repeat: -1,
      });
    }
    if (!anims.exists('player-jump')) {
      anims.create({
        key: 'player-jump',
        frames: anims.generateFrameNumbers('player', { start: 16, end: 23 }),
        frameRate: 10,
        repeat: 0,
      });
    }
    if (!anims.exists('player-hit')) {
      anims.create({
        key: 'player-hit',
        frames: anims.generateFrameNumbers('player', { start: 24, end: 27 }),
        frameRate: 8,
        repeat: 0,
      });
    }
  }

  jump(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down) {
      body.setVelocityY(this.jumpVelocity);
      this.setState('jumping');
      this.scene.sound.play('jump-sfx', { volume: 0.8 });
    }
  }

  takeDamage(): boolean {
    if (this.invulnerable) return false;

    this.hp--;
    this.invulnerable = true;
    this.invulnerabilityTimer = Player.INVULNERABILITY_DURATION;
    this.setState('damaged');
    this.setTint(0xff0000);

    this.scene.time.delayedCall(300, () => {
      if (this.currentState === 'damaged') {
        this.setState('running');
      }
    });

    return this.hp <= 0;
  }

  getHP(): number { return this.hp; }
  isInvulnerable(): boolean { return this.invulnerable; }

  updateJumpVelocity(h: number): void {
    this.jumpVelocity = -(h * 1.05);
  }

  setState(state: PlayerState): this {
    this.currentState = state;
    switch (state) {
      case 'idle':    this.play('player-idle', true); break;
      case 'running': this.play('player-run', true);  break;
      case 'jumping': this.play('player-jump', true); break;
      case 'damaged': this.play('player-hit', true);  break;
    }
    return this;
  }

  getState(): PlayerState { return this.currentState; }

  update(_time: number, delta: number): void {
    if (this.invulnerable) {
      this.invulnerabilityTimer -= delta;
      this.setAlpha(Math.sin(this.invulnerabilityTimer * 0.01) > 0 ? 1 : 0.3);
      if (this.invulnerabilityTimer <= 0) {
        this.invulnerable = false;
        this.setAlpha(1);
        this.clearTint();
      }
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.currentState === 'jumping' && body.blocked.down) {
      this.setState('running');
    }
  }
}
