# Runner Game

A 2D endless runner game built with Phaser 3, TypeScript, and Vite. Designed as a mobile-first playable ad that builds to a single self-contained HTML file.

## Features

- Side-scrolling runner with jump mechanics
- Animated player with idle, run, jump, and hit states
- Obstacles: traffic cones and running enemies
- Coin collection system with triangular arc patterns
- 3 HP health system with invulnerability frames
- Parallax background with decorative bushes, trees, and street lamps
- Finish line with rope/ribbon stretch and snap effect
- Confetti effect on win
- Win and lose screens with animated CTA buttons
- Bottom banner with orientation-aware assets (portrait/landscape)
- Background music and sound effects (jump, coin, damage, win, fail)
- Compliment phrases on coin collection
- Fully responsive across all screen sizes and orientations
- Delta-time normalized movement for consistent speed across refresh rates
- Single HTML file build output (~2MB)

## Tech Stack

- **Phaser 3** - Game framework
- **TypeScript** - Type-safe development
- **Vite** - Build tool and dev server
- **vite-plugin-singlefile** - Inlines all assets into a single HTML file

## Getting Started

### Prerequisites

- Node.js 18+

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

Output: `dist/index.html` - a single self-contained HTML file with all assets inlined.

### Preview Build

```bash
npm run preview
```

## Assets

All game assets (sprites, backgrounds, decorations) were generated with [Nano Banana](https://nanobanana.com).

## Project Structure

```
src/
  main.ts                     # Phaser game config and entry point
  vite-env.d.ts               # Type declarations for asset imports
  game/
    scenes/
      BootScene.ts             # Asset loading and player sprite processing
      GameScene.ts             # Main game logic, UI, screens
    objects/
      Player.ts                # Player class with animations and physics
    systems/
      ParallaxBackground.ts    # Scrolling background
      ObstacleManager.ts       # Cone and enemy spawning
      CoinManager.ts           # Coin arc spawning and collection
      UIManager.ts             # Health and score display
      FinishLine.ts            # Finish line with rope effect
assets/                        # Game images (webp)
  decorations/                 # Bushes, trees, street lamps
audio/                         # Sound effects and music (mp3)
```

## Deployment

```bash
npm run build
npx vercel deploy dist/ --prod --yes
```
