import type { EnemyCharacter, CombatState, CombatParticipant, PlayerCharacter, CharacterClass } from '../components/types';

export const rollInitiative = (dexterity: number): number => {
    const modifier = Math.floor((dexterity - 10) / 2);
    return Math.max(1, Math.floor(Math.random() * 20) + 1 + modifier);
};

export const startCombat = (
    player: PlayerCharacter,
    enemies: EnemyCharacter[]
): CombatState => {
    const hostileEnemies = enemies.filter(e => e.isHostile);

    const participants: CombatParticipant[] = [
        {
            id: 'player',
            initiative: rollInitiative(player.stats.dexterity),
            isPlayer: true
        },
        ...hostileEnemies.map(e => ({
            id: e.id,
            initiative: rollInitiative(e.stats.dexterity),
            isPlayer: false
        }))
    ];

    const sorted = participants.sort((a, b) => b.initiative - a.initiative);

    return {
        isActive: true,
        initiativeOrder: sorted.map(p => p.id),
        currentTurnIndex: 0,
        hasAttackedThisTurn: false,
        hasMovedThisTurn: false,
        log: [{ message: 'Combat has started!', timestamp: Date.now() }]
    };
};

export const rollAttack = (attackBonus: number): number => {
    return Math.max(1, Math.floor(Math.random() * 20) + 1 + attackBonus);
};

export const rollDamage = (numDice: number, dieSize: number): number => {
    let total = 0;
    for (let i = 0; i < numDice; i++) {
        total += Math.floor(Math.random() * dieSize) + 1;
    }
    return total;
};

export const resolveAttack = (
    attackerBonus: number,
    defenderAC: number,
    numDice: number,
    dieSize: number
): { hit: boolean; damage: number; roll: number } => {
    const roll = rollAttack(attackerBonus);
    const hit = roll >= defenderAC;
    const damage = hit ? rollDamage(numDice, dieSize) : 0;
    return { hit, damage, roll };
};

export const getRangedAttackBonus = (
    characterClass: CharacterClass,
    stats: { dexterity: number; intelligence: number },
    level: number
): number => {
    const proficiency = Math.ceil(level / 4) + 1;
    const statMod = characterClass === 'Warrior'
        ? Math.floor((stats.dexterity - 10) / 2)
        : Math.floor((stats.intelligence - 10) / 2);
    return proficiency + statMod;
};

export const getMeleeAttackBonus = (
    strength: number,
    level: number
): number => {
    const proficiency = Math.ceil(level / 4) + 1;
    const strMod = Math.floor((strength - 10) / 2);
    return proficiency + strMod;
};

export const getFocusDamageBonus = (dexterity: number): number => {
    const dexMod = Math.floor((dexterity - 10) / 2);
    return dexMod > 0 ? dexMod : 0;
};

export const advanceTurn = (
    state: CombatState,
    enemies: EnemyCharacter[]
): CombatState => {
    const activeIds = new Set([
        'player',
        ...enemies.filter(e => e.isHostile && e.currentHp > 0).map(e => e.id)
    ]);

    let nextIndex = (state.currentTurnIndex + 1) % state.initiativeOrder.length;
    let attempts = 0;

    while (!activeIds.has(state.initiativeOrder[nextIndex])) {
        nextIndex = (nextIndex + 1) % state.initiativeOrder.length;
        attempts++;
        if (attempts > state.initiativeOrder.length) break;
    }

    return {
        ...state,
        currentTurnIndex: nextIndex,
        hasAttackedThisTurn: false,
        hasMovedThisTurn: false
    };
};

export const checkAndAdvancePlayerTurn = (
    state: CombatState,
    enemies: EnemyCharacter[]
): CombatState => {
    const turnComplete = state.hasAttackedThisTurn && state.hasMovedThisTurn;
    if (turnComplete) return advanceTurn(state, enemies);
    return state;
};

export const checkCombatEnd = (enemies: EnemyCharacter[]): boolean => {
    return enemies.filter(e => e.isHostile).every(e => e.currentHp <= 0);
};

export const addLogEntry = (state: CombatState, message: string): CombatState => {
    return {
        ...state,
        log: [...state.log, { message, timestamp: Date.now() }]
    };
};