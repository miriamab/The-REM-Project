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
  menuImage.src = '/assets/images/start-menu-start-state.png'; // Korrigierter Pfad
  menuImage.id = 'startMenu';
  menuImage.style.position = 'absolute';
  menuImage.style.top = '0';
  menuImage.style.left = '0';
  menuImage.style.width = '100%';
  menuImage.style.height = '100%';
  menuImage.style.zIndex = '1000';
  document.body.appendChild(menuImage);

  // SICHTBARER Credits-Button (hohe Opacity, über dem Menü)
  const creditsButtonVisible = document.createElement('div');
  creditsButtonVisible.textContent = 'CREDITS';
  creditsButtonVisible.style.position = 'absolute';
  creditsButtonVisible.style.top = '70%'; // Unter dem START-Button
  creditsButtonVisible.style.left = '50%';
  creditsButtonVisible.style.transform = 'translateX(-50%)';
  creditsButtonVisible.style.padding = '15px 40px';
  creditsButtonVisible.style.fontSize = '24px';
  creditsButtonVisible.style.fontWeight = 'bold';
  creditsButtonVisible.style.backgroundColor = 'rgba(255, 255, 255, 0.95)'; // Hohe Opacity!
  creditsButtonVisible.style.border = '3px solid #000';
  creditsButtonVisible.style.borderRadius = '10px';
  creditsButtonVisible.style.cursor = 'pointer';
  creditsButtonVisible.style.zIndex = '1003'; // Sehr hoch, über allem!
  creditsButtonVisible.style.transition = 'all 0.3s ease';
  creditsButtonVisible.style.textAlign = 'center';
  creditsButtonVisible.style.color = '#000';
  
  // Hover-Effekt
  creditsButtonVisible.addEventListener('mouseenter', () => {
    creditsButtonVisible.style.backgroundColor = '#000';
    creditsButtonVisible.style.color = '#fff';
    creditsButtonVisible.style.transform = 'translateX(-50%) scale(1.1)';
  });
  
  creditsButtonVisible.addEventListener('mouseleave', () => {
    creditsButtonVisible.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    creditsButtonVisible.style.color = '#000';
    creditsButtonVisible.style.transform = 'translateX(-50%) scale(1)';
  });
  
  document.body.appendChild(creditsButtonVisible);

  // Credits Screen erstellen (initial versteckt)
  const creditsScreen = document.createElement('div');
  creditsScreen.id = 'credits-screen';
  creditsScreen.style.position = 'fixed';
  creditsScreen.style.top = '0';
  creditsScreen.style.left = '0';
  creditsScreen.style.width = '100vw';
  creditsScreen.style.height = '100vh';
  creditsScreen.style.zIndex = '2000';
  creditsScreen.style.display = 'none';
  creditsScreen.style.backgroundColor = '#000';
  creditsScreen.style.backgroundImage = 'url(/assets/images/credits.png)';
  creditsScreen.style.backgroundSize = 'cover';
  creditsScreen.style.backgroundPosition = 'center';
  
  // Credits Close Button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'CLOSE (ESC)';
  closeButton.style.position = 'absolute';
  closeButton.style.bottom = '50px';
  closeButton.style.right = '50px';
  closeButton.style.padding = '12px 24px';
  closeButton.style.fontSize = '16px';
  closeButton.style.fontWeight = 'bold';
  closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
  closeButton.style.border = '2px solid #333';
  closeButton.style.borderRadius = '8px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.zIndex = '2001';
  closeButton.style.transition = 'all 0.3s ease';
  
  // Hover-Effekt für Close-Button
  closeButton.addEventListener('mouseenter', () => {
    closeButton.style.backgroundColor = '#fff';
    closeButton.style.transform = 'scale(1.05)';
  });
  
  closeButton.addEventListener('mouseleave', () => {
    closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    closeButton.style.transform = 'scale(1)';
  });
  
  // Credits schließen Funktionen
  const closeCredits = () => {
    creditsScreen.style.display = 'none';
    document.removeEventListener('keydown', handleEscKey);
  };
  
  const handleEscKey = (e) => {
    if (e.key === 'Escape') {
      closeCredits();
    }
  };
  
  // Credits-Button Event Listener (der sichtbare Button)
  creditsButtonVisible.addEventListener('click', (e) => {
    e.stopPropagation(); // Verhindert, dass der Menü-Click-Handler auch ausgelöst wird
    console.log('🎬 Credits geöffnet (Sichtbarer Button)');
    creditsScreen.style.display = 'block';
    document.addEventListener('keydown', handleEscKey);
  });
  
  // Close-Button Event Listener
  closeButton.addEventListener('click', closeCredits);
  
  creditsScreen.appendChild(closeButton);
  document.body.appendChild(creditsScreen);

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
      console.log('🎬 Credits geöffnet');
      const creditsScreen = document.getElementById('credits-screen');
      if (creditsScreen) {
        creditsScreen.style.display = 'block';
      }
    }
  });
}
