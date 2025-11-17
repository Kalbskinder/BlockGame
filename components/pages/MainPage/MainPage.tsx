import SkinView3D from "@/components/ui/skinview3d/skinView3D";
import styles from "./MainPage.module.css";
import Button from "@/components/ui/components/button/Button";
import SplashText from "@/components/ui/SplashText/SplashText";
import { useState } from "react";
import Modal from "@/components/ui/components/Modal/Modal";
import Input from "@/components/ui/components/Input/Input";

export default function MainPage() {
    const [skinModal, setSkinModal] = useState(true);
    const [usernameInput, setUsernameInput] = useState("");
    const [username, setUsername] = useState("Kalbskinder");

    const handlePlay = () => {};

    const handleUsernameChange = () => {
        if (usernameInput.trim() !== "") {
            setUsername(usernameInput.trim());
            setSkinModal(true);
        }
    }

  return (
    <div className={styles.mainPage}>
        <div className={styles.bg} /> {/* Background */} 
        <Modal hidden={skinModal} onClose={() => setSkinModal(true)} >
            <Input placeholder="Username" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} />
            <Button onClick={handleUsernameChange}>Update Skin</Button>
        </Modal>
        <div className={`${styles.titleWrapper} select-none`}>
            <img src="/assets/ui/title.png" className={`${styles.title} select-none`} alt="Block Game" />
            <div className={styles.splashTextWrapper}>
                <SplashText />
            </div>
        </div>
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.contentLeft}>
                    <SkinView3D skin={`https://mineskin.eu/skin/${username}`} />
                    <Button onClick={() => setSkinModal(false)} className="max-w-2">Change Skin</Button>
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