import { MinecraftTextUtil } from '@/src/utils/minecraftTextUtil';
import styles from './Actionbar.module.css';
import { useEffect, useState } from 'react';
import { time } from 'console';

interface ActionbarProps {
    text?: string;
}


export default function Actionbar({ text }: ActionbarProps) {
    const [visible, setVisible] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        if (text) {
            setVisible(true);
            const timeout = setTimeout(() => {
                setFadeOut(true);
                setTimeout(() => {
                    setVisible(false);
                    setFadeOut(false);
                }, 500);
            }, 2500);

            return () => clearTimeout(timeout);
        } else {
            setVisible(false);
            setFadeOut(false);
        }
    }, [text]);

    return (
        <div className={`${styles.actionbar} ${visible ? styles.visible : ''} ${fadeOut ? styles['fade-out'] : ''}`} id="actionbar">
            {MinecraftTextUtil.formatText(text || '')}
        </div>
    );
}