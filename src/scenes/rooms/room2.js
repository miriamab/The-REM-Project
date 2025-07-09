// src/scenes/rooms/room2.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { BaseRoom } from './BaseRoom.js.js';
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
    this.squidModel = null; // Referenz zum Squid-Modell für Animation
    this.squidChaseSound = null; // Instanz des Monster-Sounds
    this.squidFloatingAnimationId = null; // ID für Animation-Frame
    this.squidChasingAnimationId = null; // ID für Verfolgungsanimation
    this.squidLight = null; // Lichteffekt für das Squid während der Verfolgung
    this.isSquidChasing = false; // Flag für aktiven Verfolgungsmodus
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
        // Speichere non-squid Objekte separat
        const gltfObjects = [
          { file: '/hospital_objects/bottles_medical.glb', pos: [120, 0, -150], scale: [0.02,0.02,0.02], rot: [0, 0, 0] },
          { file: '/hospital_objects/hospital_asset.glb', pos: [160, 9.3, -192], scale: [0.01,0.01,0.01], rot: [0, -Math.PI/2, 0] },
          { file: '/hospital_objects/wheelchair.glb', pos: [168, -6.5, -130], scale: [0.60,0.60,0.60], rot: [0, Math.PI, 0] }
        ];
        
        // Lade alle normalen Objekte
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
        
        // Lade squid.glb separat, um eine Referenz darauf zu speichern
        const squidLoader = new GLTFLoader();
        squidLoader.load('/hospital_objects/squid.glb', (gltf) => {
          const squidModel = gltf.scene;
          squidModel.position.set(90, 10, -135);
          squidModel.scale.set(19, 19, 19);
          squidModel.rotation.set(0, 0, 0);
          squidModel.name = 'squid_model'; // Name für einfaches Auffinden
          squidModel.traverse(child => { 
            if (child.isMesh) {
              child.visible = true;
              // Optional: Material für bessere Sichtbarkeit anpassen
              if (child.material) {
                child.material.roughness = 0.7;
                child.material.metalness = 0.3;
              }
            } 
          });
          // Squid zum Scene hinzufügen und Referenz im Room2-Objekt speichern
          this.scene.add(squidModel);
          this.squidModel = squidModel;
          // Interaktion: Monster kann nach Teleportation verfolgt werden und durch Klick "besiegt" werden
          this.squidHitCount = 0;
          this.maxSquidHits = 3;
          // Cell-Modell laden
          const cellLoader = new GLTFLoader();
          cellLoader.load('/hospital_objects/cell.glb', (cellGltf) => {
            this.cellModel = cellGltf.scene;
            // Nach Teleportation: Squid verfolgt Spieler wie zuvor
            this.enableSquidChaseAfterTeleport = () => {
              this.startSquidChasing();
            };
            // Interaktion: Auf das Monster klicken, um 3x cell.glb zu werfen
          // Monster-Interaktion: Nach Besiegen komplett aus Szene und Blocker entfernen
          this.squidModel.traverse(child => {
            if (child.isMesh) {
              registerInteractive(child, () => {
                if (this.squidHitCount >= this.maxSquidHits) return;
                // 3x cell.glb werfen (Animation)
                const throwCell = (count) => {
                  if (count === 0) {
                    // Monster komplett entfernen (auch Blocker, Collider, Licht, Animationen)
                    if (this.squidChasingAnimationId) {
                      cancelAnimationFrame(this.squidChasingAnimationId);
                      this.squidChasingAnimationId = null;
                    }
                    if (this.squidFloatingAnimationId) {
                      cancelAnimationFrame(this.squidFloatingAnimationId);
                      this.squidFloatingAnimationId = null;
                    }
                    if (this.squidLight && this.scene) {
                      this.scene.remove(this.squidLight);
                      this.squidLight = null;
                    }
                    if (this.squidModel && this.scene) {
                      this.scene.remove(this.squidModel);
                      this.squidModel = null;
                    }
                    // Monster-Sound stoppen
                    if (this.squidChaseSound) {
                      this.squidChaseSound.pause();
                      this.squidChaseSound.currentTime = 0;
                      this.squidChaseSound = null;
                    }
                    this.isSquidChasing = false;
                    return;
                  }
                  const cell = this.cellModel.clone();
                  const camera = this.scene.camera;
                  if (!camera) return;
                  const dir = new THREE.Vector3();
                  camera.getWorldDirection(dir);
                  cell.position.copy(camera.position).add(dir.clone().multiplyScalar(2));
                  cell.scale.set(2, 2, 2);
                  this.scene.add(cell);
                  // Flugrichtung
                  const velocity = dir.clone().multiplyScalar(1.5);
                  let frame;
                  const animate = () => {
                    cell.position.add(velocity);
                    // Kollision mit Squid prüfen
                    if (this.squidModel) {
                      const squidBox = new THREE.Box3().setFromObject(this.squidModel);
                      const cellBox = new THREE.Box3().setFromObject(cell);
                      if (squidBox.intersectsBox(cellBox)) {
                        this.squidHitCount++;
                        this.scene.remove(cell);
                        if (this.squidHitCount >= this.maxSquidHits) {
                          // Monster komplett entfernen (auch Blocker, Collider, Licht, Animationen)
                          if (this.squidChasingAnimationId) {
                            cancelAnimationFrame(this.squidChasingAnimationId);
                            this.squidChasingAnimationId = null;
                          }
                          if (this.squidFloatingAnimationId) {
                            cancelAnimationFrame(this.squidFloatingAnimationId);
                            this.squidFloatingAnimationId = null;
                          }
                          if (this.squidLight && this.scene) {
                            this.scene.remove(this.squidLight);
                            this.squidLight = null;
                          }
                          if (this.squidModel && this.scene) {
                            this.scene.remove(this.squidModel);
                            this.squidModel = null;
                          }
                          // Monster-Sound stoppen
                          if (this.squidChaseSound) {
                            this.squidChaseSound.pause();
                            this.squidChaseSound.currentTime = 0;
                            this.squidChaseSound = null;
                          }
                          this.isSquidChasing = false;
                          return;
                        }
                        setTimeout(() => throwCell(count - 1), 300);
                        return;
                      }
                    }
                    if (cell.position.distanceTo(camera.position) > 60) {
                      this.scene.remove(cell);
                      setTimeout(() => throwCell(count - 1), 300);
                      return;
                    }
                    frame = requestAnimationFrame(animate);
                  };
                  animate();
                };
                throwCell(3);
              });
            }
          });
          });
          console.log("Squid-Modell geladen und gespeichert für Animation");
        }, undefined, (err) => {
          console.error('FEHLER beim Laden von squid.glb:', err);
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

    // Blood Door in der Nähe des Backpacks einfügen (prison_door.glb)
    const bloodDoorLoader = new GLTFLoader();
    bloodDoorLoader.load('/prison_door.glb', (gltf) => {
      const bloodDoor = gltf.scene;
      bloodDoor.name = 'prison_door';
      // Position nahe des Rucksacks (backpack ist bei 110, 10, 119)
      bloodDoor.position.set(33, 0, 89); // Tiefer positioniert, damit der Boden nicht sichtbar ist
      // Größe und Rotation anpassen
      bloodDoor.scale.set(10, 10, 10); // Skalierung je nach Modellgröße anpassen
      bloodDoor.rotation.set(0, 0, 0); // Keine Rotation, Tür ist seitlich zu sehen
      
      // Zielposition für die Teleportation (vor dem Squid-Modell)
      const teleportDestination = {
        position: new THREE.Vector3(70, 10, -100), // Position vor dem Squid (original squid: 90, 10, -135)
        lookAt: new THREE.Vector3(90, 10, -135)   // Blick in Richtung des Squids
      };

      // Tür sichtbar machen, aber Boden ausblenden und Interaktion hinzufügen
      bloodDoor.traverse(obj => {
        if (obj.isMesh) {
          obj.visible = true;
          obj.castShadow = true;
          obj.receiveShadow = true;
          // Wenn es sich um den Boden der Tür handelt, Textur transparent machen
          if (obj.name.includes('floor') || obj.name.includes('boden') || 
              (obj.position.y < -0.5 && obj.position.y > -2)) {
            obj.visible = false;
          }
          // Teleport-Interaktion mit der Tür (Klick)
          registerInteractive(obj, () => {
            this.teleportPlayerThroughPrisonDoor();
          });
        }
      });

      // --- KOLLISIONS-TELEPORT: Spieler geht durch die Tür ---
      // Collider für die Tür erstellen (unsichtbar, aber groß genug)
      const doorBox = new THREE.Box3().setFromObject(bloodDoor);
      this.prisonDoorBox = doorBox;
      this.prisonDoorTeleportActive = true;

      // Teleportierfunktion extrahieren und an this binden
      const teleportPlayerThroughPrisonDoor = () => {
        console.log('Teleportiere zur Squid-Position...');
        const originalVelocity = window.controls ? window.controls.velocity : 0;
        if (window.controls) window.controls.velocity = 0;
        const originalFog = scene.fog ? scene.fog.clone() : new THREE.Fog(0x000000, 20, 150);
        scene.fog = new THREE.Fog(0x000000, 0.1, 0.2);
        setTimeout(() => {
          if (scene.camera) {
            scene.camera.position.copy(teleportDestination.position);
            scene.camera.lookAt(teleportDestination.lookAt);
            setTimeout(() => {
              scene.fog = originalFog;
              if (window.controls) window.controls.velocity = originalVelocity;
              if (typeof this.enableSquidChaseAfterTeleport === 'function') {
                this.enableSquidChaseAfterTeleport();
              }
            }, 500);
          }
        }, 200);
      };
      // WICHTIG: Funktion an this binden, damit update() sie aufrufen kann
      this.teleportPlayerThroughPrisonDoor = teleportPlayerThroughPrisonDoor;
      
      // Rotes Licht an der Tür für dramatischen Effekt
      const doorLight = new THREE.PointLight(0xff0000, 2, 20);
      doorLight.position.set(bloodDoor.position.x, bloodDoor.position.y + 10, bloodDoor.position.z);
      scene.add(doorLight);
      
      scene.add(bloodDoor);
      console.log("Blood Door platziert bei:", bloodDoor.position);
    }, undefined, (err) => {
      console.error("FEHLER beim Laden von prison_door.glb:", err);
    });

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
    fallSound.volume = 0.4;
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
        
    // Nach kurzer Pause Nebel aktivieren und Bewegung für die Nebeldauer blockieren
    setTimeout(() => {
      // Statt zur Startposition zurückzukehren, bleiben wir am aktuellen Ort auf dem Boden
      // Wir behalten die X/Z Position, aber setzen Y auf höhere Bodenhöhe
      if (this.scene.camera) {
        const currentPos = this.scene.camera.position;
        this.scene.camera.position.set(currentPos.x, 10, currentPos.z);
        this.scene.camera.lookAt(currentPos.x, 10, currentPos.z - 10);
        // Rotation zurücksetzen für normale Ansicht
        camera.rotation.x = originalRotation.x;
        camera.rotation.y = originalRotation.y;
        camera.rotation.z = originalRotation.z;
        // >>>>>>>> HIER wird der Rauch-Nebel nach dem Fall erzeugt und Bewegung blockiert <<<<<<<<
        // Nebeldauer und Blockdauer synchronisieren (z.B. 5 Sekunden)
        const fogDuration = 5000;
        this.createRoomFog(currentPos, 2.2, fogDuration); // Nebel und Blockzeit identisch
        // Während createRoomFog aktiv ist, wird Bewegung blockiert und nach Ende wiederhergestellt
        // <<<<<<<< ENDE Rauch-Nebel nach dem Fallen <<<<<<<<
      }
      // Informationsmeldung in der Konsole
      console.log("Spieler ist auf dem Boden des Hospitals gelandet!");
    }, 300); // Kürzere Pause nach dem Aufprall, dann sofort Nebel
      }
    };
    
    // Keinen Wind-Sound mehr verwenden, da wir nur falling.wav abspielen
    this.fallWindSound = null;
    
    // Animation starten
    fallAnimation();
  }

  // Blauen/türkisen Nebel um den Spieler herum erzeugen
  createBlueFog(position, intensity = 5, duration = 15000) {
    const scene = this.scene;
    if (!scene) return;
    
    // Erstelle ein Partikelsystem für den Nebel
    const particleCount = 1000;
    const particles = new THREE.BufferGeometry();
    
    // Arrays für Partikel-Positionen und Farben
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Nebel um die angegebene Position herum erzeugen (typischerweise Spielerposition)
    const radius = 30; // Radius des Nebels
    
    // Für jeden Partikel
    for (let i = 0; i < particleCount; i++) {
      // Zufällige Position im Bereich um den Spieler
      const x = position.x + (Math.random() * 2 - 1) * radius;
      const y = position.y + (Math.random() * 2 - 1) * 10; // Flacher in der Höhe
      const z = position.z + (Math.random() * 2 - 1) * radius;
      
      // Position setzen
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      // Blau-türkise Farbe mit leichter Variation
      colors[i * 3] = 0.1 + Math.random() * 0.1; // Rot-Anteil (niedrig)
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.3; // Grün-Anteil (mittel)
      colors[i * 3 + 2] = 0.8 + Math.random() * 0.2; // Blau-Anteil (hoch)
    }
    
    // Füge Attribute zur Geometrie hinzu
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Material für die Partikel
    const particleMaterial = new THREE.PointsMaterial({
      size: 2,
      transparent: true,
      opacity: 0.5,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    // Erstelle das Partikelsystem
    const particleSystem = new THREE.Points(particles, particleMaterial);
    particleSystem.name = 'blueFog';
    scene.add(particleSystem);
    
    // Animation des Nebels - er wird langsam erscheinen und dann verschwinden
    const startTime = Date.now();
    const animateFog = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1.0) {
        // Nebel bewegt sich leicht und pulsiert
        for (let i = 0; i < particleCount; i++) {
          positions[i * 3] += Math.sin(elapsed * 0.001 + i) * 0.03;
          positions[i * 3 + 2] += Math.cos(elapsed * 0.001 + i) * 0.03;
          positions[i * 3 + 1] += Math.sin(elapsed * 0.002 + i) * 0.01; // Leicht auf und ab
        }
        particles.attributes.position.needsUpdate = true;
        
        // Opazität über Zeit anpassen
        if (progress < 0.2) {
          // Einblenden
          particleMaterial.opacity = progress * 2.5 * intensity;
        } else if (progress > 0.7) {
          // Ausblenden
          particleMaterial.opacity = (1.0 - progress) * 3.3 * intensity;
        } else {
          // Volle Intensität
          particleMaterial.opacity = intensity;
        }
        
        requestAnimationFrame(animateFog);
      } else {
        // Nebel entfernen, wenn die Animation fertig ist
        scene.remove(particleSystem);
      }
    };
    
    // Animation starten
    animateFog();
    
    return particleSystem;
  }

  // Türkisen Nebel im gesamten Raum erzeugen (größere Reichweite als der normale Nebel)
  createRoomFog(position, intensity = 5, duration = 10000) {
    const scene = this.scene;
    if (!scene || !scene.camera) return;
    // Sound für den Nebel (optional)
    const fogSound = new Audio('/assets/audio/things_unremembered.mp3');
    fogSound.volume = 0.4;
    fogSound.play().catch(e => {});

    // Mehrere überlappende Planes für dichteren, überschneidenden Nebel
    const fogPlanes = [];
    const numPlanes = 4; // Anzahl der überlappenden Planes
    // Farben für animierten Übergang von Blau zu Rot
    const colorStart = new THREE.Color(0x00fff7); // Türkis/Blau
    const colorEnd = new THREE.Color(0xff0033); // Rot
    for (let i = 0; i < numPlanes; i++) {
      const geometry = new THREE.PlaneGeometry(100 + i * 10, 60 + i * 8);
      const material = new THREE.MeshBasicMaterial({
        color: colorStart.clone(),
        transparent: true,
        opacity: 0.22 + 0.13 * Math.random(), // leicht variierende Opazität
        depthWrite: false
      });
      const fogPlane = new THREE.Mesh(geometry, material);
      fogPlane.name = 'neonFogOverlay_' + i;
      fogPlanes.push(fogPlane);
      scene.add(fogPlane);
    }

    // Planes vor der Kamera positionieren, leicht versetzt und rotiert
    const updatePlanes = () => {
      if (!scene.camera) return;
      for (let i = 0; i < fogPlanes.length; i++) {
        const fogPlane = fogPlanes[i];
        fogPlane.position.copy(scene.camera.position);
        const dir = new THREE.Vector3();
        scene.camera.getWorldDirection(dir);
        fogPlane.position.add(dir.multiplyScalar(10 + i * 1.5));
        fogPlane.quaternion.copy(scene.camera.quaternion);
        // Leichte zufällige Rotation für Überschneidung
        fogPlane.rotateZ((Math.PI / 12) * (i - 1.5) + Math.random() * 0.1);
        fogPlane.rotateX(Math.random() * 0.08 - 0.04);
      }
    };
    updatePlanes();

    // Spielerbewegung und Kamera ab Start des Nebels blockieren und nach Ende wieder freigeben
    let originalVelocity = null;
    let velocityLocked = false;
    let pointerLockWasActive = false;
    let pointerLockElement = null;
    let pointerLockChangeHandler = null;
    let keydownHandler = null;
    let keyupHandler = null;
    let blockedKeys = new Set(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ']);
    // Blockiert alle WASD/Arrow/Space Eingaben
    keydownHandler = function(e) {
      if (blockedKeys.has(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    keyupHandler = function(e) {
      if (blockedKeys.has(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    // PointerLock blockieren
    pointerLockElement = document.body;
    pointerLockChangeHandler = function() {
      if (document.pointerLockElement === pointerLockElement) {
        // Sofort wieder verlassen, falls während Nebel aktiviert
        document.exitPointerLock();
      }
    };
    const lockMovement = () => {
      if (window.controls && typeof window.controls.velocity !== 'undefined' && !velocityLocked) {
        originalVelocity = window.controls.velocity;
        window.controls.velocity = 0;
        velocityLocked = true;
      }
      // Blockiere Tastatureingaben
      window.addEventListener('keydown', keydownHandler, true);
      window.addEventListener('keyup', keyupHandler, true);
      // Blockiere PointerLock
      document.addEventListener('pointerlockchange', pointerLockChangeHandler, true);
      // Falls bereits PointerLock aktiv ist, verlassen
      if (document.pointerLockElement === pointerLockElement) {
        pointerLockWasActive = true;
        document.exitPointerLock();
      } else {
        pointerLockWasActive = false;
      }
    };
    const unlockMovement = () => {
      // Bewegung wieder freigeben, unabhängig von vorherigem Wert
      if (window.controls && typeof window.controls.velocity !== 'undefined') {
        window.controls.velocity = 50; // Standardgeschwindigkeit für Raum 2
        velocityLocked = false;
      }
      // Tastatureingaben wieder zulassen
      window.removeEventListener('keydown', keydownHandler, true);
      window.removeEventListener('keyup', keyupHandler, true);
      // PointerLock wieder erlauben
      document.removeEventListener('pointerlockchange', pointerLockChangeHandler, true);
      // Falls vor Nebel aktiv, PointerLock wieder aktivieren
      if (pointerLockWasActive && pointerLockElement && pointerLockElement.requestPointerLock) {
        setTimeout(() => {
          pointerLockElement.requestPointerLock();
        }, 100); // Leichte Verzögerung, damit Nebel erst entfernt wird
      }
    };
    // Sofort blockieren
    lockMovement();

    // Farb-Animation: Nebel mischt sich von Blau/Türkis zu Rot
    let running = true;
    const fogStart = Date.now();
    const fogDuration = duration; // Nebeldauer wie übergeben
    function animateOverlay() {
      if (!running) return;
      updatePlanes();
      // Farbverlauf berechnen
      const elapsed = Date.now() - fogStart;
      const t = Math.min(elapsed / fogDuration, 1);
      for (let i = 0; i < fogPlanes.length; i++) {
        const mat = fogPlanes[i].material;
        mat.color.copy(colorStart.clone().lerp(colorEnd, t));
        mat.needsUpdate = true;
      }
      requestAnimationFrame(animateOverlay);
    }
    animateOverlay();

    // Nach Ablauf des Nebels alles entfernen und Bewegung wiederherstellen
    setTimeout(() => {
      running = false;
      fogPlanes.forEach(fogPlane => scene.remove(fogPlane));
      fogSound.pause();
      fogSound.currentTime = 0;
      unlockMovement(); // Bewegung und PointerLock wieder freigeben
    }, duration);
  }

  // Fügt eine kontinuierliche Schwebebewegung zum Squid hinzu
  addSquidFloatingAnimation() {
    if (!this.squidModel) return;
    
    const finalPosition = this.squidModel.position.clone();
    
    const floatAnimation = () => {
      if (this.squidModel) {
        const time = Date.now() * 0.001; // Zeit in Sekunden für sanftere Bewegung
        
        // Sanfte Schwebebewegung
        this.squidModel.position.y = finalPosition.y + Math.sin(time * 0.5) * 2;
        this.squidModel.position.x = finalPosition.x + Math.sin(time * 0.3) * 1;
        
        // Sanfte Rotation
        this.squidModel.rotation.z = Math.sin(time * 0.2) * 0.05;
        this.squidModel.rotation.y = Math.sin(time * 0.1) * 0.1;
        
        // Animation fortsetzen
        this.squidFloatingAnimationId = requestAnimationFrame(floatAnimation);
      }
    };
    
    // Animation starten
    floatAnimation();
  }

  // Startet einen kontinuierlichen Verfolgungsmodus des Squids
  startSquidChasing() {
    if (!this.squidModel || !this.scene.camera) {
      console.error('Squid-Modell oder Kamera nicht gefunden für Verfolgung!');
      return;
    }
    
    // Sound für die Verfolgung des Squids abspielen
    // Vorherigen Sound stoppen, falls noch einer läuft
    if (this.squidChaseSound) {
      this.squidChaseSound.pause();
      this.squidChaseSound.currentTime = 0;
    }
    this.squidChaseSound = new Audio('/assets/audio/monster-groan.mp3');
    this.squidChaseSound.volume = 0.5;
    this.squidChaseSound.loop = true;
    this.squidChaseSound.play().catch(e => console.log("Audio konnte nicht abgespielt werden:", e));
    
    // Verfolgungs-Parameter
    const speed = 0.04; // Geschwindigkeit der Verfolgung
    const minDistance = 20; // Minimale Distanz zum Spieler
    const wobbleStrength = 2; // Stärke der Wackelbewegung
    
    // Flag für aktive Verfolgung setzen
    this.isSquidChasing = true;
    
    // Sicherstellen, dass alte Animation gestoppt wird
    if (this.squidFloatingAnimationId) {
      cancelAnimationFrame(this.squidFloatingAnimationId);
    }
    
    // Chaotische Farbe für den Squid
    if (this.squidModel) {
      this.squidModel.traverse(child => {
        if (child.isMesh && child.material) {
          // Material speichern für spätere Wiederherstellung
          if (!child.userData.originalMaterial) {
            child.userData.originalMaterial = child.material.clone();
          }
          
          // Unheimliches türkises Material
          child.material.emissive = new THREE.Color(0.1, 0.5, 0.6);
          child.material.emissiveIntensity = 0.2;
        }
      });
    }
    
    // Startzeit für Animation
    const startTime = Date.now();
    
    // Verfolgungslogik
    const chasePlayer = () => {
      if (!this.isSquidChasing || !this.squidModel || !this.scene.camera) {
        // Animation beenden, wenn sie gestoppt wurde
        if (this.squidChaseSound) {
          this.squidChaseSound.pause();
          this.squidChaseSound.currentTime = 0;
          this.squidChaseSound = null;
        }
        return;
      }
      
      // Aktuelle Position des Spielers und des Squids
      const playerPosition = this.scene.camera.position.clone();
      const squidPosition = this.squidModel.position.clone();
      
      // Richtungsvektor zum Spieler
      const direction = new THREE.Vector3().subVectors(playerPosition, squidPosition).normalize();
      
      // Distanz zum Spieler berechnen
      const distanceToPlayer = squidPosition.distanceTo(playerPosition);
      
      // Animationszeit für Wackelbewegung
      const elapsed = Date.now() - startTime;
      
      // Bewegungslogik
      if (distanceToPlayer > minDistance) {
        // Nur bewegen, wenn Mindestabstand noch nicht erreicht
        
        // Bewegung in Richtung Spieler
        const moveAmount = speed * (1 + Math.sin(elapsed * 0.001) * 0.3); // Variable Geschwindigkeit
        this.squidModel.position.add(direction.multiplyScalar(moveAmount));
        
        // Wackelbewegung für unheimlicheren Effekt
        const wobbleX = Math.sin(elapsed * 0.005) * wobbleStrength; 
        const wobbleY = Math.sin(elapsed * 0.003) * wobbleStrength + Math.sin(elapsed * 0.007) * (wobbleStrength / 2);
        
        this.squidModel.position.x += wobbleX * 0.05;
        this.squidModel.position.y += wobbleY * 0.05;
        
        // Drehung in Richtung Spieler mit leichtem Wackeln
        this.squidModel.lookAt(playerPosition);
        
        // Zusätzliches Wackeln in der Rotation
        this.squidModel.rotation.z += Math.sin(elapsed * 0.002) * 0.05;
        this.squidModel.rotation.x += Math.sin(elapsed * 0.004) * 0.03;
        
        // Soundeffekt-Lautstärke basierend auf Entfernung
        const volume = Math.max(0.1, Math.min(0.8, 1 - (distanceToPlayer / 100)));
        if (this.squidChaseSound) this.squidChaseSound.volume = volume;
      } else {
        // Wenn Mindestabstand erreicht, leichte Schwebeanimation
        this.squidModel.position.y += Math.sin(elapsed * 0.003) * 0.1;
        
        // Drehung aufrecht halten, aber Spieler anschauen
        this.squidModel.lookAt(playerPosition);
        this.squidModel.rotation.z = Math.sin(elapsed * 0.001) * 0.1;
      }
      
      // Lichteffekt am Squid
      if (!this.squidLight) {
        // Erstelle Licht, wenn noch keines existiert
        this.squidLight = new THREE.PointLight(0x00ffff, 1, 30);
        this.scene.add(this.squidLight);
      }
      
      // Lichtposition aktualisieren
      if (this.squidLight) {
        this.squidLight.position.copy(this.squidModel.position);
        this.squidLight.position.y += 5;
        
        // Lichtintensität pulsieren lassen
        this.squidLight.intensity = 0.7 + Math.sin(elapsed * 0.002) * 0.3;
      }
      
      // Partikeleffekt - gelegentlich türkise "Tropfen" vom Squid
      if (Math.random() < 0.05) {
        this.createSquidDroplet(this.squidModel.position.clone());
      }
      
      // Animation fortsetzen
      this.squidChasingAnimationId = requestAnimationFrame(chasePlayer);
    };
    
    // Animation starten
    chasePlayer();
  }
  
  // Erzeugt einen türkisen "Tropfen" als Partikeleffekt vom Squid
  createSquidDroplet(position) {
    if (!this.scene) return;
    
    // Geometrie für den Tropfen
    const geometry = new THREE.SphereGeometry(0.5, 8, 8);
    
    // Türkises, leuchtendes Material
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.7
    });
    
    // Erstelle den Tropfen
    const droplet = new THREE.Mesh(geometry, material);
    droplet.position.copy(position);
    
    // Leichter Offset
    droplet.position.x += (Math.random() - 0.5) * 3;
    droplet.position.y += (Math.random() - 0.5) * 3 - 2; // Tendenz nach unten
    droplet.position.z += (Math.random() - 0.5) * 3;
    
    this.scene.add(droplet);
    
    // Fallgeschwindigkeit
    const fallSpeed = 0.05 + Math.random() * 0.1;
    
    // Lebensdauer
    const lifetime = 1000 + Math.random() * 2000;
    const startTime = Date.now();
    
    // Animation für den Tropfen
    const animateDroplet = () => {
      const elapsed = Date.now() - startTime;
      
      if (elapsed < lifetime && droplet) {
        // Fallendes Verhalten
        droplet.position.y -= fallSpeed;
        
        // Größe verringern
        const scale = 1 - elapsed / lifetime;
        droplet.scale.set(scale, scale, scale);
        
        // Transparenz erhöhen wenn der Tropfen verschwindet
        material.opacity = 0.7 * (1 - elapsed / lifetime);
        
        requestAnimationFrame(animateDroplet);
      } else if (droplet) {
        // Tropfen entfernen, wenn Lebensdauer vorbei
        this.scene.remove(droplet);
      }
    };
    
    // Animation starten
    animateDroplet();
  }

  // Update-Funktion wird für jeden Frame aufgerufen
  update() {
    // --- Spieler geht durch prison_door.glb: Teleport bei Kollision ---
    if (this.prisonDoorTeleportActive && this.prisonDoorBox && this.scene.camera) {
      const playerPosition = this.scene.camera.position.clone();
      const playerBox = new THREE.Box3(
        new THREE.Vector3(playerPosition.x - 2, playerPosition.y - 2, playerPosition.z - 2),
        new THREE.Vector3(playerPosition.x + 2, playerPosition.y + 2, playerPosition.z + 2)
      );
      if (this.prisonDoorBox.intersectsBox(playerBox)) {
        this.prisonDoorTeleportActive = false; // Nur einmal teleportieren
        if (typeof this.teleportPlayerThroughPrisonDoor === 'function') {
          this.teleportPlayerThroughPrisonDoor();
        }
      }
    }
    if (typeof super.update === 'function') {
      super.update(); // Basisklassen-Methode aufrufen, falls vorhanden
    }
    
    // Squid-Spieler-Kollisionserkennung im Verfolgungsmodus
    if (this.isSquidChasing && this.squidModel && this.scene.camera) {
      const playerPosition = this.scene.camera.position.clone();
      const squidPosition = this.squidModel.position.clone();
      
      // Distanz zwischen Spieler und Squid
      const distanceToSquid = playerPosition.distanceTo(squidPosition);
      
      // Wenn Squid sehr nahe am Spieler ist (fast Kollision), Kamera-Shake-Effekt
      if (distanceToSquid < 10) {
        // Stärke des Shake-Effekts basierend auf der Nähe
        const intensity = (10 - distanceToSquid) / 5;
        
        // Nur ab und zu schütteln (nicht jeden Frame)
        if (Math.random() < 0.1) {
          this.shakeCamera(intensity * 0.5, 200);
          
          // "Flüstern" Sound gelegentlich abspielen für extra Grusel-Effekt
          if (Math.random() < 0.2) {
            const whisperSound = new Audio('/assets/audio/memories_lie.mp3');
            whisperSound.volume = 0.3;
            whisperSound.play().catch(e => console.log("Audio konnte nicht abgespielt werden:", e));
          }
        }
        
        // Rote Bildschirmränder bei sehr naher Kollision
        if (distanceToSquid < 5) {
          // Hier würde man normalerweise einen roten Vignette-Effekt hinzufügen
          // Da dies aber einen HTML/CSS-Overlay benötigen würde, lassen wir es bei dem Kamera-Shake
          
          // Stattdessen verstärken wir den Herzschlag-Sound
          if (Math.random() < 0.1 && !this.heartbeatPlaying) {
            this.heartbeatPlaying = true;
            const heartbeatSound = new Audio('/assets/audio/memories_lie.mp3'); // Alternativ zum Herzschlag
            heartbeatSound.volume = 0.5;
            heartbeatSound.play().catch(e => {
              console.log("Audio konnte nicht abgespielt werden:", e);
            }).finally(() => {
              setTimeout(() => {
                this.heartbeatPlaying = false;
              }, 3000);
            });
          }
        }
      }
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

  // Bereinigt Ressourcen beim Verlassen der Szene
  dispose() {
    // Animationen stoppen
    if (this.squidFloatingAnimationId) {
      cancelAnimationFrame(this.squidFloatingAnimationId);
      this.squidFloatingAnimationId = null;
    }
    
    if (this.squidChasingAnimationId) {
      cancelAnimationFrame(this.squidChasingAnimationId);
      this.squidChasingAnimationId = null;
    }
    
    // Lichter entfernen
    if (this.squidLight && this.scene) {
      this.scene.remove(this.squidLight);
      this.squidLight = null;
    }
    
    // Flag für Verfolgung zurücksetzen
    this.isSquidChasing = false;
    
    // Materialien des Squids wiederherstellen
    if (this.squidModel) {
      this.squidModel.traverse(child => {
        if (child.isMesh && child.material && child.userData.originalMaterial) {
          child.material = child.userData.originalMaterial;
        }
      });
    }
    
    // Basisklassen-Methode aufrufen, falls vorhanden
    if (typeof super.dispose === 'function') {
      super.dispose();
    }
  }

}
