import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { ObstacleManager } from '../systems/ObstacleManager';
import { CoinManager } from '../systems/CoinManager';
import { UIManager } from '../systems/UIManager';
import { FinishLine } from '../systems/FinishLine';

type GameState = 'idle' | 'running' | 'win' | 'lose';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private background!: ParallaxBackground;
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
  private banner!: Phaser.GameObjects.Image;

  constructor() {
    super({ key: 'GameScene' });
  }

  private get w(): number { return this.scale.width; }
  private get h(): number { return this.scale.height; }
  // Center of the road in the background image
  private get groundY(): number { return this.h * 0.80; }

  create(): void {
    this.gameState = 'idle';
    this.gameSpeed = 4;
    this.distanceTraveled = 0;
    this.spawningDone = false;

    // Scale gravity to screen height (base: 800 gravity at 400px height)
    this.physics.world.gravity.y = this.h * 2;

    // Invisible ground collider - thick to prevent tunneling at high speeds
    const groundRect = this.add.rectangle(this.w / 2, this.groundY + 50, this.w * 2, 100, 0x000000, 0);
    this.physics.add.existing(groundRect, true);

    // Background
    this.background = new ParallaxBackground(this);

    // Bushes (decorative, on top edge of road)
    this.bushes = [];
    this.bushTimer = 0;
    this.spawnInitialBushes();

    // Player (bottom-anchored, placed at groundY)
    this.player = new Player(this, this.w * 0.15, this.groundY);
    this.physics.add.collider(this.player, groundRect);

    // UI
    this.ui = new UIManager(this);

    // Banner at bottom - pick based on orientation
    const isPortrait = this.h > this.w;
    const bannerKey = isPortrait ? 'banner-pr' : 'banner-ls';
    this.banner = this.add.image(this.w / 2, this.h, bannerKey)
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(150);
    // Scale banner to fill screen width
    const bannerTex = this.textures.get(bannerKey).getSourceImage();
    const bannerScale = this.w / bannerTex.width;
    this.banner.setScale(bannerScale);
    const bannerH = bannerTex.height * bannerScale;

    // Download button on right side of banner
    const btnW = bannerH * 1.4;
    const btnH = bannerH * 0.5;
    const btnX = this.w - btnW / 2 - this.w * 0.08;
    const btnY = this.h - bannerH / 2;
    const btnPadX = btnW * 0.08;
    const btnPadY = btnH * 0.12;
    const fullW = btnW + btnPadX * 2;
    const fullH = btnH + btnPadY * 2;
    const btnRadius = 8;

    // Draw button graphics relative to (0,0) — container position handles placement
    const btnGfx = this.make.graphics({}).setDepth(0);
    // Shadow
    btnGfx.fillStyle(0xc45500, 1);
    btnGfx.fillRoundedRect(-fullW / 2, -fullH / 2 + 3, fullW, fullH, btnRadius);
    // Main button
    btnGfx.fillStyle(0xff8c00, 1);
    btnGfx.fillRoundedRect(-fullW / 2, -fullH / 2, fullW, fullH, btnRadius);
    // Highlight
    btnGfx.fillStyle(0xffb347, 0.6);
    btnGfx.fillRoundedRect(-fullW / 2 + 3, -fullH / 2 + 2, fullW - 6, fullH * 0.38, { tl: btnRadius, tr: btnRadius, bl: 0, br: 0 });

    const btnText = this.make.text({
      x: 0, y: 0,
      text: 'DOWNLOAD',
      style: {
        fontFamily: 'Arial',
        fontStyle: '900',
        fontSize: `${btnH * 0.3}px`,
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      },
    }).setOrigin(0.5).setDepth(1);

    // Container at button center — scaling happens from center
    const btnContainer = this.add.container(btnX, btnY, [btnGfx, btnText])
      .setScrollFactor(0)
      .setDepth(151);

    // Smooth continuous pulse
    this.tweens.add({
      targets: btnContainer,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Make button interactive
    const hitZone = this.add.zone(btnX, btnY, fullW, fullH)
      .setScrollFactor(0)
      .setDepth(153)
      .setInteractive();
    hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      window.open('https://example.com', '_blank');
    });

    // Obstacles
    this.obstacles = new ObstacleManager(this, this.groundY);
    this.obstacles.setupCollision(this.player, () => this.handlePlayerHit());

    // Coins (spawned by obstacle manager above cones)
    this.coins = new CoinManager(this, this.groundY);
    this.coins.setupOverlap(this.player, (score) => this.ui.updateScore(score));
    this.obstacles.setCoinManager(this.coins);

    // Finish line
    this.finishLine = new FinishLine(this, this.FINISH_DISTANCE, this.groundY);
    this.finishLine.setupOverlap(this.player, () => this.handleWin());

    // Start screen
    this.showStartScreen();

    // Input
    this.input.on('pointerdown', () => this.handleInput());
    this.input.keyboard?.on('keydown-SPACE', () => this.handleInput());

    // Handle resize
    this.scale.on('resize', () => this.scene.restart());
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
    this.ui.updateHP(this.player.getHP());

    if (dead) {
      this.handleLose();
    }
  }

  private handleWin(): void {
    this.gameState = 'win';
    this.obstacles.stop();
    this.coins.stop();
    this.bgMusic?.stop();
    this.sound.play('win-sfx', { volume: 0.6 });
    this.showWinScreen();
  }

  private handleLose(): void {
    this.gameState = 'lose';
    this.bgMusic?.stop();
    this.sound.play('fail-sfx', { volume: 0.6 });
    this.showLoseScreen();
  }

  private showWinScreen(): void {
    this.clearOverlay();

    // Pause physics
    this.physics.pause();

    // Semi-transparent overlay
    this.overlay = this.add.graphics().setScrollFactor(0).setDepth(200);
    this.overlay.fillStyle(0x000000, 0.6);
    this.overlay.fillRect(0, 0, this.w, this.h);

    const cx = this.w / 2;
    const s = Math.min(this.w, this.h);
    const titleFs = s * 0.07;
    const subFs = titleFs * 0.55;
    const gap = s * 0.04;

    // Measure coin size
    const coinSize = s * 0.35;
    const coinScale = coinSize / 581;

    // Button dimensions
    const btnW = s * 0.55;
    const btnH = btnW * 0.22;

    // Calculate total content height and center vertically
    const totalH = titleFs + gap + subFs + gap + coinSize + gap + btnH;
    let y = (this.h - totalH) / 2;

    // "Congratulations!"
    const congratsText = this.add.text(cx, y, 'Congratulations!', {
      fontFamily: 'Arial',
      fontStyle: '900',
      fontSize: `${titleFs}px`,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(201);
    y += congratsText.height + gap;

    // "Choose your reward!"
    const rewardText = this.add.text(cx, y, 'Choose your reward!', {
      fontFamily: 'Arial',
      fontStyle: '700',
      fontSize: `${subFs}px`,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(201);
    y += rewardText.height + gap;

    // Flash star behind coin
    const coinY = y + coinSize / 2;
    const starScale = coinScale * 5.1;
    const flashStar = this.add.image(cx, coinY, 'flash-star')
      .setScale(starScale)
      .setScrollFactor(0)
      .setDepth(200.5);

    this.tweens.add({
      targets: flashStar,
      angle: 360,
      duration: 4000,
      repeat: -1,
      ease: 'Linear',
    });

    // Big coin with score inside
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
    const btnPadX = btnW * 0.06;
    const btnPadY = btnH * 0.15;
    const fullW = btnW + btnPadX * 2;
    const fullH = btnH + btnPadY * 2;
    const btnRadius = 8;

    const btnGfx = this.make.graphics({}).setDepth(0);
    // Shadow
    btnGfx.fillStyle(0xc45500, 1);
    btnGfx.fillRoundedRect(-fullW / 2, -fullH / 2 + 3, fullW, fullH, btnRadius);
    // Main button
    btnGfx.fillStyle(0xff8c00, 1);
    btnGfx.fillRoundedRect(-fullW / 2, -fullH / 2, fullW, fullH, btnRadius);
    // Highlight
    btnGfx.fillStyle(0xffb347, 0.6);
    btnGfx.fillRoundedRect(-fullW / 2 + 3, -fullH / 2 + 2, fullW - 6, fullH * 0.38, { tl: btnRadius, tr: btnRadius, bl: 0, br: 0 });

    const btnText = this.make.text({
      x: 0, y: 0,
      text: 'INSTALL AND EARN',
      style: {
        fontFamily: 'Arial',
        fontStyle: '900',
        fontSize: `${btnH * 0.4}px`,
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      },
    }).setOrigin(0.5).setDepth(1);

    const btnContainer = this.add.container(cx, btnY, [btnGfx, btnText])
      .setScrollFactor(0)
      .setDepth(201);

    // Pulse animation
    this.tweens.add({
      targets: btnContainer,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Button click
    const hitZone = this.add.zone(cx, btnY, fullW, fullH)
      .setScrollFactor(0)
      .setDepth(203)
      .setInteractive();
    hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      window.open('https://example.com', '_blank');
    });

    this.overlayObjects.push(congratsText, rewardText, flashStar, bigCoin, scoreInCoin, btnContainer, hitZone);
  }

  private showLoseScreen(): void {
    this.clearOverlay();

    // Pause physics
    this.physics.pause();

    // Semi-transparent overlay
    this.overlay = this.add.graphics().setScrollFactor(0).setDepth(200);
    this.overlay.fillStyle(0x000000, 0.6);
    this.overlay.fillRect(0, 0, this.w, this.h);

    const cx = this.w / 2;
    const s = Math.min(this.w, this.h);
    const titleFs = s * 0.07;
    const subFs = titleFs * 0.55;
    const gap = s * 0.04;

    // Coin + star size
    const coinSize = s * 0.35;
    const coinScale = coinSize / 581;
    const starScale = coinScale * 5.1;

    // Button dimensions
    const btnW = s * 0.55;
    const btnH = btnW * 0.22;

    // Calculate total content height and center vertically
    const totalH = titleFs + gap + subFs + gap + coinSize + gap + btnH;
    let y = (this.h - totalH) / 2;

    // "You didn't make it!"
    const loseText = this.add.text(cx, y, "You didn't make it!", {
      fontFamily: 'Arial',
      fontStyle: '900',
      fontSize: `${titleFs}px`,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(201);
    y += loseText.height + gap;

    // "Try again on the app!"
    const tryAgainText = this.add.text(cx, y, 'Try again on the app!', {
      fontFamily: 'Arial',
      fontStyle: '700',
      fontSize: `${subFs}px`,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(201);
    y += tryAgainText.height + gap;

    // Flash star behind coin
    const coinY = y + coinSize / 2;
    const flashStar = this.add.image(cx, coinY, 'flash-star')
      .setScale(starScale)
      .setScrollFactor(0)
      .setDepth(200.5);

    this.tweens.add({
      targets: flashStar,
      angle: 360,
      duration: 4000,
      repeat: -1,
      ease: 'Linear',
    });

    // Big coin with score inside
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

    // "INSTALL AND EARN" button (red variant)
    const btnY = y + btnH / 2;
    const btnPadX = btnW * 0.06;
    const btnPadY = btnH * 0.15;
    const fullW = btnW + btnPadX * 2;
    const fullH = btnH + btnPadY * 2;
    const btnRadius = 8;

    const btnGfx = this.make.graphics({}).setDepth(0);
    // Shadow
    btnGfx.fillStyle(0x8b0000, 1);
    btnGfx.fillRoundedRect(-fullW / 2, -fullH / 2 + 3, fullW, fullH, btnRadius);
    // Main button
    btnGfx.fillStyle(0xdd2222, 1);
    btnGfx.fillRoundedRect(-fullW / 2, -fullH / 2, fullW, fullH, btnRadius);
    // Highlight
    btnGfx.fillStyle(0xff6666, 0.6);
    btnGfx.fillRoundedRect(-fullW / 2 + 3, -fullH / 2 + 2, fullW - 6, fullH * 0.38, { tl: btnRadius, tr: btnRadius, bl: 0, br: 0 });

    const btnText = this.make.text({
      x: 0, y: 0,
      text: 'INSTALL AND EARN',
      style: {
        fontFamily: 'Arial',
        fontStyle: '900',
        fontSize: `${btnH * 0.4}px`,
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      },
    }).setOrigin(0.5).setDepth(1);

    const btnContainer = this.add.container(cx, btnY, [btnGfx, btnText])
      .setScrollFactor(0)
      .setDepth(201);

    // Pulse animation
    this.tweens.add({
      targets: btnContainer,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Button click
    const hitZone = this.add.zone(cx, btnY, fullW, fullH)
      .setScrollFactor(0)
      .setDepth(203)
      .setInteractive();
    hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      window.open('https://example.com', '_blank');
    });

    this.overlayObjects.push(loseText, tryAgainText, flashStar, bigCoin, scoreInCoin, btnContainer, hitZone);
  }

  private clearOverlay(): void {
    this.overlay?.destroy();
    this.overlay = undefined;
    this.overlayObjects.forEach((t) => t.destroy());
    this.overlayObjects = [];
  }

  update(time: number, delta: number): void {
    if (this.gameState === 'idle') return;

    if (this.gameState === 'running') {
      this.player.update(time, delta);
      this.background.update(this.gameSpeed);
      this.obstacles.update(delta, this.gameSpeed);
      this.coins.update(delta, this.gameSpeed);
      this.finishLine.update(this.gameSpeed);
      this.updateBushes(delta, this.gameSpeed);

      this.distanceTraveled += this.gameSpeed;
      this.gameSpeed = 4 + this.distanceTraveled * 0.0002;

      // Stop spawning just before finish line enters the screen
      if (!this.spawningDone && this.distanceTraveled >= this.FINISH_DISTANCE - this.w - 200) {
        this.spawningDone = true;
        this.obstacles.stop();
        this.coins.stop();
      }
    }

    // On win/lose: keep player physics updating (landing) but stop scrolling
    if (this.gameState === 'win' || this.gameState === 'lose') {
      this.player.update(time, delta);
      this.finishLine.update(0);
    }
  }

  private spawnInitialBushes(): void {
    // Scatter bushes across the screen at start
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
      // Trees stretch from road top all the way to the top of the screen
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
    // Scroll existing bushes
    for (let i = this.bushes.length - 1; i >= 0; i--) {
      this.bushes[i].x -= speed * 0.7;
      if (this.bushes[i].x < -100) {
        this.bushes[i].destroy();
        this.bushes.splice(i, 1);
      }
    }

    // Spawn new bushes
    this.bushTimer += delta;
    if (this.bushTimer >= 800 + Math.random() * 600) {
      this.bushTimer = 0;
      this.spawnBush(this.w + 80);
    }
  }
}
