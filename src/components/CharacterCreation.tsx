import React, {useState, useEffect, forwardRef, useRef} from 'react';
import './CharacterCreation.css';

import WarriorMale from '../assets/gifs/warrior_male.gif'
import MageMale from '../assets/gifs/mage_male.gif';
import WarriorFemale from '../assets/gifs/warrior_female.gif';
import MageFemale from '../assets/gifs/mage_female.gif';
import type { Character, CharacterClass, CharacterGender, CharacterStats } from './types';

const rollStat = (): number => {
    const min = 8;
    const max = 18;
    const roll = Math.floor(Math.random() * (max - min + 1)) + min;
    return roll;
};
const rollStats = (): CharacterStats => {
   const stats: CharacterStats = {
        strength: rollStat(),
        dexterity: rollStat(),
        constitution: rollStat(),
        intelligence: rollStat(),
        wisdom: rollStat(),
        charisma: rollStat(),
    }; 
    return stats;
}

const CharacterCreation = ({ onAdventureStart }: { onAdventureStart: (character: Character) => void }) => {
    const [characterName, setCharacterName] = useState('');
    const [characterStats, setCharacterStats] = useState(rollStats);
    const [characterClass, setCharacterClass] = useState<CharacterClass>('Warrior');
    const [characterGender, setCharacterGender] = useState<CharacterGender>('Male');

    const nameRef = useRef<HTMLInputElement>(null);
    const classRef = useRef<HTMLButtonElement>(null);
    const genderRef = useRef<HTMLButtonElement>(null);
    const rerollRef = useRef<HTMLButtonElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        nameRef.current?.focus();
    }, []);

    const handleNameKeyNav = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            classRef.current?.focus();
        } else if (e.key === 'ArrowUp' && characterName) {
            confirmRef.current?.focus();
        }
    };

    const handleClassKeyNav = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'ArrowDown') {
            genderRef.current?.focus();
        } else if (e.key === 'ArrowUp') {
            nameRef.current?.focus();
        }
    };

    const handleGenderKeyNav = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'ArrowDown') {
            rerollRef.current?.focus();
        } else if (e.key === 'ArrowUp') {
            classRef.current?.focus();
        }
    };

    const handleRerollKeyNav = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'ArrowDown') {
            confirmRef.current?.focus();
        } else if (e.key === 'ArrowUp') {
            genderRef.current?.focus();
        }
    };

    const handleConfirmKeyNav = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'ArrowDown') {
            nameRef.current?.focus();
        } else if (e.key === 'ArrowUp') {
            genderRef.current?.focus();
        }
    };


    const handleOnRerollStats = () => {
        setCharacterStats(rollStats());
    }

    const handleConfirmClick = () => {
        const character: Character = {
            name: characterName,
            characterClass,
            characterGender,
            stats: characterStats,
        }
        onAdventureStart(character);
    }
    return (
        <div className="cc-layout">
            <div className="cc-container">
                <CharacterPreview characterClass={characterClass} characterGender={characterGender} />
                <div className="cc-stats">
                    <div className="cc-stats-header">Character Creation</div>
                    <div className="cc-stats-content">
                        <CharacterCreationName ref={nameRef} characterName={characterName} setCharacterName={setCharacterName} onKeyNav={handleNameKeyNav} />
                        <CharacterClassSelection ref={classRef} characterClass={characterClass} setCharacterClass={setCharacterClass} onKeyNav={handleClassKeyNav} />
                        <CharacterGender ref={genderRef} characterGender={characterGender} setCharacterGender={setCharacterGender} onKeyNav={handleGenderKeyNav} />
                        <CharacterStatsList characterStats={characterStats} />
                    </div>
                    <div className="cc-stats-reroll">
                        <button onClick={ handleOnRerollStats } ref={rerollRef} onKeyDown={handleRerollKeyNav}>Reroll Stats</button>
                    </div>
                </div>
            </div>
            <div className="cc-confirm">
                <button className="cc-confirm-btn" onClick={handleConfirmClick} disabled={!characterName} ref={confirmRef} onKeyDown={handleConfirmKeyNav}>
                    Confirm
                </button>
            </div>
        </div>
    )
}

const CharacterPreview = ({ characterClass, characterGender }: { characterClass: CharacterClass, characterGender: CharacterGender }) => {
        let imgSrc = '';
        if (characterClass === 'Warrior' && characterGender === 'Male') {
            imgSrc = WarriorMale;
        } else if (characterClass === 'Warrior' && characterGender === 'Female') {
            imgSrc = WarriorFemale;
        } else if (characterClass === 'Mage' && characterGender === 'Male') {
            imgSrc = MageMale;
        } else if (characterClass === 'Mage' && characterGender === 'Female') {
            imgSrc = MageFemale;
        }
        return (
        <div className="cc-preview">
            <div className="cc-preview-image">
                <img className="cc-preview-img" src={imgSrc} alt="Character Preview" />
            </div>
        </div>
    );
}

const CharacterCreationName = forwardRef<HTMLInputElement, { characterName: string, setCharacterName: (name: string) => void, onKeyNav: (e: React.KeyboardEvent<HTMLInputElement>) => void }>(({ characterName, setCharacterName, onKeyNav }, ref) => {
    return (
        <div className="cc-name-section">
            <div className="cc-name-label">Character Name:</div>
            <input
                id="character-name-input"
                ref={ref}
                type="text"
                placeholder="Enter the name of your character ..."
                value={characterName}
                style={{width: 'inherit', fontSize: '18px', padding: '5px'}}
                onChange={(e) => setCharacterName(e.target.value)}
                onKeyDown={onKeyNav}
            />
        </div>
    );
});

const CharacterGender = forwardRef<HTMLButtonElement, { characterGender: CharacterGender, setCharacterGender: (gender: CharacterGender) => void, onKeyNav: (e: React.KeyboardEvent<HTMLButtonElement>) => void }>(({ characterGender, setCharacterGender, onKeyNav }, ref: React.Ref<HTMLButtonElement>) => {
    const handleGenderChange = (direction: number) => {
        const genders: CharacterGender[] = ['Male', 'Female'];
        const currentIndex = genders.indexOf(characterGender);
        const newIndex = (currentIndex + direction + genders.length) % genders.length;
        setCharacterGender(genders[newIndex]);
    };
    const handleKeyNav = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'ArrowLeft') {
            handleGenderChange(-1);
        } else if (e.key === 'ArrowRight') {
            handleGenderChange(1);
        } else {
            onKeyNav(e);
        }
    };

    return (
        <div className="cc-gender-section">
            <div className="cc-gender-label">Character Gender:</div>
            <div className="cc-gender-controls">
                <button className="chevron-left" ref={ref} onClick={() => {handleGenderChange(-1)}} onKeyDown={handleKeyNav}>‹</button>
                <div className="cc-gender-name">{characterGender}</div>
                <button className="chevron-right" onClick={() => {handleGenderChange(1)}} onKeyDown={handleKeyNav}>›</button>
            </div>
        </div>
    );
});

const CharacterStatsList = ({ characterStats }: { characterStats: CharacterStats }) => {
    return (
        <div className="cc-stats-render">
            {
                Object.entries(characterStats).map(([stat, value]) => (
                    <div key={stat} className="cc-stat">
                        <span className="cc-stat-name">{stat.charAt(0).toUpperCase() + stat.slice(1)}:</span>
                        <span className="cc-stat-value">{value}</span>
                    </div>
                ))
            }
        </div>
    );
}



const CharacterClassSelection = forwardRef(({ characterClass, setCharacterClass, onKeyNav }: { characterClass: CharacterClass, setCharacterClass: (charClass: CharacterClass) => void, onKeyNav: (e: React.KeyboardEvent<HTMLButtonElement>) => void }, ref: React.Ref<HTMLButtonElement>) => {
    const handleClassChange = (direction: number) => {
        const classes: CharacterClass[] = ['Warrior', 'Mage'];
        const currentIndex = classes.indexOf(characterClass);
        const newIndex = (currentIndex + direction + classes.length) % classes.length;
        setCharacterClass(classes[newIndex]);
    };
    const handleKeyNav = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'ArrowLeft') {
            handleClassChange(-1);
        } else if (e.key === 'ArrowRight') {
            handleClassChange(1);
        } else {
            onKeyNav(e);
        }
    };

    return (
        <div className="cc-class-selection">
            <div className="cc-class-label">Character Class:</div>
            <div className="cc-class-controls">
                <button className="chevron-left" ref={ref} onClick={() => {handleClassChange(-1)}} onKeyDown={handleKeyNav}>‹</button>
                <div className="cc-class-name">{characterClass}</div>
                <button className="chevron-right" onClick={() => {handleClassChange(1)}} onKeyDown={handleKeyNav}>›</button>
            </div>
        </div>
    )
});


export default CharacterCreation;