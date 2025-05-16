// testrraum.js
import * as THREE from 'three';

import { registerInteractive } from '../../interactions/useRayInteraction.js';

export function setupTestRoom(scene) {
  const wallColor = 0xdfc1f7;
  const objectColor = 0xfaf27f;
  const lightColor = 0xffffff;

  // Licht
  const ambientLight = new THREE.AmbientLight(lightColor, 0.4);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(lightColor, 0.8);
  dirLight.position.set(5, 10, 7.5);
  scene.add(dirLight);

  // Boden
  const floorGeo = new THREE.PlaneGeometry(20, 20);
  const floorMat = new THREE.MeshStandardMaterial({ color: wallColor });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = Math.PI / 2;
  scene.add(floor);

  // Wände
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, side: THREE.BackSide });
  const room = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 20), wallMat);
  room.position.y = 5;
  scene.add(room);

  // Interaktive Box
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const boxMat = new THREE.MeshStandardMaterial({ color: objectColor });
  const box = new THREE.Mesh(boxGeo, boxMat);
  box.position.set(2, 0.5, 0);
  scene.add(box);

registerInteractive(box, () => {
  box.material.color.set(0xf352f0); // Neue Farbe
  console.log("✅ Box getroffen und geändert");
});
  
  // Optional: Rückgabe für Interaktion
  return box;


}
