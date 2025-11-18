"use client";

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { WorldGeneration } from '@/src/rendering/WorldGeneration';
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

        /**
         * Constants
         */
        const PLAYER_HEIGHT = 1.8;
        const PLAYER_RADIUS = 0.3; // Player collision radius (x/z)
        const PLAYER_COLLISION_OFFSET = 0.01; // small offset to avoid sticking to surfaces
        const BLOCK_SIZE = 1;
        const BLOCK_HALF = BLOCK_SIZE / 2; // all blocks are centered on integer coordinates
        const GRAVITY = 30;
        const JUMP_VELOCITY = 10;
        const MOVE_SPEED = 5;
        const RENDER_DISTANCE = 2;
        const STEP_HEIGHT = 0.5; // maximum step height player can walk up

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

        // Stats
        const stats = new Stats();
        stats.showPanel(0);
        document.body.appendChild(stats.dom);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        scene.add(directionalLight);

        /**
         * Input and velocity
         */
        const velocity = new THREE.Vector3(0, 0, 0); // y holds vertical velocity

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

        /**
         * World loading
         *
         * We'll gather height maps from each chunk's userData.heightMap (set in WorldGeneration)
         * into a globalHeightMap for fast queries.
         */
        const worldChunks = new Map<string, THREE.Group>();
        const globalHeightMap = new Map<string, number>(); // key: "x,z" -> height (blocks count, e.g., 0..N)

        const loadWorld = async () => {
            try {
                for (let cx = -RENDER_DISTANCE; cx < RENDER_DISTANCE; cx++) {
                    for (let cz = -RENDER_DISTANCE; cz < RENDER_DISTANCE; cz++) {
                        const chunk = await WorldGeneration.generateChunk(cx, cz);
                        scene.add(chunk);
                        worldChunks.set(`${cx},${cz}`, chunk);

                        // If chunk provides a heightMap in userData, merge it into globalHeightMap
                        const hm = (chunk as any).userData?.heightMap;
                        if (hm) {
                            // heightMap may be a Map or an Object; handle both
                            if (hm instanceof Map) {
                                for (const [k, v] of hm.entries()) {
                                    globalHeightMap.set(k, v as number);
                                }
                            } else if (typeof hm === "object") {
                                for (const k of Object.keys(hm)) {
                                    globalHeightMap.set(k, hm[k] as number);
                                }
                            }
                        } else {
                            // Fallback: we can attempt to derive heights from the chunk's instanced matrices,
                            // but since WorldGeneration now attaches a heightMap, this path should normally not be needed.
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to generate world:', error);
            }
        };

        loadWorld();

        /**
         * Fast block queries
         * - We assume blocks are axis-aligned unit cubes at integer coordinates
         * - globalHeightMap stores the column height: blocks exist at y in [0, height-1]
         */
        const blockAt = (bx: number, by: number, bz: number): boolean => {
            const key = `${bx},${bz}`;
            const height = globalHeightMap.get(key);
            if (height === undefined) return false;
            return by >= 0 && by < height;
        };

        // Returns the Y of the top face of the highest block in the column (if any).
        // Blocks are centered at integer Y, so the top face is at (height - 0.5).
        const getColumnTopFaceY = (x: number, z: number): number | null => {
            const key = `${Math.floor(x + 0.5)},${Math.floor(z + 0.5)}`;
            const h = globalHeightMap.get(key);
            if (h === undefined) return null;
            // if column has h blocks (0..h-1), top block center is (h-1), top face = h - 0.5
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
         * - We treat player AABB as: min=(x - radius, y - height, z - radius), max=(x + radius, y, z + radius)
         * - When an overlap is detected on an axis, we push the player the minimal amount to resolve it.
         */

        const tryMoveAABB = (delta: THREE.Vector3) => {
            // Horizontal movement X
            if (delta.x !== 0) {
                const targetX = camera.position.x + delta.x;
                // player extents after X move (other axes unchanged for now)
                const minX = targetX - PLAYER_RADIUS;
                const maxX = targetX + PLAYER_RADIUS;
                const minY = camera.position.y - PLAYER_HEIGHT;
                const maxY = camera.position.y;
                const minZ = camera.position.z - PLAYER_RADIUS;
                const maxZ = camera.position.z + PLAYER_RADIUS;
            const centerX = camera.position.x;
            const centerZ = camera.position.z;
            const bottomY = minY;

                // search nearby integer blocks
                const startX = Math.floor(minX + 0.5) - 1;
                const endX = Math.floor(maxX + 0.5) + 1;
                const startY = Math.floor(minY);
                const endY = Math.floor(maxY);
                const startZ = Math.floor(minZ + 0.5) - 1;
                const endZ = Math.floor(maxZ + 0.5) + 1;

                let resolvedX = targetX;

                for (let bx = startX; bx <= endX; bx++) {
                    for (let bz = startZ; bz <= endZ; bz++) {
                        // column height optimization: if column empty or below player's bottom, skip
                        const colH = globalHeightMap.get(`${bx},${bz}`);
                        if (colH === undefined) continue;

                        // check vertical overlap range between player and this column
                        // blockYs from 0..colH-1
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

                            // Optionally skip the floor block under center while falling to allow step-down
                            if (velocity.y <= 0) {
                                const centerOverBlock =
                                    centerX >= blockMinX && centerX <= blockMaxX &&
                                    centerZ >= blockMinZ && centerZ <= blockMaxZ;
                                if (centerOverBlock && bottomY <= blockMaxY + 0.05) {
                                    continue;
                                }
                            }

                            // check overlap on Z and Y first (since we've moved X)
                            const overlapZ = overlapOnAxis(minZ, maxZ, blockMinZ, blockMaxZ);
                            const overlapY = overlapOnAxis(minY, maxY, blockMinY, blockMaxY);
                            if (overlapZ > 0 && overlapY > 0.02) { // require meaningful Y overlap
                                // check X overlap with the targetX
                                const overlapX = overlapOnAxis(minX, maxX, blockMinX, blockMaxX);
                                if (overlapX > 0) {
                                    // push out along X: if we are moving positive X, push to blockMinX - PLAYER_RADIUS
                                    if (delta.x > 0) {
                                        const candidateX = blockMinX - PLAYER_RADIUS - PLAYER_COLLISION_OFFSET;
                                        if (candidateX < resolvedX) {
                                            // ensure we don't move past candidate (we moved into the block)
                                            resolvedX = Math.min(resolvedX, candidateX);
                                        } else {
                                            resolvedX = Math.min(resolvedX, candidateX);
                                        }
                                    } else {
                                        // moving negative X
                                        const candidateX = blockMaxX + PLAYER_RADIUS + PLAYER_COLLISION_OFFSET;
                                        if (candidateX > resolvedX) {
                                            resolvedX = Math.max(resolvedX, candidateX);
                                        } else {
                                            resolvedX = Math.max(resolvedX, candidateX);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                camera.position.x = resolvedX;
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
                const centerX = camera.position.x;
                const centerZ = camera.position.z;
                const bottomY = minY;

                const startX = Math.floor(minX + 0.5) - 1;
                const endX = Math.floor(maxX + 0.5) + 1;
                const startY = Math.floor(minY);
                const endY = Math.floor(maxY);
                const startZ = Math.floor(minZ + 0.5) - 1;
                const endZ = Math.floor(maxZ + 0.5) + 1;

                let resolvedZ = targetZ;

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

                            // Optionally skip the floor block under center while falling to allow step-down
                            if (velocity.y <= 0) {
                                const centerOverBlock =
                                    centerX >= blockMinX && centerX <= blockMaxX &&
                                    centerZ >= blockMinZ && centerZ <= blockMaxZ;
                                if (centerOverBlock && bottomY <= blockMaxY + 0.05) {
                                    continue;
                                }
                            }

                            const overlapX = overlapOnAxis(minX, maxX, blockMinX, blockMaxX);
                            const overlapY = overlapOnAxis(minY, maxY, blockMinY, blockMaxY);
                            if (overlapX > 0 && overlapY > 0.02) { // require meaningful Y overlap
                                const overlapZ = overlapOnAxis(minZ, maxZ, blockMinZ, blockMaxZ);
                                if (overlapZ > 0) {
                                    if (delta.z > 0) {
                                        const candidateZ = blockMinZ - PLAYER_RADIUS - PLAYER_COLLISION_OFFSET;
                                        resolvedZ = Math.min(resolvedZ, candidateZ);
                                    } else {
                                        const candidateZ = blockMaxZ + PLAYER_RADIUS + PLAYER_COLLISION_OFFSET;
                                        resolvedZ = Math.max(resolvedZ, candidateZ);
                                    }
                                }
                            }
                        }
                    }
                }

                camera.position.z = resolvedZ;
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

                // search blocks overlapping horizontal footprint
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

                        // iterate plausible block y's around player's vertical range
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
                                    // collision along Y
                                    if (delta.y > 0) {
                                        // moving up - stop player top just below block bottom
                                        const candidateY = blockMinY - PLAYER_COLLISION_OFFSET;
                                        resolvedY = Math.min(resolvedY, candidateY);
                                    } else {
                                        // moving down - landed on block top
                                        // Only treat as ground if the player's center is above this block
                                        const centerOverBlock =
                                            centerX >= blockMinX && centerX <= blockMaxX &&
                                            centerZ >= blockMinZ && centerZ <= blockMaxZ;
                                        if (centerOverBlock) {
                                            const candidateY = blockMaxY + PLAYER_COLLISION_OFFSET + PLAYER_HEIGHT;
                                            resolvedY = Math.max(resolvedY, candidateY);
                                            collidedBelow = true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                camera.position.y = resolvedY;

                // If collided below (landed), zero vertical velocity and allow jump
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
                // gravity
                velocity.y -= GRAVITY * delta;

                // input
                const f = (moveState.forward ? 1 : 0) - (moveState.backward ? 1 : 0);
                const s = (moveState.right ? 1 : 0) - (moveState.left ? 1 : 0);

                // camera direction
                camera.getWorldDirection(forwardVec);
                forwardVec.y = 0;
                forwardVec.normalize();
                rightVec.crossVectors(forwardVec, new THREE.Vector3(0, 1, 0)).normalize();

                // build desired movement
                moveVec.set(0, 0, 0);
                if (f !== 0 || s !== 0) {
                    const ln = Math.hypot(s, f);
                    const nx = (s / ln);
                    const nz = (f / ln);
                    // apply camera vectors scaled by MOVE_SPEED*delta
                    moveVec.add(forwardVec.clone().multiplyScalar(nz * MOVE_SPEED * delta));
                    moveVec.add(rightVec.clone().multiplyScalar(nx * MOVE_SPEED * delta));
                }

                // Movement order: when falling, resolve vertical first to allow stepping down
                if (velocity.y < 0) {
                    tryMoveAABB(new THREE.Vector3(0, velocity.y * delta, 0));
                    tryMoveAABB(new THREE.Vector3(moveVec.x, 0, 0));
                    tryMoveAABB(new THREE.Vector3(0, 0, moveVec.z));
                } else {
                    // First attempt horizontal move (X & Z), resolving collisions via AABB
                    // We'll try X and Z separately to allow sliding
                    tryMoveAABB(new THREE.Vector3(moveVec.x, 0, 0));
                    tryMoveAABB(new THREE.Vector3(0, 0, moveVec.z));
                    // Then vertical movement (gravity/jump)
                    tryMoveAABB(new THREE.Vector3(0, velocity.y * delta, 0));
                }

                // Grounded check (no snap): set canJump when feet are near top face below
                const topFaceY = getColumnTopFaceY(camera.position.x, camera.position.z);
                if (topFaceY !== null) {
                    const bottomY = camera.position.y - PLAYER_HEIGHT;
                    const grounded = (bottomY - topFaceY) <= 0.02 && velocity.y <= 0;
                    moveState.canJump = grounded;
                } else {
                    moveState.canJump = false;
                }
            }

            renderer.render(scene, camera);

            prevTime = time;
            stats.end();
        };

        animate();

        /**
         * Resize
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
         */
        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
            if (canvasRef.current) canvasRef.current.removeEventListener('click', onClick);
            // remove stats dom safely
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
