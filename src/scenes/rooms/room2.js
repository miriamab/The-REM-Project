// src/scenes/rooms/room2.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { BaseRoom } from './BaseRoom.js';
import { START_POSITIONS } from '../../constants/StartPositions.js';
import { registerInteractive } from '../../interactions/useRayInteraction.js';
import { startQuiz } from '../../interactions/quiz_logic.js';

export class Room2 extends BaseRoom {
  // Entfernt: Quiz-bezogene Properties, da Quiz jetzt extern ist
  // Hilfsmethode, um Sounds explizit zu starten (kann nach Raumwechsel aufgerufen werden)
  startRoom2Sounds() {
    if (this.spookySound && this.atmoSound && this.spookySound.buffer && this.atmoSound.buffer && !this.soundsStarted) {
      this.spookySound.play();
      this.atmoSound.play();
      this.soundsStarted = true;
    }
  }
  constructor(scene) {
    super(scene);
    this.colliders = [];
    this.soundsStarted = false;
    this._quizShowRequested = false; // Merker, falls Spritze vor Terminal geladen wird
  }

  init() {
    // --- Clipboard-Objekt laden und Interaktion ---
    this.clipboardFound = false;
    const clipboardLoader = new GLTFLoader();
    clipboardLoader.load(
      '/hospital_objects/document_clipboard.glb',
      (gltf) => {
        const clipboard = gltf.scene;
        clipboard.name = 'document_clipboard';
        // Extrem groß und deutlich über dem Bett schweben lassen (Debug)
        clipboard.position.set(125, 8.9, -164); // X/Y/Z wie Bett, Y deutlich höher
        clipboard.scale.set(15, 15, 15);
        clipboard.rotation.set(Math.PI / 11, 0, 0); // 30° nach vorne geneigt
        // Auffälliges Material für Sichtbarkeit
        clipboard.traverse(obj => {
          if (obj.isMesh) {
            obj.visible = true;
            // Originalmaterial aus GLB bleibt erhalten
          }
        });
        console.log('DEBUG: Clipboard SCHWEBT über Bett:', clipboard.position);
        this.scene.add(clipboard);
        // Debug: Modellhierarchie loggen
        console.log('DEBUG: Clipboard children:', clipboard.children);
        // Interaktion: Klick auf Clipboard
        clipboard.traverse(obj => {
          if (obj.isMesh) {
            registerInteractive(obj, () => {
              if (this.clipboardFound) return;
              this.clipboardFound = true;
              // Sound abspielen
              const audio = new Audio('/assets/audio/signed_documents.mp3');
              audio.play();
              // Objekt aus Szene entfernen
              this.scene.remove(clipboard);
              // Terminal erst jetzt aktivierbar machen
              this.terminalEnabled = true;
            });
          }
        });

        // --- Weitere medizinische Objekte in der Nähe des Clipboards platzieren ---
        const gltfObjects = [
          { file: '/hospital_objects/bottles_medical.glb', pos: [140, 0, -150], scale: [0.02,0.02,0.02], rot: [0, 0, 0] },
          { file: '/hospital_objects/hospital_asset.glb', pos: [160, 9.3, -192], scale: [0.01,0.01,0.01], rot: [0, -Math.PI/2, 0] },
          { file: '/hospital_objects/medical_backpack.glb', pos: [137, 3, -143], scale: [5,5,5], rot: [0, 0, 0] },
          { file: '/hospital_objects/wheelchair.glb', pos: [168, -6.5, -130], scale: [0.60,0.60,0.60], rot: [0, Math.PI, 0] }
        ];
        gltfObjects.forEach(obj => {
          const loader = new GLTFLoader(); 
          loader.load(obj.file, (gltf) => { 
            const model = gltf.scene; 
            model.position.set(...obj.pos); 
            model.scale.set(...obj.scale);
            model.rotation.set(...obj.rot);
            model.traverse(child => { if (child.isMesh) child.visible = true; });
            this.scene.add(model);
          }, undefined, (err) => {
            console.error('FEHLER beim Laden von', obj.file, err);
          });
        });
      },
      undefined,
      (err) => {
        console.error('FEHLER: document_clipboard.glb konnte nicht geladen werden:', err);
      }
    );
    const scene = this.scene;

    // Bewegungsgeschwindigkeit NUR für Raum 2 setzen
    if (window.controls && typeof window.controls.velocity !== 'undefined') {
      window.controls.velocity = 50; // Beispielwert, nach Wunsch anpassen
    }

    // Kamera
    const camera = scene.children.find(obj => obj.isCamera);
    if (camera) scene.camera = camera;

    const start = START_POSITIONS.FLUR;
    if (scene.camera) {
      scene.camera.position.set(start.position.x, start.position.y, start.position.z);
      scene.camera.lookAt(start.lookAt.x, start.lookAt.y, start.lookAt.z);
    }

    // Licht
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    this.ambientLight = ambient;

    const dirLight = new THREE.DirectionalLight(0xe0ffcc, 3);
    dirLight.position.set(0, 20, -20);
    dirLight.castShadow = true;
    scene.add(dirLight);
    this.dirLight = dirLight;

    // Nebel & Hintergrund
    scene.fog = new THREE.Fog(0x000000, 20, 150);
    scene.background = new THREE.Color(0x000000);


    // 3D-Terminal-Modell laden, aber Interaktion erst nach Clipboard-Fund aktivieren
    const terminalX = 0;
    const terminalY = 0;
    const terminalZ = -199.7;
    const terminalLoader = new GLTFLoader();
    terminalLoader.load('/terminal.glb', (gltf) => {
      const terminalModel = gltf.scene;
      terminalModel.scale.set(0.85, 0.85, 0.85);
      terminalModel.position.set(220, 10, -200);
      terminalModel.rotation.y = Math.PI / 2;
      terminalModel.name = 'quiz_terminal_model';
      terminalModel.traverse(obj => {
        if (obj.isMesh) {
          obj.visible = true;
        }
      });
      scene.add(terminalModel);
      // Interaktion: Klick auf Terminal NUR wenn clipboard gefunden
      terminalModel.traverse(obj => {
        if (obj.isMesh) {
          registerInteractive(obj, () => {
            if (!this.terminalEnabled) return; // Erst nach Clipboard-Fund
            console.log('Terminal wurde geklickt! Quiz wird geöffnet...');
            const audio = new Audio('/assets/audio/quiz_activatd.mp3');
            audio.play().catch(() => {});
            setTimeout(() => {
              window.location.href = '/quiz.html';
            }, 6000);
          });
        }
      });
    }, undefined, (err) => {
      console.warn('computer_terminal.glb konnte nicht geladen werden:', err);
    });

    // Titel-Box und Text wie gehabt (optional, kann entfernt werden)
    const titleBoxGeometry = new THREE.BoxGeometry(9.5, 1.2, 0.3);
    const titleBoxMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const titleBox = new THREE.Mesh(titleBoxGeometry, titleBoxMaterial);
    titleBox.position.set(terminalX, terminalY + 6.2, terminalZ + 0.01);
    scene.add(titleBox);

    const fontLoader = new FontLoader();
    fontLoader.load('/fonts/helvetiker_regular.typeface.json', (font) => {
      const textGeo = new TextGeometry('SOMNA Terminal', {
        font,
        size: 0.55,
        height: 0.12,
      });
      const textMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const textMesh = new THREE.Mesh(textGeo, textMat);
      textMesh.position.set(terminalX - 4.1, terminalY + 4.2 - 0.35, terminalZ + 0.04);
      textMesh.rotation.y = 0;
      scene.add(textMesh);
    });

    // Spritze (Quiz-Interaktion)
    const bookLoader = new GLTFLoader();
    bookLoader.load('/hospital_objects/medical-shot.glb', (gltf) => {
      const syringe = gltf.scene;
      syringe.scale.set(0.3, 0.3, 0.3);
      syringe.position.set(170, 7.7, -178);
      syringe.rotation.y = Math.PI / 2;
      syringe.name = 'quiz_syringe';
      // Ursprüngliches Material der Spritze beibehalten (keine pinke Farbe mehr)
      scene.add(syringe);
      // Interaktion: Klick auf die Spritze öffnet die Quiz-Seite und loggt in die Konsole
      registerInteractive(syringe, () => {
        console.log('Spritze wurde geklickt! Quiz wird geöffnet...');
        window.location.href = '/quiz.html';
      });
    });
    // Fallback-Button wird entfernt (nicht mehr benötigt)

    // Bett
    const bedLoader = new GLTFLoader();
    bedLoader.load('/old-hospitalbed.glb', (gltf) => {
      const bed = gltf.scene;
      bed.scale.set(0.125, 0.125, 0.125);
      bed.position.set(175, 0, -180);
      bed.rotation.y = Math.PI / 2;
      scene.add(bed);
    });

    // Sounds
    const listener = new THREE.AudioListener();
    if (scene.camera) scene.camera.add(listener);

    this.spookySound = new THREE.Audio(listener);
    this.atmoSound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();

    audioLoader.load('sounds/scary-hospital.mp3', (buffer) => {
      this.spookySound.setBuffer(buffer);
      this.spookySound.setLoop(true);
      this.spookySound.setVolume(0.1);
    });

    audioLoader.load('sounds/hospital-food-cart-wheeled-79068.mp3', (buffer) => {
      this.atmoSound.setBuffer(buffer);
      this.atmoSound.setLoop(true);
      this.atmoSound.setVolume(0.1);
    });

    // Sounds nach User-Interaktion (z.B. Klick) oder explizit nach Raumwechsel starten
    document.addEventListener('click', () => {
      this.startRoom2Sounds();
    });

    this.flickerLight();

    // Modell
    const loader = new GLTFLoader();
    loader.load('/hospital_hall/scene.gltf', (gltf) => {
      const model = gltf.scene;
      model.scale.set(10, 10, 10);
      model.position.set(0, 0, 0);
      scene.add(model);

      // Collider & Türen
      const doorNames = [
        'hospital_door_primitive0',
        'hospital_door001_primitive0',
        'hospital_door002_primitive0'
      ];

      model.traverse((child) => {
        if (child.isMesh && child.name.toLowerCase().includes("wall")) {
          const box = new THREE.Box3().setFromObject(child);
          if (!box.isEmpty()) this.colliders.push(box);
        }

        if (child.isMesh && doorNames.includes(child.name)) {
          const pivot = new THREE.Group();
          scene.add(pivot);
          pivot.add(child);

          child.position.set(0, 0, 0);
          child.rotation.set(0, 0, 0);

          pivot.userData.interactive = true;
          pivot.userData.isOpen = false;

          const box = new THREE.Mesh(
            new THREE.BoxGeometry(10, 20, 2),
            new THREE.MeshBasicMaterial({ visible: false })
          );
          box.position.copy(pivot.position);
          box.userData.pivot = pivot;

          registerInteractive(box, () => {
            if (!pivot.userData.isOpen) {
              pivot.rotation.y -= Math.PI / 2;
              pivot.userData.isOpen = true;
            }
          });

          scene.add(box);
        }
      });
    });
  }

  flickerLight() {
    const flicker = () => {
      const chance = Math.random();
      if (chance < 0.1) this.dirLight.intensity = 0.0;
      else if (chance < 0.3) this.dirLight.intensity = 0.5 + Math.random();
      else this.dirLight.intensity = 3 + Math.random() * 0.5;
      setTimeout(flicker, 30 + Math.random() * 150);
    };
    flicker();
  }

  // ...existing code...
}
