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
  for (let i = 0; i < 8; i++) {
    const mesh = new THREE.Mesh(geometry, material.clone());
    // x: -9 bis 9, y: 0.5 bis 9.5, z: -9 bis 9 (etwas Abstand zu den Wänden/Boden/Decke)
    mesh.position.x = Math.random() * 18 - 9;
    mesh.position.y = 5;
    mesh.position.z = 1 + Math.random() * 1;
    mesh.scale.setScalar(Math.random() * 2 + 0.5);
    scene.add(mesh)
    bubbleArray.push(mesh)
  }

  const animate = function animateBlubberblasen() {
    const timer = 0.0001 * Date.now();
    for (let i = 0, il = bubbleArray.length; i < il; i++) {
      const sphere = bubbleArray[i];
      if (sphere.userData.removed) continue;
      sphere.position.x = 0 + 4 * Math.cos(timer + i);
      sphere.position.y = 3 + 2 * Math.sin(timer + i * 1.2);
      sphere.position.z = 0 + 4 * Math.sin(timer + i * 0.9)
    }
  };

  return {animate, bubbleArray}
}

export function spawnBubbleEffect(scene, position) {
  const particles = [];
  const geometry = new THREE.SphereGeometry(0.05, 8, 8);
  const material = new THREE.MeshBasicMaterial({ color: 0xffa500, transparent: true, opacity: 0.8 });

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

// FUNKTION WENN ALLE BLUBBERBLASEN ANGEKLICKT WURDEN
export function triggerOrangeFogAndLight(scene, ambientLight, dirLight) {
    // Zielwerte
    const fogColor = 0xd48f11;
    const maxDensity = 0.2; // Weniger dicht für mehr Durchsichtigkeit
    const fadeInTime = 2000; // ms
    const holdTime = 4000;   // ms
    const fadeOutTime = 2500; // ms

    // Nebel initialisieren
    scene.fog = new THREE.FogExp2(fogColor, 1, 12);

    // Ursprungsfarben merken
    const origAmbient = ambientLight ? ambientLight.color.clone() : null;
    const origDir = dirLight ? dirLight.color.clone() : null;
    const targetColor = new THREE.Color(0xffa500);

    // Fade-In
  let start = null;
  const fadeIn = (timestamp) => {
    if (!start) start = timestamp;
    const elapsed = timestamp - start;
    const t = Math.min(elapsed / fadeInTime, 1);
    scene.fog.density = t * maxDensity;

    // Lichtfarbe sanft interpolieren
    if (ambientLight && origAmbient) {
      ambientLight.color.lerpColors(origAmbient, targetColor, t);
    }
    if (dirLight && origDir) {
      dirLight.color.lerpColors(origDir, targetColor, t);
    }

    if (t < 1) {
      requestAnimationFrame(fadeIn);
    } else {
      // Halte den Nebel für eine Weile
      setTimeout(() => {
        // Fade-Out starten
        start = null;
        requestAnimationFrame(fadeOut);
      }, holdTime);
    }
  };

  // Fade-Out
  const fadeOut = (timestamp) => {
    if (!start) start = timestamp;
    const elapsed = timestamp - start;
    const t = Math.min(elapsed / fadeOutTime, 1);
    scene.fog.density = (1 - t) * maxDensity;
    if (t < 1) {
      requestAnimationFrame(fadeOut);
    } else {
      scene.fog = null;
    }
  };

  requestAnimationFrame(fadeIn);
}