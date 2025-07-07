import * as THREE from 'three';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(0, 0);
const registry = new Map(); // speichert { object → callback }

export function registerInteractive(object, onInteract) {
  registry.set(object, onInteract);
}

export function setupRayInteraction(camera) {
  document.addEventListener('mousedown', () => {
    console.log("🖱️ MouseDown erkannt");
    console.log("📌 PointerLock aktiv:", document.pointerLockElement === document.body);
    console.log("📦 Registrierte Objekte:", registry.size);

    // Optional zum Testen ohne Lock
    // if (document.pointerLockElement !== document.body) return;

    raycaster.setFromCamera(mouse, camera);
    // Filtere Objekte, die ignoreRaycast=true haben
    const raycastTargets = [...registry.keys()].filter(obj => !obj.userData?.ignoreRaycast);
    const intersects = raycaster.intersectObjects(raycastTargets, false);

    console.log("🎯 Treffer:", intersects.length);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const callback = registry.get(hit);
      if (callback) {
        console.log("✅ Callback wird ausgeführt");
        callback(hit);
      } else {
        console.warn("⚠️ Kein Callback für getroffenes Objekt gefunden");
      }
    } else {
      console.warn("❌ Kein Treffer beim Raycasting");
    }
  });
}
