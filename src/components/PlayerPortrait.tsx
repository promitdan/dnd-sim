import { useMemo } from 'react';
import type { PlayerCharacter } from './types';
import { PLAYER_PORTRAIT_MAP, type playerSpriteKey } from '../constants/spriteMap';

interface PlayerPortraitProps {
    playerCharacter: PlayerCharacter;
    currentHp: number;
    maxHp: number;
}

const PlayerPortrait = ({ playerCharacter, currentHp, maxHp }: PlayerPortraitProps) => {
    const spriteKey = `${playerCharacter.characterClass}_${playerCharacter.characterGender}` as playerSpriteKey;
    const imgSrc = PLAYER_PORTRAIT_MAP[spriteKey];

    const damagePercent = useMemo(() => {
        return Math.max(0, Math.min(1, 1 - currentHp / maxHp));
    }, [currentHp, maxHp]);

    // If damage is 20%, overlay height is 80% from bottom
    const overlayHeight = `${damagePercent * 100}%`;

    const hpColor = useMemo(() => {
        if (damagePercent < 0.33) return '#4caf50';
        if (damagePercent < 0.66) return '#ff9800';
        return '#f44336';
    }, [damagePercent]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            border: '1px solid #555',
            borderRadius: '8px',
            minWidth: '160px',
            fontFamily: 'monospace',
            color: 'white'
        }}>
            {/* Name */}
            <div style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#ffd700',
                textAlign: 'center',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                maxWidth: '140px'
            }}>
                {playerCharacter.name}
            </div>

            {/* Portrait with red overlay */}
            <div style={{
                position: 'relative',
                width: '140px',
                height: '140px',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '2px solid #888'
            }}>
                <img
                    src={imgSrc}
                    alt={playerCharacter.name}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                    }}
                />
                {/* Red damage overlay — grows from bottom */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: overlayHeight,
                    backgroundColor: 'rgba(180, 0, 0, 0.55)',
                    transition: 'height 0.4s ease',
                    pointerEvents: 'none'
                }} />
            </div>

            {/* HP bar */}
            <div style={{ width: '140px' }}>
                <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#333',
                    borderRadius: '4px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${(currentHp / maxHp) * 100}%`,
                        height: '100%',
                        backgroundColor: hpColor,
                        transition: 'width 0.4s ease, background-color 0.4s ease',
                        borderRadius: '4px'
                    }} />
                </div>

                {/* HP text */}
                <div style={{
                    textAlign: 'center',
                    fontSize: '13px',
                    marginTop: '4px',
                    color: hpColor
                }}>
                    {currentHp} / {maxHp} HP
                </div>
            </div>

            {/* Class and level */}
            <div style={{
                fontSize: '11px',
                color: '#aaa',
                textAlign: 'center'
            }}>
                {playerCharacter.characterClass} · Level {playerCharacter.level}
            </div>
        </div>
    );
};

export default PlayerPortrait;