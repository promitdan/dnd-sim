import { useState } from 'react';
import CharacterCreation from './CharacterCreation';
import AdventureArea from './AdventureArea';
import VictoryScreen from './VictoryScreen';
import GameOverScreen from './GameOverScreen';
import type { Character, GameStage } from './types';
import { createGameCharacter } from './stats';
import type { PlayerCharacter } from './types';

const PlayableArea = (): React.ReactNode => {
    const [gameStage, setGameStage] = useState<GameStage>('character_creation');
    const [playerCharacter, setPlayerCharacter] = useState<PlayerCharacter | null>(null);

    const handleOnAdventureStart = (character: Character) => {
        const gameCharacter = createGameCharacter(character, 1);
        const playerCharacter: PlayerCharacter = {
            ...gameCharacter,
            isPC: true,
            vision: 3
        };
        setPlayerCharacter(playerCharacter);
        setGameStage('adventure');
    };

    const handleVictory = () => {
        setGameStage('victory');
    };

    const handleGameOver = () => {
        setGameStage('game_over');
    };

    const handlePlayAgain = () => {
        setPlayerCharacter(null);
        setGameStage('character_creation');
    };

    if (gameStage === 'character_creation') {
        return <CharacterCreation onAdventureStart={handleOnAdventureStart} />;
    }

    if (gameStage === 'adventure' && playerCharacter) {
        return (
            <AdventureArea
                playerCharacter={playerCharacter}
                onVictory={handleVictory}
                onGameOver={handleGameOver}
            />
        );
    }

    if (gameStage === 'victory' && playerCharacter) {
        return (
            <VictoryScreen
                playerName={playerCharacter.name}
                onPlayAgain={handlePlayAgain}
            />
        );
    }

    if (gameStage === 'game_over' && playerCharacter) {
        return (
            <GameOverScreen
                playerName={playerCharacter.name}
                onPlayAgain={handlePlayAgain}
            />
        );
    }
};

export default PlayableArea;