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
import { playNarratorClip } from '../../objects/audios.js';

import { setColliders } from '../../controls/FirstPersonControls.js';
import { playCutsceneAndSwitch, switchRoom } from '../../sceneManager.js';
import { Room2 } from './room2.js';

export class Room1 extends BaseRoom {
  constructor(scene) {
    super(scene);
    this.colliders = [];
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
    let bubblesPopped = 0;
    this.bubbles.forEach(bubble => {
      registerInteractive(bubble, (hit) => {
        this.scene.remove(hit);
        hit.userData.removed = true;
        spawnBubbleEffect(this.scene, hit.position);
        bubblesPopped++;
        if (bubblesPopped === 2) {
          playNarratorClip('drei'); // Audio drei nach 2 abgeschossenen Bubbles
        }
        if (this.bubbles.filter(b => !b.userData.removed).length === 0) {
          playNarratorClip('vier');
          // Wandbilder nach letzter Bubble mit 3 Sekunden Verzögerung sichtbar machen
          setTimeout(() => {
            if (this.wandbilder) this.wandbilder.forEach(mesh => mesh.visible = true);
          }, 3000);
          triggerOrangeFogAndLight(this.scene, this.ambientLight, this.dirLight);
          setTimeout(() => {
            this.spawnTeddyAndButton();
          }, 2200);
        }
      });
    });
  } // Ende showBlubberblasen

  init() {
    const scene = this.scene;

    const wallColor = 0xdfc1f7;
    const objectColor = 0xfaf27f;
    const lightColor = 0xffffff;

    const textureLoader = new THREE.TextureLoader();
    const wallTexture = textureLoader.load('assets/images/wall1.png');
    const floorTexture = textureLoader.load('assets/images/floor1.jpg');
    const ceilingTexture = textureLoader.load('assets/images/decke1.jpg');

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

    // Fußbodenleiste (Sockelleiste) 
const baseboardMaterial = new THREE.MeshStandardMaterial({ color: 0x8a7457 }); // hellgrau, ggf. Textur
const baseboardHeight = 0.12;
const baseboardDepth = 0.08;
const baseboardY = baseboardHeight / 2 + 0.01; // knapp über dem Boden
const baseboardOffset = 0.26;

// Rückwand (leiste)
const baseboardBack = new THREE.Mesh(new THREE.BoxGeometry(20, baseboardHeight, baseboardDepth), baseboardMaterial);
baseboardBack.position.set(0, baseboardY, -10 + baseboardDepth / 2 + baseboardOffset);
this.add(baseboardBack);

// Vorderwand (leiste)
const baseboardFront = new THREE.Mesh(new THREE.BoxGeometry(20, baseboardHeight, baseboardDepth), baseboardMaterial);
baseboardFront.position.set(0, baseboardY, 10 - baseboardDepth / 2 - baseboardOffset);
this.add(baseboardFront);

// Linke Wand (leiste)
const baseboardLeft = new THREE.Mesh(new THREE.BoxGeometry(baseboardDepth, baseboardHeight, 20), baseboardMaterial);
baseboardLeft.position.set(-10 + baseboardDepth / 2 + baseboardOffset, baseboardY, 0);
this.add(baseboardLeft);

// Rechte Wand (leiste)
const baseboardRight = new THREE.Mesh(new THREE.BoxGeometry(baseboardDepth, baseboardHeight, 20), baseboardMaterial);
baseboardRight.position.set(10 - baseboardDepth / 2 - baseboardOffset, baseboardY, 0);
this.add(baseboardRight);

// Deckenleiste (Stuckleiste)
const crownMaterial = new THREE.MeshStandardMaterial({ color: 0x8a7457 }); // z.B. cremeweiß, ggf. Textur
const crownHeight = 0.12;
const crownDepth = 0.08; // genauso schmal wie die Fußleiste
const crownY = 9 - crownHeight / 2; // knapp unter der Decke (Decke ist bei y=9)
const crownOffset = 0.26; // analog zur Fußleiste

// Rückwand (leiste decke)
const crownBack = new THREE.Mesh(new THREE.BoxGeometry(20, crownHeight, crownDepth), crownMaterial);
crownBack.position.set(0, crownY, -10 + crownDepth / 2 + crownOffset);
this.add(crownBack);

// Vorderwand (leiste decke)
const crownFront = new THREE.Mesh(new THREE.BoxGeometry(20, crownHeight, crownDepth), crownMaterial);
crownFront.position.set(0, crownY, 10 - crownDepth / 2 - crownOffset);
this.add(crownFront);

// Linke Wand (leiste decke)
const crownLeft = new THREE.Mesh(new THREE.BoxGeometry(crownDepth, crownHeight, 20), crownMaterial);
crownLeft.position.set(-10 + crownDepth / 2 + crownOffset, crownY, 0);
this.add(crownLeft);

// Rechte Wand (leiste decke)
const crownRight = new THREE.Mesh(new THREE.BoxGeometry(crownDepth, crownHeight, 20), crownMaterial);
crownRight.position.set(10 - crownDepth / 2 - crownOffset, crownY, 0);
this.add(crownRight);


    // Sichtbare Wände (mit Textur)
const visibleWallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture, side: THREE.DoubleSide });

// Rückwand (sichtbar)
const visibleBackWall = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 0.5), visibleWallMaterial);
visibleBackWall.position.set(0, 5, -10);
this.add(visibleBackWall);

// Vorderwand (sichtbar)
const visibleFrontWall = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 0.5), visibleWallMaterial);
visibleFrontWall.position.set(0, 5, 10);
this.add(visibleFrontWall);

// Linke Wand (sichtbar)
const visibleLeftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 20), visibleWallMaterial);
visibleLeftWall.position.set(-10, 5, 0);
this.add(visibleLeftWall);

// Rechte Wand (sichtbar)
const visibleRightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 20), visibleWallMaterial);
visibleRightWall.position.set(10, 5, 0);
this.add(visibleRightWall);

// Unsichtbare Collider-Wände (ohne Textur)
const colliderWallMaterial = new THREE.MeshBasicMaterial({ visible: false });

// Rückwand (Collider)
const colliderBackWall = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 0.5), colliderWallMaterial);
colliderBackWall.position.set(0, 5, -10);
this.add(colliderBackWall);
this.colliders.push(colliderBackWall);

// Vorderwand (Collider)
const colliderFrontWall = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 0.5), colliderWallMaterial);
colliderFrontWall.position.set(0, 5, 10);
this.add(colliderFrontWall);
this.colliders.push(colliderFrontWall);

// Linke Wand (Collider)
const colliderLeftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 20), colliderWallMaterial);
colliderLeftWall.position.set(-10, 5, 0);
this.add(colliderLeftWall);
this.colliders.push(colliderLeftWall);

// Rechte Wand (Collider)
const colliderRightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 20), colliderWallMaterial);
colliderRightWall.position.set(10, 5, 0);
this.add(colliderRightWall);
this.colliders.push(colliderRightWall);

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
      this.colliders.push(wardrobe);
    });

    // Bett
    loader.load('src/objects/models/room_1/bed/old_bed.glb', (gltf) => {
      const bed = gltf.scene;
      bed.scale.set(4, 4, 4);
      bed.position.set(7, 0.1, -5);
      this.add(bed);
      this.colliders.push(bed);
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

    // Schwarzes Rechteck an der Wand (Schatten einer Tür)
    const blackRectangleMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Schwarz
    const blackRectangleGeometry = new THREE.PlaneGeometry(3, 8, 1); // Breite und Höhe des Rechtecks
    const blackRectangle = new THREE.Mesh(blackRectangleGeometry, blackRectangleMaterial);
    blackRectangle.visible = false; // Unsichtbar machen
    blackRectangle.position.set(-4.5, 2.8, 9.5); // An der Vorderwand (gegenüber der Kommode)
    blackRectangle.rotation.y = Math.PI; // An die Wand ausrichten
    blackRectangle.name = 'blackRectangle'; // WICHTIG: Name setzen für getObjectByName
    this.scene.add(blackRectangle);
    

// Rose
loader.load('src/objects/models/room_1/rose.glb', (gltf) => {
  const rose = gltf.scene;

  rose.scale.set(1, 1, 1);

  rose.position.set(0, -2, 0); // X = 0, Y = leicht über dem Boden, Z = 0

  // Rotation (falls nötig)
  rose.rotation.y = 0; // Keine Rotation, zeigt nach vorne

  // Blume zur Szene hinzufügen
  this.add(rose);
  this.rose = rose;
});

// Schlüssel über der Rose
loader.load('src/objects/models/room_1/key.glb', (gltf) => {
  const key = gltf.scene;

  // Skalierung anpassen (ggf. anpassen, damit der Schlüssel die richtige Größe hat)
  key.scale.set(1, 1, 1);

  // Position über der Rose
  key.position.set(0, -2, 0); // X = 0, Y = 1.5 (über der Rose), Z = 0

  // Rotation (falls nötig)
  key.rotation.y = 0; // Keine Rotation, zeigt nach vorne

  // Schlüssel zur Szene hinzufügen
  this.add(key);
  this.key = key;

  // Animation für langsame Rotation
  function animateKeyRotation() {
    key.rotation.y += 0.01; // Langsame Drehung um die Y-Achse
    requestAnimationFrame(animateKeyRotation); // Nächsten Frame anfordern
  }
  animateKeyRotation(); // Animation starten

  // Schlüssel interaktiv machen
key.traverse(child => {
  if (child.isMesh) {
    registerInteractive(child, () => {
      // Schwarzes Rechteck sichtbar machen
     this.onSolved();
    });
  }
});
});

    // Lamp
    loader.load('src/objects/models/room_1/lamp/lamp.glb', (gltf) => {
      const lamp = gltf.scene;
      lamp.scale.set(0.9, 0.9, 0.9);
      lamp.position.set(7, 0.1, 7);
      this.add(lamp);

      // Unsichtbarer, aber klickbarer Quader um die Lampe
      const boxGeometry = new THREE.BoxGeometry(3, 6, 3); 
      const boxMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0 });
      const hitbox = new THREE.Mesh(boxGeometry, boxMaterial);
      hitbox.position.set(0, 4.01, 0); // Position relativ zur Lampe (ggf. anpassen)
      lamp.add(hitbox);
      this.colliders.push(hitbox);

      let lampAudioPlayed = false;
      this.lampLock = makeLampInteractive(hitbox, this.ambientLight, this.dirLight, this, () => {
        if (!lampAudioPlayed) {
          playNarratorClip('zwei'); // Audio zwei nur beim ersten Mal abspielen
          lampAudioPlayed = true;
        }
      });
      this.lampLock = makeLampInteractive(hitbox, this.ambientLight, this.dirLight, this);
    });

    // TV
    loader.load('src/objects/models/room_1/tv/small_table.glb', (gltf) => {
      const table = gltf.scene;
      table.scale.set(1.2, 1.2, 1.2);
      table.position.set(8.4, 0.5, 3);
      this.add(table);
      this.colliders.push(table);
    });

    
    loader.load('src/objects/models/room_1/tv/tv.glb', (gltf) => {
      const tv = gltf.scene;
      tv.scale.set(0.8, 0.8, 0.8);
      tv.position.set(8, 0.2, 3);
      tv.rotation.y = Math.PI ;
      this.add(tv);
      this.colliders.push(tv);

      this.tvLock = makeTVInteractive(tv, this);
    });

    // Soviet Chair in der Nähe des TVs platzieren
    loader.load('src/objects/models/soviet_chair.glb', (gltf) => {
      const chair = gltf.scene;
      chair.position.set(2, 0.1, 6); 
      chair.scale.set(0.9, 0.9, 0.9); // Größe ggf. anpassen
      chair.rotation.y = Math.PI / 3; // leicht zur Raummitte drehen
      this.add(chair);
      this.colliders.push(chair);
    });


    // Tassen
    loader.load('src/objects/models/room_1/soviet_mug.glb', (gltf) => {
      const mug = gltf.scene;
      mug.scale.set(13, 13, 13);
      mug.position.set(4, 0.1, -7);
      mug.rotation.y = Math.PI / 2; // zur Wand drehen
      this.add(mug);
      this.colliders.push(mug);
    });

 // --- Timer für Erzähler-Audio (unabhängig von Interaktion) ---
    setTimeout(() => {
      playNarratorClip('eins');
    }, 12000); // 25 Sekunden


const quallenTexture = textureLoader.load('assets/images/quallen.png');
const wallPaintTexture = textureLoader.load('assets/images/wall_paint.png');

const quallenMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(4, 5),
  new THREE.MeshBasicMaterial({ map: quallenTexture, transparent: true })
);
quallenMesh.position.set(9.4, 4, 0);
quallenMesh.rotation.y = -Math.PI / 2;
quallenMesh.visible = false;
this.add(quallenMesh);

const wallPaintMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(6, 4),
  new THREE.MeshBasicMaterial({ map: wallPaintTexture, transparent: true })
);
wallPaintMesh.position.set(2, 5, 9.7);
wallPaintMesh.rotation.y = Math.PI;
wallPaintMesh.visible = false;
this.add(wallPaintMesh);

const wallTeddyTexture = textureLoader.load('assets/images/wall_teddy.png');
const wallSplashTexture = textureLoader.load('assets/images/wall_splash.png');

const wallSplashMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 10),
  new THREE.MeshBasicMaterial({ map: wallSplashTexture, transparent: true })
);
wallSplashMesh.position.set(0, 4, -9.7);
wallSplashMesh.rotation.y = 0;
wallSplashMesh.visible = false;
this.add(wallSplashMesh);

const wallTeddyMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 10),
  new THREE.MeshBasicMaterial({ map: wallTeddyTexture, transparent: true })
);
wallTeddyMesh.position.set(-9.7, 5, 0);
wallTeddyMesh.rotation.y = Math.PI / 2;
wallTeddyMesh.visible = false;
this.add(wallTeddyMesh);

// Referenzen speichern
this.wandbilder = [quallenMesh, wallPaintMesh, wallTeddyMesh, wallSplashMesh];

    // Kissen-Pack (post-apocalypse_pillow_pack.glb) auf dem Boden platzieren
    loader.load('src/objects/models/room_1/post-apocalypse_pillow_pack.glb', (gltf) => {
      const pillowPack = gltf.scene;
      pillowPack.position.set(5, 0.1, 2); // x, y (leicht über Boden), z – Position ggf. anpassen
      pillowPack.scale.set(0.3, 0.3, 0.3); // Größe ggf. anpassen
      pillowPack.rotation.y = 0; // ggf. drehen
      this.add(pillowPack);
    });

    // Aschenbecher (ashtray_with_cigarettes.glb) auf dem Boden platzieren
    loader.load('src/objects/models/room_1/ashtray_with_cigarettes.glb', (gltf) => {
      const ashtray = gltf.scene;
      ashtray.position.set(3, 0.15, 6); // Beispiel-Position, leicht über dem Boden
      ashtray.scale.set(5.2, 5.2, 5.2); // Größe ggf. anpassen
      this.add(ashtray);
    });

      // Toycar
    loader.load('src/objects/models/room_1/toy_car.glb', (gltf) => {
      const toycar = gltf.scene;
      toycar.scale.set(3, 3, 3);
      toycar.position.set(-1, 0.36, 4);
      toycar.rotation.y = Math.PI; // zur Wand drehen
      this.add(toycar);
      // Unsichtbarer, klickbarer Cube direkt in die Szene (nicht als Kind!)
      const boxGeometry = new THREE.BoxGeometry(2, 1, 3); // schmaler und niedriger
      const boxMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
      boxMaterial.depthWrite = false; // verhindert Z-Buffer-Probleme
      const hitbox = new THREE.Mesh(boxGeometry, boxMaterial);
      hitbox.position.set(-1, 0.7, 4); // niedriger, näher am Auto
      hitbox.renderOrder = -1; // immer hinter allem rendern
      this.add(hitbox);
      let moved = false;
      registerInteractive(hitbox, () => {
        const from = toycar.position.x;
        const to = moved ? -1 : -2.5;
        let start = null;
        function animateToycar(timestamp) {
          if (!start) start = timestamp;
          const progress = Math.min((timestamp - start) / 1000, 1);
          toycar.position.x = from + (to - from) * progress;
          if (progress < 1) {
            requestAnimationFrame(animateToycar);
          }
        }
        requestAnimationFrame(animateToycar);
        moved = !moved;
      });
    }); 


    // Somna Floor als kleine, um 180° gedrehte Plane GENAU unter das Toycar
    const somnaFloorTexture = textureLoader.load('assets/images/somna_floor.png');
    const somnaFloorMaterial = new THREE.MeshBasicMaterial({ map: somnaFloorTexture, transparent: true });
    const somnaFloorGeometry = new THREE.PlaneGeometry(1.1, 0.4); // halb so groß
    const somnaFloorMesh = new THREE.Mesh(somnaFloorGeometry, somnaFloorMaterial);
    somnaFloorMesh.renderOrder = 0; // Wird vor dem Blut gerendert
    // Position exakt wie Toycar, aber auf Bodenhöhe
    const toycarX = -1, toycarZ = 4;
    somnaFloorMesh.position.set(toycarX, 0.015, toycarZ);
    somnaFloorMesh.rotation.x = -Math.PI / 2;
    somnaFloorMesh.rotation.z = Math.PI; // um 180° drehen
    this.add(somnaFloorMesh);

   // Hintergrundmusik im Raum abspielen
this.backgroundMusic = new Audio('assets/audio/spooky_sound.mp3');
this.backgroundMusic.loop = true; // Musik wiederholen
this.backgroundMusic.volume = 0.5; // Lautstärke anpassen
this.backgroundMusic.play(); // Musik starten


if (!this.camera || !this.camera.position) {
  console.error('Kamera ist nicht korrekt initialisiert!');
  return;
}

  } // Ende init

  // Zentraler Callback für den Raumwechsel nach Cutscene
  switchToRoom2() {
    // switchRoom übernimmt jetzt ALLE notwendigen Initialisierungen
    return switchRoom(Room2, this.scene);
  }

  // Wird aufgerufen, wenn Raum 1 abgeschlossen ist
  onSolved() {
  const blackRectangle = this.scene.getObjectByName('blackRectangle');
  if (blackRectangle) {
    blackRectangle.visible = true; // Tür sichtbar machen

    // Interaktivität für die Tür registrieren
    blackRectangle.traverse(child => {
      if (child.isMesh) {
        registerInteractive(child, () => {
          if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0; // Zurücksetzen
            this.backgroundMusic = null;
          }

          playCutsceneAndSwitch('/cutscenes/room2.mp4', () => {
            this.switchToRoom2(); // Raumwechsel ausführen
          });
        });
      }
    });
  } else {
    console.error('Schwarzes Rechteck nicht gefunden!');
  }
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
      this.colliders.push(teddy);
      this.teddyPosition = teddy.position.clone();
      // Interaktiv: Nach Blut auf Teddy klicken -> Raum 2
      teddy.traverse(child => {
        if (child.isMesh) {
          registerInteractive(child, () => {
            if (!this.bloodStarted) return;
            const bloodPool = this.scene.getObjectByName('bloodPool');
            if (!bloodPool) return;
            
            playNarratorClip('sechs');
          });
        }
      });
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
              playNarratorClip('fuenf'); // Audio fuenf abspielen, wenn Teddy zu bluten beginnt
              startBloodFountain(this.scene, this.teddyPosition);
              startBloodPool(this.scene, this.teddyPosition, this.rose, this.key);
              // Bear-Sound nach 5 Sekunden abspielen
              setTimeout(() => {
                const bearSound = new Audio('assets/audio/bear-sound.wav');
                bearSound.play();
              }, 5000);
            }
          });
        }
      });
    });
  } // Ende spawnTeddyAndButton

} // Ende Klasse Room1
