// Room1.js (refactored to use BaseRoom)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { registerInteractive } from '../../interactions/useRayInteraction.js';
import { BaseRoom } from './BaseRoom.js';


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

    // Interaktive Box
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: objectColor })
    );
    box.position.set(2, 0.5, 0);
    registerInteractive(box, () => {
      box.material.color.set(0xf352f0);
      console.log("✅ Box getroffen und geändert");
    });
    this.add(box);


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

    // Blubberblasen
  


  


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
}
