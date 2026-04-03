import { create } from 'zustand';
import type { Tile, EnemyCharacter, HealthPotion, CombatState, PlayerCharacter } from '../components/types';
import type { PlayerAction } from '../components/ContextMenu';
import { generateDungeon } from '../engine/dungeon';
import { initializeEnemies } from '../engine/enemies';
import { initializePotions } from '../engine/items';

const DUNGEON_WIDTH = 30;
const DUNGEON_HEIGHT = 15;

interface Position {
    x: number;
    y: number;
}

interface GameStore {
    // Map
    dungeon: Tile[][]
    visibleTiles: Set<string>
    exploredTiles: Set<string>

    // Entities
    enemies: EnemyCharacter[]
    potions: HealthPotion[]

    // Player
    playerPosition: Position
    playerHp: number
    playerMaxHp: number
    sightRange: number

    // Combat
    combatState: CombatState | null
    pendingAction: PlayerAction | null

    // Actions
    initGame: (playerCharacter: PlayerCharacter) => void
    setEnemies: (enemies: EnemyCharacter[]) => void
    updateEnemy: (id: string, updates: Partial<EnemyCharacter>) => void
    setPotions: (potions: HealthPotion[]) => void
    removePotion: (id: string) => void
    setPlayerPosition: (pos: Position) => void
    setPlayerHp: (hp: number | ((prev: number) => number)) => void
    setCombatState: (state: CombatState | null) => void
    updateCombatState: (updater: (prev: CombatState) => CombatState) => void
    setPendingAction: (action: PlayerAction | null) => void
    updateFOV: (x: number, y: number, sightRange: number) => void
    revealTile: (x: number, y: number) => void
}

const getTileKey = (x: number, y: number): string => `${x},${y}`;

const computeFOV = (
    dungeon: Tile[][],
    playerX: number,
    playerY: number,
    sightRange: number,
    existingExplored: Set<string>
): { visibleTiles: Set<string>; exploredTiles: Set<string> } => {
    const visibleTiles = new Set<string>();
    const exploredTiles = new Set<string>(existingExplored);

    const height = dungeon.length;
    const width = dungeon[0].length;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const distance = Math.max(
                Math.abs(x - playerX),
                Math.abs(y - playerY)
            );
            if (distance <= sightRange) {
                const key = getTileKey(x, y);
                visibleTiles.add(key);
                exploredTiles.add(key);
            }
        }
    }

    return { visibleTiles, exploredTiles };
};

export const useGameStore = create<GameStore>((set) => ({
    dungeon: [],
    visibleTiles: new Set(),
    exploredTiles: new Set(),
    enemies: [],
    potions: [],
    playerPosition: { x: 0, y: 0 },
    playerHp: 0,
    playerMaxHp: 0,
    sightRange: 3,
    combatState: null,
    pendingAction: null,

    initGame: (playerCharacter: PlayerCharacter) => {
        const dungeon = generateDungeon(DUNGEON_WIDTH, DUNGEON_HEIGHT);

        // Find start tile
        const startY = dungeon.findIndex(row => row.some(tile => tile.isStart));
        const startX = dungeon[startY].findIndex(tile => tile.isStart);
        const startPos = { x: startX, y: startY };

        // Compute sight range from wisdom
        const sightRange = 3 + Math.floor((playerCharacter.stats.wisdom - 10) / 2);

        // Initialize entities
        const skeletonCount = Math.floor(Math.random() * 3) + 2;
        const banditCount = Math.floor(Math.random() * 3) + 2;
        const enemies = initializeEnemies(dungeon, skeletonCount, banditCount);
        const potions = initializePotions(dungeon, enemies);

        // Compute initial FOV
        const { visibleTiles, exploredTiles } = computeFOV(
            dungeon,
            startX,
            startY,
            sightRange,
            new Set()
        );

        set({
            dungeon,
            enemies,
            potions,
            playerPosition: startPos,
            playerHp: playerCharacter.maxHp,
            playerMaxHp: playerCharacter.maxHp,
            sightRange,
            visibleTiles,
            exploredTiles,
            combatState: null,
            pendingAction: null
        });
    },

    setEnemies: (enemies) => set({ enemies }),

    updateEnemy: (id, updates) => set(state => ({
        enemies: state.enemies.map(e =>
            e.id === id ? { ...e, ...updates } : e
        )
    })),

    setPotions: (potions) => set({ potions }),

    removePotion: (id) => set(state => ({
        potions: state.potions.filter(p => p.id !== id)
    })),

    setPlayerPosition: (pos) => set({ playerPosition: pos }),

    setPlayerHp: (hp) => set(state => ({
        playerHp: typeof hp === 'function' ? hp(state.playerHp) : hp
    })),

    setCombatState: (combatState) => set({ combatState }),

    updateCombatState: (updater) => set(state => {
        if (!state.combatState) return state;
        return { combatState: updater(state.combatState) };
    }),

    setPendingAction: (pendingAction) => set({ pendingAction }),

    updateFOV: (x, y, sightRange) => set(state => {
        const { visibleTiles, exploredTiles } = computeFOV(
            state.dungeon,
            x, y,
            sightRange,
            state.exploredTiles
        );
        return { visibleTiles, exploredTiles };
    }),

    revealTile: (x, y) => set(state => {
        const key = getTileKey(x, y);
        if (state.visibleTiles.has(key) && state.exploredTiles.has(key)) {
            return state; // no change needed
        }
        return {
            visibleTiles: new Set([...state.visibleTiles, key]),
            exploredTiles: new Set([...state.exploredTiles, key])
        };
    }),
}));

// Selector hooks for clean component access
export const useDungeon = () => useGameStore(s => s.dungeon);
export const useEnemies = () => useGameStore(s => s.enemies);
export const usePotions = () => useGameStore(s => s.potions);
export const usePlayerPosition = () => useGameStore(s => s.playerPosition);
export const usePlayerHp = () => useGameStore(s => s.playerHp);
export const useCombatState = () => useGameStore(s => s.combatState);
export const usePendingAction = () => useGameStore(s => s.pendingAction);
export const useVisibleTiles = () => useGameStore(s => s.visibleTiles);
export const useExploredTiles = () => useGameStore(s => s.exploredTiles);