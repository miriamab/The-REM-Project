// main.js
import * as THREE from 'three';
import { addRealHands } from './objects/hands.js';
import { setupRayInteraction } from './interactions/useRayInteraction.js';
import { setupFirstPersonControls } from './controls/FirstPersonControls.js';

import { Room1 } from './scenes/rooms/Room1.js';
import { switchRoom, playCutsceneAndSwitch } from './sceneManager.js';

// --- Grundsetup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 5);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Restliches Setup ---
addRealHands(camera);
setupRayInteraction(camera);
const { controls, update } = setupFirstPersonControls(camera, renderer);

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);
  update();
  renderer.render(scene, camera);
}
animate();

// --- Starte mit Cutscene, dann Raum ---
playCutsceneAndSwitch('/cutscenes/intro.mp4', () => {
  switchRoom(Room1, scene);
});
