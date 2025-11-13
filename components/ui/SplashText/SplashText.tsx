import { useEffect, useState } from "react";
import styles from "./SplashText.module.css";
import { getRandomSplashText } from "@/libs/data/splashtexts";
import { SplashTextEntry } from "@/libs/types/models";

export default function SplashText() {
    const [splashText, setSplashText] = useState<SplashTextEntry | null>(null);
    
    useEffect(() => {
        setSplashText(getRandomSplashText());
    }, []);

    return (
        <div className={styles.splashText} style={{ fontSize: `${splashText?.fontSize}em` }}>
            {splashText?.text}
        </div>
    );
}