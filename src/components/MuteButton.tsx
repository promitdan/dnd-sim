import { useAudioStore } from '../state/audioStore';

const MuteButton = () => {
    const { isMuted, toggleMute } = useAudioStore();

    return (
        <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            style={{
                position: 'fixed',
                top: '16px',
                right: '16px',
                zIndex: 200,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                border: '1px solid #555',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '20px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'monospace',
                transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(80, 80, 80, 0.9)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.75)')}
        >
            {isMuted ? '🔇' : '🔊'}
        </button>
    );
};

export default MuteButton;