// import { FOV } from 'rot-js';
import type { EnemyCharacter, Tile } from '../components/types';

const getRandomFloorPosition = (
    dungeon: Tile[][],
    occupiedPositions: Set<string>
): { x: number; y: number } => {
    const height = dungeon.length;
    const width = dungeon[0].length;
    while (true) {
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);
        const key = `${x},${y}`;
        if (dungeon[y][x].tileType === 'floor' && !dungeon[y][x].isStart && !occupiedPositions.has(key)) {
            occupiedPositions.add(key);
            return { x, y };
        }
    }
}

export const initializeEnemies = (dungeon: Tile[][], SKELETON_COUNT: number, BANDIT_COUNT: number): EnemyCharacter[] => {
    const enemies: EnemyCharacter[] = [];
    const occupiedPositions = new Set<string>();

    for (let i = 0; i < SKELETON_COUNT; i++) {
        const pos = getRandomFloorPosition(dungeon, occupiedPositions);
        enemies.push({
            id: crypto.randomUUID(),
            name: 'Skeleton',
            characterClass: 'Undead',
            enemyType: 'Skeleton',
            vision: 2,
            isHostile: false,
            stats: {
                strength: 8,
                dexterity: 12,
                constitution: 10,
                intelligence: 6,
                wisdom: 8,
                charisma: 6
            },
            level: Math.floor(Math.random() * 2) + 1,
            maxHp: 6,
            currentHp: 6,
            exp: 0,
            expReward: 50,
            proficiencyBonus: 2,
            armorClass: 12,
            attackBonus: 2,
            damage: { numDice: 1, dieSize: 6 },
            x: pos.x,
            y: pos.y
        });
    }

    for (let i = 0; i < BANDIT_COUNT; i++) {
        const pos = getRandomFloorPosition(dungeon, occupiedPositions);
        enemies.push({
            id: crypto.randomUUID(),
            name: 'Bandit',
            characterClass: 'Warrior',
            enemyType: 'Bandit',
            vision: 3,
            isHostile: false,
            stats: {
                strength: 10,
                dexterity: 14,
                constitution: 12,
                intelligence: 8,
                wisdom: 10,
                charisma: 12
            },
            level: Math.floor(Math.random() * 2) + 1,
            maxHp: 8,
            currentHp: 8,
            exp: 0,
            expReward: 75,
            proficiencyBonus: 2,
            armorClass: 13,
            attackBonus: 3,
            damage: { numDice: 1, dieSize: 8 },
            x: pos.x,
            y: pos.y
        });
    }

    return enemies;
}

const hasLineOfSight = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    visionRange: number,
): boolean => {
    return Math.max(
        Math.abs(from.x - to.x),
        Math.abs(from.y - to.y)
    ) <= visionRange;
};

export const getAlertedEnemies = (
    detectingEnemy: EnemyCharacter,
    allEnemies: EnemyCharacter[],
    _dungeon: Tile[][]
): string[] => {
    const alertedIds = new Set<string>();
    alertedIds.add(detectingEnemy.id);

    const queue: EnemyCharacter[] = [detectingEnemy];

    while (queue.length > 0) {
        const current = queue.shift()!;

        allEnemies
            .filter(e => !alertedIds.has(e.id))
            .forEach(e => {
                if (hasLineOfSight(current, e, current.vision)) {
                    alertedIds.add(e.id);
                    queue.push(e);
                }
            });
    }

    return Array.from(alertedIds);
};

export const detectPlayer = (
    enemies: EnemyCharacter[],
    playerPosition: { x: number; y: number },
    _dungeon: Tile[][]
): EnemyCharacter | null => {
    for (const enemy of enemies) {
        if (enemy.isHostile) continue;
        const distance = Math.max(
            Math.abs(enemy.x - playerPosition.x),
            Math.abs(enemy.y - playerPosition.y)
        );
        if (distance <= enemy.vision) return enemy;
    }
    return null;
};