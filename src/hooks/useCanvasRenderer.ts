import { useEffect } from 'react';
import type { EnemyCharacter, CombatState, AttackAnimation } from '../components/types';
import type { PlayerAction } from '../components/ContextMenu';
import { useGameStore } from '../state/gameStore';
import type { GameAssets } from './useGameAssets';

const TILE_SIZE = 48;

export const useCanvasRenderer = (
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    assets: GameAssets,
    attackAnimationRef: React.MutableRefObject<AttackAnimation | null>,
    isReady: boolean
) => {
    useEffect(() => {
        if (!isReady || !assets.allLoaded) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const drawTiles = (
            dungeon: ReturnType<typeof useGameStore.getState>['dungeon'],
            visibleTiles: Set<string>,
            exploredTiles: Set<string>
        ) => {
            for (let y = 0; y < dungeon.length; y++) {
                for (let x = 0; x < (dungeon[0]?.length ?? 0); x++) {
                    const tile = dungeon[y][x];
                    const px = x * TILE_SIZE;
                    const py = y * TILE_SIZE;
                    const key = `${x},${y}`;

                    if (!exploredTiles.has(key)) {
                        ctx.fillStyle = '#000';
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                        continue;
                    }

                    if (tile.tileType === 'floor' && assets.floorRef.current) {
                        ctx.drawImage(assets.floorRef.current, px, py, TILE_SIZE, TILE_SIZE);
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
                if (!assets.potionRef.current) return;
                const px = potion.x * TILE_SIZE;
                const py = potion.y * TILE_SIZE;
                const size = TILE_SIZE * 0.6;
                const offset = (TILE_SIZE - size) / 2;
                ctx.shadowColor = 'rgba(0, 255, 100, 0.8)';
                ctx.shadowBlur = 10;
                ctx.drawImage(assets.potionRef.current, px + offset, py + offset, size, size);
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
            const spriteImg = assets.attackSpritesRef.current[anim.spriteType];
            if (!spriteImg) return;
            const progress = elapsed / anim.duration;
            const size = TILE_SIZE * (1 + progress * 0.5);
            const offset = (TILE_SIZE - size) / 2;
            ctx.globalAlpha = 1 - progress;
            ctx.drawImage(spriteImg, targetX * TILE_SIZE + offset, targetY * TILE_SIZE + offset, size, size);
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
                const enemyImg = enemy.enemyType === 'Skeleton'
                    ? assets.skeletonRef.current
                    : assets.banditRef.current;
                if (!enemyImg) return;

                const px = enemy.x * TILE_SIZE;
                const py = enemy.y * TILE_SIZE;

                if (enemy.currentHp <= 0) {
                    if (!exploredTiles.has(key)) return;
                    ctx.globalAlpha = 0.5;
                    ctx.drawImage(enemyImg, px, py, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = 'rgba(180, 0, 0, 0.6)';
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.globalAlpha = 1;
                    return;
                }

                if (!visibleTiles.has(key)) return;

                const anim = attackAnimationRef.current;
                const isAnimating = anim &&
                    anim.entityId === enemy.id &&
                    timestamp - anim.startTime < anim.duration;

                let drawX = px;
                if (isAnimating) drawX += Math.sin((timestamp - anim.startTime) / 50) * 4;

                const distance = Math.max(
                    Math.abs(enemy.x - playerPos.x),
                    Math.abs(enemy.y - playerPos.y)
                );
                if ((pendingAction === 'attack' && distance <= 4) ||
                    (pendingAction === 'focus_attack' && distance <= 1)) {
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

        const drawPlayer = (pos: { x: number; y: number }, timestamp: number) => {
            if (!assets.playerRef.current) return;
            const anim = attackAnimationRef.current;
            const isAnimating = anim &&
                anim.entityId === 'player' &&
                timestamp - anim.startTime < anim.duration;

            let px = pos.x * TILE_SIZE;
            const py = pos.y * TILE_SIZE;
            if (isAnimating) px += Math.sin((timestamp - anim.startTime) / 50) * 4;

            ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
            ctx.shadowBlur = 15;
            ctx.drawImage(assets.playerRef.current, px, py, TILE_SIZE, TILE_SIZE);
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
            const isPlayerTurn = cs.initiativeOrder[cs.currentTurnIndex] === 'player';
            ctx.fillStyle = isPlayerTurn ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 80, 80, 0.9)';
            ctx.font = 'bold 14px monospace';
            ctx.fillText(isPlayerTurn ? '⚔ YOUR TURN' : '💀 ENEMY TURN', 10, 20);
        };

        const drawCombatLog = (cs: CombatState | null, dungeonHeight: number) => {
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
                combatState,
            } = useGameStore.getState();

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawTiles(dungeon, visibleTiles, exploredTiles);
            drawPotions(potions, visibleTiles);
            drawEnemies(enemies, visibleTiles, exploredTiles, timestamp, pendingAction, playerPosition);
            drawPlayer(playerPosition, timestamp);
            drawTurnIndicator(combatState);
            drawCombatLog(combatState, dungeon.length);
            animationFrameId = requestAnimationFrame(gameLoop);
        };

        animationFrameId = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [assets.allLoaded, isReady]);
};
