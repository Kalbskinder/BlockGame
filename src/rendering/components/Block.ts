import * as THREE from 'three';

export class Block {
    private texture: string;
    private textures?: string[];
    private textureLoader = new THREE.TextureLoader();
    private finalCube: THREE.Mesh;
    
    /**
     * Creates a new Block with either a single texture for all faces or multiple textures for each face.
     * @param texture A string representing the texture URL for all faces, or an array of 6 strings for each face.
     * The order of textures in the array should be: [right, left, top, bottom, front, back].
     */
    public constructor(texture: string | string[]) {
        const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);

        // Multiple textures for different faces
        if (Array.isArray(texture)) {
            this.textures = texture;
            this.texture = "";

            if (this.textures.length !== 6) {
                throw new Error("Array of textures must have exactly 6 elements for each face of the block.");
            }

            const materials = this.textures.map((tex) => {
                const loadedTexture = this.textureLoader.load(tex);
                return new THREE.MeshBasicMaterial({ map: loadedTexture });
            });

            this.finalCube = new THREE.Mesh(cubeGeometry, materials);

        // Single texture for all faces
        } else {
            this.texture = texture;
            const loadedTexture = this.textureLoader.load(texture);
            const material = new THREE.MeshBasicMaterial({ map: loadedTexture });
            this.finalCube = new THREE.Mesh(cubeGeometry, material);
        }
    }
}