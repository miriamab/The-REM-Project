// firstPersonControl.js
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export function setupFirstPersonControls(camera, renderer) {
  const controls = new PointerLockControls(camera, renderer.domElement);
  const keys = {};

  document.addEventListener('keydown', (event) => keys[event.code] = true);
  document.addEventListener('keyup', (event) => keys[event.code] = false);

  document.addEventListener('click', () => {
    controls.lock();
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
      controls.moveRight(direction.x * velocity * 0.016); // 60fps-Basis
      controls.moveForward(direction.z * velocity * 0.016);
    }
  }
  

  return { controls, update };
}
