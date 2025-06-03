// main.js
import * as THREE from 'three';
import { addRealHands } from './objects/hands.js';
import { registerInteractive, setupRayInteraction } from './interactions/useRayInteraction.js';
import { setupFirstPersonControls } from './controls/FirstPersonControls.js';
import { Room1 } from './scenes/rooms/Room1.js'; // Refactored Raum 1 als Klasse

// --- Grundsetup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Raum vorbereiten ---
const room = new Room1(scene); // Szene übergeben
room.init();                   // Raum aufbauen

// --- Restliches Setup ---
addRealHands(camera);
setupRayInteraction(camera);
const { controls, update } = setupFirstPersonControls(camera, renderer);

// --- Kamera zur Szene hinzufügen ---
scene.add(camera);

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);
  update();
  renderer.render(scene, camera);
}
animate();
