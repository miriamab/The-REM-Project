// IngameMenu.js
// Provisorisches, modular eingebundenes Ingame-Menü

export function setupIngameMenu({ onPause, onResume }) {
  let isOpen = false;
  let wasPointerLocked = false;
  let animationPaused = false;

  // Menü-Overlay erstellen
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.left = '0';
  overlay.style.top = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(30,30,30,0.7)';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.zIndex = '2000';
  overlay.style.visibility = 'hidden';

  // Menü-Box
  const menuBox = document.createElement('div');
  menuBox.style.background = 'rgba(50,50,50,0.85)';
  menuBox.style.borderRadius = '16px';
  menuBox.style.padding = '32px 48px';
  menuBox.style.display = 'flex';
  menuBox.style.flexDirection = 'column';
  menuBox.style.gap = '24px';
  menuBox.style.boxShadow = '0 4px 32px rgba(0,0,0,0.3)';

  // Titel
  const title = document.createElement('h2');
  title.innerText = 'Pause';
  title.style.color = '#fff';
  title.style.textAlign = 'center';
  menuBox.appendChild(title);

  // Continue-Button
  const btnContinue = document.createElement('button');
  btnContinue.innerText = 'Continue';
  btnContinue.style.padding = '12px 32px';
  btnContinue.style.fontSize = '1.2em';
  btnContinue.style.borderRadius = '8px';
  btnContinue.style.border = 'none';
  btnContinue.style.background = '#4caf50';
  btnContinue.style.color = '#fff';
  btnContinue.style.cursor = 'pointer';
  btnContinue.addEventListener('click', closeMenu);
  menuBox.appendChild(btnContinue);

  // Quit-Button
  const btnQuit = document.createElement('button');
  btnQuit.innerText = 'Quit';
  btnQuit.style.padding = '12px 32px';
  btnQuit.style.fontSize = '1.2em';
  btnQuit.style.borderRadius = '8px';
  btnQuit.style.border = 'none';
  btnQuit.style.background = '#e53935';
  btnQuit.style.color = '#fff';
  btnQuit.style.cursor = 'pointer';
  btnQuit.addEventListener('click', () => {
    window.close();
    // Falls window.close() nicht funktioniert, Hinweis anzeigen
    setTimeout(() => {
      if (!window.closed) alert('Seite kann nicht automatisch geschlossen werden. Bitte Tab manuell schließen.');
    }, 200);
  });
  menuBox.appendChild(btnQuit);

  overlay.appendChild(menuBox);
  document.body.appendChild(overlay);

  // ESC-Handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!isOpen) openMenu();
      else closeMenu();
    }
  });

  function openMenu() {
    if (isOpen) return;
    isOpen = true;
    overlay.style.visibility = 'visible';
    // PointerLock ggf. verlassen
    if (document.pointerLockElement) {
      wasPointerLocked = true;
      document.exitPointerLock();
    } else {
      wasPointerLocked = false;
    }
    if (onPause && !animationPaused) {
      onPause();
      animationPaused = true;
    }
  }

  function closeMenu() {
    if (!isOpen) return;
    isOpen = false;
    overlay.style.visibility = 'hidden';
    if (wasPointerLocked) {
      // PointerLock wiederherstellen
      setTimeout(() => {
        if (document.body) document.body.click();
      }, 100);
    }
    if (onResume && animationPaused) {
      onResume();
      animationPaused = false;
    }
  }

  // Public API (optional)
  return {
    openMenu,
    closeMenu
  };
}
