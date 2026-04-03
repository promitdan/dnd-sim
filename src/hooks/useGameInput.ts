import { useCallback, useEffect, useRef } from 'react';
import { Path } from 'rot-js';
import type { PlayerCharacter, AttackAnimation } from '../components/types';
import type { PlayerAction } from '../components/ContextMenu';
import {
    startCombat,
    advanceTurn,
    resolveAttack,
    checkCombatEnd,
    addLogEntry,
    getRangedAttackBonus,
    getMeleeAttackBonus,
    getFocusDamageBonus,
    checkAndAdvancePlayerTurn,
} from '../engine/combat';
import { detectPlayer, getAlertedEnemies } from '../engine/enemies';
import { rollPotionHeal } from '../engine/items';
import { PLAYER_SPRITE_MAP, type playerSpriteKey, ATTACK_SPRITE_MAP } from '../constants/spriteMap';
import { useGameStore } from '../state/gameStore';

const TILE_SIZE = 48;

const getAttackSpriteType = (
    characterClass: 'Warrior' | 'Mage' | 'Undead',
    isMelee: boolean
): AttackAnimation['spriteType'] => {
    if (characterClass === 'Warrior') return isMelee ? 'sword' : 'arrow';
    if (characterClass === 'Undead') return isMelee ? 'sword' : 'arrow';
    return isMelee ? 'staff' : 'fireball';
};

export const useGameInput = (
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    playerCharacter: PlayerCharacter,
    isReady: boolean,
    attackAnimationRef: React.MutableRefObject<AttackAnimation | null>
) => {
    const movementIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const {
        setEnemies,
        removePotion,
        setPlayerPosition,
        setPlayerHp,
        setCombatState,
        updateCombatState,
        setPendingAction,
        revealTile,
    } = useGameStore();

    const handleConsumePotion = useCallback(() => {
        const {
            playerPosition: pos,
            potions: currentPotions,
            combatState: cs,
            enemies: currentEnemies,
            playerHp: currentHp,
            playerMaxHp,
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
                    hasMovedThisTurn: true,
                },
                currentEnemies
            ));
        }
    }, [setPlayerHp, removePotion, updateCombatState]);

    const handlePlayerAction = useCallback((action: PlayerAction) => {
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
    }, [handleConsumePotion, updateCombatState, setPendingAction, canvasRef]);

    // Mouse move — update cursor based on pending action
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isReady) return;

        const handleMouseMove = (e: MouseEvent) => {
            const {
                pendingAction: action,
                playerPosition: pos,
                enemies: currentEnemies,
                dungeon: currentDungeon,
            } = useGameStore.getState();

            if (!action) { canvas.style.cursor = 'default'; return; }

            const rect = canvas.getBoundingClientRect();
            const hoverX = Math.floor((e.clientX - rect.left) / TILE_SIZE);
            const hoverY = Math.floor((e.clientY - rect.top) / TILE_SIZE);
            const distance = Math.max(Math.abs(hoverX - pos.x), Math.abs(hoverY - pos.y));
            const hoveredEnemy = currentEnemies.find(e => e.x === hoverX && e.y === hoverY && e.currentHp > 0);
            const hoveredTile = currentDungeon[hoverY]?.[hoverX];

            let isValid = false;
            if (action === 'attack') isValid = !!hoveredEnemy && distance <= 4;
            else if (action === 'focus_attack') isValid = !!hoveredEnemy && distance <= 1;
            else if (action === 'move') isValid = !!hoveredTile && hoveredTile.tileType === 'floor' && distance <= 1;
            else if (action === 'long_move') isValid = !!hoveredTile && hoveredTile.tileType === 'floor' && distance <= 2;

            if (!isValid) { canvas.style.cursor = 'not-allowed'; return; }

            const spriteKey = `${playerCharacter.characterClass}_${playerCharacter.characterGender}` as playerSpriteKey;
            const cursorMap: Record<string, string> = {
                attack: `url(${ATTACK_SPRITE_MAP['arrow']}) 16 16, crosshair`,
                focus_attack: `url(${ATTACK_SPRITE_MAP['sword']}) 16 16, crosshair`,
                move: `url(${PLAYER_SPRITE_MAP[spriteKey]}) 16 16, move`,
                long_move: `url(${PLAYER_SPRITE_MAP[spriteKey]}) 16 16, move`,
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

    // Right click — consume adjacent potion outside combat
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isReady) return;

        const handleRightClick = (e: MouseEvent) => {
            e.preventDefault();
            const {
                combatState: cs,
                playerPosition: pos,
                potions: currentPotions,
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
    }, [isReady, handleConsumePotion]);

    // Left click — combat actions or free movement
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
                dungeon: currentDungeon,
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
                            e.id === target.id ? { ...e, currentHp: e.currentHp - result.damage } : e
                        );
                        setEnemies(updatedEnemies);
                        attackAnimationRef.current = {
                            entityId: target.id,
                            startTime: performance.now(),
                            duration: 500,
                            spriteType: getAttackSpriteType(playerCharacter.characterClass, false),
                        };
                        if (checkCombatEnd(updatedEnemies)) {
                            updateCombatState(prev => addLogEntry(
                                { ...prev, isActive: false },
                                result.hit
                                    ? `You shoot ${target.name} for ${result.damage} damage. Victory!`
                                    : `You missed ${target.name}`
                            ));
                            setPendingAction(null);
                            canvas.style.cursor = 'default';
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
                        canvas.style.cursor = 'default';
                    }
                }

                if (action === 'focus_attack') {
                    const meleeBonus = getMeleeAttackBonus(playerCharacter.stats.strength, playerCharacter.level);
                    const focusDamageBonus = getFocusDamageBonus(playerCharacter.stats.dexterity);
                    const target = currentEnemies.find(e =>
                        e.x === clickX && e.y === clickY && e.currentHp > 0 &&
                        Math.max(Math.abs(e.x - pos.x), Math.abs(e.y - pos.y)) <= 1
                    );
                    if (target) {
                        const result = resolveAttack(meleeBonus, target.armorClass, 1, 6);
                        const totalDamage = result.damage + (result.hit ? focusDamageBonus : 0);
                        const updatedEnemies = currentEnemies.map(e =>
                            e.id === target.id ? { ...e, currentHp: e.currentHp - totalDamage } : e
                        );
                        setEnemies(updatedEnemies);
                        attackAnimationRef.current = {
                            entityId: target.id,
                            startTime: performance.now(),
                            duration: 500,
                            spriteType: getAttackSpriteType(playerCharacter.characterClass, true),
                        };
                        if (checkCombatEnd(updatedEnemies)) {
                            updateCombatState(prev => addLogEntry(
                                { ...prev, isActive: false },
                                result.hit
                                    ? `You focus attack ${target.name} for ${totalDamage} damage. Victory!`
                                    : `Your focus attack missed ${target.name}`
                            ));
                            setPendingAction(null);
                            canvas.style.cursor = 'default';
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
                        canvas.style.cursor = 'default';
                    }
                }

                if (action === 'move' || action === 'long_move') {
                    const maxTiles = action === 'long_move' ? 2 : 1;
                    const distance = Math.max(Math.abs(clickX - pos.x), Math.abs(clickY - pos.y));
                    if (distance <= maxTiles && currentDungeon[clickY]?.[clickX]?.tileType === 'floor') {
                        setPlayerPosition({ x: clickX, y: clickY });
                        updateCombatState(prev => checkAndAdvancePlayerTurn(
                            {
                                ...addLogEntry(prev, `You move to (${clickX}, ${clickY})`),
                                hasMovedThisTurn: true,
                                hasAttackedThisTurn: action === 'long_move' ? true : prev.hasAttackedThisTurn,
                            },
                            currentEnemies
                        ));
                        setPendingAction(null);
                        canvas.style.cursor = 'default';
                    }
                }
                return;
            }

            if (cs?.isActive) return;
            if (currentDungeon[clickY]?.[clickX]?.tileType !== 'floor') return;

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
                const nextPos = path[stepIndex++];
                setPlayerPosition(nextPos);

                const { enemies: latestEnemies, dungeon: latestDungeon } = useGameStore.getState();
                const detectingEnemy = detectPlayer(latestEnemies, nextPos, latestDungeon);
                if (detectingEnemy) {
                    clearInterval(movementIntervalRef.current!);
                    movementIntervalRef.current = null;
                    const alertedIds = getAlertedEnemies(detectingEnemy, latestEnemies, latestDungeon);
                    const updated = latestEnemies.map(e =>
                        alertedIds.includes(e.id) ? { ...e, isHostile: true } : e
                    );
                    updated.filter(e => alertedIds.includes(e.id)).forEach(e => revealTile(e.x, e.y));
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
                playerPosition: pos,
            } = useGameStore.getState();

            const key = e.key.toLowerCase();

            if (key === 'c') {
                const nearPotion = currentPotions.find(p =>
                    Math.max(Math.abs(p.x - pos.x), Math.abs(p.y - pos.y)) <= 1
                );
                if (nearPotion) { handleConsumePotion(); return; }
            }

            const isPlayerTurnNow = cs?.isActive &&
                cs.initiativeOrder[cs.currentTurnIndex] === 'player';
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
    }, [isReady, handleConsumePotion, handlePlayerAction]);

    return { handlePlayerAction };
};
