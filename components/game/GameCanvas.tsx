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
        setTimeout(() => {
            controlsRef.current?.lock();
        }, 100);
    }

    useEffect(() => {
        if (!canvasRef.current) return;

        /**
         * Constants
         */
        const PLAYER_HEIGHT = 1.8;
        const PLAYER_RADIUS = 0.3; 
        const PLAYER_COLLISION_OFFSET = 0.001; 
        const BLOCK_SIZE = 1;
        const BLOCK_HALF = BLOCK_SIZE / 2;
        const GRAVITY = 30;
        const JUMP_VELOCITY = 8.5;
        const RENDER_DISTANCE = 2;
        const STEP_HEIGHT = 0.5; 
        
        const MAX_SPEED = 4.0;
        const ACCELERATION = 40.0;
        const FRICTION = 25.0; 

        /**
         * Scene setup
         */
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(0, 35, 0);
        cameraRef.current = camera;

        const controls = new PointerLockControls(camera, document.body);
        controlsRef.current = controls;
        controls.addEventListener('unlock', () => setEscOpened(true));

        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            antialias: true,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        rendererRef.current = renderer;

        const stats = new Stats();
        stats.showPanel(0);
        document.body.appendChild(stats.dom);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        scene.add(directionalLight);

        /**
         * Input and velocity
         */
        const velocity = new THREE.Vector3(0, 0, 0);

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

        const onClick = (e: MouseEvent) => {
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

        /**
         * Fast block queries
         */
        const blockAt = (bx: number, by: number, bz: number): boolean => {
            const key = `${bx},${bz}`;
            const height = globalHeightMap.get(key);
            if (height === undefined) return false;
            return by >= 0 && by < height;
        };
        const getColumnTopFaceY = (x: number, z: number): number | null => {
            const key = `${Math.floor(x + 0.5)},${Math.floor(z + 0.5)}`;
            const h = globalHeightMap.get(key);
            if (h === undefined) return null;
            return h - BLOCK_HALF;
        };

        /**
         * AABB helper utilities
         */
        const overlapOnAxis = (amin: number, amax: number, bmin: number, bmax: number) => {
            return Math.max(0, Math.min(amax, bmax) - Math.max(amin, bmin));
        };

        /**
         * Core collision: per-axis movement with AABB checks against nearby blocks
         */

        const tryMoveAABB = (delta: THREE.Vector3) => {
            // Horizontal movement X
            if (delta.x !== 0) {
                const targetX = camera.position.x + delta.x;
                const minX = targetX - PLAYER_RADIUS;
                const maxX = targetX + PLAYER_RADIUS;
                const minY = camera.position.y - PLAYER_HEIGHT; 
                const maxY = camera.position.y;
                const minZ = camera.position.z - PLAYER_RADIUS;
                const maxZ = camera.position.z + PLAYER_RADIUS;
            
                const startX = Math.floor(minX + 0.5) - 1;
                const endX = Math.floor(maxX + 0.5) + 1;
                const startY = Math.floor(minY);
                const endY = Math.floor(maxY);
                const startZ = Math.floor(minZ + 0.5) - 1;
                const endZ = Math.floor(maxZ + 0.5) + 1;

                let resolvedX = targetX;
                let collidedX = false;

                for (let bx = startX; bx <= endX; bx++) {
                    for (let bz = startZ; bz <= endZ; bz++) {
                        const colH = globalHeightMap.get(`${bx},${bz}`);
                        if (colH === undefined) continue;

                        const byMin = Math.max(startY, 0);
                        const byMax = Math.min(endY, colH - 1);

                        if (byMax < byMin) continue;

                        for (let by = byMin; by <= byMax; by++) {
                            const blockMinX = bx - BLOCK_HALF;
                            const blockMaxX = bx + BLOCK_HALF;
                            const blockMinY = by - BLOCK_HALF;
                            const blockMaxY = by + BLOCK_HALF;
                            const blockMinZ = bz - BLOCK_HALF;
                            const blockMaxZ = bz + BLOCK_HALF;

                            const overlapZ = overlapOnAxis(minZ, maxZ, blockMinZ, blockMaxZ);
                            const overlapY = overlapOnAxis(minY, maxY, blockMinY, blockMaxY);
                            
                            const isWall = blockMaxY > (minY + STEP_HEIGHT);

                            if (overlapZ > 0 && overlapY > 0.02 && isWall) { 
                                const overlapX = overlapOnAxis(minX, maxX, blockMinX, blockMaxX);
                                if (overlapX > 0) {
                                    if (delta.x > 0) {
                                        const candidateX = blockMinX - PLAYER_RADIUS - PLAYER_COLLISION_OFFSET;
                                        resolvedX = Math.min(resolvedX, candidateX);
                                    } else {
                                        const candidateX = blockMaxX + PLAYER_RADIUS + PLAYER_COLLISION_OFFSET;
                                        resolvedX = Math.max(resolvedX, candidateX);
                                    }
                                    collidedX = true;
                                }
                            }
                        }
                    }
                }
                camera.position.x = resolvedX;
                if (collidedX) {
                    velocity.x = 0;
                }
            }

            // Horizontal movement Z
            if (delta.z !== 0) {
                const targetZ = camera.position.z + delta.z;
                const minX = camera.position.x - PLAYER_RADIUS;
                const maxX = camera.position.x + PLAYER_RADIUS;
                const minY = camera.position.y - PLAYER_HEIGHT;
                const maxY = camera.position.y;
                const minZ = targetZ - PLAYER_RADIUS;
                const maxZ = targetZ + PLAYER_RADIUS;

                const startX = Math.floor(minX + 0.5) - 1;
                const endX = Math.floor(maxX + 0.5) + 1;
                const startY = Math.floor(minY);
                const endY = Math.floor(maxY);
                const startZ = Math.floor(minZ + 0.5) - 1;
                const endZ = Math.floor(maxZ + 0.5) + 1;

                let resolvedZ = targetZ;
                let collidedZ = false;

                for (let bx = startX; bx <= endX; bx++) {
                    for (let bz = startZ; bz <= endZ; bz++) {
                        const colH = globalHeightMap.get(`${bx},${bz}`);
                        if (colH === undefined) continue;

                        const byMin = Math.max(startY, 0);
                        const byMax = Math.min(endY, colH - 1);
                        if (byMax < byMin) continue;

                        for (let by = byMin; by <= byMax; by++) {
                            const blockMinX = bx - BLOCK_HALF;
                            const blockMaxX = bx + BLOCK_HALF;
                            const blockMinY = by - BLOCK_HALF;
                            const blockMaxY = by + BLOCK_HALF;
                            const blockMinZ = bz - BLOCK_HALF;
                            const blockMaxZ = bz + BLOCK_HALF;

                            const overlapX = overlapOnAxis(minX, maxX, blockMinX, blockMaxX);
                            const overlapY = overlapOnAxis(minY, maxY, blockMinY, blockMaxY);
                            
                            const isWall = blockMaxY > (minY + STEP_HEIGHT);

                            if (overlapX > 0 && overlapY > 0.02 && isWall) { 
                                const overlapZ = overlapOnAxis(minZ, maxZ, blockMinZ, blockMaxZ);
                                if (overlapZ > 0) {
                                    if (delta.z > 0) {
                                        const candidateZ = blockMinZ - PLAYER_RADIUS - PLAYER_COLLISION_OFFSET;
                                        resolvedZ = Math.min(resolvedZ, candidateZ);
                                    } else {
                                        const candidateZ = blockMaxZ + PLAYER_RADIUS + PLAYER_COLLISION_OFFSET;
                                        resolvedZ = Math.max(resolvedZ, candidateZ);
                                    }
                                    collidedZ = true;
                                }
                            }
                        }
                    }
                }
                camera.position.z = resolvedZ;
                if (collidedZ) {
                    velocity.z = 0;
                }
            }


            // Vertical movement Y (gravity / jump)
            if (delta.y !== 0) {
                const targetY = camera.position.y + delta.y;
                const minX = camera.position.x - PLAYER_RADIUS;
                const maxX = camera.position.x + PLAYER_RADIUS;
                const minY = targetY - PLAYER_HEIGHT;
                const maxY = targetY;
                const minZ = camera.position.z - PLAYER_RADIUS;
                const maxZ = camera.position.z + PLAYER_RADIUS;

                const startX = Math.floor(minX + 0.5) - 1;
                const endX = Math.floor(maxX + 0.5) + 1;
                const startZ = Math.floor(minZ + 0.5) - 1;
                const endZ = Math.floor(maxZ + 0.5) + 1;
                const startY = Math.floor(minY);
                const endY = Math.floor(maxY);

                let resolvedY = targetY;
                let collidedBelow = false;
                const centerX = camera.position.x;
                const centerZ = camera.position.z;
                
                for (let bx = startX; bx <= endX; bx++) {
                    for (let bz = startZ; bz <= endZ; bz++) {
                        const colH = globalHeightMap.get(`${bx},${bz}`);
                        if (colH === undefined) continue;

                        const byMin = Math.max(0, startY);
                        const byMax = Math.min(colH - 1, endY + 1);
                        if (byMax < byMin) continue;

                        for (let by = byMin; by <= byMax; by++) {
                            const blockMinX = bx - BLOCK_HALF;
                            const blockMaxX = bx + BLOCK_HALF;
                            const blockMinY = by - BLOCK_HALF;
                            const blockMaxY = by + BLOCK_HALF;
                            const blockMinZ = bz - BLOCK_HALF;
                            const blockMaxZ = bz + BLOCK_HALF;

                            const overlapX = overlapOnAxis(minX, maxX, blockMinX, blockMaxX);
                            const overlapZ = overlapOnAxis(minZ, maxZ, blockMinZ, blockMaxZ);

                            if (overlapX > 0 && overlapZ > 0) {
                                const overlapY = overlapOnAxis(minY, maxY, blockMinY, blockMaxY);
                                if (overlapY > 0) {
                                    if (delta.y > 0 && blockMinY > camera.position.y) {
                                        // This is a "head bonk"
                                        // The new check `blockMinY > camera.position.y` ensures
                                        // we only collide with blocks *above our eyes*,
                                        // not the floor or wall-base we are jumping past.
                                        const candidateY = blockMinY - PLAYER_COLLISION_OFFSET;
                                        resolvedY = Math.min(resolvedY, candidateY);
                                        velocity.y = 0; 
                                    } else if (delta.y < 0 && blockMaxY < camera.position.y - (PLAYER_HEIGHT * 0.5)) {
                                        // This is a "landing"
                                        const candidateY = blockMaxY + PLAYER_COLLISION_OFFSET + PLAYER_HEIGHT;
                                        resolvedY = Math.max(resolvedY, candidateY);
                                        collidedBelow = true;
                                    }
                                }
                            }
                        }
                    }
                }

                camera.position.y = resolvedY;

                if (collidedBelow) {
                    velocity.y = 0;
                    moveState.canJump = true;
                }
            }
        };

        /**
         * Animation loop (camera-relative movement)
         */
        let prevTime = performance.now();
        const forwardVec = new THREE.Vector3();
        const rightVec = new THREE.Vector3();
        const moveVec = new THREE.Vector3();

        const animate = () => {
            requestAnimationFrame(animate);
            stats.begin();

            const time = performance.now();
            const delta = Math.min((time - prevTime) / 1000, 0.05);

            if (controls.isLocked) {
                // Reset jump state at start of frame to ensure we only jump if grounded THIS frame
                moveState.canJump = false;

                // gravity
                velocity.y -= GRAVITY * delta;

                // --- Acceleration/Friction block (Omitted for brevity - no changes) ---
                camera.getWorldDirection(forwardVec);
                forwardVec.y = 0;
                forwardVec.normalize();
                rightVec.crossVectors(forwardVec, new THREE.Vector3(0, 1, 0)).normalize();
                const inputDir = new THREE.Vector3();
                const f = (moveState.forward ? 1 : 0) - (moveState.backward ? 1 : 0);
                const s = (moveState.right ? 1 : 0) - (moveState.left ? 1 : 0);
                if (f !== 0 || s !== 0) {
                    inputDir.add(forwardVec.clone().multiplyScalar(f));
                    inputDir.add(rightVec.clone().multiplyScalar(s));
                    inputDir.normalize();
                }
                const hVel = new THREE.Vector3(velocity.x, 0, velocity.z);
                if (inputDir.lengthSq() > 0) {
                    hVel.add(inputDir.clone().multiplyScalar(ACCELERATION * delta));
                    if (hVel.lengthSq() > MAX_SPEED * MAX_SPEED) {
                         hVel.normalize().multiplyScalar(MAX_SPEED);
                    }
                } else {
                    const speed = hVel.length();
                    if (speed > 0) {
                        const drop = speed * FRICTION * delta;
                        const newSpeed = Math.max(0, speed - drop);
                        if (newSpeed > 0) {
                            hVel.multiplyScalar(newSpeed / speed);
                        } else {
                            hVel.set(0, 0, 0); 
                        }
                    }
                }
                velocity.x = hVel.x;
                velocity.z = hVel.z;
                moveVec.set(velocity.x * delta, 0, velocity.z * delta);
                // --- End of Acceleration/Friction block ---


                // Movement order
                if (velocity.y < 0) {
                    tryMoveAABB(new THREE.Vector3(0, velocity.y * delta, 0));
                    tryMoveAABB(new THREE.Vector3(moveVec.x, 0, 0));
                    tryMoveAABB(new THREE.Vector3(0, 0, moveVec.z));
                } else {
                    tryMoveAABB(new THREE.Vector3(moveVec.x, 0, 0));
                    tryMoveAABB(new THREE.Vector3(0, 0, moveVec.z));
                    tryMoveAABB(new THREE.Vector3(0, velocity.y * delta, 0));
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

        /**
         * Resize
         * (Omitted for brevity - no changes)
         */
        const handleResize = () => {
            if (!cameraRef.current || !rendererRef.current) return;
            cameraRef.current.aspect = window.innerWidth / window.innerHeight;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        /**
         * Cleanup
         * (Omitted for brevity - no changes)
         */
        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
            if (canvasRef.current) canvasRef.current.removeEventListener('click', onClick);
            try { document.body.removeChild(stats.dom); } catch (e) {}
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