import * as THREE from 'three';

import { AnaglyphEffect } from 'three/addons/effects/AnaglyphEffect.js';


/**
 * Fügt animierte Blubberblasen zu einer bestehenden THREE.js Szene hinzu.
 * @param {THREE.Scene} scene - Die Szene, zu der die Blasen hinzugefügt werden.
 * @param {THREE.CubeTexture} envMap - Die Environment-Map für Spiegelungen.
 * @returns {Function} Animationsfunktion für den Render-Loop.
 */
export function createBlubberblasen(scene) {
  const bubbleArray = [];
  
  const geometry = new THREE.SphereGeometry(0.1, 32, 16);

    const envMap = new THREE.CubeTextureLoader().load([
    'assets/images/silber.png',
    'assets/images/silber.png',
    'assets/images/silber.png',
    'assets/images/silber.png',
    'assets/images/silber.png',
    'assets/images/silber.png'
  ]);
  scene.background = envMap;

  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    envMap: envMap
  });

  // Erstelle viele Blasen
  for (let i = 0; i < 100; i++) {
    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.position.x = Math.random() * 10 - 5;
    mesh.position.y = Math.random() * 10 - 5;
    mesh.position.z = Math.random() * 10 - 5;
    mesh.scale.setScalar(Math.random() * 2 + 0.5);
    scene.add(mesh)
    bubbleArray.push(mesh)
  }





  return bubbleArray;
}