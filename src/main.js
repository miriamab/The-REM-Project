// main.js
import * as THREE from 'three';
//import { addPlaceholderHands } from './objects/hands.js';
import { addRealHands } from './objects/hands.js';
import { registerInteractive, setupRayInteraction } from './interactions/useRayInteraction.js';
import { setupFirstPersonControls } from './controls/FirstPersonControls.js';
// import { setupTestRoom } from './scenes/rooms/test_room.js';
import { setupRoom1 } from './scenes/rooms/room1.js'; //aktueller Raum

// --- Grundsetup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
scene.add(camera);


// --- Setup-Module aufrufen ---
setupTestRoom(scene);                      // Test-Raum wird aufgebaut
//addPlaceholderHands(camera);              // Hände an Kamera
addRealHands(camera);
setupRayInteraction(camera);              // Raycasting vorbereiten
const { controls, update } = setupFirstPersonControls(camera, renderer); // Bewegung

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);
  update();
  renderer.render(scene, camera);
}
animate();
