// IngameMenu.js
// Provisorisches, modular eingebundenes Ingame-Menü

export function setupIngameMenu({ onPause, onResume }) {
  let isOpen = false;
  let wasPointerLocked = false;
  let animationPaused = false;

  // Menü-Overlay als Fullscreen (wie Startmenü)
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.zIndex = '2000';
  container.style.display = 'block';
  container.style.visibility = 'hidden';

  // Menübild: immer Fullscreen, ggf. beschnitten
  const menuImg = document.createElement('img');
  menuImg.src = 'assets/images/ingame-menu.png';
  menuImg.style.position = 'absolute';
  menuImg.style.top = '0';
  menuImg.style.left = '0';
  menuImg.style.width = '100vw';
  menuImg.style.height = '100vh';
  menuImg.style.objectFit = 'cover';
  menuImg.style.pointerEvents = 'none';
  container.appendChild(menuImg);

  // Continue-Button (Beispiel: 960, 600 im 1920x1080-Design)
  const btnContinue = document.createElement('button');
  btnContinue.innerText = 'Continue';
  btnContinue.style.position = 'absolute';
  btnContinue.style.left = (960 / 1920 * 100) + '%'; // 50%
  btnContinue.style.top = (550 / 1080 * 100) + '%';  // 55.6%
  btnContinue.style.transform = 'translate(-50%, -50%)';
  btnContinue.style.width = '18vw';
  btnContinue.style.height = '8vh';
  btnContinue.style.fontSize = '2vw';
  btnContinue.style.borderRadius = '8px';
  btnContinue.style.border = 'none';
  btnContinue.style.background = '#4caf50';
  btnContinue.style.color = '#fff';
  btnContinue.style.cursor = 'pointer';
  btnContinue.style.opacity = '0.0'; // Startet unsichtbar
  btnContinue.addEventListener('click', closeMenu);
  container.appendChild(btnContinue);

  // Quit-Button (Beispiel: 960, 900 im 1920x1080-Design)
  const btnQuit = document.createElement('button');
  btnQuit.innerText = 'Quit';
  btnQuit.style.position = 'absolute';
  btnQuit.style.left = (960 / 1920 * 100) + '%'; // 50%
  btnQuit.style.top = (950 / 1080 * 100) + '%';  // 83.3%
  btnQuit.style.transform = 'translate(-50%, -50%)';
  btnQuit.style.width = '18vw';
  btnQuit.style.height = '8vh';
  btnQuit.style.fontSize = '2vw';
  btnQuit.style.borderRadius = '8px';
  btnQuit.style.border = 'none';
  btnQuit.style.background = '#e53935';
  btnQuit.style.color = '#fff';
  btnQuit.style.opacity = '0.0';
  btnQuit.style.cursor = 'pointer';
  btnQuit.addEventListener('click', () => {
    window.close();
    setTimeout(() => {
      if (!window.closed) alert('Seite kann nicht automatisch geschlossen werden. Bitte Tab manuell schließen.');
    }, 200);
  });
  container.appendChild(btnQuit);

  document.body.appendChild(container);

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
    container.style.visibility = 'visible';
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
    container.style.visibility = 'hidden';
    if (wasPointerLocked) {
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
