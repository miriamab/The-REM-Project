import * as THREE from 'three';
import { START_POSITIONS } from '../constants/StartPositions.js';

let currentColliders = [];

export function setColliders(colliders) {
  currentColliders = colliders || [];
}

export function setupFirstPersonControls(camera, renderer) {
  const speed = 1.1;
  let direction = new THREE.Vector3();
  const keys = { forward: false, back: false, left: false, right: false };

  let pitch = 0;
  let yaw = 0;
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const pointerLockElement = renderer.domElement;

  const controlsObject = new THREE.Object3D();
  controlsObject.add(camera);

  pointerLockElement.addEventListener('click', () => {
    pointerLockElement.requestPointerLock();
  });

  const velocity = 5.0;
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
        const moveStep = velocity * 0.016;

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

  function onMouseMove(event) {
    yaw -= event.movementX * 0.002;
    pitch -= event.movementY * 0.002;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    euler.set(pitch, yaw, 0);
    camera.quaternion.setFromEuler(euler);
  }

  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW') keys.forward = true;
    if (e.code === 'KeyS') keys.back = true;
    if (e.code === 'KeyA') keys.left = true;
    if (e.code === 'KeyD') keys.right = true;
  });

  document.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW') keys.forward = false;
    if (e.code === 'KeyS') keys.back = false;
    if (e.code === 'KeyA') keys.left = false;
    if (e.code === 'KeyD') keys.right = false;
  });

  // ✅ Hier wird der Startpunkt gesetzt – direkt im Flur
  const start = START_POSITIONS.FLUR;
  controlsObject.position.set(start.position.x, start.position.y, start.position.z);
  camera.lookAt(start.lookAt.x, start.lookAt.y, start.lookAt.z);
  console.log("📍 Startposition (Flur):", controlsObject.position);

  return {
    object: controlsObject,
    update() {
      direction.set(0, 0, 0);
      const front = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      front.y = 0;
      front.normalize();
      const side = new THREE.Vector3().crossVectors(camera.up, front).normalize();
      if (keys.forward) direction.add(front);
      if (keys.back) direction.sub(front);
      if (keys.left) direction.add(side);
      if (keys.right) direction.sub(side);
      if (direction.lengthSq() === 0) return;
      controlsObject.position.add(direction.normalize().multiplyScalar(speed));
    }
  };
}

 // export { setColliders };
