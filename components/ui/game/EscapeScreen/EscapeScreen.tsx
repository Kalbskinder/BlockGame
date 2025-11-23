import { useEffect, useState } from 'react';
import Button from '../../components/Button/Button';
import Slider from '../../components/Slider/Slider';
import styles from './EscapeScreen.module.css';
import { LocalStorageHandler } from '@/src/utils/localStorageUtil';
import { Settings } from '@/src/types/models';

interface ModalProps {
    onClose?: () => void;
}

export function EscapeScreen({ onClose }: ModalProps) {
    const [renderDistance, setRenderDistance] = useState(8); // Default render distance of 8 chunks
    const [fov, setFov] = useState(70); // Default FOV of 70 degrees
    const [isLoaded, setIsLoaded] = useState(false);

    function openExternalLink(url: string) {
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    useEffect(() => {
        const getSettings = async () => {
            const settingsString = await LocalStorageHandler.get('settings');
            if (settingsString) {
                const settings = JSON.parse(settingsString) as Settings;
                if (settings.renderDistance) setRenderDistance(settings.renderDistance);
                if (settings.fov) setFov(settings.fov);
            } else {
                const defaultSettings: Settings = { fov: 70, renderDistance: 8 };
                LocalStorageHandler.save('settings', JSON.stringify(defaultSettings));
            }
            setIsLoaded(true);
        };        
        getSettings();
    }, [])

    useEffect(() => {
        if (!isLoaded) return;
        const saveSettings = async () => {
            const settings: Settings = { fov, renderDistance };
            await LocalStorageHandler.save('settings', JSON.stringify(settings));
        };
        saveSettings();
    }, [fov, renderDistance, isLoaded]);

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
