"use client";

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { WorldGeneration, CHUNK_SIZE } from '@/src/rendering/WorldGeneration';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { EscapeScreen } from '../ui/game/EscapeScreen/EscapeScreen';

export default function GameCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<PointerLockControls | null>(null);
    const [escOpened, setEscOpened] = useState(false);
    
    // Player movement
    const moveState = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false,
        canJump: false,
    };

    const handleEscapeClose = () => {
        setEscOpened(false);
        moveState.backward = false;
        moveState.forward = false;
        moveState.left = false;
        moveState.right = false;
        moveState.jump = false;
        // Use setTimeout to avoid lock conflicts
        setTimeout(() => {
            controlsRef.current?.lock();
        }, 100);
    }

    useEffect(() => {
        if (!canvasRef.current) return;

        const velocity = new THREE.Vector3();
        const direction = new THREE.Vector3();
        const PLAYER_HEIGHT = 1.8;
        const PLAYER_RADIUS = 0.3; // Player collision radius
        const PLAYER_COLLISION_OFFSET = 0.1; // Small offset to prevent clipping
        const GRAVITY = 30;
        const JUMP_VELOCITY = 10;
        const MOVE_SPEED = 5;
        const RENDER_DISTANCE = 2; // in chunks, loads (2*R+1)^2 chunks around player
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

        // Handle pointer lock change
        controls.addEventListener('unlock', () => {
            setEscOpened(true);
        });

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

        // Click to lock pointer (only when escape menu is closed)
        const onClick = (e: MouseEvent) => {
            // Check if click is on canvas
            if (e.target === canvasRef.current && !controls.isLocked) {
                controls.lock();
            }
        };
        canvasRef.current.addEventListener('click', onClick);

        // Chunk streaming around player
        const worldChunks = new Map<string, THREE.Group>();
        const pendingLoads = new Set<string>();
        const keyOf = (cx: number, cz: number) => `${cx},${cz}`;

        let lastCenterChunkX = Number.POSITIVE_INFINITY;
        let lastCenterChunkZ = Number.POSITIVE_INFINITY;

        const isWithinRenderDistance = (cx: number, cz: number, centerX: number, centerZ: number) =>
            Math.abs(cx - centerX) <= RENDER_DISTANCE && Math.abs(cz - centerZ) <= RENDER_DISTANCE;

        const disposeChunk = (group: THREE.Group) => {
            group.traverse((obj) => {
                const mesh = obj as THREE.Mesh | THREE.InstancedMesh | any;
                if ((mesh as any).isMesh || (mesh as any).isInstancedMesh) {
                    if (mesh.geometry) {
                        mesh.geometry.dispose();
                    }
                    const mat: any = mesh.material;
                    if (Array.isArray(mat)) {
                        mat.forEach((m) => m && typeof m.dispose === 'function' && m.dispose());
                    } else if (mat && typeof mat.dispose === 'function') {
                        mat.dispose();
                    }
                    if ((mesh as any).isInstancedMesh && typeof (mesh as any).dispose === 'function') {
                        (mesh as any).dispose();
                    }
                }
            });
        };

        const scheduleChunkLoad = async (cx: number, cz: number) => {
            const id = keyOf(cx, cz);
            if (worldChunks.has(id) || pendingLoads.has(id)) return;
            pendingLoads.add(id);
            try {
                const chunk = await WorldGeneration.generateChunk(cx, cz);
                // Only add if still needed around current center
                if (isWithinRenderDistance(cx, cz, lastCenterChunkX, lastCenterChunkZ)) {
                    scene.add(chunk);
                    worldChunks.set(id, chunk);
                } else {
                    // No longer needed
                    disposeChunk(chunk);
                }
            } catch (e) {
                console.error('Failed to load chunk', id, e);
            } finally {
                pendingLoads.delete(id);
            }
        };

        const ensureChunksForCenter = (centerX: number, centerZ: number) => {
            lastCenterChunkX = centerX;
            lastCenterChunkZ = centerZ;

            // Determine which chunks should be present
            const needed = new Set<string>();
            for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
                for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
                    const cx = centerX + dx;
                    const cz = centerZ + dz;
                    needed.add(keyOf(cx, cz));
                    scheduleChunkLoad(cx, cz);
                }
            }

            // Unload chunks that are no longer needed
            const toRemove: string[] = [];
            worldChunks.forEach((group, id) => {
                if (!needed.has(id)) {
                    scene.remove(group);
                    disposeChunk(group);
                    toRemove.push(id);
                }
            });
            toRemove.forEach((id) => worldChunks.delete(id));
        };

        // Initial load around origin (before player moves)
        ensureChunksForCenter(0, 0);

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
            
            return -Infinity; // No terrain = fall forever
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

                // Stream chunks when entering a new chunk
                const currentChunkX = Math.floor(camera.position.x / CHUNK_SIZE);
                const currentChunkZ = Math.floor(camera.position.z / CHUNK_SIZE);
                if (currentChunkX !== lastCenterChunkX || currentChunkZ !== lastCenterChunkZ) {
                    ensureChunksForCenter(currentChunkX, currentChunkZ);
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
            if (canvasRef.current) {
                canvasRef.current.removeEventListener('click', onClick);
            }
            document.body.removeChild(stats.dom);
            renderer.dispose();
        };
    }, []);

    return (
        <div>
            {escOpened && <EscapeScreen onClose={handleEscapeClose} />}
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
