interface GameOverScreenProps {
    playerName: string;
    onPlayAgain: () => void;
}

const GameOverScreen = ({ playerName, onPlayAgain }: GameOverScreenProps) => {
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
                animation: 'flicker 3s ease-in-out infinite'
            }}>
                💀
            </div>

            <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#cc0000',
                textShadow: '0 0 30px rgba(200, 0, 0, 0.8)',
                textAlign: 'center',
                letterSpacing: '4px'
            }}>
                YOU DIED
            </div>

            <div style={{
                fontSize: '20px',
                color: '#666',
                textAlign: 'center'
            }}>
                {playerName} has fallen in the dungeon
            </div>

            <button
                onClick={onPlayAgain}
                style={{
                    marginTop: '16px',
                    padding: '14px 40px',
                    fontSize: '18px',
                    fontFamily: 'monospace',
                    backgroundColor: '#cc0000',
                    color: 'white',
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
                @keyframes flicker {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
            `}</style>
        </div>
    );
};

export default GameOverScreen;