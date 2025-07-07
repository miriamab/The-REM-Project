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
    this._quakeTriggered = false; // Flag für Erdbeben-Trigger
    this.quakeTriggerActive = false; // Wird in init aktiviert
    this._fallTriggered = false; // Flag für Fall-Trigger
    this.fallTriggerActive = true; // Wird in init aktiviert
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

        // --- Weitere medizinische Objekte platzieren ---
        const gltfObjects = [
          { file: '/hospital_objects/bottles_medical.glb', pos: [140, 0, -150], scale: [0.02,0.02,0.02], rot: [0, 0, 0] },
          { file: '/hospital_objects/hospital_asset.glb', pos: [160, 9.3, -192], scale: [0.01,0.01,0.01], rot: [0, -Math.PI/2, 0] },
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
        
        // Medizinischer Rucksack mit Interaktion (verschwinden beim Klicken)
        const backpackLoader = new GLTFLoader();
        backpackLoader.load('/hospital_objects/medical_backpack.glb', (gltf) => {
          const backpack = gltf.scene;
          backpack.name = 'medical_backpack';
          backpack.position.set(110, 10, 119);
          backpack.scale.set(14, 14, 14);
          backpack.rotation.set(0, 0, 0);
          
          backpack.traverse(child => {
            if (child.isMesh) {
              child.visible = true;
              // Interaktion registrieren
              registerInteractive(child, () => {
                // Sound abspielen
                console.log("Medizinischer Rucksack wurde aufgehoben! Spiele 'one_item' Sound ab");
                const itemSound = new Audio('/assets/audio/one_item.mp3');
                itemSound.volume = 0.4;
                itemSound.play().catch(e => console.log("Audio konnte nicht abgespielt werden:", e));
                
                // Objekt aus Szene entfernen
                this.scene.remove(backpack);
              });
            }
          });
          
          this.scene.add(backpack);
        }, undefined, (err) => {
          console.error('FEHLER beim Laden von medical_backpack.glb:', err);
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

  // --- Trigger-Wand für Beben im Korridor ---
    // Position: deutlich weiter links von der Startposition (X-Achse verringern)
    const triggerWallGeometry = new THREE.BoxGeometry(70, 16, 20); // Extra große Wand für bessere Erkennung
    // Komplett unsichtbare Wand (opacity: 0.0)
    const triggerWallMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.0 });
    const triggerWall = new THREE.Mesh(triggerWallGeometry, triggerWallMaterial);
    triggerWall.position.set(start.position.x - -3, start.position.y - 2, start.position.z - 40); // Näher und tiefer positionieren
    triggerWall.name = 'quake_trigger_wall';
    scene.add(triggerWall);
    
    // Nur Kollisionserkennung: Die Wand reagiert NICHT auf Klicks, nur auf Durchlaufen
    console.log("Beben-Trigger-Wand platziert bei:", triggerWall.position);
    
    // Collider-basierte Erkennung - Trigger-Box für die Kollisionserkennung in update()
    this.quakeTriggerBox = new THREE.Box3().setFromObject(triggerWall);
    this.quakeTriggerActive = true;

    
    // Stellen wir sicher, dass diese Box nicht mit dem Clipboard oder Terminal kollidiert
    triggerWall.userData.ignoreRaycast = true; // Zusätzliche Absicherung gegen unerwünschte Raycast-Interaktionen

    // --- Fall-Trigger-Wand hinter dem Rucksack ---
    // Position: hinter dem Rucksack platzieren (medical_backpack ist bei 110, 10, 119)
    const fallTriggerGeometry = new THREE.BoxGeometry(70, 16, 40); // Breite Wand für bessere Erkennung
    // Unsichtbare Wand von Anfang an (opacity: 0.0)
    const fallTriggerMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.0 });
    const fallTriggerWall = new THREE.Mesh(fallTriggerGeometry, fallTriggerMaterial);
    // Platzierung im Flur (weiter rechts verschoben)
    // X-Position nach rechts verschoben (von 140 auf 200)
    fallTriggerWall.position.set(45, 10, 100); 
    fallTriggerWall.name = 'fall_trigger_wall';
    scene.add(fallTriggerWall);
    
    // Nur Kollisionserkennung: Die Wand reagiert NICHT auf Klicks, nur auf Durchlaufen
    console.log("Fall-Trigger-Wand platziert bei:", fallTriggerWall.position);
    
    // Collider-basierte Erkennung - Trigger-Box für die Kollisionserkennung in update()
    this.fallTriggerBox = new THREE.Box3().setFromObject(fallTriggerWall);
    this.fallTriggerActive = true;
    
    // Stellen wir sicher, dass diese Box nicht mit anderen Objekten interagiert
    fallTriggerWall.userData.ignoreRaycast = true; 

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
     
      scene.add(syringe);
    
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

  // Erdbeben-/Shake-Effekt für die Kamera
  shakeCamera(intensity = 0.5, duration = 500) {
    const camera = this.scene.camera;
    if (!camera) return;
    const originalPosition = camera.position.clone();
    let elapsed = 0;
    const shake = () => {
      if (elapsed < duration) {
        camera.position.x = originalPosition.x + (Math.random() - 0.5) * intensity;
        camera.position.y = originalPosition.y + (Math.random() - 0.5) * intensity;
        camera.position.z = originalPosition.z + (Math.random() - 0.5) * intensity;
        elapsed += 16;
        requestAnimationFrame(shake);
      } else {
        camera.position.copy(originalPosition);
      }
    };
    shake();
  }

  // Fall-Animation für die Kamera - echtes "von oben nach unten" Fallen simulieren
  simulateFall(duration = 2000, distance = 30) {
    const camera = this.scene.camera;
    if (!camera) return;
    
    // Originale Position merken (für Wiederherstellung nach dem Fall wenn gewünscht)
    const originalPosition = camera.position.clone();
    // Originale Rotation merken
    const originalRotation = {
      x: camera.rotation.x,
      y: camera.rotation.y,
      z: camera.rotation.z
    };
    
    // WICHTIG: Kamera zuerst nach oben teleportieren, damit wir von dort fallen können
    // Wir positionieren den Spieler hoch über seiner aktuellen Position
    camera.position.y = originalPosition.y + 100; // 100 Einheiten über der aktuellen Position
    
    const startTime = Date.now();
    let isFalling = true;
    
    // Temporär Spielerkontrolle deaktivieren
    const originalVelocity = window.controls ? window.controls.velocity : 0;
    if (window.controls) window.controls.velocity = 0;
    
    // NUR den falling.wav Sound abspielen während des Falls
    const fallSound = new Audio('/assets/audio/falling.wav');
    fallSound.volume = 0.7;
    fallSound.play().catch(e => console.log("Audio konnte nicht abgespielt werden:", e));
    
    // Fallanimation mit exponentieller Beschleunigung
    const fallAnimation = () => {
      if (!isFalling) return;
      
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Quadratische Beschleunigung für realistischeren Fall (mit größerer Distanz)
      // Wir wollen von (originalPosition.y + 100) bis zum Bodenlevel des Hospitals fallen
      // Das Bodenlevel ist deutlich über 0, damit wir nicht zu tief fallen
      const floorLevel = 10; // Hospital-Bodenlevel deutlich höher angesetzt
      const totalFallDistance = (originalPosition.y + 100) - floorLevel; // Distanz bis zum Boden
      const fallDistance = totalFallDistance * Math.pow(progress, 1.8); // Etwas steilere Beschleunigung
      
      // Kamera von oben nach unten bewegen, aber nicht unter den Boden fallen
      const newY = (originalPosition.y + 100) - fallDistance;
      camera.position.y = Math.max(newY, floorLevel); // Nicht unter den Boden fallen
      
      // Stärkerer Dreheffekt für Desorientierung
      const rotationAmount = 0.1 * Math.sin(progress * Math.PI * 4);
      camera.rotation.z = originalRotation.z + rotationAmount;
      
      // Zusätzlich Vor- und Zurückkippen für besseres Fallgefühl
      const pitchAmount = 0.2 * Math.sin(progress * Math.PI * 3);
      camera.rotation.x = originalRotation.x + pitchAmount;
      
      // Nächster Frame oder Animation beenden
      if (progress < 1) {
        requestAnimationFrame(fallAnimation);
      } else {
        // Animation beenden, Spieler ist "aufgeschlagen"
        isFalling = false;
        
        // Leichter Aufprall-Effekt
        this.shakeCamera(2.0, 300);
        
        // Nach kurzer Pause Kontrolle wiederherstellen und auf dem Boden des Hospitals bleiben
        setTimeout(() => {
          // Statt zur Startposition zurückzukehren, bleiben wir am aktuellen Ort auf dem Boden
          // Wir behalten die X/Z Position, aber setzen Y auf das Floor-Level (5)
          if (this.scene.camera) {
            // X und Z Koordinaten beibehalten, nur Y auf höhere Bodenhöhe setzen
            const currentPos = this.scene.camera.position;
            this.scene.camera.position.set(currentPos.x, 10, currentPos.z);
            
            // In Blickrichtung schauen (leicht nach vorne)
            this.scene.camera.lookAt(currentPos.x, 10, currentPos.z - 10);
          }
          
          // Rotation zurücksetzen für normale Ansicht
          camera.rotation.x = originalRotation.x;
          camera.rotation.y = originalRotation.y;
          camera.rotation.z = originalRotation.z;
          
          // Spielerkontrolle wiederherstellen
          if (window.controls) window.controls.velocity = originalVelocity;
          
          // Informationsmeldung in der Konsole
          console.log("Spieler ist auf dem Boden des Hospitals gelandet!");
          
        }, 3000); // Längere Pause nach dem Aufprall für dramatischen Effekt
      }
    };
    
    // Keinen Wind-Sound mehr verwenden, da wir nur falling.wav abspielen
    this.fallWindSound = null;
    
    // Animation starten
    fallAnimation();
  }

  // Update-Funktion wird für jeden Frame aufgerufen
  update() {
    if (typeof super.update === 'function') {
      super.update(); // Basisklassen-Methode aufrufen, falls vorhanden
    }
    
    // Prüfen, ob der Spieler die Trigger-Box für das Beben berührt
    if (this.quakeTriggerActive && this.quakeTriggerBox && this.scene.camera) {
      // Erstelle Box um Spieler-Position (Kamera) - etwas größer für bessere Erkennung
      const playerPosition = this.scene.camera.position.clone();
      const playerBox = new THREE.Box3(
        new THREE.Vector3(playerPosition.x - 2, playerPosition.y - 2, playerPosition.z - 2),
        new THREE.Vector3(playerPosition.x + 2, playerPosition.y + 2, playerPosition.z + 2)
      );
      
      // Debug: Zeige Position der Kamera
      if (Math.random() < 0.005) { // Noch seltener loggen
        console.log("Spieler-Position:", playerPosition);
      }
      
      // Prüfe Kollision zwischen Spieler und Trigger-Box
      if (this.quakeTriggerBox.intersectsBox(playerBox)) {
        console.log("BEBEN AUSGELÖST durch Kollision!");
        this._quakeTriggered = true;
        this.quakeTriggerActive = false;
        
        // Trigger-Wand bleibt jetzt als unsichtbare Barriere
        const triggerWall = this.scene.getObjectByName('quake_trigger_wall');
        if (triggerWall) {
          console.log("Trigger-Wand bleibt als unsichtbare Barriere aktiv");
          // Wand war bereits von Anfang an unsichtbar, daher keine Änderung nötig
        }
        
        // Startposition speichern für "Boomerang"-Effekt
        this.startPosition = START_POSITIONS.FLUR.position;
        
        // Warten wir einen Moment vor dem Beben, damit der Sound zuerst startet
        setTimeout(() => {
          // Sicherstellen, dass Clipboard und Terminal noch funktionieren können
          this.shakeCamera(1.5, 1800); // Etwas stärkeres Beben für besseren Effekt
        }, 200);
      }
    }
    
    // Prüfen, ob der Spieler versucht, durch die (nun unsichtbare) Barriere zu gehen
    if (this._quakeTriggered && this.scene.camera) {
      const playerPosition = this.scene.camera.position.clone();
      const triggerWall = this.scene.getObjectByName('quake_trigger_wall');
      
      if (triggerWall) {
        // Erstelle eine aktualisierte Bounding Box für die Wand
        const wallBox = new THREE.Box3().setFromObject(triggerWall);
        
        // Erweiterte Box um den Spieler
        const playerBox = new THREE.Box3(
          new THREE.Vector3(playerPosition.x - 2, playerPosition.y - 2, playerPosition.z - 2),
          new THREE.Vector3(playerPosition.x + 2, playerPosition.y + 2, playerPosition.z + 2)
        );
        
        // Wenn der Spieler versucht, durch die Wand zu gehen (kollision)
        if (wallBox.intersectsBox(playerBox)) {
          console.log("Spieler versucht, durch die Barriere zu gehen - Boomerang zurück zum Start!");
          
          // Sound für Teleport
          const teleportSound = new Audio('/assets/audio/earth-rumble.wav');
          teleportSound.volume = 0.3;
          teleportSound.play().catch(e => {});
          
          // "Boomerang" Effekt - zurück zum Startpunkt
          const start = START_POSITIONS.FLUR;
          if (this.scene.camera) {
            this.scene.camera.position.set(start.position.x, start.position.y, start.position.z);
            this.scene.camera.lookAt(start.lookAt.x, start.lookAt.y, start.lookAt.z);
          }
          
          // Flag setzen, damit wir den Teleport nicht mehrfach hintereinander auslösen
          this.lastTeleportTime = Date.now();
          
          // Nach 3 Sekunden den "find_the_room" Sound abspielen
          setTimeout(() => {
            console.log("Spiele 'find_the_room' Sound nach Teleport");
            const findRoomSound = new Audio('/assets/audio/find_the_room.mp3');
            findRoomSound.volume = 0.5;
            findRoomSound.play().catch(e => console.log("Audio konnte nicht abgespielt werden:", e));
          }, 3000);
        }
      }
    }
    
    // Prüfen, ob der Spieler die Fall-Trigger-Box berührt
    if (this.fallTriggerActive && this.fallTriggerBox && this.scene.camera && !this._fallTriggered) {
      // Erstelle Box um Spieler-Position (Kamera)
      const playerPosition = this.scene.camera.position.clone();
      const playerBox = new THREE.Box3(
        new THREE.Vector3(playerPosition.x - 2, playerPosition.y - 2, playerPosition.z - 2),
        new THREE.Vector3(playerPosition.x + 2, playerPosition.y + 2, playerPosition.z + 2)
      );
      
      // Debug: Zeige Position der Kamera gelegentlich
      if (Math.random() < 0.005) {
        console.log("Spieler-Position (Fall-Trigger):", playerPosition);
      }
      
      // Prüfe Kollision zwischen Spieler und Fall-Trigger-Box
      if (this.fallTriggerBox.intersectsBox(playerBox)) {
        console.log("FALL AUSGELÖST durch Kollision mit Fall-Trigger!");
        this._fallTriggered = true;
        // Komplett deaktivieren - nie wieder triggern
        this.fallTriggerActive = false;
        
        // Fall-Wand komplett aus der Szene entfernen
        const fallTriggerWall = this.scene.getObjectByName('fall_trigger_wall');
        if (fallTriggerWall) {
          console.log("Fall-Trigger-Wand wird komplett entfernt");
          // Wand aus der Szene entfernen
          this.scene.remove(fallTriggerWall);
        }
        
        // Fall-Animation starten - jetzt mit verbessertem Fallgefühl von oben
        // Längere Dauer (4 Sekunden) und große Falldistanz für dramatischen Effekt
        this.simulateFall(4000, 100);
        
        // Nach einer längeren Pause können wir den _fallTriggered Flag zurücksetzen
        // Aber wir lassen fallTriggerActive auf false, damit der Trigger nicht erneut aktiviert wird
        setTimeout(() => {
          this._fallTriggered = false;
          // this.fallTriggerActive bleibt auf false - nicht wieder aktivieren
        }, 12000); // 12 Sekunden warten
      }
    }
  }
}


