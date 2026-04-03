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

export interface GameAssets {
    floorRef: React.MutableRefObject<HTMLImageElement | null>;
    playerRef: React.MutableRefObject<HTMLImageElement | null>;
    skeletonRef: React.MutableRefObject<HTMLImageElement | null>;
    banditRef: React.MutableRefObject<HTMLImageElement | null>;
    potionRef: React.MutableRefObject<HTMLImageElement | null>;
    attackSpritesRef: React.MutableRefObject<Partial<Record<AttackSpriteType, HTMLImageElement>>>;
    allLoaded: boolean;
}

export const useGameAssets = (playerCharacter: PlayerCharacter): GameAssets => {
    const floorRef = useRef<HTMLImageElement | null>(null);
    const playerRef = useRef<HTMLImageElement | null>(null);
    const skeletonRef = useRef<HTMLImageElement | null>(null);
    const banditRef = useRef<HTMLImageElement | null>(null);
    const potionRef = useRef<HTMLImageElement | null>(null);
    const attackSpritesRef = useRef<Partial<Record<AttackSpriteType, HTMLImageElement>>>({});

    const [floorLoaded, setFloorLoaded] = useState(false);
    const [playerLoaded, setPlayerLoaded] = useState(false);
    const [enemiesLoaded, setEnemiesLoaded] = useState(false);
    const [potionLoaded, setPotionLoaded] = useState(false);
    const [attacksLoaded, setAttacksLoaded] = useState(false);

    useEffect(() => {
        const img = new Image();
        img.src = FloorTile;
        img.onload = () => { floorRef.current = img; setFloorLoaded(true); };
    }, []);

    useEffect(() => {
        const { characterClass, characterGender } = playerCharacter;
        const key = `${characterClass}_${characterGender}` as playerSpriteKey;
        const img = new Image();
        img.src = PLAYER_SPRITE_MAP[key];
        img.onload = () => { playerRef.current = img; setPlayerLoaded(true); };
    }, [playerCharacter]);

    useEffect(() => {
        const img = new Image();
        img.src = POTION_SPRITE_MAP['Health'];
        img.onload = () => { potionRef.current = img; setPotionLoaded(true); };
    }, []);

    useEffect(() => {
        const types: EnemyType[] = ['Skeleton', 'Bandit'];
        let count = 0;
        types.forEach(type => {
            const img = new Image();
            img.src = ENEMY_SPRITE_MAP[type];
            img.onload = () => {
                if (type === 'Skeleton') skeletonRef.current = img;
                else banditRef.current = img;
                if (++count === types.length) setEnemiesLoaded(true);
            };
        });
    }, []);

    useEffect(() => {
        const types = Object.keys(ATTACK_SPRITE_MAP) as AttackSpriteType[];
        let count = 0;
        types.forEach(type => {
            const img = new Image();
            img.src = ATTACK_SPRITE_MAP[type];
            img.onload = () => {
                attackSpritesRef.current[type] = img;
                if (++count === types.length) setAttacksLoaded(true);
            };
        });
    }, []);

    return {
        floorRef,
        playerRef,
        skeletonRef,
        banditRef,
        potionRef,
        attackSpritesRef,
        allLoaded: floorLoaded && playerLoaded && enemiesLoaded && potionLoaded && attacksLoaded,
    };
};
