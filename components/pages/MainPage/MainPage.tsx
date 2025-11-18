import SkinView3D from "@/components/ui/skinview3d/skinView3D";
import styles from "./MainPage.module.css";
import Button from "@/components/ui/components/button/Button";
import SplashText from "@/components/ui/SplashText/SplashText";
import { useEffect, useState } from "react";
import Modal from "@/components/ui/components/Modal/Modal";
import Input from "@/components/ui/components/Input/Input";
import { LocalStorageHandler } from "@/src/utils/localStorageUtil";
import { WorldUtils } from "@/src/utils/worldUtils";
import { WorldStorage } from "@/src/utils/worldStorage";

export default function MainPage() {
    const [skinModal, setSkinModal] = useState(true);
    const [usernameInput, setUsernameInput] = useState("");
    const [username, setUsername] = useState("Kalbskinder");

    async function handlePlay () {
        try {
            const worldId = await LocalStorageHandler.get("worldId");
            if (worldId) {
                console.log("Loading world with ID:", worldId);
                // Load existing world from localStorage
                const worldData = await WorldStorage.loadWorld(worldId);
                if (worldData) {
                    console.log("World loaded:", worldData);
                    window.location.href = "/play";
                } else {
                    console.log("World not found in storage");
                }
            } else {
                // Create new world
                const newWorldId = WorldUtils.randomWorldId();
                const seed = WorldUtils.randomSeed();
                const emptyWorldData = { blocks: [], seed };
                
                // Save to localStorage
                WorldStorage.saveWorld(newWorldId, emptyWorldData, seed);
                
                // Save worldId to localStorage
                LocalStorageHandler.save("worldId", newWorldId);
                console.log("Creating new world with ID:", newWorldId, "Seed:", seed);
                window.location.href = "/play";
            }
        } catch (error) {
            console.error("Error handling world ID:", error);
        }
    };

    const handleUsernameChange = () => {
        if (usernameInput.trim() !== "") {
            setUsername(usernameInput.trim());
            setSkinModal(true);
            LocalStorageHandler.save("username", usernameInput.trim());
        }
    }

    useEffect(() => {
        const loadUsername = async () => {
            const savedUsername = await LocalStorageHandler.get("username");
            if (savedUsername) {
                setUsername(savedUsername);
                setUsernameInput(savedUsername);
            } else {
                setUsername("Kalbskinder");
                setUsernameInput("Kalbskinder");
            }
        };
        loadUsername();
    }, []);

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
                    <SkinView3D key={username} username={username} />
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