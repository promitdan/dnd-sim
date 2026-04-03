# The Dungeon of Evil

A browser-based dungeon crawler built with React and TypeScript, inspired by D&D 5e mechanics. Explore a procedurally generated dungeon, fight Skeletons and Bandits, and survive to claim victory.

---

## Gameplay

- **Explore** a procedurally generated dungeon with fog-of-war visibility
- **Trigger combat** by walking into an enemy's line of sight
- **Fight** using a turn-based initiative system with ranged and melee attacks
- **Survive** by managing HP and picking up health potions
- **Win** by defeating every enemy in the dungeon

---

## Controls

### Exploration (out of combat)
| Input | Action |
|---|---|
| Left-click floor tile | Pathfind and walk to that tile |
| Right-click / `C` | Consume adjacent health potion |

### Combat
| Input | Action |
|---|---|
| `A` | Ranged attack (up to 4 tiles) |
| `F` | Focus attack — melee, adjacent only, uses full turn |
| `M` | Move (1 tile) |
| `L` | Long move (2 tiles, uses attack action) |
| `E` | End turn |
| `C` | Consume adjacent health potion |

Actions are two-phase: press the key (or click the button in the sidebar) to select an action, then click the target on the canvas.

---

## Characters

Choose from two classes, each with Male and Female variants:

| Class | Ranged Attack | Melee Attack | Notes |
|---|---|---|---|
| **Warrior** | Arrow (DEX-based) | Sword (STR-based) | Higher base HP and armour |
| **Mage** | Fireball (INT-based) | Staff (STR-based) | Wider sight range |

Stats follow D&D 5e conventions — modifiers are `floor((stat - 10) / 2)`. Wisdom increases sight range; Constitution increases max HP.

---

## Tech Stack

| | |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5.9 |
| Build tool | Vite 8 |
| State management | Zustand 5 |
| Dungeon & pathfinding | [rot-js](https://ondras.github.io/rot.js/hp/) |
| Rendering | HTML5 Canvas (`requestAnimationFrame` game loop) |

---

## Project Structure

```
src/
├── components/         # React UI components (AdventureArea, CharacterCreation, ContextMenu, …)
│   └── types.ts        # Shared TypeScript types
├── engine/             # Pure game logic (no React)
│   ├── combat.ts       # Initiative, attack rolls, damage, turn advancement
│   ├── dungeon.ts      # Procedural dungeon generation (rot-js Digger)
│   ├── enemies.ts      # Enemy spawning and detection
│   └── items.ts        # Health potion spawning and healing
├── hooks/              # React hooks that wire engine logic to the UI
│   ├── useCanvasRenderer.ts   # Game loop + all canvas drawing
│   ├── useEnemyTurn.ts        # Enemy AI (move / attack)
│   ├── useGameAssets.ts       # Image preloading
│   ├── useGameInput.ts        # Mouse + keyboard input handling
│   └── useBackgroundMusic.ts  # Music switching (exploration / combat)
├── state/
│   └── gameStore.ts    # Zustand store — dungeon, entities, player, combat state
└── constants/
    └── spriteMap.ts    # Sprite and cursor image mappings
```

---

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

```bash
npm run build   # production build
npm run preview # preview the production build locally
```
