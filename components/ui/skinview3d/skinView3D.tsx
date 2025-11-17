"use client";

import { useEffect, useRef, useState } from "react";
import * as skinview3d from "skinview3d";

interface SkinView3DProps {
    skin: string;
    width?: number;
    height?: number;
}

export default function SkinView3D({ skin, width = 200, height = 300 }: SkinView3DProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const viewerRef = useRef<skinview3d.SkinViewer | null>(null);
    const mousePositionRef = useRef({ x: 0, y: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!canvasRef.current) return;

        setIsLoading(true);

        const viewer = new skinview3d.SkinViewer({
            canvas: canvasRef.current,
            width: width,
            height: height,
            skin: skin,
            enableControls: false,
        });

        viewerRef.current = viewer;

        // Apply idle animation
        viewer.animation = new skinview3d.IdleAnimation();
        viewer.animation.speed = 1;

        // Wait for skin to load
        viewer.loadSkin(skin).then(() => {
            setIsLoading(false);
        }).catch((error) => {
            console.error("Failed to load skin:", error);
            setIsLoading(false);
        });

        return () => {
            viewer.dispose();
            viewerRef.current = null;
        };
    }, [skin]);

    useEffect(() => {
        const updatePlayerRotation = (mouseX: number, mouseY: number) => {
            const viewer = viewerRef.current;
            if (!viewer) return;

            // math: https://media.tenor.com/ppGmIFN36bwAAAAM/nerd-catstor.gif
            const rect = viewer.canvas.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const diffX = (mouseX - centerX) / rect.width;
            const diffY = (mouseY - centerY) / rect.height;

            const clampedDiffX = Math.max(-6, Math.min(6, diffX));
            const clampedDiffY = Math.max(-6, Math.min(6, diffY));

            const maxAngleX = Math.PI / 25;
            const maxAngleY = Math.PI / 18;
            const bodyFactor = 0.5;

            const rotX = -clampedDiffY * maxAngleY;
            const rotY = -clampedDiffX * maxAngleX;

            const player = viewer.playerObject;
            if (!player) return;

            player.skin.head.innerLayer.rotation.set(-rotX, -rotY, 0);
            player.skin.head.outerLayer.rotation.set(-rotX, -rotY, 0);
            player.rotation.set(-rotX * bodyFactor, -rotY * bodyFactor, 0);
        };

        const handleMouseMove = (e: MouseEvent) => {
            mousePositionRef.current = { x: e.clientX, y: e.clientY };
            updatePlayerRotation(e.clientX, e.clientY);
        };

        const handleScroll = () => {
            updatePlayerRotation(mousePositionRef.current.x, mousePositionRef.current.y);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("scroll", handleScroll);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("scroll", handleScroll);
        };
    }, []);

    async function loadCape(uuid: string) {
        const url = `https://crafatar.com/capes/${uuid}`;
        const res = await fetch(url);
        if (res.status === 400) {
            viewerRef.current?.loadCape(null);
        } else if (res.ok) {
            viewerRef.current?.loadCape(url);
        } else {
            console.warn(`User ${uuid} has no cape.`)
            viewerRef.current?.loadCape(null);
        }
    }

    return (
        <div style={{ position: 'relative', width: `${width}px`, height: `${height}px` }}>
            {isLoading && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    borderRadius: '4px'
                }}>
                    <div style={{
                        border: '4px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '4px solid white',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        animation: 'spin 1s linear infinite'
                    }} />
                </div>
            )}
            <canvas ref={canvasRef} style={{ opacity: isLoading ? 0.3 : 1, transition: 'opacity 0.3s' }}></canvas>
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
