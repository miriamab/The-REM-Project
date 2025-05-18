import * as THREE from 'three';

export function setupRaycasting(camera, targetObjects) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(0, 0); // Immer Zentrum (PointerLock)

  function onClick(event) {
    if (document.pointerLockElement !== document.body) return; // Nur wenn Maus gelockt ist

    // Ray direkt aus Kameramitte
    raycaster.setFromCamera(mouse, camera);

    // Nur gezielte Objekte testen
    const intersects = raycaster.intersectObjects(targetObjects, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      hit.material.color.set(0x00ff60); // z. B. grün als Testreaktion
      console.log("Würfel wurde getroffen!");
    }
  }

  document.addEventListener('mousedown', onClick);
}
