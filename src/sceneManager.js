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

let currentRoom = null;

/**
 * Wechselt die Szene zu einem neuen Raum.
 * Entfernt vorherige Objekte und lädt neuen Raum.
 * @param {class} RoomClass - Eine Klasse, die von BaseRoom erbt
 * @param {THREE.Scene} scene - Die globale Szene
 */
export function switchRoom(RoomClass, scene) {
  if (currentRoom) {
    currentRoom.cleanup?.(); // optional chaining für Sicherheit
    scene.remove(currentRoom);
  }

  currentRoom = new RoomClass(scene);
  currentRoom.init();

  return currentRoom;
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
