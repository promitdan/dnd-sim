export type GameStage = 'character_creation' | 'adventure' | 'game_over' | 'victory';
 
export interface CharacterStats {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
}

export type CharacterClass = 'Warrior' | 'Mage' | 'Undead';
export type CharacterGender = 'Male' | 'Female';

export interface Character {
    name: string;
    characterClass: CharacterClass;
    characterGender?: CharacterGender;
    stats: CharacterStats;
}

export interface GameCharacter extends Character {
    level: number;
    currentHp: number;
    maxHp: number;
    exp: number;
    proficiencyBonus: number;
    armorClass: number;
    attackBonus: number;
}

export interface PlayerCharacter extends GameCharacter {
    isPC: true;
    vision: number;
}

export interface EnemyCharacter extends GameCharacter {
    id: string;
    vision: number;
    enemyType: EnemyType;
    isHostile: boolean;
    expReward: number;
    damage: {
        numDice: number;
        dieSize: number;
    };
    x: number;
    y: number;
}
export type TileType = 'wall' | 'floor';

export interface Tile {
    // isExplored: boolean;
    // isVisible: boolean;
    tileType: TileType;
    isStart: boolean
}

export type EnemyType = 'Skeleton' | 'Bandit';

export interface CombatParticipant {
    id: string
    initiative: number
    isPlayer: boolean
}

export interface CombatLogEntry {
    message: string
    timestamp: number
}

export interface CombatState {
    isActive: boolean
    initiativeOrder: string[]
    currentTurnIndex: number
    hasAttackedThisTurn: boolean
    hasMovedThisTurn: boolean
    log: CombatLogEntry[]
}

export interface HealthPotion {
    id: string
    x: number
    y: number
}

export type AttackSpriteType = 'arrow' | 'fireball' | 'sword' | 'staff';

export interface AttackAnimation {
    entityId: string;
    startTime: number;
    duration: number;
    spriteType: AttackSpriteType;
}