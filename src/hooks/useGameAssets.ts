import { useEffect, useRef, useState } from 'react';
import type { PlayerCharacter, EnemyType, AttackSpriteType } from '../components/types';
import FloorTile from '../assets/dungeon/tile.jpg';
import {
    PLAYER_SPRITE_MAP,
    type playerSpriteKey,
    ENEMY_SPRITE_MAP,
    POTION_SPRITE_MAP,
    ATTACK_SPRITE_MAP,
} from '../constants/spriteMap';

// floor + player + potion + skeleton + bandit + 4 attack sprites
const TOTAL_ASSETS = 9;

export interface GameAssets {
    floorRef: React.RefObject<HTMLImageElement | null>;
    playerRef: React.RefObject<HTMLImageElement | null>;
    skeletonRef: React.RefObject<HTMLImageElement | null>;
    banditRef: React.RefObject<HTMLImageElement | null>;
    potionRef: React.RefObject<HTMLImageElement | null>;
    attackSpritesRef: React.RefObject<Partial<Record<AttackSpriteType, HTMLImageElement>>>;
    allLoaded: boolean;
    progress: number; // 0 to 1
}

export const useGameAssets = (playerCharacter: PlayerCharacter): GameAssets => {
    const floorRef = useRef<HTMLImageElement | null>(null);
    const playerRef = useRef<HTMLImageElement | null>(null);
    const skeletonRef = useRef<HTMLImageElement | null>(null);
    const banditRef = useRef<HTMLImageElement | null>(null);
    const potionRef = useRef<HTMLImageElement | null>(null);
    const attackSpritesRef = useRef<Partial<Record<AttackSpriteType, HTMLImageElement>>>({});

    const [loadedCount, setLoadedCount] = useState(0);

    const onLoad = () => setLoadedCount(c => c + 1);

    useEffect(() => {
        const img = new Image();
        img.src = FloorTile;
        img.onload = () => { floorRef.current = img; onLoad(); };
    }, []);

    useEffect(() => {
        const { characterClass, characterGender } = playerCharacter;
        const key = `${characterClass}_${characterGender}` as playerSpriteKey;
        const img = new Image();
        img.src = PLAYER_SPRITE_MAP[key];
        img.onload = () => { playerRef.current = img; onLoad(); };
    }, [playerCharacter]);

    useEffect(() => {
        const img = new Image();
        img.src = POTION_SPRITE_MAP['Health'];
        img.onload = () => { potionRef.current = img; onLoad(); };
    }, []);

    useEffect(() => {
        const types: EnemyType[] = ['Skeleton', 'Bandit'];
        types.forEach(type => {
            const img = new Image();
            img.src = ENEMY_SPRITE_MAP[type];
            img.onload = () => {
                if (type === 'Skeleton') skeletonRef.current = img;
                else banditRef.current = img;
                onLoad();
            };
        });
    }, []);

    useEffect(() => {
        const types = Object.keys(ATTACK_SPRITE_MAP) as AttackSpriteType[];
        types.forEach(type => {
            const img = new Image();
            img.src = ATTACK_SPRITE_MAP[type];
            img.onload = () => {
                attackSpritesRef.current[type] = img;
                onLoad();
            };
        });
    }, []);

    const progress = Math.min(loadedCount / TOTAL_ASSETS, 1);

    return {
        floorRef,
        playerRef,
        skeletonRef,
        banditRef,
        potionRef,
        attackSpritesRef,
        allLoaded: loadedCount >= TOTAL_ASSETS,
        progress,
    };
};
