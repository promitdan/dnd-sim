import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerCharacter, EnemyType, EnemyCharacter, CombatState } from './types';
import ExplorationMusic from '../assets/audio/dungeon_exploration_music.mp3';
import CombatMusic from '../assets/audio/combat_music.mp3';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';
import {
    startCombat,
    advanceTurn,
    resolveAttack,
    checkCombatEnd,
    addLogEntry,
    getRangedAttackBonus,
    getMeleeAttackBonus,
    getFocusDamageBonus,
    checkAndAdvancePlayerTurn
} from '../engine/combat';
import { detectPlayer, getAlertedEnemies } from '../engine/enemies';
import { rollPotionHeal } from '../engine/items';
import FloorTile from '../assets/dungeon/tile.jpg';
import {
    PLAYER_SPRITE_MAP,
    type playerSpriteKey,
    ENEMY_SPRITE_MAP,
    POTION_SPRITE_MAP,
    ATTACK_SPRITE_MAP,
    type AttackSpriteType
} from '../constants/spriteMap';
import { Path } from 'rot-js';
import ContextMenu, { type PlayerAction } from './ContextMenu';
import PlayerPortrait from './PlayerPortrait';
import {
    useGameStore,
    useEnemies,
    usePotions,
    usePlayerPosition,
    usePlayerHp,
    useCombatState,
    usePendingAction,
} from '../state/gameStore';
import './AdventureArea.css';

const TILE_SIZE = 48;

interface AdventureAreaProps {
    playerCharacter: PlayerCharacter;
    onVictory: () => void;
    onGameOver: () => void;
}

const getAttackSpriteType = (
    characterClass: 'Warrior' | 'Mage',
    isMelee: boolean
): AttackSpriteType => {
    if (characterClass === 'Warrior') return isMelee ? 'sword' : 'arrow';
    return isMelee ? 'staff' : 'fireball';
};

const AdventureArea = ({ playerCharacter, onVictory, onGameOver }: AdventureAreaProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Image refs
    const floorImageRef = useRef<HTMLImageElement | null>(null);
    const playerImageRef = useRef<HTMLImageElement | null>(null);
    const skeletonImageRef = useRef<HTMLImageElement | null>(null);
    const banditImageRef = useRef<HTMLImageElement | null>(null);
    const potionImageRef = useRef<HTMLImageElement | null>(null);
    const attackSpritesRef = useRef<Partial<Record<AttackSpriteType, HTMLImageElement>>>({});
    const attackAnimationRef = useRef<{
        entityId: string;
        startTime: number;
        duration: number;
        spriteType: AttackSpriteType;
    } | null>(null);
    const movementIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Local state
    const [isReady, setIsReady] = useState(false);
    const [floorImageLoaded, setFloorImageLoaded] = useState(false);
    const [playerImageLoaded, setPlayerImageLoaded] = useState(false);
    const [enemyImagesLoaded, setEnemyImagesLoaded] = useState(false);
    const [potionImageLoaded, setPotionImageLoaded] = useState(false);
    const [attackSpritesLoaded, setAttackSpritesLoaded] = useState(false);

    // Store state
    const enemies = useEnemies();
    const potions = usePotions();
    const playerPosition = usePlayerPosition();
    const playerHp = usePlayerHp();
    const combatState = useCombatState();
    const pendingAction = usePendingAction();

    // Store actions
    const {
        initGame,
        setEnemies,
        updateEnemy,
        removePotion,
        setPlayerPosition,
        setPlayerHp,
        setCombatState,
        updateCombatState,
        setPendingAction,
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

    // Adjacent potion check
    const adjacentPotion = useMemo(() => {
        return potions.find(p =>
            Math.max(Math.abs(p.x - playerPosition.x), Math.abs(p.y - playerPosition.y)) <= 1
        ) ?? null;
    }, [playerPosition, potions]);

    // Is it the player's turn
    const isPlayerTurn = useMemo(() => {
        if (!combatState?.isActive) return false;
        return combatState.initiativeOrder[combatState.currentTurnIndex] === 'player';
    }, [combatState]);
    const isInCombat = !!combatState?.isActive;
    const currentTrack = isInCombat ? CombatMusic : ExplorationMusic;
    useBackgroundMusic(currentTrack);
    // Victory check
    useEffect(() => {
        if (enemies.length === 0) return;
        if (enemies.every(e => e.currentHp <= 0)) onVictory();
    }, [enemies]);

    // Load floor tile
    useEffect(() => {
        const img = new Image();
        img.src = FloorTile;
        img.onload = () => {
            floorImageRef.current = img;
            setFloorImageLoaded(true);
        };
    }, []);

    // Load player sprite
    useEffect(() => {
        const { characterClass, characterGender } = playerCharacter;
        const spriteKey = `${characterClass}_${characterGender}` as playerSpriteKey;
        const img = new Image();
        img.src = PLAYER_SPRITE_MAP[spriteKey];
        img.onload = () => {
            playerImageRef.current = img;
            setPlayerImageLoaded(true);
        };
    }, [playerCharacter]);

    // Load potion sprite
    useEffect(() => {
        const img = new Image();
        img.src = POTION_SPRITE_MAP['Health'];
        img.onload = () => {
            potionImageRef.current = img;
            setPotionImageLoaded(true);
        };
    }, []);

    // Load enemy sprites
    useEffect(() => {
        const enemyTypes: EnemyType[] = ['Skeleton', 'Bandit'];
        let loadedCount = 0;
        enemyTypes.forEach(enemyType => {
            const img = new Image();
            img.src = ENEMY_SPRITE_MAP[enemyType];
            img.onload = () => {
                if (enemyType === 'Skeleton') skeletonImageRef.current = img;
                else if (enemyType === 'Bandit') banditImageRef.current = img;
                loadedCount++;
                if (loadedCount === enemyTypes.length) setEnemyImagesLoaded(true);
            };
        });
    }, []);

    // Load attack sprites
    useEffect(() => {
        const spriteTypes: AttackSpriteType[] = ['arrow', 'fireball', 'sword', 'staff'];
        let loadedCount = 0;
        spriteTypes.forEach(spriteType => {
            const img = new Image();
            img.src = ATTACK_SPRITE_MAP[spriteType];
            img.onload = () => {
                attackSpritesRef.current[spriteType] = img;
                loadedCount++;
                if (loadedCount === spriteTypes.length) setAttackSpritesLoaded(true);
            };
        });
    }, []);

    // Initial enemy detection
    useEffect(() => {
        if (!isReady || !floorImageLoaded || !playerImageLoaded || !enemyImagesLoaded) return;

        const { enemies: currentEnemies, playerPosition: pos, dungeon: currentDungeon } = useGameStore.getState();
        const detectingEnemy = detectPlayer(currentEnemies, pos, currentDungeon);

        if (detectingEnemy) {
            const alertedIds = getAlertedEnemies(detectingEnemy, currentEnemies, currentDungeon);
            const updated = currentEnemies.map(e =>
                alertedIds.includes(e.id) ? { ...e, isHostile: true } : e
            );
            updated
                .filter(e => alertedIds.includes(e.id))
                .forEach(e => revealTile(e.x, e.y));
            setEnemies(updated);
            setCombatState(startCombat(playerCharacter, updated));
        }
    }, [isReady, floorImageLoaded, playerImageLoaded, enemyImagesLoaded]);

    // Enemy turn processing
    useEffect(() => {
        if (!combatState?.isActive) return;
        const currentId = combatState.initiativeOrder[combatState.currentTurnIndex];
        if (currentId === 'player') return;

        const enemy = enemies.find(e => e.id === currentId);
        if (!enemy || enemy.currentHp <= 0) {
            updateCombatState(prev => advanceTurn(prev, useGameStore.getState().enemies));
            return;
        }

        const timer = setTimeout(() => {
            const {
                playerPosition: pos,
                enemies: currentEnemies,
                dungeon: currentDungeon
            } = useGameStore.getState();

            const distance = Math.max(
                Math.abs(enemy.x - pos.x),
                Math.abs(enemy.y - pos.y)
            );

            if (distance <= 1) {
                const result = resolveAttack(enemy.attackBonus, playerCharacter.armorClass, 1, 6);
                attackAnimationRef.current = {
                    entityId: 'player',
                    startTime: performance.now(),
                    duration: 500,
                    spriteType: 'sword'
                };
                if (result.hit) {
                    const newHp = Math.max(0, useGameStore.getState().playerHp - result.damage);
                    setPlayerHp(newHp);
                    if (newHp <= 0) onGameOver();
                }
                updateCombatState(prev => advanceTurn(
                    addLogEntry(prev,
                        result.hit
                            ? `${enemy.name} hits you for ${result.damage} damage`
                            : `${enemy.name} misses you`
                    ),
                    currentEnemies
                ));
            } else {
                const astar = new Path.AStar(pos.x, pos.y, (x, y) => {
                    return currentDungeon[y]?.[x]?.tileType === 'floor';
                });
                const path: { x: number; y: number }[] = [];
                astar.compute(enemy.x, enemy.y, (x, y) => path.push({ x, y }));
                path.shift();

                if (path.length > 0) {
                    revealTile(path[0].x, path[0].y);
                    updateEnemy(enemy.id, { x: path[0].x, y: path[0].y });
                }

                updateCombatState(prev =>
                    advanceTurn(prev, useGameStore.getState().enemies)
                );
            }

            if (checkCombatEnd(useGameStore.getState().enemies)) {
                updateCombatState(prev => ({ ...prev, isActive: false }));
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [combatState?.currentTurnIndex, combatState?.isActive]);

    // Mouse move handler
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isReady) return;

        const handleMouseMove = (e: MouseEvent) => {
            const {
                pendingAction: action,
                playerPosition: pos,
                enemies: currentEnemies,
                dungeon: currentDungeon
            } = useGameStore.getState();

            if (!action) {
                canvas.style.cursor = 'default';
                return;
            }

            const rect = canvas.getBoundingClientRect();
            const hoverX = Math.floor((e.clientX - rect.left) / TILE_SIZE);
            const hoverY = Math.floor((e.clientY - rect.top) / TILE_SIZE);

            const distance = Math.max(
                Math.abs(hoverX - pos.x),
                Math.abs(hoverY - pos.y)
            );

            const hoveredEnemy = currentEnemies.find(e =>
                e.x === hoverX && e.y === hoverY && e.currentHp > 0
            );
            const hoveredTile = currentDungeon[hoverY]?.[hoverX];

            let isValid = false;
            if (action === 'attack') isValid = !!hoveredEnemy && distance <= 4;
            else if (action === 'focus_attack') isValid = !!hoveredEnemy && distance <= 1;
            else if (action === 'move') isValid = !!hoveredTile && hoveredTile.tileType === 'floor' && distance <= 1;
            else if (action === 'long_move') isValid = !!hoveredTile && hoveredTile.tileType === 'floor' && distance <= 2;

            if (!isValid) {
                canvas.style.cursor = 'not-allowed';
                return;
            }

            const cursorMap: Record<string, string> = {
                attack: `url(${ATTACK_SPRITE_MAP['arrow']}) 16 16, crosshair`,
                focus_attack: `url(${ATTACK_SPRITE_MAP['sword']}) 16 16, crosshair`,
                move: `url(${PLAYER_SPRITE_MAP[`${playerCharacter.characterClass}_${playerCharacter.characterGender}` as playerSpriteKey]}) 16 16, move`,
                long_move: `url(${PLAYER_SPRITE_MAP[`${playerCharacter.characterClass}_${playerCharacter.characterGender}` as playerSpriteKey]}) 16 16, move`,
            };

            canvas.style.cursor = cursorMap[action] ?? 'crosshair';
        };

        const handleMouseLeave = () => { canvas.style.cursor = 'default'; };

        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        return () => {
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [isReady]);

    // Right click — potions outside combat
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isReady) return;

        const handleRightClick = (e: MouseEvent) => {
            e.preventDefault();
            const {
                combatState: cs,
                playerPosition: pos,
                potions: currentPotions
            } = useGameStore.getState();
            if (cs?.isActive) return;

            const rect = canvas.getBoundingClientRect();
            const clickX = Math.floor((e.clientX - rect.left) / TILE_SIZE);
            const clickY = Math.floor((e.clientY - rect.top) / TILE_SIZE);

            const nearPotion = currentPotions.find(p =>
                Math.max(Math.abs(p.x - pos.x), Math.abs(p.y - pos.y)) <= 1
            );

            if (
                (clickX === pos.x && clickY === pos.y && nearPotion) ||
                currentPotions.find(p =>
                    p.x === clickX && p.y === clickY &&
                    Math.max(Math.abs(p.x - pos.x), Math.abs(p.y - pos.y)) <= 1
                )
            ) {
                handleConsumePotion();
            }
        };

        canvas.addEventListener('contextmenu', handleRightClick);
        return () => canvas.removeEventListener('contextmenu', handleRightClick);
    }, [isReady]);

    const handleConsumePotion = () => {
        const {
            playerPosition: pos,
            potions: currentPotions,
            combatState: cs,
            enemies: currentEnemies,
            playerHp: currentHp
        } = useGameStore.getState();

        const potion = currentPotions.find(p =>
            Math.max(Math.abs(p.x - pos.x), Math.abs(p.y - pos.y)) <= 1
        );
        if (!potion) return;

        const heal = rollPotionHeal();
        setPlayerHp(Math.min(playerMaxHp, currentHp + heal));
        removePotion(potion.id);

        if (cs?.isActive) {
            updateCombatState(prev => advanceTurn(
                {
                    ...addLogEntry(prev, `You drink a potion and recover ${heal} HP`),
                    hasAttackedThisTurn: true,
                    hasMovedThisTurn: true
                },
                currentEnemies
            ));
        }
    };

    const handlePlayerAction = (action: PlayerAction) => {
        if (action === 'consume_potion') {
            handleConsumePotion();
            return;
        }
        if (action === 'end_turn') {
            updateCombatState(prev => advanceTurn(prev, useGameStore.getState().enemies));
            setPendingAction(null);
            if (canvasRef.current) canvasRef.current.style.cursor = 'default';
            return;
        }
        setPendingAction(action);
    };

    // Click handler
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isReady) return;

        const handleClick = (event: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const clickX = Math.floor((event.clientX - rect.left) / TILE_SIZE);
            const clickY = Math.floor((event.clientY - rect.top) / TILE_SIZE);

            const {
                combatState: cs,
                pendingAction: action,
                playerPosition: pos,
                enemies: currentEnemies,
                dungeon: currentDungeon
            } = useGameStore.getState();

            if (cs?.isActive && action) {
                if (action === 'attack') {
                    const rangedBonus = getRangedAttackBonus(
                        playerCharacter.characterClass,
                        playerCharacter.stats,
                        playerCharacter.level
                    );
                    const target = currentEnemies.find(e =>
                        e.x === clickX && e.y === clickY && e.currentHp > 0 &&
                        Math.max(Math.abs(e.x - pos.x), Math.abs(e.y - pos.y)) <= 4
                    );
                    if (target) {
                        const result = resolveAttack(rangedBonus, target.armorClass, 1, 6);
                        const updatedEnemies = currentEnemies.map(e =>
                            e.id === target.id
                                ? { ...e, currentHp: e.currentHp - result.damage }
                                : e
                        );
                        setEnemies(updatedEnemies);
                        attackAnimationRef.current = {
                            entityId: target.id,
                            startTime: performance.now(),
                            duration: 500,
                            spriteType: getAttackSpriteType(playerCharacter.characterClass, false)
                        };

                        if (checkCombatEnd(updatedEnemies)) {
                            updateCombatState(prev => addLogEntry(
                                { ...prev, isActive: false },
                                result.hit
                                    ? `You shoot ${target.name} for ${result.damage} damage. Victory!`
                                    : `You missed ${target.name}`
                            ));
                            setPendingAction(null);
                            if (canvasRef.current) canvasRef.current.style.cursor = 'default';
                            return;
                        }

                        updateCombatState(prev => checkAndAdvancePlayerTurn(
                            addLogEntry(
                                { ...prev, hasAttackedThisTurn: true },
                                result.hit
                                    ? `You shoot ${target.name} for ${result.damage} damage`
                                    : `You missed ${target.name}`
                            ),
                            updatedEnemies
                        ));
                        setPendingAction(null);
                        if (canvasRef.current) canvasRef.current.style.cursor = 'default';
                    }
                }

                if (action === 'focus_attack') {
                    const meleeBonus = getMeleeAttackBonus(
                        playerCharacter.stats.strength,
                        playerCharacter.level
                    );
                    const focusDamageBonus = getFocusDamageBonus(playerCharacter.stats.dexterity);
                    const target = currentEnemies.find(e =>
                        e.x === clickX && e.y === clickY && e.currentHp > 0 &&
                        Math.max(Math.abs(e.x - pos.x), Math.abs(e.y - pos.y)) <= 1
                    );
                    if (target) {
                        const result = resolveAttack(meleeBonus, target.armorClass, 1, 6);
                        const totalDamage = result.damage + (result.hit ? focusDamageBonus : 0);
                        const updatedEnemies = currentEnemies.map(e =>
                            e.id === target.id
                                ? { ...e, currentHp: e.currentHp - totalDamage }
                                : e
                        );
                        setEnemies(updatedEnemies);
                        attackAnimationRef.current = {
                            entityId: target.id,
                            startTime: performance.now(),
                            duration: 500,
                            spriteType: getAttackSpriteType(playerCharacter.characterClass, true)
                        };

                        if (checkCombatEnd(updatedEnemies)) {
                            updateCombatState(prev => addLogEntry(
                                { ...prev, isActive: false },
                                result.hit
                                    ? `You focus attack ${target.name} for ${totalDamage} damage. Victory!`
                                    : `Your focus attack missed ${target.name}`
                            ));
                            setPendingAction(null);
                            if (canvasRef.current) canvasRef.current.style.cursor = 'default';
                            return;
                        }

                        updateCombatState(prev => advanceTurn(
                            addLogEntry(
                                { ...prev, hasAttackedThisTurn: true, hasMovedThisTurn: true },
                                result.hit
                                    ? `You focus attack ${target.name} for ${totalDamage} damage`
                                    : `Your focus attack missed ${target.name}`
                            ),
                            updatedEnemies
                        ));
                        setPendingAction(null);
                        if (canvasRef.current) canvasRef.current.style.cursor = 'default';
                    }
                }

                if (action === 'move' || action === 'long_move') {
                    const maxTiles = action === 'long_move' ? 2 : 1;
                    const distance = Math.max(
                        Math.abs(clickX - pos.x),
                        Math.abs(clickY - pos.y)
                    );
                    if (
                        distance <= maxTiles &&
                        currentDungeon[clickY]?.[clickX]?.tileType === 'floor'
                    ) {
                        setPlayerPosition({ x: clickX, y: clickY });
                        updateCombatState(prev => checkAndAdvancePlayerTurn(
                            {
                                ...addLogEntry(prev, `You move to (${clickX}, ${clickY})`),
                                hasMovedThisTurn: true,
                                hasAttackedThisTurn: action === 'long_move'
                                    ? true
                                    : prev.hasAttackedThisTurn
                            },
                            currentEnemies
                        ));
                        setPendingAction(null);
                        if (canvasRef.current) canvasRef.current.style.cursor = 'default';
                    }
                }
                return;
            }

            if (cs?.isActive) return;

            if (!currentDungeon[clickY]?.[clickX] ||
                currentDungeon[clickY][clickX].tileType !== 'floor') return;

            const astar = new Path.AStar(clickX, clickY, (x, y) => {
                return useGameStore.getState().dungeon[y]?.[x]?.tileType === 'floor';
            });

            const path: { x: number; y: number }[] = [];
            astar.compute(pos.x, pos.y, (x, y) => path.push({ x, y }));
            path.shift();
            if (path.length === 0) return;

            if (movementIntervalRef.current) clearInterval(movementIntervalRef.current);

            let stepIndex = 0;
            movementIntervalRef.current = setInterval(() => {
                if (stepIndex >= path.length) {
                    clearInterval(movementIntervalRef.current!);
                    movementIntervalRef.current = null;
                    return;
                }

                const nextPos = path[stepIndex];
                setPlayerPosition(nextPos);
                stepIndex++;

                const {
                    enemies: latestEnemies,
                    dungeon: latestDungeon
                } = useGameStore.getState();

                const detectingEnemy = detectPlayer(latestEnemies, nextPos, latestDungeon);
                if (detectingEnemy) {
                    clearInterval(movementIntervalRef.current!);
                    movementIntervalRef.current = null;
                    const alertedIds = getAlertedEnemies(
                        detectingEnemy,
                        latestEnemies,
                        latestDungeon
                    );
                    const updated = latestEnemies.map(e =>
                        alertedIds.includes(e.id) ? { ...e, isHostile: true } : e
                    );
                    updated
                        .filter(e => alertedIds.includes(e.id))
                        .forEach(e => revealTile(e.x, e.y));
                    setEnemies(updated);
                    setCombatState(startCombat(playerCharacter, updated));
                }
            }, 150);
        };

        canvas.addEventListener('click', handleClick);
        return () => {
            canvas.removeEventListener('click', handleClick);
            if (movementIntervalRef.current) clearInterval(movementIntervalRef.current);
        };
    }, [isReady]);

    // Keyboard shortcuts
    useEffect(() => {
        if (!isReady) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;

            const {
                combatState: cs,
                potions: currentPotions,
                playerPosition: pos
            } = useGameStore.getState();

            const isPlayerTurnNow = cs?.isActive &&
                cs.initiativeOrder[cs.currentTurnIndex] === 'player';

            const key = e.key.toLowerCase();

            if (key === 'c') {
                const nearPotion = currentPotions.find(p =>
                    Math.max(Math.abs(p.x - pos.x), Math.abs(p.y - pos.y)) <= 1
                );
                if (nearPotion) {
                    handleConsumePotion();
                    return;
                }
            }

            if (!isPlayerTurnNow || !cs) return;

            const { hasAttackedThisTurn, hasMovedThisTurn } = cs;
            const fullTurnUsed = hasAttackedThisTurn || hasMovedThisTurn;

            switch (key) {
                case 'a': if (!hasAttackedThisTurn) handlePlayerAction('attack'); break;
                case 'm': if (!hasMovedThisTurn) handlePlayerAction('move'); break;
                case 'l': if (!fullTurnUsed) handlePlayerAction('long_move'); break;
                case 'f': if (!fullTurnUsed) handlePlayerAction('focus_attack'); break;
                case 'e': handlePlayerAction('end_turn'); break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isReady]);

    // Game loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isReady) return;
        if (!floorImageLoaded || !playerImageLoaded || !enemyImagesLoaded ||
            !potionImageLoaded || !attackSpritesLoaded) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const drawTiles = (
            dungeon: ReturnType<typeof useGameStore.getState>['dungeon'],
            visibleTiles: Set<string>,
            exploredTiles: Set<string>
        ) => {
            const height = dungeon.length;
            const width = dungeon[0]?.length ?? 0;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const tile = dungeon[y][x];
                    const px = x * TILE_SIZE;
                    const py = y * TILE_SIZE;
                    const key = `${x},${y}`;

                    if (!exploredTiles.has(key)) {
                        ctx.fillStyle = '#000';
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                        continue;
                    }

                    if (tile.tileType === 'floor' && floorImageRef.current) {
                        ctx.drawImage(floorImageRef.current, px, py, TILE_SIZE, TILE_SIZE);
                    } else {
                        ctx.fillStyle = tile.tileType === 'wall' ? '#222' : '#000';
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    }

                    if (!visibleTiles.has(key)) {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    }
                }
            }
        };

        const drawPotions = (
            potions: ReturnType<typeof useGameStore.getState>['potions'],
            visibleTiles: Set<string>
        ) => {
            potions.forEach(potion => {
                if (!visibleTiles.has(`${potion.x},${potion.y}`)) return;
                if (!potionImageRef.current) return;
                const px = potion.x * TILE_SIZE;
                const py = potion.y * TILE_SIZE;
                const size = TILE_SIZE * 0.6;
                const offset = (TILE_SIZE - size) / 2;
                ctx.shadowColor = 'rgba(0, 255, 100, 0.8)';
                ctx.shadowBlur = 10;
                ctx.drawImage(potionImageRef.current, px + offset, py + offset, size, size);
                ctx.shadowBlur = 0;
            });
        };

        const drawAttackAnimation = (
            timestamp: number,
            targetX: number,
            targetY: number
        ) => {
            const anim = attackAnimationRef.current;
            if (!anim) return;
            const elapsed = timestamp - anim.startTime;
            if (elapsed >= anim.duration) {
                attackAnimationRef.current = null;
                return;
            }
            const spriteImg = attackSpritesRef.current[anim.spriteType];
            if (!spriteImg) return;
            const progress = elapsed / anim.duration;
            const size = TILE_SIZE * (1 + progress * 0.5);
            const offset = (TILE_SIZE - size) / 2;
            ctx.globalAlpha = 1 - progress;
            ctx.drawImage(
                spriteImg,
                targetX * TILE_SIZE + offset,
                targetY * TILE_SIZE + offset,
                size, size
            );
            ctx.globalAlpha = 1;
        };

        const drawEnemies = (
            enemies: EnemyCharacter[],
            visibleTiles: Set<string>,
            exploredTiles: Set<string>,
            timestamp: number,
            pendingAction: PlayerAction | null,
            playerPos: { x: number; y: number }
        ) => {
            enemies.forEach(enemy => {
                const key = `${enemy.x},${enemy.y}`;
                const isVisible = visibleTiles.has(key);
                const isExplored = exploredTiles.has(key);

                const enemyImg = enemy.enemyType === 'Skeleton'
                    ? skeletonImageRef.current
                    : banditImageRef.current;
                if (!enemyImg) return;

                const px = enemy.x * TILE_SIZE;
                const py = enemy.y * TILE_SIZE;

                if (enemy.currentHp <= 0) {
                    if (!isExplored) return;
                    ctx.globalAlpha = 0.5;
                    ctx.drawImage(enemyImg, px, py, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = 'rgba(180, 0, 0, 0.6)';
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.globalAlpha = 1;
                    return;
                }

                if (!isVisible) return;

                const anim = attackAnimationRef.current;
                const isAnimating = anim &&
                    anim.entityId === enemy.id &&
                    timestamp - anim.startTime < anim.duration;

                let drawX = px;
                if (isAnimating) {
                    drawX += Math.sin((timestamp - anim.startTime) / 50) * 4;
                }

                const distance = Math.max(
                    Math.abs(enemy.x - playerPos.x),
                    Math.abs(enemy.y - playerPos.y)
                );
                const isValidRanged = pendingAction === 'attack' && distance <= 4;
                const isValidMelee = pendingAction === 'focus_attack' && distance <= 1;

                if (isValidRanged || isValidMelee) {
                    ctx.strokeStyle = 'rgba(255, 255, 0, 0.9)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
                }

                if (enemy.isHostile) {
                    ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
                    ctx.shadowBlur = 15;
                }

                ctx.drawImage(enemyImg, drawX, py, TILE_SIZE, TILE_SIZE);
                ctx.shadowBlur = 0;

                if (isAnimating) {
                    const progress = (timestamp - anim.startTime) / anim.duration;
                    ctx.fillStyle = `rgba(255, 0, 0, ${0.5 - progress * 0.5})`;
                    ctx.fillRect(drawX, py, TILE_SIZE, TILE_SIZE);
                    drawAttackAnimation(timestamp, enemy.x, enemy.y);
                }
            });
        };

        const drawPlayer = (
            pos: { x: number; y: number },
            timestamp: number
        ) => {
            if (!playerImageRef.current) return;

            const anim = attackAnimationRef.current;
            const isAnimating = anim &&
                anim.entityId === 'player' &&
                timestamp - anim.startTime < anim.duration;

            let px = pos.x * TILE_SIZE;
            const py = pos.y * TILE_SIZE;

            if (isAnimating) {
                px += Math.sin((timestamp - anim.startTime) / 50) * 4;
            }

            ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
            ctx.shadowBlur = 15;
            ctx.drawImage(playerImageRef.current, px, py, TILE_SIZE, TILE_SIZE);
            ctx.shadowBlur = 0;

            if (isAnimating) {
                const progress = (timestamp - anim.startTime) / anim.duration;
                ctx.fillStyle = `rgba(255, 0, 0, ${0.5 - progress * 0.5})`;
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                drawAttackAnimation(timestamp, pos.x, pos.y);
            }
        };

        const drawTurnIndicator = (cs: CombatState | null) => {
            if (!cs?.isActive) return;
            const isPlayerTurnNow = cs.initiativeOrder[cs.currentTurnIndex] === 'player';
            ctx.fillStyle = isPlayerTurnNow
                ? 'rgba(255, 215, 0, 0.9)'
                : 'rgba(255, 80, 80, 0.9)';
            ctx.font = 'bold 14px monospace';
            ctx.fillText(isPlayerTurnNow ? '⚔ YOUR TURN' : '💀 ENEMY TURN', 10, 20);
        };

        const drawCombatLog = (
            cs: CombatState | null,
            dungeonHeight: number
        ) => {
            if (!cs?.isActive) return;
            const lastFive = cs.log.slice(-5);
            ctx.font = '12px monospace';
            lastFive.forEach((entry, i) => {
                ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + i * 0.15})`;
                ctx.fillText(
                    entry.message,
                    10,
                    dungeonHeight * TILE_SIZE - 10 - (lastFive.length - 1 - i) * 18
                );
            });
        };

        const gameLoop = (timestamp: number) => {
            const {
                dungeon,
                enemies,
                potions,
                playerPosition,
                visibleTiles,
                exploredTiles,
                pendingAction,
                combatState: cs
            } = useGameStore.getState();

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawTiles(dungeon, visibleTiles, exploredTiles);
            drawPotions(potions, visibleTiles);
            drawEnemies(
                enemies,
                visibleTiles,
                exploredTiles,
                timestamp,
                pendingAction,
                playerPosition
            );
            drawPlayer(playerPosition, timestamp);
            drawTurnIndicator(cs);
            drawCombatLog(cs, dungeon.length);
            animationFrameId = requestAnimationFrame(gameLoop);
        };

        animationFrameId = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [
        isReady,
        floorImageLoaded,
        playerImageLoaded,
        enemyImagesLoaded,
        potionImageLoaded,
        attackSpritesLoaded
    ]);

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
                width={dungeon[0]?.length * TILE_SIZE ?? 0}
                height={dungeon.length * TILE_SIZE ?? 0}
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