import * as THREE from 'three';
import { START_POSITIONS } from '../constants/StartPositions.js';

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

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === pointerLockElement) {
      document.addEventListener('mousemove', onMouseMove);
    } else {
      document.removeEventListener('mousemove', onMouseMove);
    }
  });

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

// stand mit BEST 