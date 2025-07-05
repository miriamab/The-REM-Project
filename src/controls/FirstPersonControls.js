// firstPersonControl.js
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

let currentColliders = [];

export function setColliders(colliders) {
  currentColliders = colliders || [];
}

export function setupFirstPersonControls(camera, renderer) {
  const controls = new PointerLockControls(camera, renderer.domElement);
  const keys = {};

  document.addEventListener('keydown', (event) => keys[event.code] = true);
  document.addEventListener('keyup', (event) => keys[event.code] = false);

  document.addEventListener('click', () => {
    controls.lock();
  });

  // Geschwindigkeit kann von außen gesetzt werden
  controls.velocity = 5.0;
  const direction = new THREE.Vector3();

  function update() {
    if (controls.isLocked) {
      direction.set(0, 0, 0);
      if (keys['KeyW']) direction.z += 1;
      if (keys['KeyS']) direction.z -= 1;
      if (keys['KeyA']) direction.x -= 1;
      if (keys['KeyD']) direction.x += 1;
      direction.normalize();

      if (direction.length() > 0) {
        const moveStep = controls.velocity * 0.016;

        // 1. Rechts/Links (X) prüfen
        if (direction.x !== 0) {
          // Simuliere Bewegung in Blickrichtung rechts/links
          const temp = controls.getObject().position.clone();
          controls.moveRight(direction.x * moveStep);
          const nextPos = controls.getObject().position.clone();
          controls.getObject().position.copy(temp); // Rückgängig machen

          if (!checkCollision(nextPos)) {
            controls.moveRight(direction.x * moveStep);
          }
        }

        // 2. Vor/Zurück (Z) prüfen
        if (direction.z !== 0) {
          const temp = controls.getObject().position.clone();
          controls.moveForward(direction.z * moveStep);
          const nextPos = controls.getObject().position.clone();
          controls.getObject().position.copy(temp);

          if (!checkCollision(nextPos)) {
            controls.moveForward(direction.z * moveStep);
          }
        }
      }
    }
  }
  
  function checkCollision(newPosition) {
    // Spieler-BB: etwas kleiner und höher, damit er nicht im Boden steckt
    const playerBB = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(newPosition.x, newPosition.y + 0.8, newPosition.z), // Mittelpunkt auf Hüfthöhe
      new THREE.Vector3(0.5, 1.6, 0.5) // Breite, Höhe, Tiefe
    );
    for (const collider of currentColliders) {
      let hit = false;
      collider.traverse?.(obj => {
        if (obj.isMesh) {
          const colliderBB = new THREE.Box3().setFromObject(obj);
          if (playerBB.intersectsBox(colliderBB)) hit = true;
        }
      });
      if (hit) return true;
    }
    return false;
  }

  return { controls, update };
}

 // export { setColliders };
