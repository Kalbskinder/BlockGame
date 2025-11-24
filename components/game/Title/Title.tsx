import { MinecraftTextUtil } from '@/src/utils/gameTextUtil';
import styles from './Title.module.css';
import { useEffect, useState } from 'react';

interface TitleProps {
    title?: string;
    subtitle?: string;
}


export default function Title({ title, subtitle }: TitleProps) {
    const [visible, setVisible] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        let fadeOutTimeout: NodeJS.Timeout;
        let hideTimeout: NodeJS.Timeout;

        if (title || subtitle) {
            // Reset state for new title
            setVisible(true);
            setFadeOut(false);

            fadeOutTimeout = setTimeout(() => {
                setFadeOut(true);
                hideTimeout = setTimeout(() => {
                    setVisible(false);
                    setFadeOut(false);
                }, 500);
            }, 2500);
        } else {
            setVisible(false);
            setFadeOut(false);
        }

        return () => {
            clearTimeout(fadeOutTimeout);
            clearTimeout(hideTimeout);
        };
    }, [title, subtitle]);

    return (
        <div className={`${styles.title} ${visible ? styles.visible : ''} ${fadeOut ? styles['fade-out'] : ''}`} id="title">
            <div className={styles.titleText}>{MinecraftTextUtil.formatText(title || '')}</div>
            <br />
            <div className={styles.subtitleText}>{MinecraftTextUtil.formatText(subtitle || '')}</div>
        </div>
    );
}