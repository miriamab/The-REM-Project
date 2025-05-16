// hands.js
import * as THREE from 'three';

export function addPlaceholderHands(camera) {
  const leftHand = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.08, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xffcc66 })
  );
  leftHand.position.set(-0.2, -0.3, -0.5);

  const rightHand = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.08, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xffcc66 })
  );
  rightHand.position.set(0.2, -0.3, -0.5);

  camera.add(leftHand);
  camera.add(rightHand);
}
