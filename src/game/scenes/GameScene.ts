import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { ObstacleManager } from '../systems/ObstacleManager';
import { CoinManager } from '../systems/CoinManager';
import { UIManager } from '../systems/UIManager';
import { FinishLine } from '../systems/FinishLine';

type GameState = 'idle' | 'running' | 'win' | 'lose';

interface ButtonColors {
  shadow: number;
  main: number;
  highlight: number;
}

const ORANGE_BTN: ButtonColors = { shadow: 0xc45500, main: 0xff8c00, highlight: 0xffb347 };
const RED_BTN: ButtonColors = { shadow: 0x8b0000, main: 0xdd2222, highlight: 0xff6666 };

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private obstacles!: ObstacleManager;
  private coins!: CoinManager;
  private ui!: UIManager;
  private finishLine!: FinishLine;
  private gameState: GameState = 'idle';
  private gameSpeed = 4;
  private distanceTraveled = 0;
  private readonly FINISH_DISTANCE = 5000;
  private spawningDone = false;
  private overlay?: Phaser.GameObjects.Graphics;
  private overlayObjects: Phaser.GameObjects.GameObject[] = [];
  private bgMusic?: Phaser.Sound.BaseSound;
  private bushes: Phaser.GameObjects.Image[] = [];
  private bushTimer = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  private get w(): number { return this.scale.width; }
  private get h(): number { return this.scale.height; }
  private get groundY(): number { return this.h * 0.80; }

  create(): void {
    this.gameState = 'idle';
    this.gameSpeed = 4;
    this.distanceTraveled = 0;
    this.spawningDone = false;

    this.physics.world.gravity.y = this.h * 2;

    const groundRect = this.add.rectangle(this.w / 2, this.groundY + 50, this.w * 2, 100, 0x000000, 0);
    this.physics.add.existing(groundRect, true);

    new ParallaxBackground(this);

    this.bushes = [];
    this.bushTimer = 0;
    this.spawnInitialBushes();

    this.player = new Player(this, this.w * 0.15, this.groundY);
    this.physics.add.collider(this.player, groundRect);

    this.ui = new UIManager(this);
    this.createBanner();

    this.obstacles = new ObstacleManager(this, this.groundY);
    this.obstacles.setupCollision(this.player, () => this.handlePlayerHit());

    this.coins = new CoinManager(this, this.groundY);
    this.coins.setupOverlap(this.player, (score) => this.ui.updateScore(score));
    this.obstacles.setCoinManager(this.coins);

    this.finishLine = new FinishLine(this, this.FINISH_DISTANCE, this.groundY);
    this.finishLine.setupOverlap(this.player, () => this.handleWin());

    this.showStartScreen();

    this.input.on('pointerdown', () => this.handleInput());
    this.input.keyboard?.on('keydown-SPACE', () => this.handleInput());
    this.scale.on('resize', () => this.scene.restart());
  }

  private createBanner(): void {
    const isPortrait = this.h > this.w;
    const bannerKey = isPortrait ? 'banner-pr' : 'banner-ls';
    const banner = this.add.image(this.w / 2, this.h, bannerKey)
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(150);

    const bannerTex = this.textures.get(bannerKey).getSourceImage();
    const bannerScale = this.w / bannerTex.width;
    banner.setScale(bannerScale);
    const bannerH = bannerTex.height * bannerScale;

    const btnW = bannerH * 1.4;
    const btnH = bannerH * 0.5;
    const btnX = this.w - btnW / 2 - this.w * 0.08;
    const btnY = this.h - bannerH / 2;

    this.createButton(btnX, btnY, btnW, btnH, 'DOWNLOAD', ORANGE_BTN, 151, () => {
      window.open('https://example.com', '_blank');
    });
  }

  private createButton(
    x: number, y: number, w: number, h: number,
    label: string, colors: ButtonColors, depth: number,
    onClick: () => void, pulse = true,
  ): Phaser.GameObjects.Container {
    const padX = w * 0.06;
    const padY = h * 0.15;
    const fullW = w + padX * 2;
    const fullH = h + padY * 2;
    const radius = 8;

    const gfx = this.make.graphics({}).setDepth(0);
    gfx.fillStyle(colors.shadow, 1);
    gfx.fillRoundedRect(-fullW / 2, -fullH / 2 + 3, fullW, fullH, radius);
    gfx.fillStyle(colors.main, 1);
    gfx.fillRoundedRect(-fullW / 2, -fullH / 2, fullW, fullH, radius);
    gfx.fillStyle(colors.highlight, 0.6);
    gfx.fillRoundedRect(-fullW / 2 + 3, -fullH / 2 + 2, fullW - 6, fullH * 0.38,
      { tl: radius, tr: radius, bl: 0, br: 0 });

    const text = this.make.text({
      x: 0, y: 0,
      text: label,
      style: {
        fontFamily: 'Arial',
        fontStyle: '900',
        fontSize: `${h * 0.35}px`,
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      },
    }).setOrigin(0.5).setDepth(1);

    const container = this.add.container(x, y, [gfx, text])
      .setScrollFactor(0)
      .setDepth(depth);

    if (pulse) {
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const hitZone = this.add.zone(x, y, fullW, fullH)
      .setScrollFactor(0)
      .setDepth(depth + 2)
      .setInteractive();
    hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      onClick();
    });

    return container;
  }

  private showStartScreen(): void {
    this.clearOverlay();

    const text = this.add.text(this.w / 2, this.h / 2, 'Tap to start\nearning!', {
      fontFamily: 'Arial',
      fontStyle: '600',
      fontSize: `${Math.min(this.w * 0.08, 64)}px`,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.overlayObjects.push(text);
  }

  private handleInput(): void {
    if (this.gameState === 'idle') {
      this.gameState = 'running';
      this.player.setState('running');
      this.clearOverlay();
      this.bgMusic = this.sound.add('bg-music', { loop: true, volume: 0.20 });
      this.bgMusic.play();
    } else if (this.gameState === 'running') {
      this.player.jump();
    }
  }

  private handlePlayerHit(): void {
    if (this.player.isInvulnerable() || this.gameState !== 'running') return;

    const dead = this.player.takeDamage();
    this.sound.play('damage-sfx', { volume: 0.5 });
    this.ui.updateHP(this.player.getHP());

    if (dead) {
      this.handleLose();
    }
  }

  private handleWin(): void {
    this.gameState = 'win';
    this.obstacles.stop();
    this.coins.stop();
    this.player.setState('idle');
    this.bgMusic?.stop();
    this.sound.play('win-sfx', { volume: 0.6 });
    this.showEndScreen('Congratulations!', 'Choose your reward!', ORANGE_BTN);
  }

  private handleLose(): void {
    this.gameState = 'lose';
    this.bgMusic?.stop();
    this.sound.play('fail-sfx', { volume: 0.6 });
    this.showEndScreen("You didn't make it!", 'Try again on the app!', RED_BTN);
  }

  private showEndScreen(title: string, subtitle: string, btnColors: ButtonColors): void {
    this.clearOverlay();
    this.physics.pause();

    this.overlay = this.add.graphics().setScrollFactor(0).setDepth(200);
    this.overlay.fillStyle(0x000000, 0.6);
    this.overlay.fillRect(0, 0, this.w, this.h);

    const cx = this.w / 2;
    const s = Math.min(this.w, this.h);
    const titleFs = s * 0.07;
    const subFs = titleFs * 0.55;
    const gap = s * 0.04;

    const coinSize = s * 0.35;
    const coinScale = coinSize / 581;
    const btnW = s * 0.55;
    const btnH = btnW * 0.22;

    const totalH = titleFs + gap + subFs + gap + coinSize + gap + btnH;
    let y = (this.h - totalH) / 2;

    const titleText = this.add.text(cx, y, title, {
      fontFamily: 'Arial',
      fontStyle: '900',
      fontSize: `${titleFs}px`,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(201);
    y += titleText.height + gap;

    const subText = this.add.text(cx, y, subtitle, {
      fontFamily: 'Arial',
      fontStyle: '700',
      fontSize: `${subFs}px`,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(201);
    y += subText.height + gap;

    const coinY = y + coinSize / 2;

    const flashStar = this.add.image(cx, coinY, 'flash-star')
      .setScale(coinScale * 5.1)
      .setScrollFactor(0)
      .setDepth(200.5);

    this.tweens.add({
      targets: flashStar,
      angle: 360,
      duration: 4000,
      repeat: -1,
      ease: 'Linear',
    });

    const bigCoin = this.add.image(cx, coinY, 'coin')
      .setScale(coinScale)
      .setScrollFactor(0)
      .setDepth(201);

    const scoreInCoin = this.add.text(cx, coinY, `${this.coins.getScore()}`, {
      fontFamily: 'Arial',
      fontStyle: '900',
      fontSize: `${titleFs}px`,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202);
    y += coinSize + gap;

    const btnY = y + btnH / 2;
    const btnContainer = this.createButton(cx, btnY, btnW, btnH, 'INSTALL AND EARN', btnColors, 201, () => {
      window.open('https://example.com', '_blank');
    });

    this.overlayObjects.push(titleText, subText, flashStar, bigCoin, scoreInCoin, btnContainer);
  }

  private clearOverlay(): void {
    this.overlay?.destroy();
    this.overlay = undefined;
    this.overlayObjects.forEach((obj) => obj.destroy());
    this.overlayObjects = [];
  }

  update(time: number, delta: number): void {
    if (this.gameState === 'idle') return;

    if (this.gameState === 'running') {
      this.player.update(time, delta);
      this.obstacles.update(delta, this.gameSpeed);
      this.coins.update(delta, this.gameSpeed);
      this.finishLine.update(this.gameSpeed);
      this.updateBushes(delta, this.gameSpeed);

      this.distanceTraveled += this.gameSpeed;
      this.gameSpeed = 4 + this.distanceTraveled * 0.0002;

      if (!this.spawningDone && this.distanceTraveled >= this.FINISH_DISTANCE - this.w * 2) {
        this.spawningDone = true;
        this.obstacles.stop();
        this.coins.stop();
      }
    }

    if (this.gameState === 'win' || this.gameState === 'lose') {
      this.player.update(time, delta);
      this.finishLine.update(0);
    }
  }

  private spawnInitialBushes(): void {
    for (let x = 100; x < this.w; x += 200 + Math.random() * 250) {
      this.spawnBush(x);
    }
  }

  private spawnBush(x: number): void {
    const items = ['bush-1', 'bush-2', 'bush-3', 'tree-1', 'tree-2', 'street-lamp'];
    const key = items[Math.floor(Math.random() * items.length)];
    const roadTopY = this.h * 0.64;
    const isTree = key.startsWith('tree');
    const isLamp = key === 'street-lamp';

    let scale: number;
    if (isTree) {
      const treeTex = this.textures.get(key).getSourceImage();
      scale = roadTopY / treeTex.height;
    } else if (isLamp) {
      scale = (this.h * 0.20) / 200;
    } else {
      scale = (this.h * 0.08) / 200;
    }

    const tex = this.textures.get(key).getSourceImage();
    const halfW = (tex.width * scale) / 2;
    const spawnX = Math.max(x, this.w + halfW + 20);

    const deco = this.add.image(spawnX, roadTopY, key)
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setDepth(-1);
    this.bushes.push(deco);
  }

  private updateBushes(delta: number, speed: number): void {
    for (let i = this.bushes.length - 1; i >= 0; i--) {
      this.bushes[i].x -= speed * 0.7;
      if (this.bushes[i].x < -100) {
        this.bushes[i].destroy();
        this.bushes.splice(i, 1);
      }
    }

    this.bushTimer += delta;
    if (this.bushTimer >= 800 + Math.random() * 600) {
      this.bushTimer = 0;
      this.spawnBush(this.w + 80);
    }
  }
}
