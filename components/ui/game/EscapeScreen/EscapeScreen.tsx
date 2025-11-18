import Button from '../../components/Button/Button';
import styles from './EscapeScreen.module.css';

interface ModalProps {
    onClose?: () => void;
}

export function EscapeScreen({ onClose }: ModalProps) {
    function openExternalLink(url: string) {
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    return (
        <div className={styles.escapeScreen}>
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
