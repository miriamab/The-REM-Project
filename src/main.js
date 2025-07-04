// main.js
import * as THREE from 'three';
import { addRealHands } from './objects/hands.js';
import { setupRaycasting } from './interactions/raycast.js';
import { setupFirstPersonControls, setColliders } from './controls/FirstPersonControls.js';
import { setupRayInteraction } from './interactions/useRayInteraction.js';
import { setupIngameMenu } from './ui/IngameMenu.js';

import { Room1 } from './scenes/rooms/room1.js';
import { switchRoom, playCutsceneAndSwitch } from './sceneManager.js';
import { spawnBubbleEffect } from './objects/blubberblasen.js';
import { createBlubberblasen } from './objects/blubberblasen.js';

// --- Grundsetup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333);

// Skip Video (true) oder Video abspielen (false)
const SKIP_CUTSCENE = false; 

let currentRoom = null;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 5);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//Point Locker einmalig
renderer.domElement.addEventListener('click', () => {
  renderer.domElement.requestPointerLock();
});

// --- Restliches Setup ---
addRealHands(camera);
setupRayInteraction(camera);
const { controls, update } = setupFirstPersonControls(camera, renderer);

//Bubbles
//const bubbles = createBlubberblasen(scene);

// --- Animation Loop ---
let animationId = null;
let isPaused = false;
function animate() {
  if (isPaused) return;
  animationId = requestAnimationFrame(animate);
  // Nutze das passende Update (je nach deinem Setup)
  if (typeof update === 'function') update();
  if (controls && typeof controls.update === 'function') controls.update();
  renderer.render(scene, camera);

  // Blubberblasen hinzufügen für Raum1
  if (currentRoom && typeof currentRoom.animateBlubberblasen === 'function') {
    currentRoom.animateBlubberblasen();
  }
}

function pauseGame() {
  isPaused = true;
  if (animationId) cancelAnimationFrame(animationId);
}

function resumeGame() {
  if (!isPaused) return;
  isPaused = false;
  animate();
}

// Setup Ingame Menu
setupIngameMenu({
  onPause: pauseGame,
  onResume: resumeGame
});

//Funktionen aufrufen:
animate();

// Fadenkreuz als HTML-Element hinzufügen
const crosshair = document.createElement('div');
crosshair.id = 'crosshair';
crosshair.style.position = 'fixed';
crosshair.style.left = '50%';
crosshair.style.top = '50%';
crosshair.style.width = '8px';
crosshair.style.height = '8px';
crosshair.style.marginLeft = '-4px';
crosshair.style.marginTop = '-4px';
crosshair.style.background = 'red';
crosshair.style.borderRadius = '50%';
crosshair.style.zIndex = '1000';
crosshair.style.pointerEvents = 'none';
crosshair.style.opacity = '0.7';
document.body.appendChild(crosshair);

// --- Starte mit Cutscene, dann Raum ---
if (SKIP_CUTSCENE) {
  currentRoom = switchRoom(Room1, scene);
  setColliders(currentRoom.colliders); // <--- NEU
  crosshair.style.display = '';
  //activateRoomInteractions();
} else {
  playCutsceneAndSwitch('/cutscenes/intro.mp4', () => {
    crosshair.style.display = '';
    currentRoom = switchRoom(Room1, scene);
    setColliders(currentRoom.colliders); // <--- NEU
    //activateRoomInteractions();
  });
}
window.setupIngameMenu = setupIngameMenu;
