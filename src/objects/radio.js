import { registerInteractive } from '../interactions/useRayInteraction.js';
import * as THREE from 'three';

export function makeRadioInteractive(radioObject, audioUrl, room) {
  const audio = new Audio(audioUrl);
  let locked = false;

  let vibrating = false;
  let animationId = null;
  let basePosition = radioObject.position.clone();
  let baseRotation = radioObject.rotation.clone();

  function vibrate() {
    if (!vibrating) return;
    radioObject.position.x = basePosition.x + Math.sin(Date.now() * 0.02) * 0.012;
    radioObject.position.y = basePosition.y + Math.sin(Date.now() * 0.025) * 0.008;
    radioObject.rotation.z = baseRotation.z + Math.sin(Date.now() * 0.04) * 0.012;
    animationId = requestAnimationFrame(vibrate);
  }

  function stopVibrate() {
    vibrating = false;
    if (animationId) cancelAnimationFrame(animationId);
    radioObject.position.copy(basePosition);
    radioObject.rotation.copy(baseRotation);
  }

  function lock() {
    locked = true;
    // Optional: Radio bleibt an, Vibration bleibt an
  }

  radioObject.traverse(child => {
    if (child.isMesh) {
      registerInteractive(child, () => {
        if (locked) return;
        if (audio.paused) {
          audio.currentTime = 0;
          audio.play();
          vibrating = true;
          vibrate();
          if (room) { room.radioOn = true; room.checkAllOn(); }
        } else {
          audio.pause();
          stopVibrate();
          if (room) { room.radioOn = false; }
        }
      });
    }
  });

  audio.addEventListener('ended', () => {
    stopVibrate();
    if (room && !locked) room.radioOn = false;
  });

  return lock;
}

export function makeLampInteractive(lampObject, ambientLight, dirLight, room) {
  let warm = false;
  let locked = false;
  const origAmbient = ambientLight.color.clone();
  const origDir = dirLight.color.clone();
  const warmColor = new THREE.Color(0xffdc91);

  function lock() {
    locked = true;
    // Optional: Lampe bleibt an, Farbe bleibt warm
  }

  lampObject.traverse(child => {
    if (child.isMesh) {
      registerInteractive(child, () => {
        if (locked) return;
        warm = !warm;
        if (warm) {
          ambientLight.color.copy(warmColor);
          dirLight.color.copy(warmColor);
          if (room) { room.lampOn = true; room.checkAllOn(); }
        } else {
          ambientLight.color.copy(origAmbient);
          dirLight.color.copy(origDir);
          if (room) { room.lampOn = false; }
        }
      });
    }
  });

  return lock;
}

export function makeTVInteractive(tvObject, room) {
  let tvOn = false;
  let overlay = null;
  let locked = false;

  function lock() {
    locked = true;
    // Optional: TV bleibt an, Overlay bleibt sichtbar
  }

  function createPixelOverlay() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    for (let y = 0; y < canvas.height; y += 4) {
      for (let x = 0; x < canvas.width; x += 4) {
        const gray = Math.floor(Math.random() * 180 + 40);
        ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
        ctx.fillRect(x, y, 4, 4);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const geometry = new THREE.PlaneGeometry(1.8, 1.5);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0.54, 2.4, 0.0);
    mesh.rotation.y = Math.PI / 2;

    function animateNoise() {
      if (!mesh.visible) return;
      for (let y = 0; y < canvas.height; y += 2) {
        for (let x = 0; x < canvas.width; x += 2) {
          const gray = Math.floor(Math.random() * 180 + 40);
          ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
          ctx.fillRect(x, y, 2, 2);
        }
      }
      texture.needsUpdate = true;
      mesh._noiseTimeout = setTimeout(animateNoise, 100);
    }
    mesh.animateNoise = animateNoise;
    return mesh;
  }

  tvObject.traverse(child => {
    if (child.isMesh) {
      registerInteractive(child, () => {
        if (locked) return;
        tvOn = !tvOn;
        if (tvOn) {
          if (!overlay) {
            overlay = createPixelOverlay();
            tvObject.add(overlay);
          }
          overlay.visible = true;
          overlay.animateNoise();
          if (room) { room.tvOn = true; room.checkAllOn(); }
        } else if (overlay) {
          overlay.visible = false;
          if (overlay._noiseTimeout) clearTimeout(overlay._noiseTimeout);
          if (room) { room.tvOn = false; }
        }
      });
    }
  });

  return lock;
}