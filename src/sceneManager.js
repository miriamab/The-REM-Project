// sceneManager.js


/**
 * 🔹 Cutscene-System (Three.js + MP4 Overlay)
 *
 * Diese Datei ermöglicht das einfache Abspielen von Video-Zwischensequenzen
 * vor einem Raum oder als Übergang zu einem neuen Raum.
 *
 * ➕ Neue Cutscene einfügen:
 * 1. Lege dein Video unter `public/cutscenes/` ab (z. B. `room2_intro.mp4`)
 * 2. Rufe im Raum (z. B. in `onSolved()`):
 *
 *    playCutsceneAndSwitch('/cutscenes/room2_intro.mp4', () => {
 *      switchRoom(Room2, this.scene);
 *    });
 *
 * 🔄 Das Video wird automatisch eingeblendet, das Canvas versteckt
 * und nach Ende das Callback (`switchRoom`) aufgerufen.
 *
 * ⚠️ Autoplay funktioniert nur mit `muted = true` (aus technischen Gründen) spaeter wird ein Menu eingebettet dann ist Audio auch kein Problem
 */

import { playVideoCutscene } from './scenes/rooms/video/videoCutscene.js';
import { setColliders } from './controls/FirstPersonControls.js';
import { Room2 } from './scenes/rooms/room2.js';

// Keine lokale currentRoom-Variable mehr - wir verwenden die globale

/**
 * Wechselt die Szene zu einem neuen Raum.
 * Entfernt vorherige Objekte und lädt neuen Raum.
 * @param {class} RoomClass - Eine Klasse, die von BaseRoom erbt
 * @param {THREE.Scene} scene - Die globale Szene
 */
export function switchRoom(RoomClass, scene) {
  // Verwende die globale currentRoom-Variable
  const currentRoom = window.currentRoom;
  
  if (currentRoom) {
    currentRoom.cleanup?.(); // optional chaining für Sicherheit
    scene.remove(currentRoom);
  }

  const newRoom = new RoomClass(scene);
  newRoom.init();
  
  // Globale currentRoom-Variable aktualisieren
  window.currentRoom = newRoom;
  
  // Auch die lokale Variable in main.js aktualisieren
  if (typeof window.updateCurrentRoom === 'function') {
    window.updateCurrentRoom(newRoom);
  }

  // **WICHTIG: Alle notwendigen Initialisierungen hier durchführen**
  // Damit sie IMMER ausgeführt werden, egal von wo switchRoom aufgerufen wird
  
  // 1. Colliders setzen
  if (newRoom && newRoom.colliders) {
    setColliders(newRoom.colliders);
  } else {
    console.warn('Colliders für den aktuellen Raum fehlen oder sind nicht definiert.');
  }

  // 2. Kamera an den neuen Raum übergeben
  const camera = scene.camera || scene.children.find(obj => obj.isCamera);
  if (newRoom && camera) {
    newRoom.camera = camera;
  } else {
    console.error('Neuer Raum oder Kamera konnte nicht initialisiert werden.');
  }

  // 3. Room2-spezifische Sound-Initialisierung
  if (newRoom instanceof Room2) {
    const tryStartSounds = () => {
      try {
        newRoom.startRoom2Sounds && newRoom.startRoom2Sounds();
      } catch (error) {
        console.error('Fehler beim Starten der Room2-Sounds:', error);
      }
      document.removeEventListener('click', tryStartSounds);
    };
    document.addEventListener('click', tryStartSounds);
  }

  return newRoom;
}

/**
 * Führt einen Szenenwechsel nach einem Video durch.
 * Nutzt die Utility aus videoCutscene.js
 *
 * @param {string} videoPath - Pfad zur MP4-Datei
 * @param {Function} onEnd - Callback (z. B. switchRoom(...))
 */
export function playCutsceneAndSwitch(videoPath, onEnd) {
  console.log("🎥 Starte Cutscene:", videoPath); // Debug-Log
  const crosshair = document.getElementById('crosshair');
  if (crosshair) crosshair.style.display = 'none';

  playVideoCutscene(videoPath, () => {
    // Fadenkreuz wieder einblenden
    if (crosshair) crosshair.style.display = '';
    if (onEnd) onEnd();
  });
}
