interface VictoryScreenProps {
    playerName: string;
    onPlayAgain: () => void;
}

const VictoryScreen = ({ playerName, onPlayAgain }: VictoryScreenProps) => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100vw',
            height: '100vh',
            backgroundColor: '#0a0a0a',
            fontFamily: 'monospace',
            color: 'white',
            gap: '32px'
        }}>
            <div style={{
                fontSize: '64px',
                animation: 'pulse 2s ease-in-out infinite'
            }}>
                ⚔️
            </div>

            <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#ffd700',
                textShadow: '0 0 30px rgba(255, 215, 0, 0.8)',
                textAlign: 'center'
            }}>
                VICTORY
            </div>

            <div style={{
                fontSize: '20px',
                color: '#aaa',
                textAlign: 'center'
            }}>
                {playerName} has cleared the dungeon
            </div>

            <button
                onClick={onPlayAgain}
                style={{
                    marginTop: '16px',
                    padding: '14px 40px',
                    fontSize: '18px',
                    fontFamily: 'monospace',
                    backgroundColor: '#ffd700',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    letterSpacing: '2px'
                }}
            >
                PLAY AGAIN
            </button>

            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                }
            `}</style>
        </div>
    );
};

export default VictoryScreen;