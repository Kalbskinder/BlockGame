"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { WorldGeneration } from '@/src/rendering/WorldGeneration';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export default function GameCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<PointerLockControls | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Player movement
        const moveState = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            canJump: false,
        };

        const velocity = new THREE.Vector3();
        const direction = new THREE.Vector3();
        const PLAYER_HEIGHT = 1.8;
        const PLAYER_RADIUS = 0.3; // Player collision radius
        const PLAYER_COLLISION_OFFSET = 0.1; // Small offset to prevent clipping
        const GRAVITY = 30;
        const JUMP_VELOCITY = 10;
        const MOVE_SPEED = 5;
        const MOVE_ACCELERATION = 50; // How fast you accelerate
        const MOVE_DAMPING = 0.85; // How fast you decelerate (lower = more slippery)
        const STEP_HEIGHT = 0.5; // Maximum step height player can walk up

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
        camera.position.set(0, 35, 0);
        cameraRef.current = camera;

        // Pointer Lock Controls
        const controls = new PointerLockControls(camera, document.body);
        controlsRef.current = controls;

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

        // Keyboard controls
        const onKeyDown = (event: KeyboardEvent) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    moveState.forward = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    moveState.left = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    moveState.backward = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    moveState.right = true;
                    break;
                case 'Space':
                    if (moveState.canJump) {
                        velocity.y = JUMP_VELOCITY;
                        moveState.canJump = false;
                    }
                    break;
            }
        };

        const onKeyUp = (event: KeyboardEvent) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    moveState.forward = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    moveState.left = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    moveState.backward = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    moveState.right = false;
                    break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        // Click to lock pointer
        const onClick = () => {
            controls.lock();
        };
        document.addEventListener('click', onClick);

        // Generate world chunks
        const worldChunks = new Map<string, THREE.Group>();
        
        const loadWorld = async () => {
            try {
                for (let cx = -6; cx < 6; cx++) {
                    for (let cz = -6; cz < 6; cz++) {
                        const chunk = await WorldGeneration.generateChunk(cx, cz);
                        scene.add(chunk);
                        worldChunks.set(`${cx},${cz}`, chunk);
                    }
                }
            } catch (error) {
                console.error('Failed to generate world:', error);
            }
        };

        loadWorld();

        // Helper function to get terrain height at position
        const getTerrainHeight = (x: number, z: number): number => {
            // Use raycaster to detect terrain height
            const raycaster = new THREE.Raycaster();
            raycaster.set(
                new THREE.Vector3(x, 100, z),
                new THREE.Vector3(0, -1, 0)
            );

            const intersects = raycaster.intersectObjects(scene.children, true);
            
            if (intersects.length > 0) {
                return intersects[0].point.y + PLAYER_COLLISION_OFFSET;
            }
            
            return 32; // Default height if no terrain found
        };

        // Animation loop
        let prevTime = performance.now();
        
        const animate = () => {
            requestAnimationFrame(animate);
            
            stats.begin();

            const time = performance.now();
            const delta = (time - prevTime) / 1000;

            if (controls.isLocked) {
                // Apply gravity
                velocity.y -= GRAVITY * delta;

                // Movement direction
                direction.z = Number(moveState.backward) - Number(moveState.forward);
                direction.x = Number(moveState.left) - Number(moveState.right);
                direction.normalize();

                // Calculate movement velocities
                const moveX = -direction.x * MOVE_SPEED * delta;
                const moveZ = -direction.z * MOVE_SPEED * delta;

                // Store old position
                const oldY = camera.position.y;

                // Move the controls
                controls.moveRight(moveX);
                controls.moveForward(moveZ);

                // Apply vertical movement (gravity/jump)
                camera.position.y += velocity.y * delta;

                // Ground collision with terrain height detection
                const terrainHeight = getTerrainHeight(camera.position.x, camera.position.z);
                const playerGroundLevel = terrainHeight + PLAYER_HEIGHT;
                
                const heightDifference = playerGroundLevel - camera.position.y;
                
                // If we're below or slightly above the ground
                if (heightDifference > 0) {
                    // If it's a small step, smoothly move up
                    if (heightDifference <= STEP_HEIGHT && moveState.canJump) {
                        camera.position.y += Math.min(heightDifference, STEP_HEIGHT * delta * 10);
                        velocity.y = 0;
                    }
                    // If we're falling or landing
                    else if (velocity.y <= 0) {
                        camera.position.y = playerGroundLevel;
                        velocity.y = 0;
                        moveState.canJump = true;
                    }
                } else {
                    // We're in the air
                    moveState.canJump = false;
                }
            }

            renderer.render(scene, camera);
            
            prevTime = time;
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
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
            document.removeEventListener('click', onClick);
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
