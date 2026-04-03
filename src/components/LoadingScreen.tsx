import { useState, useEffect } from 'react';
import './LoadingScreen.css';

const LOADING_PHRASES = [
    'Sharpening Weapons...',
    'Brewing Potions...',
    'Preparing Spells...',
    'Rolling for Initiative...',
    'Lighting Torches...',
    'Drawing Dungeon Maps...',
    'Summoning Skeletons...',
    'Recruiting Bandits...',
    'Forging Armor...',
    'Consulting the Oracle...',
    'Warding the Entrance...',
    'Memorizing Arcane Texts...',
    'Counting Gold Pieces...',
    'Polishing Shields...',
    'Setting Traps...',
];

interface LoadingScreenProps {
    progress: number; // 0 to 1
}

const LoadingScreen = ({ progress }: LoadingScreenProps) => {
    const [phraseIndex, setPhraseIndex] = useState(() =>
        Math.floor(Math.random() * LOADING_PHRASES.length)
    );

    useEffect(() => {
        const id = setInterval(() => {
            setPhraseIndex(i => (i + 1) % LOADING_PHRASES.length);
        }, 1800);
        return () => clearInterval(id);
    }, []);

    const pct = Math.round(progress * 100);

    return (
        <div className="loading-screen">
            <div className="loading-title">The Dungeon of Evil</div>
            <div className="loading-phrase">{LOADING_PHRASES[phraseIndex]}</div>
            <div className="loading-bar-track">
                <div className="loading-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="loading-pct">{pct}%</div>
        </div>
    );
};

export default LoadingScreen;
