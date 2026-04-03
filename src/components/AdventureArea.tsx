import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerCharacter, AttackAnimation } from './types';
import ExplorationMusic from '../assets/audio/dungeon_exploration_music.mp3';
import CombatMusic from '../assets/audio/combat_music.mp3';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';
import { useGameAssets } from '../hooks/useGameAssets';
import { useCanvasRenderer } from '../hooks/useCanvasRenderer';
import { useEnemyTurn } from '../hooks/useEnemyTurn';
import { useGameInput } from '../hooks/useGameInput';
import { startCombat } from '../engine/combat';
import { detectPlayer, getAlertedEnemies } from '../engine/enemies';
import {
    useGameStore,
    useEnemies,
    usePotions,
    usePlayerPosition,
    usePlayerHp,
    useCombatState,
} from '../state/gameStore';
import ContextMenu from './ContextMenu';
import PlayerPortrait from './PlayerPortrait';
import './AdventureArea.css';

const TILE_SIZE = 48;

interface AdventureAreaProps {
    playerCharacter: PlayerCharacter;
    onVictory: () => void;
    onGameOver: () => void;
}

const AdventureArea = ({ playerCharacter, onVictory, onGameOver }: AdventureAreaProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const attackAnimationRef = useRef<AttackAnimation | null>(null);

    const [isReady, setIsReady] = useState(false);

    const enemies = useEnemies();
    const potions = usePotions();
    const playerPosition = usePlayerPosition();
    const playerHp = usePlayerHp();
    const combatState = useCombatState();
    // const pendingAction = usePendingAction();

    const {
        initGame,
        setEnemies,
        setCombatState,
        updateFOV,
        revealTile,
        sightRange,
        playerMaxHp,
        dungeon,
    } = useGameStore();

    // Initialise game on mount
    useEffect(() => {
        initGame(playerCharacter);
        setIsReady(true);
    }, []);

    // Update FOV whenever player moves
    useEffect(() => {
        if (!isReady || !dungeon.length) return;
        updateFOV(playerPosition.x, playerPosition.y, sightRange);
    }, [playerPosition, sightRange, isReady]);

    // Victory check — guard on isReady to avoid firing on stale enemies from a previous game
    useEffect(() => {
        if (!isReady) return;
        if (enemies.length === 0) return;
        if (enemies.every(e => e.currentHp <= 0)) onVictory();
    }, [enemies, isReady]);

    // Initial enemy detection (handle combat starting on spawn)
    const assets = useGameAssets(playerCharacter);
    useEffect(() => {
        if (!isReady || !assets.allLoaded) return;
        const { enemies: currentEnemies, playerPosition: pos, dungeon: currentDungeon } = useGameStore.getState();
        const detectingEnemy = detectPlayer(currentEnemies, pos, currentDungeon);
        if (detectingEnemy) {
            const alertedIds = getAlertedEnemies(detectingEnemy, currentEnemies, currentDungeon);
            const updated = currentEnemies.map(e =>
                alertedIds.includes(e.id) ? { ...e, isHostile: true } : e
            );
            updated.filter(e => alertedIds.includes(e.id)).forEach(e => revealTile(e.x, e.y));
            setEnemies(updated);
            setCombatState(startCombat(playerCharacter, updated));
        }
    }, [isReady, assets.allLoaded]);

    const isInCombat = !!combatState?.isActive;
    useBackgroundMusic(isInCombat ? CombatMusic : ExplorationMusic);

    useCanvasRenderer(canvasRef, assets, attackAnimationRef);
    useEnemyTurn(playerCharacter, onGameOver, attackAnimationRef);
    const { handlePlayerAction } = useGameInput(canvasRef, playerCharacter, isReady, attackAnimationRef);

    const adjacentPotion = useMemo(() => {
        return potions.find(p =>
            Math.max(Math.abs(p.x - playerPosition.x), Math.abs(p.y - playerPosition.y)) <= 1
        ) ?? null;
    }, [playerPosition, potions]);

    const isPlayerTurn = useMemo(() => {
        if (!combatState?.isActive) return false;
        return combatState.initiativeOrder[combatState.currentTurnIndex] === 'player';
    }, [combatState]);

    if (!isReady) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100vw',
                height: '100vh',
                backgroundColor: '#0a0a0a',
                color: '#ffd700',
                fontFamily: 'monospace',
                fontSize: '24px',
                letterSpacing: '2px'
            }}>
                Generating dungeon...
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', margin: 'auto' }}>
            <canvas
                className="adventure-canvas"
                ref={canvasRef}
                width={(dungeon[0]?.length ?? 0) * TILE_SIZE}
                height={dungeon.length * TILE_SIZE}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <PlayerPortrait
                    playerCharacter={playerCharacter}
                    currentHp={playerHp}
                    maxHp={playerMaxHp}
                />
                <ContextMenu
                    combatState={combatState?.isActive ? combatState : null}
                    onAction={handlePlayerAction}
                    canConsumePotion={!!adjacentPotion}
                    isPlayerTurn={isPlayerTurn}
                />
            </div>
        </div>
    );
};

export default AdventureArea;
