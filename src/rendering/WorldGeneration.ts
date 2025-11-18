import { SimplexNoise } from "three/examples/jsm/Addons.js";
import { LocalStorageHandler } from "../utils/localStorageUtil";
import { WorldMetadata } from "../types/models";
import * as THREE from "three";
import { Block } from "./components/Block";

const CHUNK_SIZE = 16;
const NOISE_HEIGHT_SCALE = 0.045;
const WORLD_HEIGHT = 64;

export class WorldGeneration {
    private static async getSeed() {
        try {
            const worldId = await LocalStorageHandler.get("worldId");
            if (!worldId) throw new Error("No worldId found in localStorage");
            const worldData = await LocalStorageHandler.get(worldId);
            if (!worldData) throw new Error("No world data found in localStorage for worldId: " + worldId);
            return (JSON.parse(worldData) as WorldMetadata).seed;
        } catch (error) {
            console.error("Error retrieving world data:", error);
            return null;
        }
    }

    public static async generateChunk(chunkX: number, chunkZ: number) {
        const seed = await this.getSeed();
        
        if (seed === null) {
            console.error("Failed to get seed, using default");
            return new THREE.Group();
        }
        
        // Create a seeded random function
        let currentSeed = seed;
        const seededRandom = () => {
            const x = Math.sin(currentSeed++) * 10000;
            return x - Math.floor(x);
        };
        
        const noise = new SimplexNoise({ random: seededRandom });

        // Create merged geometries for each block type
        const grassGeometry = new THREE.BoxGeometry(1, 1, 1);
        const dirtGeometry = new THREE.BoxGeometry(1, 1, 1);
        const stoneGeometry = new THREE.BoxGeometry(1, 1, 1);

        const grassBlocks: THREE.Matrix4[] = [];
        const dirtBlocks: THREE.Matrix4[] = [];
        const stoneBlocks: THREE.Matrix4[] = [];

        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const worldX = chunkX * CHUNK_SIZE + x;
                const worldZ = chunkZ * CHUNK_SIZE + z;

                const height = Math.floor(noise.noise(worldX * NOISE_HEIGHT_SCALE, worldZ * 0.05) * 3 + 32);

                for (let y = 0; y < height; y++) {
                    const matrix = new THREE.Matrix4();
                    matrix.setPosition(worldX, y, worldZ);

                    if (y === height - 1) {
                        grassBlocks.push(matrix);
                    } else if (y > height - 5) {
                        dirtBlocks.push(matrix);
                    } else {
                        stoneBlocks.push(matrix);
                    }
                }
            }
        }

        // Create materials with nearest filter for pixel-perfect look
        const textureLoader = new THREE.TextureLoader();
        
        // Grass block uses different textures per face: top (grass), bottom (dirt), sides (grass_side)
        const grassTopTexture = textureLoader.load("/assets/game/blocks/grass.png");
        grassTopTexture.magFilter = THREE.NearestFilter;
        grassTopTexture.minFilter = THREE.NearestFilter;

        const grassSideTexture = textureLoader.load("/assets/game/blocks/grass_side.png");
        grassSideTexture.magFilter = THREE.NearestFilter;
        grassSideTexture.minFilter = THREE.NearestFilter;
        
        const dirtTexture = textureLoader.load("/assets/game/blocks/dirt.png");
        dirtTexture.magFilter = THREE.NearestFilter;
        dirtTexture.minFilter = THREE.NearestFilter;
        
        const stoneTexture = textureLoader.load("/assets/game/blocks/stone.png");
        stoneTexture.magFilter = THREE.NearestFilter;
        stoneTexture.minFilter = THREE.NearestFilter;

        // Materials: order corresponds to BoxGeometry groups: +x, -x, +y (top), -y (bottom), +z, -z
        const grassSideMaterial = new THREE.MeshLambertMaterial({ map: grassSideTexture });
        const grassTopMaterial = new THREE.MeshLambertMaterial({ map: grassTopTexture });
        const grassBottomMaterial = new THREE.MeshLambertMaterial({ map: dirtTexture });
        const grassMaterials: THREE.MeshLambertMaterial[] = [
            grassSideMaterial, // +x
            grassSideMaterial, // -x
            grassTopMaterial,  // +y (top)
            grassBottomMaterial, // -y (bottom)
            grassSideMaterial, // +z
            grassSideMaterial  // -z
        ];
        const dirtMaterial = new THREE.MeshLambertMaterial({ map: dirtTexture });
        const stoneMaterial = new THREE.MeshLambertMaterial({ map: stoneTexture });

        // Create instanced meshes
        const chunkGroup = new THREE.Group();

        if (grassBlocks.length > 0) {
            // InstancedMesh supports an array of materials matching geometry groups
            const grassMesh = new THREE.InstancedMesh(grassGeometry, grassMaterials, grassBlocks.length);
            grassBlocks.forEach((matrix, i) => grassMesh.setMatrixAt(i, matrix));
            chunkGroup.add(grassMesh);
        }

        if (dirtBlocks.length > 0) {
            const dirtMesh = new THREE.InstancedMesh(dirtGeometry, dirtMaterial, dirtBlocks.length);
            dirtBlocks.forEach((matrix, i) => dirtMesh.setMatrixAt(i, matrix));
            chunkGroup.add(dirtMesh);
        }

        if (stoneBlocks.length > 0) {
            const stoneMesh = new THREE.InstancedMesh(stoneGeometry, stoneMaterial, stoneBlocks.length);
            stoneBlocks.forEach((matrix, i) => stoneMesh.setMatrixAt(i, matrix));
            chunkGroup.add(stoneMesh);
        }

        return chunkGroup;
    }


}