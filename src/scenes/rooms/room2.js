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
  }

  init() {
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

    // ▶️ QUIZ-TERMINAL (Box und Titel direkt an der Wand, auf Augenhöhe)
    // Neue zentrale Position an der Wand
    const terminalX = 0;
    const terminalY = 8;
    const terminalZ = -199.7;

    // Terminal-Box direkt an der Wand
    const terminalGeometry = new THREE.BoxGeometry(9.5, 7.5, 0.3);
    const terminalMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const terminal = new THREE.Mesh(terminalGeometry, terminalMaterial);
    terminal.position.set(terminalX, terminalY, terminalZ);
    terminal.rotation.y = 0;
    terminal.name = 'quiz_terminal';
    scene.add(terminal);

    // Titel-Box über dem Terminal
    const titleBoxGeometry = new THREE.BoxGeometry(9.5, 1.2, 0.3);
    const titleBoxMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const titleBox = new THREE.Mesh(titleBoxGeometry, titleBoxMaterial);
    titleBox.position.set(terminalX, terminalY + 4.2, terminalZ + 0.01); // leicht vor dem Terminal
    scene.add(titleBox);

    // Titel-Text auf der Box
    const fontLoader = new FontLoader();
    fontLoader.load('/fonts/helvetiker_regular.typeface.json', (font) => {
      const textGeo = new TextGeometry('SOMNA Terminal', {
        font,
        size: 0.55,
        height: 0.12,
      });
      const textMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const textMesh = new THREE.Mesh(textGeo, textMat);
      textMesh.position.set(terminalX - 4.1, terminalY + 4.2 - 0.35, terminalZ + 0.04); // mittig auf der Box
      textMesh.rotation.y = 0;
      scene.add(textMesh);
    });

    // Quiz-Plane (direkt vor dem Terminal)
    const quizGeometry = new THREE.PlaneGeometry(9.5, 7.5);
    const quizCanvas = document.createElement('canvas');
    quizCanvas.width = 1024;
    quizCanvas.height = 800;
    const quizCtx = quizCanvas.getContext('2d');
    quizCtx.fillStyle = 'rgba(0,0,0,0)';
    quizCtx.fillRect(0, 0, quizCanvas.width, quizCanvas.height);
    const quizTexture = new THREE.CanvasTexture(quizCanvas);
    const quizMaterial = new THREE.MeshBasicMaterial({ map: quizTexture, transparent: true });
    const quizInterface = new THREE.Mesh(quizGeometry, quizMaterial);
    quizInterface.position.set(terminalX, terminalY, terminalZ + 0.18); // direkt vor dem Terminal
    quizInterface.rotation.y = 0;
    quizInterface.name = 'quiz_interface';
    scene.add(quizInterface);

    // Funktion zum Rendern des Quiz auf das Canvas
    function renderQuizOnTerminal(question, answers) {
      quizCtx.clearRect(0, 0, quizCanvas.width, quizCanvas.height);
      quizCtx.fillStyle = '#111';
      quizCtx.fillRect(0, 0, quizCanvas.width, quizCanvas.height);
      quizCtx.font = 'bold 48px Arial';
      quizCtx.fillStyle = '#fff';
      quizCtx.textAlign = 'left';
      quizCtx.fillText(question, 40, 100);
      quizCtx.font = 'bold 44px Arial';
      for (let i = 0; i < answers.length; i++) {
        quizCtx.fillStyle = '#f44';
        quizCtx.fillText((i+1) + '. ' + answers[i], 60, 200 + i * 80);
      }
      quizTexture.needsUpdate = true;
      quizMaterial.opacity = 1.0;
    }

    // Interaktive Hitbox für das Quiz (Raycast auf Plane)
    registerInteractive(quizInterface, () => {
      // Beispiel-Frage und Antworten (kann später dynamisch aus quiz_logic.js kommen)
      renderQuizOnTerminal('Wann haben Sie zuletzt durchgeschlafen?', [
        'Diese Woche',
        'Letztes Jahr',
        'Noch nie'
      ]);
      // Optional: startQuiz(scene); // Falls weitere Logik gebraucht wird
    });

    // (Titel-Box und Text sind jetzt direkt nach der Terminal-Box platziert)

    // Buch laden und interaktiv machen (neben das Bett stellen)
    const bookLoader = new GLTFLoader();
    bookLoader.load('/hospital_objects/medical-shot.glb', (gltf) => {
      const book = gltf.scene;
      book.scale.set(0.3, 0.3, 0.3);
      book.position.set(170, 7.7, -178); // x etwas größer als Bett, gleiche z
      book.rotation.y = Math.PI / 2;
      scene.add(book);

      // Interaktive Hitbox für das Buch
      book.traverse(child => {
        if (child.isMesh) {
          registerInteractive(child, () => {
            startQuiz(scene);
          });
        }
      });
    });

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
      this.spookySound.setVolume(0.2);
    });

    audioLoader.load('sounds/hospital-food-cart-wheeled-79068.mp3', (buffer) => {
      this.atmoSound.setBuffer(buffer);
      this.atmoSound.setLoop(true);
      this.atmoSound.setVolume(0.3);
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
}
