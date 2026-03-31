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
  private overlayTexts: Phaser.GameObjects.Text[] = [];
  private bgMusic?: Phaser.Sound.BaseSound;
  private bushes: Phaser.GameObjects.Image[] = [];
  private bushTimer = 0;

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

    this.overlayTexts.push(text);
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
    } else if (this.gameState === 'lose' || this.gameState === 'win') {
      this.scene.restart();
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
    this.overlay = this.add.graphics().setScrollFactor(0).setDepth(200);
    this.overlay.fillStyle(0x000000, 0.7);
    this.overlay.fillRect(0, 0, this.w, this.h);

    const fs = Math.min(this.w * 0.06, 48);

    const winText = this.add.text(this.w / 2, this.h * 0.3, 'YOU WIN!', {
      fontFamily: 'Arial',
      fontSize: `${fs}px`,
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const scoreText = this.add.text(this.w / 2, this.h * 0.5, `Score: ${this.coins.getScore()}`, {
      fontFamily: 'Arial',
      fontSize: `${fs * 0.6}px`,
      color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const dlBtn = this.add.text(this.w / 2, this.h * 0.675, '[ Download Game ]', {
      fontFamily: 'Arial',
      fontSize: `${fs * 0.45}px`,
      color: '#00ccff',
      backgroundColor: '#222222',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive();
    dlBtn.on('pointerdown', () => {
      window.open('https://example.com', '_blank');
    });

    const retryText = this.add.text(this.w / 2, this.h * 0.85, 'Tap to Retry', {
      fontFamily: 'Arial',
      fontSize: `${fs * 0.42}px`,
      color: '#ffff00',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.overlayTexts.push(winText, scoreText, dlBtn, retryText);
  }

  private showLoseScreen(): void {
    this.clearOverlay();
    this.overlay = this.add.graphics().setScrollFactor(0).setDepth(200);
    this.overlay.fillStyle(0x000000, 0.7);
    this.overlay.fillRect(0, 0, this.w, this.h);

    const fs = Math.min(this.w * 0.06, 48);

    const loseText = this.add.text(this.w / 2, this.h * 0.375, 'GAME OVER', {
      fontFamily: 'Arial',
      fontSize: `${fs}px`,
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const scoreText = this.add.text(this.w / 2, this.h * 0.575, `Score: ${this.coins.getScore()}`, {
      fontFamily: 'Arial',
      fontSize: `${fs * 0.6}px`,
      color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const retryText = this.add.text(this.w / 2, this.h * 0.775, 'Tap to Retry', {
      fontFamily: 'Arial',
      fontSize: `${fs * 0.5}px`,
      color: '#ffff00',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.overlayTexts.push(loseText, scoreText, retryText);
  }

  private clearOverlay(): void {
    this.overlay?.destroy();
    this.overlay = undefined;
    this.overlayTexts.forEach((t) => t.destroy());
    this.overlayTexts = [];
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
