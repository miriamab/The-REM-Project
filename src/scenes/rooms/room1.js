// Room1.js (refactored to use BaseRoom)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { registerInteractive } from '../../interactions/useRayInteraction.js';
import { BaseRoom } from './BaseRoom.js';
import { createBlubberblasen } from '../../objects/blubberblasen.js';
import { spawnBubbleEffect } from '../../objects/blubberblasen.js';


export class Room1 extends BaseRoom {
  constructor(scene) {
    super(scene);
  }

  init() {
    const scene = this.scene;

    const wallColor = 0xdfc1f7;
    const objectColor = 0xfaf27f;
    const lightColor = 0xffffff;

    const textureLoader = new THREE.TextureLoader();
    const wallTexture = textureLoader.load('assets/images/wall1.png');
    const floorTexture = textureLoader.load('assets/images/floor1.jpg');
    const ceilingTexture = textureLoader.load('assets/images/floor1.jpg');

    const loader = new GLTFLoader();

    // Licht
    const ambientLight = new THREE.AmbientLight(lightColor, 0.4);
    const dirLight = new THREE.DirectionalLight(lightColor, 0.8);
    dirLight.position.set(5, 10, 7.5);

    this.add(ambientLight);
    this.add(dirLight);

    this.ambientLight = ambientLight;
    this.dirLight = dirLight;   

    // Boden
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ map: floorTexture, side: THREE.BackSide })
    );
    floor.rotation.x = Math.PI / 2;
    floor.position.y = 0.01;
    this.add(floor);

    // Wände
    const room = new THREE.Mesh(
      new THREE.BoxGeometry(20, 10, 20),
      new THREE.MeshStandardMaterial({ map: wallTexture, side: THREE.DoubleSide })
    );
    room.position.y = 5;
    this.add(room);

    // Decke
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ map: ceilingTexture, side: THREE.DoubleSide })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 9;
    this.add(ceiling);

    // Kommode
    loader.load('src/objects/models/wardrobe/kids_dresser_chest_of_drawers.glb', (gltf) => {
      const wardrobe = gltf.scene;
      wardrobe.scale.set(2.5, 2.5, 2.5);
      wardrobe.position.set(0, 1.2, -9.2);
      this.add(wardrobe);
    });

    // Bett
    loader.load('src/objects/models/bed/old_bed.glb', (gltf) => {
      const bed = gltf.scene;
      bed.scale.set(4, 4, 4);
      bed.position.set(7, 0.1, -5);
      this.add(bed);
    });

    // Teddy Bär
    loader.load('src/objects/models/stuffed_animal/teddy_bear__low_poly.glb', (gltf) => {
      const teddy = gltf.scene;
      teddy.scale.set(30, 30, 30);
      teddy.position.set(-8, -0.9, 0);
      teddy.rotation.y = Math.PI;
      this.add(teddy);

      // Starte die Blutfontäne dauerhaft
      this.startBloodFountain(this.scene, teddy.position);
    });

    // Blubberblasen Rätsel
  const blubber = createBlubberblasen(this.scene);
  this.animateBlubberblasen = blubber.animate;
  this.bubbles = blubber.bubbleArray;

  this.bubbles.forEach(bubble => {
  registerInteractive(bubble, (hit) => {
    this.scene.remove(hit);
    hit.userData.removed = true;

    // Effekt anzeigen
    spawnBubbleEffect(this.scene, hit.position);

    // Wenn keine Blasen mehr da sind: Nebel und Licht!
    if (this.bubbles.filter(b => !b.userData.removed).length === 0) {
      this.triggerOrangeFogAndLight();
    }
    });
});

  }
        /**
   * Diese Methode wird aufgerufen siehe unten, wenn der Raum erfolgreich abgeschlossen wurde.
   * Hier könnte z. B. eine Tür geöffnet oder ein Rätsel beendet worden sein.
   * 
   * 👉 Hier Cutscene + Wechsel zu Raum2 auslösen, z. B.:
   * playCutsceneAndSwitch('/cutscenes/room1_outro.mp4', () => {
   *   switchRoom(Room2, this.scene);
   * });
   */
  onSolved() {
    console.log("🎯 Raum 1 als abgeschlossen markiert – Cutscene oder Raumwechsel hier einbauen.");
  }
  // _________________
  // FUNKTION WENN ALLE BLUBBERBLASEN ANGEKLICKT WURDEN
  triggerOrangeFogAndLight() {
    // Zielwerte
    const fogColor = 0xd48f11;
    const maxDensity = 0.2; // Weniger dicht für mehr Durchsichtigkeit
    const fadeInTime = 2000; // ms
    const holdTime = 4000;   // ms
    const fadeOutTime = 2500; // ms

    // Nebel initialisieren
    this.scene.fog = new THREE.FogExp2(fogColor, 1, 12);

    // Ursprungsfarben merken
    const origAmbient = this.ambientLight ? this.ambientLight.color.clone() : null;
    const origDir = this.dirLight ? this.dirLight.color.clone() : null;
    const targetColor = new THREE.Color(0xffa500);

    // Fade-In
  let start = null;
  const fadeIn = (timestamp) => {
    if (!start) start = timestamp;
    const elapsed = timestamp - start;
    const t = Math.min(elapsed / fadeInTime, 1);
    this.scene.fog.density = t * maxDensity;

    // Lichtfarbe sanft interpolieren
    if (this.ambientLight && origAmbient) {
      this.ambientLight.color.lerpColors(origAmbient, targetColor, t);
    }
    if (this.dirLight && origDir) {
      this.dirLight.color.lerpColors(origDir, targetColor, t);
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
    this.scene.fog.density = (1 - t) * maxDensity;
    if (t < 1) {
      requestAnimationFrame(fadeOut);
    } else {
      this.scene.fog = null;
    }
  };

  requestAnimationFrame(fadeIn);
}


// ______________
// FUNKTION BLUT AM TEDDY
startBloodFountain(scene, position) {
  const particles = [];
  const geometry = new THREE.SphereGeometry(0.10, 8, 8); // größere Tropfen
  const material = new THREE.MeshBasicMaterial({ color: 0x730f0f, transparent: true, opacity: 0.95 });

  function spawnBloodParticle() {
    const particle = new THREE.Mesh(geometry, material.clone());
    particle.position.copy(position);
    particle.position.y += 2; // etwas höher am Teddy
    // Starke, zufällige Flugrichtung, vor allem nach oben und zur Seite
    particle.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.2,
      Math.random() * 0.4 + 0.05,
      (Math.random() - 0.5) * 0.2
    );
    scene.add(particle);
    particles.push(particle);
  }

  // Animation für alle Partikel
  function animateParticles() {
    // Jede Frame ein paar neue Partikel erzeugen
    for (let i = 0; i < 3; i++) spawnBloodParticle();

    // Partikel bewegen und verblassen lassen
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.position.add(p.userData.velocity);
      p.userData.velocity.y -= 0.003; // Schwerkraft
      p.material.opacity -= 0.018;
      if (p.material.opacity <= 0) {
        scene.remove(p);
        particles.splice(i, 1);
      }
    }
    requestAnimationFrame(animateParticles);
  }
  animateParticles();

}
}