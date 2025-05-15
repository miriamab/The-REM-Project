import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// vor dem 1. mal Packete installieren: "npm install"
// Spiel starten: "npm run dev"

// --- Farbvariablen ---
const backgroundColor = 0x333333; // Dunkelgrau für den Hintergrund
const wallColor = 0x494ffc      // Blau für die Wände
const objectColor = 0xff5555;     // Rot für Objekte
const lightColor = 0xffffff    // Weiß für Licht

const scene = new THREE.Scene();
scene.background = new THREE.Color( {color: backgroundColor});

// Kamera & Renderer
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 5); // Augenhöhe leicht über dem Boden
camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Licht
const ambientLight = new THREE.AmbientLight({color: lightColor}, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight({color: lightColor}, 0.8);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

// Boden
const floorGeo = new THREE.PlaneGeometry(20, 20);
const floorMat = new THREE.MeshStandardMaterial({ color: wallColor });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = Math.PI / 2;
scene.add(floor);

// Wände (einfacher Raum)
const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, side: THREE.BackSide });
const room = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 20), wallMat);
room.position.y = 5; // Damit Boden nicht blockiert
scene.add(room);

// Orientierungshilfe: Box
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const boxMat = new THREE.MeshStandardMaterial({ color: objectColor });
const box = new THREE.Mesh(boxGeo, boxMat);
box.position.set(2, 0.5, 0);
scene.add(box);

// PointerLockControls
const controls = new PointerLockControls(camera, document.body);
controls.lookSpeed = 0.005; // Optional: nicht vorhanden in aktuellem Three.js – darum siehe unten

scene.add(controls.getObject());

document.addEventListener('click', () => {
  controls.lock();
});

const keys = {};
document.addEventListener('keydown', (e) => keys[e.code] = true);
document.addEventListener('keyup', (e) => keys[e.code] = false);

// Bewegung
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const speed = 5.0; // m/s

// Loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (controls.isLocked) {
    direction.set(0, 0, 0);
    if (keys['KeyW']) direction.z += 1;
    if (keys['KeyS']) direction.z -= 1;
    if (keys['KeyA']) direction.x -= 1;
    if (keys['KeyD']) direction.x += 1;

    direction.normalize();
    direction.multiplyScalar(speed * delta);

    controls.moveRight(direction.x);
    controls.moveForward(direction.z);
  }

  renderer.render(scene, camera);
}
animate();
