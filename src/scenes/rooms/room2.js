// src/scenes/rooms/room3.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BaseRoom } from './BaseRoom.js.js';
import { START_POSITIONS } from '../../constants/StartPositions.js';

export class Room2 extends BaseRoom {
  constructor(scene) {
    super(scene);
    this.colliders = [];
  }

  init() {
    const scene = this.scene;

    // Grundlicht
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(10, 20, 10);
    scene.add(ambientLight, dirLight);

    // Modell laden
    const loader = new GLTFLoader();
    loader.load(
      '/hospital_hall/scene.gltf',
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(10, 10, 10);
        model.position.set(0, 0, 0);
        scene.add(model);

        // Kamera-Start setzen
        const start = START_POSITIONS.FLUR;
        if (scene.camera) {
          const cam = scene.camera;
          cam.position.set(start.position.x, start.position.y, start.position.z);
          cam.lookAt(start.lookAt.x, start.lookAt.y, start.lookAt.z);
        }

        // Objektstruktur durchsuchen
        model.traverse((child) => {
          console.log('🔍 Teilobjekt:', child.name);

          // Wände einfärben
          if (child.isMesh && child.name.toLowerCase().includes('wall')) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0x220000 // dunkles Blutrot
            });
            child.material.needsUpdate = true;

            // Collider setzen
            const b = new THREE.Box3().setFromObject(child);
            if (!b.isEmpty()) this.colliders.push(b);

            // Sichtbarer Collider (optional)
            const helper = new THREE.Box3Helper(b, 0xff0000);
            scene.add(helper);
          }

          // Tür interaktiv machen
          if (child.name === 'Object1862_blue_0') {
            child.userData.interactive = true;
            child.userData.isOpen = false;
            console.log('🚪 Interaktive Tür erkannt:', child.name);
          }
        });

        console.log('✅ Modell geladen mit', this.colliders.length, 'Collidern');
      },
      undefined,
      (err) => {
        console.error('❌ Fehler beim Laden des Modells:', err);
      }
    );
  }
}