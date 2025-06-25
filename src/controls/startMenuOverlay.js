// startMenuOverlay.js

import { switchRoom, playCutsceneAndSwitch } from './sceneManager.js';
import { Room1 } from './scenes/rooms/Room1.js';

/**
 * Fügt das Startmenü als Bild ein, erkennt Klicks auf definierte Zonen
 */
export function initStartMenu() {
  const canvas = document.querySelector('canvas');

  // Bild als Overlay hinzufügen
  const menuImage = document.createElement('img');
  menuImage.src = '/assets/ui/startmenu.png';
  menuImage.id = 'startMenu';
  menuImage.style.position = 'absolute';
  menuImage.style.top = '0';
  menuImage.style.left = '0';
  menuImage.style.width = '100%';
  menuImage.style.height = '100%';
  menuImage.style.zIndex = '1000';
  document.body.appendChild(menuImage);

  // Cursor im Menü immer sichtbar machen
  document.body.style.cursor = 'auto';

  // Klicks abfangen
  document.addEventListener('click', (e) => {
    if (menuImage.style.display !== 'block') return;

    const x = e.clientX;
    const y = e.clientY;

    // Hilfsfunktion für Klickbereich
    const inZone = (x1, x2, y1, y2) => x >= x1 && x <= x2 && y >= y1 && y <= y2;

    // START
    if (inZone(470, 700, 400, 450)) {
      console.log('▶️ START gedrückt');
      menuImage.style.display = 'none';
      canvas.requestPointerLock?.();
      playCutsceneAndSwitch('/cutscenes/intro.mp4', () => {
        switchRoom(Room1, window.scene); // scene muss global sein
      });
    }

    // OPTIONS
    if (inZone(470, 700, 460, 510)) {
      console.log('⚙️ Optionen (Platzhalter)');
    }

    // HELP
    if (inZone(470, 700, 520, 570)) {
      console.log('❓ Hilfe (Platzhalter)');
    }

    // CREDITS
    if (inZone(470, 700, 580, 630)) {
      console.log('🎬 Credits (Platzhalter)');
    }
  });
}
