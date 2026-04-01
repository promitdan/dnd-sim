import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerCharacter, Tile, EnemyType, EnemyCharacter, CombatState, HealthPotion } from './types';
import { generateDungeon } from '../engine/dungeon';
import { initializeEnemies, detectPlayer, getAlertedEnemies } from '../engine/enemies';
import { initializePotions, rollPotionHeal } from '../engine/items';
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
import './AdventureArea.css';

const TILE_SIZE = 48;
const DUNGEON_WIDTH = 30;
const DUNGEON_HEIGHT = 15;

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

// Update FOV by mutating dungeon ref directly
const updateFOV = (
    dungeon: Tile[][],
    playerX: number,
    playerY: number,
    sightRange: number
) => {
    // Clear all visible flags
    for (let y = 0; y < dungeon.length; y++) {
        for (let x = 0; x < dungeon[y].length; x++) {
            dungeon[y][x].isVisible = false;
        }
    }

    // Mark tiles within Chebyshev distance as visible and explored
    for (let y = 0; y < dungeon.length; y++) {
        for (let x = 0; x < dungeon[y].length; x++) {
            const distance = Math.max(
                Math.abs(x - playerX),
                Math.abs(y - playerY)
            );
            if (distance <= sightRange) {
                dungeon[y][x].isVisible = true;
                dungeon[y][x].isExplored = true;
            }
        }
    }
};

// Reveal a specific tile in the dungeon ref
const revealTile = (dungeon: Tile[][], x: number, y: number) => {
    if (dungeon[y]?.[x]) {
        dungeon[y][x].isVisible = true;
        dungeon[y][x].isExplored = true;
    }
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

    // Loading state
    const [floorImageLoaded, setFloorImageLoaded] = useState(false);
    const [playerImageLoaded, setPlayerImageLoaded] = useState(false);
    const [enemyImagesLoaded, setEnemyImagesLoaded] = useState(false);
    const [potionImageLoaded, setPotionImageLoaded] = useState(false);
    const [attackSpritesLoaded, setAttackSpritesLoaded] = useState(false);

    // Game state
    const [dungeon] = useState<Tile[][]>(() => generateDungeon(DUNGEON_WIDTH, DUNGEON_HEIGHT));
    const skeletonCount = useMemo(() => Math.floor(Math.random() * 3) + 2, []);
    const banditCount = useMemo(() => Math.floor(Math.random() * 3) + 2, []);
    const [enemies, setEnemies] = useState<EnemyCharacter[]>(() =>
        initializeEnemies(dungeon, skeletonCount, banditCount)
    );
    const [potions, setPotions] = useState<HealthPotion[]>(() =>
        initializePotions(dungeon, enemies)
    );

    const startTile = useMemo(() => {
        const y = dungeon.findIndex(row => row.some(tile => tile.isStart));
        const x = dungeon[y].findIndex(tile => tile.isStart);
        return { x, y };
    }, [dungeon]);

    const [playerPosition, setPlayerPosition] = useState(startTile);
    const [combatState, setCombatState] = useState<CombatState | null>(null);
    const [pendingAction, setPendingAction] = useState<PlayerAction | null>(null);
    const [playerHp, setPlayerHp] = useState(playerCharacter.maxHp);

    // Sight range derived from wisdom
    const sightRange = useMemo(() => {
        return 3 + Math.floor((playerCharacter.stats.wisdom - 10) / 2);
    }, [playerCharacter.stats.wisdom]);

    // Refs
    const enemiesRef = useRef(enemies);
    const potionsRef = useRef(potions);
    const dungeonRef = useRef(dungeon);
    const playerPositionRef = useRef(playerPosition);
    const combatStateRef = useRef<CombatState | null>(null);
    const pendingActionRef = useRef<PlayerAction | null>(null);
    const movementIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const attackAnimationRef = useRef<{
        entityId: string;
        startTime: number;
        duration: number;
        spriteType: AttackSpriteType;
    } | null>(null);

    // Sync refs
    useEffect(() => { enemiesRef.current = enemies; }, [enemies]);
    useEffect(() => { potionsRef.current = potions; }, [potions]);
    useEffect(() => { playerPositionRef.current = playerPosition; }, [playerPosition]);
    useEffect(() => { combatStateRef.current = combatState; }, [combatState]);
    useEffect(() => { pendingActionRef.current = pendingAction; }, [pendingAction]);

    // Update FOV whenever player position changes
    useEffect(() => {
        updateFOV(dungeonRef.current, playerPosition.x, playerPosition.y, sightRange);
    }, [playerPosition, sightRange]);

    // Adjacent potion check
    const adjacentPotion = useMemo(() => {
        const pos = playerPosition;
        return potions.find(p =>
            Math.max(Math.abs(p.x - pos.x), Math.abs(p.y - pos.y)) <= 1
        ) ?? null;
    }, [playerPosition, potions]);

    // isPlayerTurn derived value
    const isPlayerTurn = useMemo(() => {
        if (!combatState?.isActive) return false;
        return combatState.initiativeOrder[combatState.currentTurnIndex] === 'player';
    }, [combatState]);

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

    // Initial detection check
    useEffect(() => {
        if (!floorImageLoaded || !playerImageLoaded || !enemyImagesLoaded) return;
        const detectingEnemy = detectPlayer(
            enemiesRef.current,
            playerPositionRef.current,
            dungeonRef.current
        );
        if (detectingEnemy) {
            const alertedIds = getAlertedEnemies(
                detectingEnemy,
                enemiesRef.current,
                dungeonRef.current
            );
            setEnemies(prev => {
                const updated = prev.map(e =>
                    alertedIds.includes(e.id) ? { ...e, isHostile: true } : e
                );
                // Reveal tiles of all alerted enemies
                updated
                    .filter(e => alertedIds.includes(e.id))
                    .forEach(e => revealTile(dungeonRef.current, e.x, e.y));
                setCombatState(startCombat(playerCharacter, updated));
                return updated;
            });
        }
    }, [floorImageLoaded, playerImageLoaded, enemyImagesLoaded]);

    // Victory check
    useEffect(() => {
        if (enemies.length === 0) return;
        if (enemies.every(e => e.currentHp <= 0)) onVictory();
    }, [enemies]);

    // Enemy turn processing
    useEffect(() => {
        if (!combatState?.isActive) return;
        const currentId = combatState.initiativeOrder[combatState.currentTurnIndex];
        if (currentId === 'player') return;

        const enemy = enemies.find(e => e.id === currentId);
        if (!enemy || enemy.currentHp <= 0) {
            setCombatState(prev => prev ? advanceTurn(prev, enemiesRef.current) : prev);
            return;
        }

        const timer = setTimeout(() => {
            const pos = playerPositionRef.current;
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
                    setPlayerHp(prev => {
                        const newHp = Math.max(0, prev - result.damage);
                        if (newHp <= 0) onGameOver();
                        return newHp;
                    });
                }
                setCombatState(prev => {
                    if (!prev) return prev;
                    const withLog = addLogEntry(prev,
                        result.hit
                            ? `${enemy.name} hits you for ${result.damage} damage`
                            : `${enemy.name} misses you`
                    );
                    return advanceTurn(withLog, enemiesRef.current);
                });
            } else {
                const astar = new Path.AStar(pos.x, pos.y, (x, y) => {
                    return dungeonRef.current[y]?.[x]?.tileType === 'floor';
                });
                const path: { x: number; y: number }[] = [];
                astar.compute(enemy.x, enemy.y, (x, y) => path.push({ x, y }));
                path.shift();

                if (path.length > 0) {
                    const nextTile = path[0];
                    // Reveal the tile the enemy moves to
                    revealTile(dungeonRef.current, nextTile.x, nextTile.y);
                    setEnemies(prev => prev.map(e =>
                        e.id === enemy.id
                            ? { ...e, x: nextTile.x, y: nextTile.y }
                            : e
                    ));
                }

                setCombatState(prev => prev ? advanceTurn(prev, enemiesRef.current) : prev);
            }

            if (checkCombatEnd(enemiesRef.current)) {
                setCombatState(prev => prev ? { ...prev, isActive: false } : prev);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [combatState?.currentTurnIndex, combatState?.isActive]);

    // Mouse move handler for cursor
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleMouseMove = (e: MouseEvent) => {
            const action = pendingActionRef.current;

            if (!action) {
                canvas.style.cursor = 'default';
                return;
            }

            const rect = canvas.getBoundingClientRect();
            const hoverX = Math.floor((e.clientX - rect.left) / TILE_SIZE);
            const hoverY = Math.floor((e.clientY - rect.top) / TILE_SIZE);
            const pos = playerPositionRef.current;

            const distance = Math.max(
                Math.abs(hoverX - pos.x),
                Math.abs(hoverY - pos.y)
            );

            const hoveredEnemy = enemiesRef.current.find(e =>
                e.x === hoverX && e.y === hoverY && e.currentHp > 0
            );

            const hoveredTile = dungeonRef.current[hoverY]?.[hoverX];
            let isValid = false;

            if (action === 'attack') {
                isValid = !!hoveredEnemy && distance <= 4;
            } else if (action === 'focus_attack') {
                isValid = !!hoveredEnemy && distance <= 1;
            } else if (action === 'move') {
                isValid = !!hoveredTile && hoveredTile.tileType === 'floor' && distance <= 1;
            } else if (action === 'long_move') {
                isValid = !!hoveredTile && hoveredTile.tileType === 'floor' && distance <= 2;
            }

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

        const handleMouseLeave = () => {
            canvas.style.cursor = 'default';
        };

        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    // Right click handler — only potions outside combat
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleRightClick = (e: MouseEvent) => {
            e.preventDefault();
            if (combatStateRef.current?.isActive) return;

            const rect = canvas.getBoundingClientRect();
            const clickX = Math.floor((e.clientX - rect.left) / TILE_SIZE);
            const clickY = Math.floor((e.clientY - rect.top) / TILE_SIZE);
            const pos = playerPositionRef.current;

            if (clickX === pos.x && clickY === pos.y) {
                const nearPotion = potionsRef.current.find(p =>
                    Math.max(Math.abs(p.x - pos.x), Math.abs(p.y - pos.y)) <= 1
                );
                if (nearPotion) handleConsumePotion();
                return;
            }

            const clickedPotion = potionsRef.current.find(p => p.x === clickX && p.y === clickY);
            if (clickedPotion) {
                const distance = Math.max(
                    Math.abs(clickedPotion.x - pos.x),
                    Math.abs(clickedPotion.y - pos.y)
                );
                if (distance <= 1) handleConsumePotion();
            }
        };

        canvas.addEventListener('contextmenu', handleRightClick);
        return () => canvas.removeEventListener('contextmenu', handleRightClick);
    }, []);

    const handleConsumePotion = () => {
        const pos = playerPositionRef.current;
        const potion = potionsRef.current.find(p =>
            Math.max(Math.abs(p.x - pos.x), Math.abs(p.y - pos.y)) <= 1
        );
        if (!potion) return;

        const heal = rollPotionHeal();
        setPlayerHp(prev => Math.min(playerCharacter.maxHp, prev + heal));
        setPotions(prev => prev.filter(p => p.id !== potion.id));

        if (combatStateRef.current?.isActive) {
            setCombatState(prev => {
                if (!prev) return prev;
                const withLog = addLogEntry(prev, `You drink a potion and recover ${heal} HP`);
                return advanceTurn(
                    { ...withLog, hasAttackedThisTurn: true, hasMovedThisTurn: true },
                    enemiesRef.current
                );
            });
        }
    };

    const handlePlayerAction = (action: PlayerAction) => {
        if (action === 'consume_potion') {
            handleConsumePotion();
            return;
        }
        if (action === 'end_turn') {
            setCombatState(prev => prev ? advanceTurn(prev, enemiesRef.current) : prev);
            setPendingAction(null);
            if (canvasRef.current) canvasRef.current.style.cursor = 'default';
            return;
        }
        setPendingAction(action);
    };

    // Click handler
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleClick = (event: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const clickX = Math.floor((event.clientX - rect.left) / TILE_SIZE);
            const clickY = Math.floor((event.clientY - rect.top) / TILE_SIZE);

            if (combatStateRef.current?.isActive && pendingActionRef.current) {
                const action = pendingActionRef.current;
                const pos = playerPositionRef.current;

                if (action === 'attack') {
                    const rangedBonus = getRangedAttackBonus(
                        playerCharacter.characterClass,
                        playerCharacter.stats,
                        playerCharacter.level
                    );
                    const target = enemiesRef.current.find(e =>
                        e.x === clickX && e.y === clickY && e.currentHp > 0 &&
                        Math.max(Math.abs(e.x - pos.x), Math.abs(e.y - pos.y)) <= 4
                    );
                    if (target) {
                        const result = resolveAttack(rangedBonus, target.armorClass, 1, 6);
                        const updatedEnemies = enemiesRef.current.map(e =>
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
                            setCombatState(prev => prev
                                ? addLogEntry({ ...prev, isActive: false },
                                    result.hit
                                        ? `You shoot ${target.name} for ${result.damage} damage. Victory!`
                                        : `You missed ${target.name}`
                                )
                                : prev
                            );
                            setPendingAction(null);
                            if (canvasRef.current) canvasRef.current.style.cursor = 'default';
                            return;
                        }

                        setCombatState(prev => {
                            if (!prev) return prev;
                            const withLog = addLogEntry(prev,
                                result.hit
                                    ? `You shoot ${target.name} for ${result.damage} damage`
                                    : `You missed ${target.name}`
                            );
                            return checkAndAdvancePlayerTurn(
                                { ...withLog, hasAttackedThisTurn: true },
                                updatedEnemies
                            );
                        });
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
                    const target = enemiesRef.current.find(e =>
                        e.x === clickX && e.y === clickY && e.currentHp > 0 &&
                        Math.max(Math.abs(e.x - pos.x), Math.abs(e.y - pos.y)) <= 1
                    );
                    if (target) {
                        const result = resolveAttack(meleeBonus, target.armorClass, 1, 6);
                        const totalDamage = result.damage + (result.hit ? focusDamageBonus : 0);
                        const updatedEnemies = enemiesRef.current.map(e =>
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
                            setCombatState(prev => prev
                                ? addLogEntry({ ...prev, isActive: false },
                                    result.hit
                                        ? `You focus attack ${target.name} for ${totalDamage} damage. Victory!`
                                        : `Your focus attack missed ${target.name}`
                                )
                                : prev
                            );
                            setPendingAction(null);
                            if (canvasRef.current) canvasRef.current.style.cursor = 'default';
                            return;
                        }

                        setCombatState(prev => {
                            if (!prev) return prev;
                            const withLog = addLogEntry(prev,
                                result.hit
                                    ? `You focus attack ${target.name} for ${totalDamage} damage`
                                    : `Your focus attack missed ${target.name}`
                            );
                            return advanceTurn(
                                { ...withLog, hasAttackedThisTurn: true, hasMovedThisTurn: true },
                                updatedEnemies
                            );
                        });
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
                        dungeonRef.current[clickY]?.[clickX]?.tileType === 'floor'
                    ) {
                        setPlayerPosition({ x: clickX, y: clickY });
                        setCombatState(prev => {
                            if (!prev) return prev;
                            const withLog = addLogEntry(prev, `You move to (${clickX}, ${clickY})`);
                            const withMove = {
                                ...withLog,
                                hasMovedThisTurn: true,
                                hasAttackedThisTurn: action === 'long_move'
                                    ? true
                                    : prev.hasAttackedThisTurn
                            };
                            return checkAndAdvancePlayerTurn(withMove, enemiesRef.current);
                        });
                        setPendingAction(null);
                        if (canvasRef.current) canvasRef.current.style.cursor = 'default';
                    }
                }
                return;
            }

            if (combatStateRef.current?.isActive) return;

            if (!dungeonRef.current[clickY]?.[clickX] ||
                dungeonRef.current[clickY][clickX].tileType !== 'floor') return;

            const astar = new Path.AStar(clickX, clickY, (x, y) => {
                return dungeonRef.current[y]?.[x]?.tileType === 'floor';
            });

            const path: { x: number; y: number }[] = [];
            astar.compute(
                playerPositionRef.current.x,
                playerPositionRef.current.y,
                (x, y) => path.push({ x, y })
            );

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

                const detectingEnemy = detectPlayer(
                    enemiesRef.current,
                    nextPos,
                    dungeonRef.current
                );
                if (detectingEnemy) {
                    clearInterval(movementIntervalRef.current!);
                    movementIntervalRef.current = null;
                    const alertedIds = getAlertedEnemies(
                        detectingEnemy,
                        enemiesRef.current,
                        dungeonRef.current
                    );
                    setEnemies(prev => {
                        const updated = prev.map(e =>
                            alertedIds.includes(e.id) ? { ...e, isHostile: true } : e
                        );
                        // Reveal tiles of all alerted enemies immediately
                        updated
                            .filter(e => alertedIds.includes(e.id))
                            .forEach(e => revealTile(dungeonRef.current, e.x, e.y));
                        setCombatState(startCombat(playerCharacter, updated));
                        return updated;
                    });
                }
            }, 150);
        };

        canvas.addEventListener('click', handleClick);
        return () => {
            canvas.removeEventListener('click', handleClick);
            if (movementIntervalRef.current) clearInterval(movementIntervalRef.current);
        };
    }, [dungeon]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;

            const combat = combatStateRef.current;
            const isPlayerTurnNow = combat?.isActive &&
                combat.initiativeOrder[combat.currentTurnIndex] === 'player';

            const key = e.key.toLowerCase();

            if (key === 'c') {
                const pos = playerPositionRef.current;
                const nearPotion = potionsRef.current.find(p =>
                    Math.max(Math.abs(p.x - pos.x), Math.abs(p.y - pos.y)) <= 1
                );
                if (nearPotion) {
                    handleConsumePotion();
                    return;
                }
            }

            if (!isPlayerTurnNow || !combat) return;

            const { hasAttackedThisTurn, hasMovedThisTurn } = combat;
            const fullTurnUsed = hasAttackedThisTurn || hasMovedThisTurn;

            switch (key) {
                case 'a':
                    if (!hasAttackedThisTurn) handlePlayerAction('attack');
                    break;
                case 'm':
                    if (!hasMovedThisTurn) handlePlayerAction('move');
                    break;
                case 'l':
                    if (!fullTurnUsed) handlePlayerAction('long_move');
                    break;
                case 'f':
                    if (!fullTurnUsed) handlePlayerAction('focus_attack');
                    break;
                case 'e':
                    handlePlayerAction('end_turn');
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Game loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (!floorImageLoaded || !playerImageLoaded || !enemyImagesLoaded ||
            !potionImageLoaded || !attackSpritesLoaded) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const drawTiles = () => {
            for (let y = 0; y < DUNGEON_HEIGHT; y++) {
                for (let x = 0; x < DUNGEON_WIDTH; x++) {
                    const tile = dungeonRef.current[y][x];
                    const px = x * TILE_SIZE;
                    const py = y * TILE_SIZE;

                    if (!tile.isExplored) {
                        // Never seen — pure black
                        ctx.fillStyle = '#000';
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                        continue;
                    }

                    // Draw the tile normally first
                    if (tile.tileType === 'floor' && floorImageRef.current) {
                        ctx.drawImage(floorImageRef.current, px, py, TILE_SIZE, TILE_SIZE);
                    } else {
                        ctx.fillStyle = tile.tileType === 'wall' ? '#222' : '#000';
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    }

                    // If explored but not currently visible, darken slightly
                    if (!tile.isVisible) {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    }
                }
            }
        };

        const drawPotions = () => {
            potionsRef.current.forEach(potion => {
                // Only draw if tile is visible
                if (!dungeonRef.current[potion.y]?.[potion.x]?.isVisible) return;
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

        const drawAttackAnimation = (timestamp: number, targetX: number, targetY: number) => {
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
            const scale = 1 + progress * 0.5;
            const alpha = 1 - progress;
            const size = TILE_SIZE * scale;
            const offset = (TILE_SIZE - size) / 2;

            const px = targetX * TILE_SIZE;
            const py = targetY * TILE_SIZE;

            ctx.globalAlpha = alpha;
            ctx.drawImage(spriteImg, px + offset, py + offset, size, size);
            ctx.globalAlpha = 1;
        };

        const drawEnemies = (timestamp: number) => {
            enemiesRef.current.forEach(enemy => {
                const tileVisible = dungeonRef.current[enemy.y]?.[enemy.x]?.isVisible;

                // Dead enemies always show on their tile if explored
                const tileExplored = dungeonRef.current[enemy.y]?.[enemy.x]?.isExplored;
                if (enemy.currentHp <= 0 && !tileExplored) return;
                if (enemy.currentHp <= 0 && tileExplored) {
                    const enemyImg = enemy.enemyType === 'Skeleton'
                        ? skeletonImageRef.current
                        : banditImageRef.current;
                    if (!enemyImg) return;
                    const px = enemy.x * TILE_SIZE;
                    const py = enemy.y * TILE_SIZE;
                    ctx.globalAlpha = 0.5;
                    ctx.drawImage(enemyImg, px, py, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = 'rgba(180, 0, 0, 0.6)';
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.globalAlpha = 1;
                    return;
                }

                // Living enemies only show if tile is visible
                if (!tileVisible) return;

                const enemyImg = enemy.enemyType === 'Skeleton'
                    ? skeletonImageRef.current
                    : banditImageRef.current;
                if (!enemyImg) return;

                let px = enemy.x * TILE_SIZE;
                let py = enemy.y * TILE_SIZE;

                const anim = attackAnimationRef.current;
                const isAnimating = anim &&
                    anim.entityId === enemy.id &&
                    timestamp - anim.startTime < anim.duration;

                if (isAnimating) {
                    px += Math.sin((timestamp - anim.startTime) / 50) * 4;
                }

                const pendingAct = pendingActionRef.current;
                const pos = playerPositionRef.current;
                const distance = Math.max(
                    Math.abs(enemy.x - pos.x),
                    Math.abs(enemy.y - pos.y)
                );
                const isValidRangedTarget = pendingAct === 'attack' && distance <= 4;
                const isValidMeleeTarget = pendingAct === 'focus_attack' && distance <= 1;

                if (isValidRangedTarget || isValidMeleeTarget) {
                    ctx.strokeStyle = 'rgba(255, 255, 0, 0.9)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
                }

                if (enemy.isHostile) {
                    ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
                    ctx.shadowBlur = 15;
                }

                ctx.drawImage(enemyImg, px, py, TILE_SIZE, TILE_SIZE);
                ctx.shadowBlur = 0;

                if (isAnimating) {
                    const progress = (timestamp - anim.startTime) / anim.duration;
                    ctx.fillStyle = `rgba(255, 0, 0, ${0.5 - progress * 0.5})`;
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    drawAttackAnimation(timestamp, enemy.x, enemy.y);
                }
            });
        };

        const drawPlayer = (timestamp: number) => {
            if (!playerImageRef.current) return;
            const pos = playerPositionRef.current;
            let px = pos.x * TILE_SIZE;
            let py = pos.y * TILE_SIZE;

            const anim = attackAnimationRef.current;
            const isAnimating = anim &&
                anim.entityId === 'player' &&
                timestamp - anim.startTime < anim.duration;

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

        const drawTurnIndicator = () => {
            if (!combatStateRef.current?.isActive) return;
            const currentId = combatStateRef.current.initiativeOrder[
                combatStateRef.current.currentTurnIndex
            ];
            const isPlayerTurnNow = currentId === 'player';
            ctx.fillStyle = isPlayerTurnNow
                ? 'rgba(255, 215, 0, 0.9)'
                : 'rgba(255, 80, 80, 0.9)';
            ctx.font = 'bold 14px monospace';
            ctx.fillText(isPlayerTurnNow ? '⚔ YOUR TURN' : '💀 ENEMY TURN', 10, 20);
        };

        const drawCombatLog = () => {
            if (!combatStateRef.current?.isActive) return;
            const log = combatStateRef.current.log;
            const lastFive = log.slice(-5);
            ctx.font = '12px monospace';
            lastFive.forEach((entry, i) => {
                ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + i * 0.15})`;
                ctx.fillText(
                    entry.message,
                    10,
                    DUNGEON_HEIGHT * TILE_SIZE - 10 - (lastFive.length - 1 - i) * 18
                );
            });
        };

        const gameLoop = (timestamp: number) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawTiles();
            drawPotions();
            drawEnemies(timestamp);
            drawPlayer(timestamp);
            drawTurnIndicator();
            drawCombatLog();
            animationFrameId = requestAnimationFrame(gameLoop);
        };

        animationFrameId = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [floorImageLoaded, playerImageLoaded, enemyImagesLoaded, potionImageLoaded, attackSpritesLoaded]);

    return (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', margin: 'auto' }}>
            <canvas
                className="adventure-canvas"
                ref={canvasRef}
                width={DUNGEON_WIDTH * TILE_SIZE}
                height={DUNGEON_HEIGHT * TILE_SIZE}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <PlayerPortrait
                    playerCharacter={playerCharacter}
                    currentHp={playerHp}
                    maxHp={playerCharacter.maxHp}
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