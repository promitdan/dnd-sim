import type { Character, GameCharacter } from "./types"
export const createGameCharacter = (character: Character, gameLevel: number | undefined): GameCharacter => {
    const modifiers = {
        strength: Math.floor((character?.stats?.strength - 10) / 2),
        constitution: Math.floor((character?.stats?.constitution - 10) / 2),
        dexterity: Math.floor((character?.stats?.dexterity - 10) / 2),
        intelligence: Math.floor((character?.stats?.intelligence - 10) / 2),
        wisdom: Math.floor((character?.stats?.wisdom - 10) / 2),
        charisma: Math.floor((character?.stats?.charisma - 10) / 2),
    }
    const level = gameLevel || 1;
    const proficiencyBonus = Math.ceil(level / 4) + 1;
    const maxHp = (character?.characterClass === 'Warrior' ? 10 : 6) + modifiers.constitution;
    return {
        ...character,
        maxHp,
        currentHp: maxHp,
        level,
        exp: 0,
        proficiencyBonus,
        armorClass: character?.characterClass === 'Warrior' ? 15 : 10 + modifiers.dexterity,
        attackBonus: character?.characterClass === 'Warrior' ? modifiers.strength + proficiencyBonus : modifiers.intelligence + proficiencyBonus,
    }
}

export const xpForNextLevel = (level: number): number => level * 100;

export const levelUpCharacter = (char: GameCharacter): GameCharacter => {
    const newLevel = char.level + 1;
    const proficiencyBonus = Math.ceil(newLevel / 4) + 1;
    const conMod = Math.floor((char.stats.constitution - 10) / 2);
    const hpGain = Math.max(1, (char.characterClass === 'Warrior' ? 6 : 4) + conMod);
    const strMod = Math.floor((char.stats.strength - 10) / 2);
    const intMod = Math.floor((char.stats.intelligence - 10) / 2);
    const attackBonus = char.characterClass === 'Warrior'
        ? strMod + proficiencyBonus
        : intMod + proficiencyBonus;
    return {
        ...char,
        level: newLevel,
        proficiencyBonus,
        maxHp: char.maxHp + hpGain,
        currentHp: char.currentHp + hpGain,
        attackBonus,
    };
};