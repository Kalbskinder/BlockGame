import * as THREE from 'three';
import { LocalStorageHandler } from '@/src/utils/localStorageUtil';

export class PlayerHand {
    public mesh: THREE.Mesh;
    private material: THREE.MeshBasicMaterial;
    private textureLoader = new THREE.TextureLoader();
    
    // Animation state
    private isSwinging = false;
    private swingProgress = 0;
    private swingSpeed = 15;

    private walkBob = 0;
    // Pivot is now at the shoulder (top of arm).
    // Position represents the shoulder position.
    private defaultPosition = new THREE.Vector3(0.43, -0.75, -0.4);
    
    // x: pitch, smaller value = more up
    // y: yaw, left-right
    // z: roll, tilt
    private defaultRotation = new THREE.Euler(Math.PI / 1.49, Math.PI - 0.17, Math.PI * -0.09);

    constructor() {
        // Arm geometry: 4x12x4 pixels
        // Scale: 1 pixel = 0.04 units (approx)
        // Width: 0.16, Height: 0.48, Depth: 0.16
        const geometry = new THREE.BoxGeometry(0.3, 0.9, 0.3);
        
        // Shift geometry so pivot (0,0,0) is at the top (shoulder)
        geometry.translate(0, -0.45, 0);
        
        this.mapUVs(geometry);

        this.material = new THREE.MeshBasicMaterial({ map: null, transparent: true });
        this.mesh = new THREE.Mesh(geometry, this.material);
        
        this.mesh.position.copy(this.defaultPosition);
        this.mesh.rotation.copy(this.defaultRotation);

        // Load skin
        this.loadSkin();
    }

    private mapUVs(geometry: THREE.BoxGeometry) {
        const uvAttribute = geometry.attributes.uv;
        
        // Helper to set UVs for a face (4 vertices)
        // faceIndex: 0..5
        // u, v, w, h in texture pixels (64x64)
        const setFaceUV = (faceIndex: number, x: number, y: number, w: number, h: number) => {
            const width = 64;
            const height = 64;
            
            // Convert to 0..1
            // Invert Y because texture coords start bottom-left in ThreeJS
            // but top-left in image.
            // y in image = 20. y in UV = (64 - 20)/64.
            // y+h in image = 32. y+h in UV = (64 - 32)/64.
            
            const u0 = x / width;
            const u1 = (x + w) / width;
            const v1 = (height - y) / height; // Top of image part
            const v0 = (height - (y + h)) / height; // Bottom of image part
            
            // BoxGeometry face vertex order:
            // 0: top-left, 1: top-right, 2: bottom-left, 3: bottom-right (Standard plane)
            // But BoxGeometry is different.
            // Let's assume standard UV mapping order for BoxGeometry and override.
            // Usually: (0,1), (1,1), (0,0), (1,0)
            
            const offset = faceIndex * 4;
            
            // 0: top-left (u0, v1)
            // 1: top-right (u1, v1)
            // 2: bottom-left (u0, v0)
            // 3: bottom-right (u1, v0)
            
            uvAttribute.setXY(offset + 0, u0, v1);
            uvAttribute.setXY(offset + 1, u1, v1);
            uvAttribute.setXY(offset + 2, u0, v0);
            uvAttribute.setXY(offset + 3, u1, v0);
        };

        // Right Arm Skin Coordinates (Steve)
        // Top: 44, 20, 4, 4
        // Bottom: 48, 20, 4, 4
        // Right: 40, 20, 4, 12
        // Front: 44, 20, 4, 12
        // Left: 48, 20, 4, 12
        // Back: 52, 20, 4, 12

        // BoxGeometry Faces: +x, -x, +y, -y, +z, -z
        // 0: +x (Right) -> Skin Right (40, 20)
        setFaceUV(0, 40, 20, 4, 12);
        // 1: -x (Left) -> Skin Left (48, 20)
        setFaceUV(1, 48, 20, 4, 12);
        // 2: +y (Top) -> Skin Top (44, 16)
        setFaceUV(2, 44, 16, 4, 4);
        // 3: -y (Bottom) -> Skin Bottom (48, 16)
        setFaceUV(3, 48, 16, 4, 4);
        // 4: +z (Front) -> Skin Front (44, 20)
        setFaceUV(4, 44, 20, 4, 12);
        // 5: -z (Back) -> Skin Back (52, 20)
        setFaceUV(5, 52, 20, 4, 12);
        
        uvAttribute.needsUpdate = true;
    }

    public async loadSkin() {
        const username = await LocalStorageHandler.get("username") || "Kalbskinder";
        const url = `https://mineskin.eu/skin/${username}`;
        
        this.textureLoader.load(url, (texture) => {
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.colorSpace = THREE.SRGBColorSpace;
            this.material.map = texture;
            this.material.needsUpdate = true;
        }, undefined, (err) => {
            console.error("Failed to load skin:", err);
        });
    }

    public update(dt: number, isMoving: boolean, isSprinting: boolean) {
        // Bobbing
        if (isMoving) {
            const speed = isSprinting ? 15 : 10;
            this.walkBob += dt * speed;
            
            const bobX = Math.cos(this.walkBob) * 0.05;
            const bobY = Math.sin(this.walkBob * 2) * 0.05; // Y bobs twice as fast
            
            this.mesh.position.x = this.defaultPosition.x + bobX;
            this.mesh.position.y = this.defaultPosition.y + bobY;
        } else {
            // Reset bob
            this.mesh.position.x = THREE.MathUtils.lerp(this.mesh.position.x, this.defaultPosition.x, dt * 5);
            this.mesh.position.y = THREE.MathUtils.lerp(this.mesh.position.y, this.defaultPosition.y, dt * 5);
        }

        // Swinging
        if (this.isSwinging) {
            this.swingProgress += dt * this.swingSpeed;
            if (this.swingProgress >= Math.PI) {
                this.swingProgress = 0;
                this.isSwinging = false;
            }
            
            // Swing rotation
            const swing = Math.sin(this.swingProgress);
            
            // Swing animation
            this.mesh.rotation.x = this.defaultRotation.x - swing * 0.5;
            this.mesh.rotation.z = this.defaultRotation.z + swing * 0.3;
            this.mesh.rotation.y = this.defaultRotation.y + swing * 0.5;
        } else {
             this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, this.defaultRotation.x, dt * 10);
             this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, this.defaultRotation.y, dt * 10);
             this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, this.defaultRotation.z, dt * 10);
             // Reset position to default (bobbing handles the rest)
             this.mesh.position.z = THREE.MathUtils.lerp(this.mesh.position.z, this.defaultPosition.z, dt * 10);
        }
    }

    public swing() {
        if (!this.isSwinging) {
            this.isSwinging = true;
            this.swingProgress = 0;
        }
    }
    
    public setVisible(visible: boolean) {
        this.mesh.visible = visible;
    }
}
