// TestRoom.js (refactored to use BaseRoom)
import * as THREE from 'three';
import { registerInteractive } from '../../interactions/useRayInteraction.js';
import { BaseRoom } from './BaseRoom.js';

export class TestRoom extends BaseRoom {
  constructor(scene) {
    super(scene);
  }

  init() {
    const scene = this.scene;

    const wallColor = 0xdfc1f7;
    const objectColor = 0xfaf27f;
    const lightColor = 0xffffff;

    // Licht
    const ambientLight = new THREE.AmbientLight(lightColor, 0.4);
    const dirLight = new THREE.DirectionalLight(lightColor, 0.8);
    dirLight.position.set(5, 10, 7.5);
    this.add(ambientLight);
    this.add(dirLight);

    // Boden
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({ color: wallColor });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = Math.PI / 2;
    this.add(floor);

    // Wände
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, side: THREE.BackSide });
    const room = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 20), wallMat);
    room.position.y = 5;
    this.add(room);

    // Interaktive Box
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const boxMat = new THREE.MeshStandardMaterial({ color: objectColor });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(2, 0.5, 0);
    registerInteractive(box, () => {
      box.material.color.set(0xf352f0);
      console.log("✅ Box getroffen und geändert");
    });
    this.add(box);

    scene.add(this);
  }
}