"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { WorldGeneration } from '@/src/rendering/WorldGeneration';
import Stats from 'three/examples/jsm/libs/stats.module.js';

export default function GameCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);
        sceneRef.current = scene;

        // Camera setup
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(0, 40, 40);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            antialias: true,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        rendererRef.current = renderer;

        // FPS Stats
        const stats = new Stats();
        stats.showPanel(0);
        document.body.appendChild(stats.dom);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        scene.add(directionalLight);

        // Generate world chunks
        const loadWorld = async () => {
            try {
                for (let cx = -6; cx < 6; cx++) {
                    for (let cz = -6; cz < 6; cz++) {
                        const chunk = await WorldGeneration.generateChunk(cx, cz);
                        scene.add(chunk);
                    }
                }
            } catch (error) {
                console.error('Failed to generate world:', error);
            }
        };

        loadWorld();

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            
            stats.begin();
            
            // Simple camera rotation for demo
            const time = Date.now() * 0.0001;
            camera.position.x = Math.sin(time) * 50;
            camera.position.z = Math.cos(time) * 50;
            camera.lookAt(32, 20, 32);

            renderer.render(scene, camera);
            
            stats.end();
        };

        animate();

        // Handle window resize
        const handleResize = () => {
            if (!cameraRef.current || !rendererRef.current) return;
            
            cameraRef.current.aspect = window.innerWidth / window.innerHeight;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            document.body.removeChild(stats.dom);
            renderer.dispose();
        };
    }, []);

    return (
        <div>
            <canvas
                ref={canvasRef}
                style={{
                    display: 'block',
                    width: '100vw',
                    height: '100vh',
                }}
            />
        </div>

    );
}
