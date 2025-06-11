// Room1.js (refactored to use BaseRoom)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { registerInteractive } from '../../interactions/useRayInteraction.js';
import { BaseRoom } from './BaseRoom.js';
import { createBlubberblasen } from '../../objects/blubberblasen.js';
import { spawnBubbleEffect } from '../../objects/blubberblasen.js';
import { triggerOrangeFogAndLight } from '../../objects/blubberblasen.js';
import { startBloodPool } from '../../objects/teddy.js';
import { startBloodFountain } from '../../objects/teddy.js';
import { makeRadioInteractive, makeLampInteractive, makeTVInteractive } from '../../objects/radio.js';


export class Room1 extends BaseRoom {
  constructor(scene) {
    super(scene);
    this.radioOn = false;
    this.lampOn = false;
    this.tvOn = false;
    this.interactionsLocked = false;
    this.blubberStarted = false;
  }

  checkAllOn() {
    if (this.radioOn && this.lampOn && this.tvOn && !this.interactionsLocked) {
      this.interactionsLocked = true;
      // Sperre alle Interaktionen
      if (this.radioLock) this.radioLock();
      if (this.lampLock) this.lampLock();
      if (this.tvLock) this.tvLock();
      this.flackerUndBlubber();
    }
  }

  flackerUndBlubber() {
    const origAmbient = this.ambientLight.color.clone();
    const origDir = this.dirLight.color.clone();
    let count = 0;
    const flacker = () => {
      if (count++ < 8) {
        this.ambientLight.intensity = (count % 2 === 0) ? 0.4 : 0.7;
        this.dirLight.intensity = (count % 2 === 0) ? 0.1 : 1.2;
        setTimeout(flacker, 80);
      } else {
        this.ambientLight.intensity = 0.4;
        this.dirLight.intensity = 0.8;
        this.ambientLight.color.copy(origAmbient);
        this.dirLight.color.copy(origDir);
        this.showBlubberblasen();
      }
    };
    flacker();
  }

  showBlubberblasen() {
    if (this.blubberStarted) return;
    this.blubberStarted = true;
    const blubber = createBlubberblasen(this.scene);
    this.animateBlubberblasen = blubber.animate;
    this.bubbles = blubber.bubbleArray;
    this.bubbles.forEach(bubble => {
      registerInteractive(bubble, (hit) => {
        this.scene.remove(hit);
        hit.userData.removed = true;
        spawnBubbleEffect(this.scene, hit.position);
        if (this.bubbles.filter(b => !b.userData.removed).length === 0) {
          triggerOrangeFogAndLight(this.scene, this.ambientLight, this.dirLight);
          setTimeout(() => {
            this.spawnTeddyAndButton();
          }, 2200);
        }
      });
    });
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
    loader.load('src/objects/models/room_1/wardrobe/kids_dresser_chest_of_drawers.glb', (gltf) => {
      const wardrobe = gltf.scene;
      wardrobe.scale.set(2.5, 2.5, 2.5);
      wardrobe.position.set(0, 1.2, -9.2);
      this.add(wardrobe);
    });

    // Bett
    loader.load('src/objects/models/room_1/bed/old_bed.glb', (gltf) => {
      const bed = gltf.scene;
      bed.scale.set(4, 4, 4);
      bed.position.set(7, 0.1, -5);
      this.add(bed);
    });

    // Radio
    loader.load('src/objects/models/room_1/radio/radio.glb', (gltf) => {
      const radio = gltf.scene;
      radio.scale.set(0.005, 0.005, 0.005);
      radio.position.set(0, 2.4, -9.1);
      radio.rotation.y = Math.PI
      this.add(radio);

      this.radioLock = makeRadioInteractive(radio, 'assets/audio/radio-music.mp3', this);
    });

    // Lamp
    loader.load('src/objects/models/room_1/lamp/lamp.glb', (gltf) => {
      const lamp = gltf.scene;
      lamp.scale.set(0.9, 0.9, 0.9);
      lamp.position.set(7, 0.1, 7);
      this.add(lamp);

      // Unsichtbarer, aber klickbarer Quader um die Lampe
      const boxGeometry = new THREE.BoxGeometry(3, 10, 3); 
      const boxMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0 });
      const hitbox = new THREE.Mesh(boxGeometry, boxMaterial);
      hitbox.position.set(0, 1, 0); // Position relativ zur Lampe (ggf. anpassen)
      lamp.add(hitbox);

      this.lampLock = makeLampInteractive(hitbox, this.ambientLight, this.dirLight, this);
    });

    // TV
    loader.load('src/objects/models/room_1/tv/small_table.glb', (gltf) => {
      const table = gltf.scene;
      table.scale.set(1.2, 1.2, 1.2);
      table.position.set(8.4, 0.5, 3);
      this.add(table);
    });

    
    loader.load('src/objects/models/room_1/tv/tv.glb', (gltf) => {
      const tv = gltf.scene;
      tv.scale.set(0.8, 0.8, 0.8);
      tv.position.set(8, 0.2, 3);
      tv.rotation.y = Math.PI ;
      this.add(tv);

      this.tvLock = makeTVInteractive(tv, this);
    });

/** 
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
      triggerOrangeFogAndLight(this.scene, this.ambientLight, this.dirLight);

      // Button und Teddy erst nach kurzer Verzögerung (nach Licht-Übergang) anzeigen:
      setTimeout(() => {
        this.spawnTeddyAndButton();
      }, 2200);
    }
    });
});
*/

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

  spawnTeddyAndButton() {
    const loader = new GLTFLoader();

  // Teddy Bär
  loader.load('src/objects/models/room_1/stuffed_animal/teddy_bear__low_poly.glb', (gltf) => {
    const teddy = gltf.scene;
    teddy.scale.set(30, 30, 30);
    teddy.position.set(-8, -0.9, 0);
    teddy.rotation.y = Math.PI;
    this.add(teddy);
    this.teddyPosition = teddy.position.clone();
  });

  // Roter Knopf
  loader.load('src/objects/models/room_1/redbutton/red_button.glb', (gltf) => {
    const button = gltf.scene;
    button.scale.set(1, 1, 1);
    button.position.set(-8.0, 1.5, 4);
    button.rotation.z = Math.PI / 2 + Math.PI;
    this.add(button);

    button.traverse(child => {
      if (child.isMesh) {
        registerInteractive(child, () => {
          if (!this.bloodStarted && this.teddyPosition) {
            this.bloodStarted = true;
            startBloodFountain(this.scene, this.teddyPosition);
            startBloodPool(this.scene, this.teddyPosition);
          }
        });
      }
    });
  });
}


}