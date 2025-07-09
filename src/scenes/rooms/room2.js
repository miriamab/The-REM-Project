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
    this.quakeTriggerActive = true; // Aktiviert Beben-Trigger von Anfang an
    this._fallTriggered = false; // Flag für Fall-Trigger
    this.fallTriggerActive = true; // Wird in init aktiviert
    this.lastTeleportTime = 0; // Zeit des letzten Teleports für Cooldown
    this.squidModel = null; // Referenz zum Squid-Modell für Animation
    this.squidFloatingAnimationId = null; // ID für Animation-Frame
    this.squidChasingAnimationId = null; // ID für Verfolgungsanimation
    this.squidLight = null; // Lichteffekt für das Squid während der Verfolgung
    this.isSquidChasing = false; // Flag für aktiven Verfolgungsmodus
    
    // Neue Properties für Cell-Wurf-Mechanik
    this.cellsThrown = []; // Array für geworfene Zellen
    this.hitCount = 0; // Zähler für Treffer am Monster
    this.maxHits = 3; // Anzahl der Treffer zum Besiegen des Monsters
    this.canThrowCell = true; // Flag für Cooldown zwischen Würfen
    this.cellThrowCooldown = 1500; // Cooldown in ms
    this.cellModel = null; // Referenz zum Cell-Modell
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
    
    // Boomerang-Wand wird weiter unten im Code erstellt
    
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
          
          // Interaktion mit dem Squid für Cell-Wurf hinzufügen
          squidModel.traverse(child => {
            if (child.isMesh) {
              registerInteractive(child, () => {
                if (this.squidModel && this.isSquidChasing && this.hitCount < this.maxHits) {
                  console.log('Spieler hat das Monster angeklickt! Zeige Cell und feuere drei Zellen ab.');
                  this.showCellBeforeFiring();
                }
              });
            }
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
    
    // Erstelle die Boomerang-Wand rechts vom Startpunkt
    const boomerangWallGeometry = new THREE.BoxGeometry(10, 30, 80);
    const boomerangWallMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, 
      transparent: true, 
      opacity: 0.1 // Fast unsichtbar, aber mit leichtem roten Schimmer für Entwicklung
    });
    const boomerangWall = new THREE.Mesh(boomerangWallGeometry, boomerangWallMaterial);
    
    // Position rechts vom Startpunkt
    boomerangWall.position.set(start.position.x + 40, start.position.y, start.position.z);
    boomerangWall.name = 'boomerang_wall';
    scene.add(boomerangWall);
    
    console.log("Boomerang-Wand platziert bei:", boomerangWall.position);
    
    // Collider-basierte Erkennung für Update-Methode
    this.boomerangWallBox = new THREE.Box3().setFromObject(boomerangWall);
    
    // Wand ignoriert Raycast-Interaktionen
    boomerangWall.userData.ignoreRaycast = true;

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
            // Boden unsichtbar machen
            obj.visible = false;
          }
          
          // Teleport-Interaktion mit der Tür
          registerInteractive(obj, () => {
            console.log('Teleportiere zur Squid-Position...');
            
            // Teleport-Sound abspielen (Electric Chimes)
            const teleportSound = new Audio('/assets/audio/teleport.wav');
            teleportSound.volume = 0.7;
            teleportSound.play().catch(e => console.log("Audio konnte nicht abgespielt werden:", e));
            
            // Temporär Spielerkontrolle deaktivieren während der Teleportation
            const originalVelocity = window.controls ? window.controls.velocity : 0;
            if (window.controls) window.controls.velocity = 0;
            
            // Visueller Effekt für die Teleportation - sofort dunkler Nebel
            const originalFog = scene.fog ? scene.fog.clone() : new THREE.Fog(0x000000, 20, 150);
            scene.fog = new THREE.Fog(0x000000, 0.1, 0.2);
            
            // Teleportation mit leichter Verzögerung für besseren Sound-Effekt
            setTimeout(() => {
              // Kamera teleportieren
              if (scene.camera) {
                // Position und Blickrichtung ändern
                scene.camera.position.copy(teleportDestination.position);
                scene.camera.lookAt(teleportDestination.lookAt);
                
                // Nach kurzer Zeit wieder zum normalen Nebel zurücksetzen und Controls wiederherstellen
                setTimeout(() => {
                  scene.fog = originalFog;
                  
                  // Spielerkontrolle wiederherstellen
                  if (window.controls) window.controls.velocity = originalVelocity;
                  
                  // Geisterhafte Stimme abspielen nach der Teleportation
                  setTimeout(() => {
                    const ghostlyVoice = new Audio('/assets/audio/after_teleport.mp3');
                    ghostlyVoice.volume = 0.5;
                    ghostlyVoice.play().catch(e => console.log("Audio konnte nicht abgespielt werden:", e));
                    
                    // Erst türkisenen Nebel im ganzen Raum erzeugen, dann das Squid-Modell verfolgen lassen
                    setTimeout(() => {
                      console.log("Erzeuge türkisen Nebel vor der Squid-Animation...");
                      
                      // Türkiser Nebel im gesamten Raum
                      const fogPosition = new THREE.Vector3(70, 10, -120); // Zentrum des Nebels in der Mitte des Raums
                      const roomFog = this.createRoomFog(fogPosition, 5, 5000); // Intensiver Nebel, aber kurze Dauer
                      
                      // Nach dem Nebel das Squid-Modell verfolgen lassen
                      setTimeout(() => {
                        console.log("Starte Squid-Animation mit Verfolgungsmodus...");
                        // Squid-Animation mit Verfolgen des Spielers
                        this.startSquidChasing();
                      }, 3000); // 3 Sekunden nach dem Nebelstart
                    }, 1500);
                  }, 1000);
                }, 500);
              }
            }, 200);
          });
        }
      });
      
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
    const terminalX = 155;
    const terminalY = 10;
    const terminalZ = -170;
    
    const terminalLoader = new GLTFLoader();
    terminalLoader.load('/hospital_objects/terminal1.glb', (gltf) => {
      const terminal = gltf.scene;
      terminal.position.set(terminalX, terminalY, terminalZ);
      terminal.scale.set(2, 2, 2);
      this.scene.add(terminal);
      
      // Interaktion nur nach Clipboard-Fund aktivieren
      terminal.traverse(obj => {
        if (obj.isMesh) {
          registerInteractive(obj, () => {
            if (!this.terminalEnabled) {
              console.log('Terminal kann erst nach Fund des Clipboards aktiviert werden!');
              const audio = new Audio('/assets/audio/sleep_access.mp3');
              audio.play();
              return;
            }
            
            console.log('Terminal aktiviert! Lade Quiz...');
            const audio = new Audio('/assets/audio/Quiz_activatd.mp3');
            audio.play();
            
            // Warten, dann Quiz öffnen
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
    
    // Cell-Modell laden für Wurf-Mechanik
    const cellLoader = new GLTFLoader();
    cellLoader.load('/hospital_objects/cell.glb', (gltf) => {
      this.cellModel = gltf.scene;
      this.cellModel.scale.set(1, 1, 1); // Standardgröße, kann angepasst werden
      console.log("Cell-Modell für Wurf-Mechanik geladen");
      
      // Rechtsklick-Event für Zellwurf hinzufügen
      document.addEventListener('contextmenu', (event) => {
        event.preventDefault(); // Standard-Kontextmenü verhindern
        
        // Nur werfen, wenn das Squid-Monster aktiv ist und der Cooldown abgelaufen ist
        if (this.squidModel && this.isSquidChasing && this.canThrowCell && this.hitCount < this.maxHits) {
          this.throwCellAtSquid();
          
          // Cooldown aktivieren
          this.canThrowCell = false;
          setTimeout(() => {
            this.canThrowCell = true;
          }, this.cellThrowCooldown);
        }
      });
    }, undefined, (err) => {
      console.error('FEHLER beim Laden von cell.glb:', err);
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
            
            // Blau-türkisen Nebel um den Spieler herum erzeugen
            console.log("Erzeuge blau-türkisen Nebel nach dem Fall...");
            this.createBlueFog(currentPos, 4, 20000); // Intensität 4, Dauer 20 Sekunden
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
    if (!scene) return;
    
    // Eerie Sound für den Nebel
    const fogSound = new Audio('/assets/audio/things_unremembered.mp3');
    fogSound.volume = 0.3;
    fogSound.play().catch(e => console.log("Audio konnte nicht abgespielt werden:", e));
    
    // Erstelle ein größeres Partikelsystem für den Raum-weiten Nebel
    const particleCount = 3000; // Mehr Partikel für dichten Nebel
    const particles = new THREE.BufferGeometry();
    
    // Arrays für Partikel-Positionen und Farben
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Nebel im gesamten Raum erzeugen
    const radius = 100; // Viel größerer Radius als beim normalen Nebel
    const height = 30; // Höhenverteilung
    
    // Für jeden Partikel
    for (let i = 0; i < particleCount; i++) {
      // Verteilung über den ganzen Raum mit höherer Dichte beim Squid
      // Wir nutzen eine Mischung aus Zufallsverteilung und gezielter Platzierung
      
      // Entscheiden, ob der Partikel nahe am Squid oder im ganzen Raum platziert wird
      const nearSquid = Math.random() < 0.3; // 30% der Partikel nahe am Squid
      
      let x, y, z;
      
      if (nearSquid && this.squidModel) {
        // Nahe am Squid (mit Offset)
        const squidPos = this.squidModel.position;
        x = squidPos.x + (Math.random() * 2 - 1) * 20;
        y = squidPos.y + (Math.random() * 2 - 1) * 15;
        z = squidPos.z + (Math.random() * 2 - 1) * 20;
      } else {
        // Im gesamten Raum
        x = position.x + (Math.random() * 2 - 1) * radius;
        y = position.y + (Math.random() * 2 - 1) * height;
        z = position.z + (Math.random() * 2 - 1) * radius;
      }
      
      // Position setzen
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      // Türkis-blaue Farbe mit Variation für unheimlichen Effekt
      colors[i * 3] = 0.05 + Math.random() * 0.1; // Rot-Anteil (sehr niedrig)
      colors[i * 3 + 1] = 0.6 + Math.random() * 0.3; // Grün-Anteil (höher für türkis)
      colors[i * 3 + 2] = 0.7 + Math.random() * 0.3; // Blau-Anteil (hoch)
    }
    
    // Füge Attribute zur Geometrie hinzu
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Material für die Partikel - größere und transparentere Partikel
    const particleMaterial = new THREE.PointsMaterial({
      size: 3,
      transparent: true,
      opacity: 0.4,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    // Erstelle das Partikelsystem
    const particleSystem = new THREE.Points(particles, particleMaterial);
    particleSystem.name = 'roomFog';
    scene.add(particleSystem);
    
    // Animation des Nebels - pulsierende Bewegung und langsames Verschwinden
    const startTime = Date.now();
    const animateFog = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1.0) {
        // Komplexere Nebelbewegung für unheimlicheren Effekt
        for (let i = 0; i < particleCount; i++) {
          // Verschiedene Frequenzen für verschiedene Partikel
          const freq1 = 0.0005 + (i % 5) * 0.0001;
          const freq2 = 0.0003 + (i % 7) * 0.0001;
          const freq3 = 0.0007 + (i % 3) * 0.0001;
          
          // Wellenförmige Bewegung in allen drei Dimensionen
          positions[i * 3] += Math.sin(elapsed * freq1 + i) * 0.03;
          positions[i * 3 + 1] += Math.cos(elapsed * freq2 + i) * 0.02;
          positions[i * 3 + 2] += Math.sin(elapsed * freq3 + i) * 0.03;
          
          // Leichte Drift in Richtung Spieler für ein "Verfolgungs"-Gefühl
          if (scene.camera && Math.random() < 0.01) {
            const toPlayer = new THREE.Vector3().subVectors(
              scene.camera.position,
              new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
            ).normalize().multiplyScalar(0.05);
            
            positions[i * 3] += toPlayer.x;
            positions[i * 3 + 1] += toPlayer.y;
            positions[i * 3 + 2] += toPlayer.z;
          }
        }
        
        particles.attributes.position.needsUpdate = true;
        
        // Opazität und Farbe über Zeit anpassen
        if (progress < 0.2) {
          // Einblenden
          particleMaterial.opacity = progress * 2.5 * intensity;
        } else if (progress > 0.7) {
          // Ausblenden
          particleMaterial.opacity = (1.0 - progress) * 3.3 * intensity;
          
          // Farbänderung gegen Ende - leicht rötlicher werden für dramatischen Effekt
          for (let i = 0; i < particleCount; i++) {
            const fadeProgress = (progress - 0.7) / 0.3;
            colors[i * 3] = 0.05 + Math.random() * 0.1 + fadeProgress * 0.3; // Rot zunehmen
            colors[i * 3 + 1] = 0.6 + Math.random() * 0.3 - fadeProgress * 0.2; // Grün abnehmen
          }
          particles.attributes.color.needsUpdate = true;
        } else {
          // Volle Intensität mit leichter Pulsation
          const pulse = Math.sin(elapsed * 0.001) * 0.2 + 0.8;
          particleMaterial.opacity = intensity * pulse;
        }
        
        requestAnimationFrame(animateFog);
      } else {
        // Nebel entfernen, wenn die Animation fertig ist
        scene.remove(particleSystem);
        
        // Sound stoppen
        fogSound.pause();
        fogSound.currentTime = 0;
      }
    };
    
    // Animation starten
    animateFog();
    
    return particleSystem;
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
    const chaseSound = new Audio('/assets/audio/bear-sound.wav');
    chaseSound.volume = 0.5;
    chaseSound.loop = true;
    chaseSound.play().catch(e => console.log("Audio konnte nicht abgespielt werden:", e));
    
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
        chaseSound.pause();
        chaseSound.currentTime = 0;
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
        chaseSound.volume = volume;
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
    
    // Erstelle Box um Spieler-Position (Kamera) - etwas größer für bessere Erkennung
    const playerPosition = this.scene.camera ? this.scene.camera.position.clone() : null;
    const playerBox = playerPosition ? new THREE.Box3(
      new THREE.Vector3(playerPosition.x - 2, playerPosition.y - 2, playerPosition.z - 2),
      new THREE.Vector3(playerPosition.x + 2, playerPosition.y + 2, playerPosition.z + 2)
    ) : null;
    
    // Debug: Zeige Position der Kamera
    if (playerPosition && Math.random() < 0.005) { // Noch seltener loggen
      console.log("Spieler-Position:", playerPosition);
    }
    
    // Prüfen, ob der Spieler die Trigger-Box für das Beben berührt
    if (this.quakeTriggerActive && this.quakeTriggerBox && playerBox) {
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
    if (this._quakeTriggered && this.scene.camera && playerBox) {
      const triggerWall = this.scene.getObjectByName('quake_trigger_wall');
      
      if (triggerWall) {
        // Erstelle eine aktualisierte Bounding Box für die Wand
        const wallBox = new THREE.Box3().setFromObject(triggerWall);
        
        // Prüfe, ob der Spieler mit der unsichtbaren Wand kollidiert
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
    
    // Prüfen, ob der Spieler die Boomerang-Wand berührt
    if (this.boomerangWallBox && playerBox) {
      // Anti-Spam-Check: Mindestens 3 Sekunden zwischen Teleportationen
      const currentTime = Date.now();
      const timeSinceLastTeleport = this.lastTeleportTime ? currentTime - this.lastTeleportTime : Infinity;
      
      if (timeSinceLastTeleport > 3000) { // 3 Sekunden Cooldown
        // Prüfe Kollision zwischen Spieler und Boomerang-Wand
        if (this.boomerangWallBox.intersectsBox(playerBox)) {
          console.log("BOOMERANG-WAND BERÜHRT - Teleport zurück zum Start!");
          
          // Sound für Teleport
          const teleportSound = new Audio('/assets/audio/Are_you_sure.mp3');
          teleportSound.volume = 0.4;
          teleportSound.play().catch(e => console.log("Teleport-Audio konnte nicht abgespielt werden:", e));
          
          // "Boomerang" Effekt - zurück zum Startpunkt
          const start = START_POSITIONS.ROOM2;
          if (this.scene.camera) {
            this.scene.camera.position.set(start.position.x, start.position.y, start.position.z);
            this.scene.camera.lookAt(start.lookAt.x, start.lookAt.y, start.lookAt.z);
            console.log("Spieler teleportiert zu:", start.position);
          }
          
          // Flag setzen, damit wir den Teleport nicht mehrfach hintereinander auslösen
          this.lastTeleportTime = currentTime;
          
          // Kurzer Kamera-Shake für den Teleport-Effekt
          setTimeout(() => {
            this.shakeCamera(0.5, 300);
          }, 100);
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
    
    // Geworfene Zellen aus der Szene entfernen
    this.cellsThrown.forEach(cell => {
      if (cell && this.scene) {
        this.scene.remove(cell);
      }
    });
    this.cellsThrown = [];
    
    // Basisklassen-Methode aufrufen, falls vorhanden
    if (typeof super.dispose === 'function') {
      super.dispose();
    }
  }
  
  // Zeigt die Zelle vor dem Spieler an, bevor die drei Zellen auf das Monster gefeuert werden
  showCellBeforeFiring() {
    if (!this.cellModel || !this.scene.camera) return;
    
    // Sound für das Erscheinen der Zelle
    const appearSound = new Audio('/assets/audio/cell_appear.wav');
    appearSound.volume = 0.4;
    appearSound.play().catch(e => console.log("Audio konnte nicht abgespielt werden:", e));
    
    // Zelle klonen
    const cell = this.cellModel.clone();
    
    // Position vor dem Spieler (ca. 3 Einheiten vor der Kamera)
    const cameraDirection = new THREE.Vector3();
    this.scene.camera.getWorldDirection(cameraDirection);
    
    const cellPosition = new THREE.Vector3().copy(this.scene.camera.position)
      .add(cameraDirection.multiplyScalar(3));
    
    cell.position.copy(cellPosition);
    cell.scale.set(5, 5, 5); // Größere Darstellung für bessere Sichtbarkeit
    
    // Zur Szene hinzufügen
    this.scene.add(cell);
    
    // Leuchtendes Material für bessere Sichtbarkeit
    cell.traverse(obj => {
      if (obj.isMesh && obj.material) {
        obj.material.emissive = new THREE.Color(0.1, 0.6, 0.3);
        obj.material.emissiveIntensity = 0.5;
      }
    });
    
    // Zelle rotieren lassen für besseren visuellen Effekt
    const startTime = Date.now();
    let rotationFrame;
    
    const rotateCell = () => {
      const elapsed = Date.now() - startTime;
      
      // Rotation der Zelle
      cell.rotation.y += 0.05;
      cell.rotation.x += 0.01;
      
      // Pulsierende Größe
      const scale = 5 + Math.sin(elapsed * 0.01) * 0.5;
      cell.scale.set(scale, scale, scale);
      
      if (elapsed < 1500) {
        rotationFrame = requestAnimationFrame(rotateCell);
      } else {
        // Animation stoppen
        cancelAnimationFrame(rotationFrame);
        
        // Zelle aus der Szene entfernen
        this.scene.remove(cell);
        
        // Drei Zellen automatisch auf das Monster abfeuern
        this.fireMultipleCellsAtSquid(3);
      }
    };
    
    // Animation starten
    rotateCell();
  }
  
  // Feuert mehrere Zellen auf das Monster ab (garantierte Treffer)
  fireMultipleCellsAtSquid(count = 3) {
    if (!this.cellModel || !this.squidModel || !this.scene.camera) return;
    
    // Sicherstellen, dass wir nur bis maxHits Zellen abfeuern
    const remainingHits = this.maxHits - this.hitCount;
    const actualCount = Math.min(count, remainingHits);
    
    if (actualCount <= 0) return;
    
    // Sound für Zellabschuss
    const fireSound = new Audio('/assets/audio/cell_fire.wav');
    fireSound.volume = 0.5;
    fireSound.play().catch(e => console.log("Audio konnte nicht abgespielt werden:", e));
    
    // Zeitversetzt mehrere Zellen abfeuern
    for (let i = 0; i < actualCount; i++) {
      setTimeout(() => {
        this.throwCellAtSquid(true); // true = garantierter Treffer
      }, i * 800); // 0.8 Sekunden Verzögerung zwischen den Würfen
    }
  }
  
  // Wirft eine Zelle auf das Monster
  throwCellAtSquid(guaranteedHit = false) {
    if (!this.cellModel || !this.squidModel || !this.scene.camera) return;
    
    // Klon des Cell-Modells erstellen
    const cell = this.cellModel.clone();
    
    // Startposition der Zelle (vor dem Spieler)
    const cameraDirection = new THREE.Vector3();
    this.scene.camera.getWorldDirection(cameraDirection);
    
    const cellPosition = new THREE.Vector3().copy(this.scene.camera.position)
      .add(cameraDirection.multiplyScalar(2));
    
    cell.position.copy(cellPosition);
    cell.scale.set(2, 2, 2); // Angepasste Größe für den Wurf
    
    // Zur Szene hinzufügen
    this.scene.add(cell);
    this.cellsThrown.push(cell);
    
    // Sound für den Wurf
    const throwSound = new Audio('/assets/audio/electric-chimes.wav');
    throwSound.volume = 0.3;
    throwSound.play().catch(e => console.log("Audio konnte nicht abgespielt werden:", e));
    
    // Flugrichtung: Bei guaranteedHit direkt zum Monster, sonst in Blickrichtung
    let targetPosition;
    let direction;
    
    if (guaranteedHit) {
      // Ziel ist das Monster (garantierter Treffer)
      targetPosition = this.squidModel.position.clone();
      direction = new THREE.Vector3().subVectors(targetPosition, cellPosition).normalize();
    } else {
      // Ziel ist in Blickrichtung des Spielers
      direction = cameraDirection.clone();
      targetPosition = null;
    }
    
    // Geschwindigkeit der Zelle
    const speed = guaranteedHit ? 0.7 : 1.2;
    
    // Flugeigenschaften speichern
    cell.userData.direction = direction;
    cell.userData.speed = speed;
    cell.userData.distanceTraveled = 0;
    cell.userData.maxDistance = 150; // Maximale Flugdistanz
    cell.userData.guaranteedHit = guaranteedHit;
    cell.userData.target = targetPosition;
    
    // Zelle während des Fluges leuchten lassen
    cell.traverse(obj => {
      if (obj.isMesh && obj.material) {
        obj.material.emissive = new THREE.Color(0.1, 0.6, 0.3);
        obj.material.emissiveIntensity = 0.5;
      }
    });
    
    // Animation für den Zellwurf
    const animateCell = () => {
      if (!cell.parent) return; // Cell wurde bereits entfernt
      
      if (cell.userData.guaranteedHit && cell.userData.target) {
        // Aktualisierte Richtung zum Monster (für garantierte Treffer)
        direction = new THREE.Vector3().subVectors(cell.userData.target, cell.position).normalize();
        cell.position.add(direction.multiplyScalar(cell.userData.speed));
      } else {
        // Gerade Flugbahn in ursprünglicher Richtung
        cell.position.add(cell.userData.direction.clone().multiplyScalar(cell.userData.speed));
      }
      
      // Zelle rotieren für coolen Effekt
      cell.rotation.x += 0.05;
      cell.rotation.z += 0.05;
      
      // Zurückgelegte Distanz erhöhen
      cell.userData.distanceTraveled += cell.userData.speed;
      
      // Kollisionsprüfung
      this.checkCellCollisions(cell);
      
      // Wenn die maximale Distanz erreicht ist und kein garantierter Treffer, entfernen
      if (!cell.userData.guaranteedHit && cell.userData.distanceTraveled > cell.userData.maxDistance) {
        this.scene.remove(cell);
        this.cellsThrown = this.cellsThrown.filter(c => c !== cell);
        return;
      }
      
      // Nächster Frame
      cell.userData.animationFrame = requestAnimationFrame(animateCell);
    };
    
    // Animation starten
    cell.userData.animationFrame = requestAnimationFrame(animateCell);
  }
  
  // Prüft Kollisionen zwischen Zellen und dem Monster
  checkCellCollisions(cell) {
    if (!cell || !this.squidModel || this.hitCount >= this.maxHits) return;
    
    // Bounding Box für Zelle und Monster
    const cellBox = new THREE.Box3().setFromObject(cell);
    const squidBox = new THREE.Box3().setFromObject(this.squidModel);
    
    // Bei garantiertem Treffer: Prüfen, ob die Zelle nahe genug am Monster ist
    const isNearEnough = cell.userData.guaranteedHit && 
      cell.position.distanceTo(this.squidModel.position) < 5;
    
    // Kollision erkannt oder garantierter Treffer in der Nähe
    if (cellBox.intersectsBox(squidBox) || isNearEnough) {
      // Treffer! Zelle entfernen
      this.scene.remove(cell);
      this.cellsThrown = this.cellsThrown.filter(c => c !== cell);
      
      if (cell.userData.animationFrame) {
        cancelAnimationFrame(cell.userData.animationFrame);
      }
      
      // Treffer-Sound
      const hitSound = new Audio('/assets/audio/3_Bubbles_burst.mp3');
      hitSound.volume = 0.5;
      hitSound.play().catch(e => console.log("Audio konnte nicht abgespielt werden:", e));
      
      // Hit-Effekt am Squid (blau-türkiser Flash)
      this.createSquidHitEffect();
      
      // Treffer zählen
      this.hitCount++;
      console.log(`Treffer! ${this.hitCount}/${this.maxHits}`);
      
      // Wenn maximale Anzahl an Treffern erreicht, Monster verschwinden lassen
      if (this.hitCount >= this.maxHits) {
        this.defeatSquidMonster();
      } else {
        // Monster "verletzt" aussehen lassen
        this.squidModel.traverse(child => {
          if (child.isMesh && child.material) {
            // Farbe ändert sich mit jedem Treffer
            const damage = this.hitCount / this.maxHits;
            child.material.emissive = new THREE.Color(0.5 * damage, 0.2, 0.3);
          }
        });
        
        // Monster kurz aufleuchten lassen
        const originalIntensity = this.squidLight ? this.squidLight.intensity : 1;
        if (this.squidLight) {
          this.squidLight.intensity = 2;
          setTimeout(() => {
            if (this.squidLight) this.squidLight.intensity = originalIntensity;
          }, 200);
        }
      }
    }
  }
  
  // Erzeugt einen Treffer-Effekt am Monster
  createSquidHitEffect() {
    if (!this.squidModel || !this.scene) return;
    
    // Position des Monsters
    const position = this.squidModel.position.clone();
    
    // Erstelle ein Partikelsystem für den Effekt
    const particleCount = 100;
    const particles = new THREE.BufferGeometry();
    
    // Arrays für Partikel-Positionen und Farben
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Für jeden Partikel
    for (let i = 0; i < particleCount; i++) {
      // Zufällige Position um das Monster
      const radius = 5;
      positions[i * 3] = position.x + (Math.random() * 2 - 1) * radius;
      positions[i * 3 + 1] = position.y + (Math.random() * 2 - 1) * radius;
      positions[i * 3 + 2] = position.z + (Math.random() * 2 - 1) * radius;
      
      // Blau-grüne Farbe
      colors[i * 3] = 0.1;
      colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
      colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
    }
    
    // Füge Attribute zur Geometrie hinzu
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Material für die Partikel
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.5,
      transparent: true,
      opacity: 0.7,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    // Erstelle das Partikelsystem
    const particleSystem = new THREE.Points(particles, particleMaterial);
    this.scene.add(particleSystem);
    
    // Animation für die Partikel
    const startTime = Date.now();
    const duration = 500;
    
    const animateParticles = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1.0) {
        // Partikel bewegen sich nach außen
        for (let i = 0; i < particleCount; i++) {
          const direction = new THREE.Vector3(
            positions[i * 3] - position.x,
            positions[i * 3 + 1] - position.y,
            positions[i * 3 + 2] - position.z
          ).normalize();
          
          const speed = 0.1 * progress;
          
          positions[i * 3] += direction.x * speed;
          positions[i * 3 + 1] += direction.y * speed;
          positions[i * 3 + 2] += direction.z * speed;
        }
        
        particles.attributes.position.needsUpdate = true;
        
        // Transparenz mit der Zeit reduzieren
        particleMaterial.opacity = 0.7 * (1 - progress);
        
        requestAnimationFrame(animateParticles);
      } else {
        // Partikel entfernen
        this.scene.remove(particleSystem);
      }
    };
    
    // Animation starten
    animateParticles();
  }
  
  // Lässt das Monster nach dem dritten Treffer verschwinden
  defeatSquidMonster() {
    if (!this.squidModel || !this.scene) return;
    
    // Sound für das Verschwinden des Monsters
    const defeatSound = new Audio('/assets/audio/4_Theyre_gone.mp3');
    defeatSound.volume = 0.7;
    defeatSound.play().catch(e => console.log("Audio konnte nicht abgespielt werden:", e));
    
    // Verfolgungsanimation stoppen
    this.isSquidChasing = false;
    
    if (this.squidChasingAnimationId) {
      cancelAnimationFrame(this.squidChasingAnimationId);
      this.squidChasingAnimationId = null;
    }
    
    // Monster stärker leuchten lassen und dann verschwinden
    this.squidModel.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.emissive = new THREE.Color(0.1, 0.8, 0.9);
        child.material.emissiveIntensity = 2;
      }
    });
    
    if (this.squidLight) {
      this.squidLight.intensity = 3;
      this.squidLight.color.set(0x00ffff);
    }
    
    // Monster-Auflösungsanimation
    const startTime = Date.now();
    const duration = 2000;
    
    const dissolveMonster = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1.0) {
        // Monster schrumpfen und drehen
        this.squidModel.scale.set(
          19 * (1 - progress),
          19 * (1 - progress),
          19 * (1 - progress)
        );
        
        this.squidModel.rotation.y += 0.05;
        
        // Lichtstärke anpassen
        if (this.squidLight) {
          this.squidLight.intensity = 3 * (1 - progress);
        }
        
        // Nächster Frame
        requestAnimationFrame(dissolveMonster);
      } else {
        // Monster und Licht vollständig entfernen
        this.scene.remove(this.squidModel);
        
        if (this.squidLight) {
          this.scene.remove(this.squidLight);
          this.squidLight = null;
        }
        
        // Erfolgs-Sound nach dem Verschwinden
        setTimeout(() => {
          const successSound = new Audio('/assets/audio/5_Well_done.mp3');
          successSound.volume = 0.7;
          successSound.play().catch(e => console.log("Audio konnte nicht abgespielt werden:", e));
        }, 1000);
      }
    };
    
    // Animation starten
    dissolveMonster();
  }
}