import { useEffect } from 'react';
import { Path } from 'rot-js';
import type { PlayerCharacter, AttackAnimation } from '../components/types';
import {
    advanceTurn,
    resolveAttack,
    checkCombatEnd,
    addLogEntry,
} from '../engine/combat';
import { useGameStore, useCombatState, useEnemies } from '../state/gameStore';

export const useEnemyTurn = (
    playerCharacter: PlayerCharacter,
    onGameOver: () => void,
    attackAnimationRef: React.MutableRefObject<AttackAnimation | null>
) => {
    const combatState = useCombatState();
    const enemies = useEnemies();
    const { setPlayerHp, updateEnemy, updateCombatState, revealTile } = useGameStore();

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
                dungeon: currentDungeon,
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
                    spriteType: 'sword',
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
};
