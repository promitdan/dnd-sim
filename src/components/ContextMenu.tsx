import type { CombatState } from './types';

export type PlayerAction =
    | 'attack'
    | 'move'
    | 'long_move'
    | 'focus_attack'
    | 'end_turn'
    | 'consume_potion';

interface ContextMenuProps {
    combatState: CombatState | null;
    onAction: (action: PlayerAction) => void;
    canConsumePotion: boolean;
    isPlayerTurn: boolean;
}

const ContextMenu = ({ combatState, onAction, canConsumePotion, isPlayerTurn }: ContextMenuProps) => {
    if (!combatState?.isActive && !canConsumePotion) return null;

    const hasAttacked = combatState?.hasAttackedThisTurn ?? false;
    const hasMoved = combatState?.hasMovedThisTurn ?? false;
    const fullTurnDisabled = hasAttacked || hasMoved;
    const isInCombat = !!combatState?.isActive;
    const notMyTurn = isInCombat && !isPlayerTurn;

    return (
        <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            border: `1px solid ${isPlayerTurn ? '#888' : '#444'}`,
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontFamily: 'monospace',
            color: 'white',
            minWidth: '180px',
            transition: 'border-color 0.3s ease'
        }}>
            <div style={{
                color: isPlayerTurn ? '#ffd700' : '#666',
                fontSize: '12px',
                marginBottom: '4px',
                letterSpacing: '1px'
            }}>
                {isInCombat
                    ? isPlayerTurn ? '⚔ YOUR TURN' : '⏳ ENEMY TURN'
                    : 'ACTIONS'
                }
            </div>

            {isInCombat && (
                <>
                    <ActionButton
                        label="🏹 Attack"
                        shortcut="A"
                        disabled={notMyTurn || hasAttacked}
                        onClick={() => onAction('attack')}
                    />
                    <ActionButton
                        label="👣 Move"
                        shortcut="M"
                        disabled={notMyTurn || hasMoved}
                        onClick={() => onAction('move')}
                    />
                    <ActionButton
                        label="🏃 Long Move"
                        shortcut="L"
                        disabled={notMyTurn || fullTurnDisabled}
                        onClick={() => onAction('long_move')}
                    />
                    <ActionButton
                        label="⚔️ Focus Attack"
                        shortcut="F"
                        disabled={notMyTurn || fullTurnDisabled}
                        onClick={() => onAction('focus_attack')}
                    />
                    <hr style={{ borderColor: '#444', margin: '4px 0' }} />
                </>
            )}

            {canConsumePotion && (
                <ActionButton
                    label="🧪 Consume Potion"
                    shortcut="C"
                    disabled={notMyTurn}
                    onClick={() => onAction('consume_potion')}
                />
            )}

            {isInCombat && (
                <ActionButton
                    label="⏭ End Turn"
                    shortcut="E"
                    disabled={notMyTurn}
                    onClick={() => onAction('end_turn')}
                />
            )}
        </div>
    );
};

interface ActionButtonProps {
    label: string;
    shortcut: string;
    disabled: boolean;
    onClick: () => void;
}

const ActionButton = ({ label, shortcut, disabled, onClick }: ActionButtonProps) => (
    <button
        onClick={onClick}
        disabled={disabled}
        style={{
            backgroundColor: disabled ? '#1a1a1a' : '#555',
            color: disabled ? '#444' : 'white',
            border: `1px solid ${disabled ? '#333' : '#777'}`,
            borderRadius: '4px',
            padding: '8px 12px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontFamily: 'monospace',
            fontSize: '14px',
            textAlign: 'left',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.2s ease'
        }}
    >
        <span>{label}</span>
        <span style={{
            fontSize: '11px',
            color: disabled ? '#333' : '#ffd700',
            backgroundColor: disabled ? '#111' : '#333',
            padding: '2px 6px',
            borderRadius: '3px',
            border: `1px solid ${disabled ? '#222' : '#555'}`,
            fontWeight: 'bold'
        }}>
            {shortcut}
        </span>
    </button>
);

export default ContextMenu;