import { useState } from 'react';
import Button from '../../components/Button/Button';
import Slider from '../../components/Slider/Slider';
import styles from './EscapeScreen.module.css';

interface ModalProps {
    onClose?: () => void;
}

export function EscapeScreen({ onClose }: ModalProps) {
    const [renderDistance, setRenderDistance] = useState(4); // Default render distance of 4 chunks
    const [fov, setFov] = useState(70); // Default FOV of 70 degrees

    function openExternalLink(url: string) {
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    return (
        <div className={styles.escapeScreen}>
            <div className={styles.optionsGroup}>
                <Slider max={120} min={30} value={fov} valueName='FOV' onChange={setFov} />
                <Slider max={16} min={1} value={renderDistance} valueName='Render Distance' onChange={setRenderDistance} />
            </div>
            <Button onClick={onClose}>Back to Game</Button>
            <div className={styles.optionsGroup}>
                <Button onClick={() => openExternalLink('https://github.com/Kalbskinder/BlockGame')}>Give Feedback</Button>
                <Button onClick={() => openExternalLink('https://github.com/Kalbskinder/BlockGame/issues')}>Report Bugs</Button>

            </div>
            <div className={styles.optionsGroup}>
                <Button>Options</Button>
                <Button>Controls</Button>

            </div>
            <Button onClick={() => { window.location.href = '/'; }}>Exit to Main Menu</Button>
        </div>
    );
}
