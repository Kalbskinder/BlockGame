import SkinView3D from "@/components/ui/skinview3d/skinView3D";
import styles from "./MainPage.module.css";
import Button from "@/components/ui/components/button/Button";
import SplashText from "@/components/ui/SplashText/SplashText";

export default function MainPage() {

    const handleSkinChange = () => {};
    const handlePlay = () => {};

  return (
    <div className={styles.mainPage}>
        <div className={styles.bg} /> {/* Background */} 
        <div className={styles.titleWrapper}>
            <img src="/assets/ui/title.png" className={styles.title} alt="Block Game" />
            <div className={styles.splashTextWrapper}>
                <SplashText />
            </div>
        </div>
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.contentLeft}>
                    <SkinView3D skin="/assets/skins/kalbskinder.png" />
                    <Button onClick={handleSkinChange} className="max-w-2">Change Skin</Button>
                </div>
                <div className={styles.contentRight}>
                    <Button onClick={handlePlay}>Play</Button>
                    <div className="flex-row w-full max-w-4 justify-center align-center gap-1">
                        <Button className="w-full">Options</Button>
                        <Button className="w-full">Quit Game</Button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}