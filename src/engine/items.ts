import type { HealthPotion, Tile, EnemyCharacter } from '../components/types';

export const initializePotions = (
    dungeon: Tile[][],
    enemies: EnemyCharacter[]
): HealthPotion[] => {
    const potions: HealthPotion[] = [];
    const count = Math.floor(Math.random() * 2) + 2; // 2 to 3
    const occupiedPositions = new Set<string>([
        ...enemies.map(e => `${e.x},${e.y}`)
    ]);

    const height = dungeon.length;
    const width = dungeon[0].length;

    while (potions.length < count) {
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);
        const key = `${x},${y}`;
        if (
            dungeon[y][x].tileType === 'floor' &&
            !dungeon[y][x].isStart &&
            !occupiedPositions.has(key)
        ) {
            occupiedPositions.add(key);
            potions.push({ id: crypto.randomUUID(), x, y });
        }
    }

    return potions;
};

export const rollPotionHeal = (): number => {
    return Math.floor(Math.random() * 10) + 1;
};