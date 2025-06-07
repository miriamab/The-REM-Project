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
  for (let i = 0; i < 2; i++) {
    const mesh = new THREE.Mesh(geometry, material.clone());
    // x: -9 bis 9, y: 0.5 bis 9.5, z: -9 bis 9 (etwas Abstand zu den Wänden/Boden/Decke)
    mesh.position.x = Math.random() * 18 - 9;
    mesh.position.y = 5;
    mesh.position.z = Math.random() * 18 - 9;
    mesh.scale.setScalar(Math.random() * 2 + 0.5);
    scene.add(mesh)
    bubbleArray.push(mesh)
  }

  const animate = function animateBlubberblasen() {
    const timer = 0.0001 * Date.now();
    for (let i = 0, il = bubbleArray.length; i < il; i++) {
      const sphere = bubbleArray[i];
      sphere.position.x = 0 + 4 * Math.cos(timer + i);
      sphere.position.y = 5 + 2 * Math.sin(timer + i * 1.2);
      sphere.position.z = 0 + 4 * Math.sin(timer + i * 0.9)
    }
  };

  return {animate, bubbleArray}
}

export function spawnBubbleEffect(scene, position) {
  const particles = [];
  const geometry = new THREE.SphereGeometry(0.05, 8, 8);
  const material = new THREE.MeshBasicMaterial({ color: 0x99ccff, transparent: true, opacity: 0.8 });

  for (let i = 0; i < 12; i++) {
    const particle = new THREE.Mesh(geometry, material.clone());
    particle.position.copy(position);
    // Zufällige Flugrichtung
    particle.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.2,
      Math.random() * 0.2 + 0.05,
      (Math.random() - 0.5) * 0.2
    );
    scene.add(particle);
    particles.push(particle);
  }

  // Animation für kurze Zeit (z.B. 0.5s)
  let time = 0;
  function animateParticles(delta) {
    time += delta;
    particles.forEach(p => {
      p.position.add(p.userData.velocity);
      p.material.opacity -= 0.04;
    });
    if (time < 0.5) {
      requestAnimationFrame(() => animateParticles(0.016));
    } else {
      particles.forEach(p => scene.remove(p));
    }
  }
  animateParticles(0);
}

