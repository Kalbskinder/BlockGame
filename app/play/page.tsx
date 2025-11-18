"use client";

import { LocalStorageHandler } from "@/src/utils/localStorageUtil";
import { useEffect, useState } from "react";
import GameCanvas from "@/components/game/GameCanvas";

export default function PlayPage() {
    const [canRender, setCanRender] = useState(false);

    useEffect(() => {
        const checkLocalstorage = async () => {
            const worldId = await LocalStorageHandler.get("worldId");
            if (!worldId) {
                window.location.href = "/";
            } else {
                setCanRender(true);
            }
        };
        checkLocalstorage();
    }, []);

    if (!canRender) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontSize: '24px',
            }}>
                Loading world...
            </div>
        );
    }

    return <GameCanvas />;
}