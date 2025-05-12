import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

export function setupFirstPersonControls(camera, renderer) {
  const controls = new PointerLockControls(camera, renderer.domElement);
  const keys = {};

  document.addEventListener('keydown', (event) => keys[event.code] = true);
  document.addEventListener('keyup', (event) => keys[event.code] = false);

  document.addEventListener('click', () => {
    controls.lock();
  });

  const velocity = 0.1;

  function update() {
    if (controls.isLocked) {
      const direction = new THREE.Vector3();
      if (keys['KeyW']) direction.z -= 1;
      if (keys['KeyS']) direction.z += 1;
      if (keys['KeyA']) direction.x -= 1;
      if (keys['KeyD']) direction.x += 1;
      direction.normalize().applyEuler(camera.rotation).multiplyScalar(velocity);
      controls.getObject().position.add(direction);
    }
  }

  return { controls, update };
}
