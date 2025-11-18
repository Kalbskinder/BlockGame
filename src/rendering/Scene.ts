import * as THREE from 'three';
import { WorldGeneration } from './WorldGeneration';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );


for (let cx = 0; cx < 4; cx++) {
  for (let cz = 0; cz < 4; cz++) {
    const chunk = await WorldGeneration.generateChunk(cx, cz);
    scene.add(chunk);
  }
}