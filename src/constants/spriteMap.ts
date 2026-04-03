import type { CharacterClass, CharacterGender, EnemyType, AttackSpriteType } from "../components/types";
import WarriorMale from '../assets/sprites/warrior_male.jpg';
import WarriorFemale from '../assets/sprites/warrior_female.jpg';
import MageMale from '../assets/sprites/mage_male.jpg';
import MageFemale from '../assets/sprites/mage_female.jpg';
import Skeleton from '../assets/sprites/skeleton.jpg';
import Bandit from '../assets/sprites/bandit.jpg';
import HealthPotion from '../assets/sprites/health.jpg'
import ArrowSprite from '../assets/sprites/arrow.png';
import FireballSprite from '../assets/sprites/fireball.png';
import SwordSprite from '../assets/sprites/sword.png';
import StaffSprite from '../assets/sprites/staff.png';

import WarriorMalePortrait from '../assets/player characters/warrior_male.jpg';
import WarriorFemalePortrait from '../assets/player characters/warrior_female.jpg';
import MageMalePortrait from '../assets/player characters/mage_male.jpg';
import MageFemalePortrait from '../assets/player characters/female_mage.jpg';

export type playerSpriteKey = `${CharacterClass}_${CharacterGender}`;
export const PLAYER_SPRITE_MAP: Record<playerSpriteKey, string> = {
    'Warrior_Male': WarriorMale,
    'Warrior_Female': WarriorFemale,
    'Mage_Male': MageMale,
    'Mage_Female': MageFemale,
    'Undead_Male': WarriorMale,
    'Undead_Female': WarriorFemale,
};

export const PLAYER_PORTRAIT_MAP: Record<playerSpriteKey, string> = {
    'Warrior_Male': WarriorMalePortrait,
    'Warrior_Female': WarriorFemalePortrait,
    'Mage_Male': MageMalePortrait,
    'Mage_Female': MageFemalePortrait,
    'Undead_Male': WarriorMalePortrait,
    'Undead_Female': WarriorFemalePortrait,
};

export const ENEMY_SPRITE_MAP: Record<EnemyType, string> = {
    'Skeleton': Skeleton,
    'Bandit': Bandit
};

export const POTION_SPRITE_MAP: Record<string, string> = {
    'Health': HealthPotion
};

export const ATTACK_SPRITE_MAP: Record<AttackSpriteType, string> = {
    arrow: ArrowSprite,
    fireball: FireballSprite,
    sword: SwordSprite,
    staff: StaffSprite,
}