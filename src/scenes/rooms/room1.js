// Room 1
import * as THREE from 'three';

import { registerInteractive } from '../../interactions/useRayInteraction.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function setupRoom1(scene) {
    // Farbvariablen
    const wallColor = 0xdfc1f7;
    const objectColor = 0xfaf27f;
    const lightColor = 0xffffff;

    // TextureLoader
    const textureLoader = new THREE.TextureLoader();
    const wallTexture = textureLoader.load('assets/images/wall1.png'); // Für die Wände
    const floorTexture = textureLoader.load('assets/images/floor1.jpg'); // Für den Boden
    const ceilingTexture = textureLoader.load('assets/images/floor1.jpg'); // Für die Decke
    const loader = new GLTFLoader();

    // Licht
    const ambientLight = new THREE.AmbientLight(lightColor, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(lightColor, 0.8);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    // Boden
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture, side: THREE.BackSide });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = Math.PI / 2;
    floor.position.y = 0.01;
    scene.add(floor);

    // Wände
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTexture, side: THREE.DoubleSide });
    const room = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 20), wallMat);
    room.position.y = 5;
    scene.add(room);

    // Decke
    const ceilingGeo = new THREE.PlaneGeometry(20, 20);
    const ceilingMat = new THREE.MeshStandardMaterial({ map: ceilingTexture, side: THREE.DoubleSide }); // DoubleSide, falls man hochschaut und die Rückseite sieht
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 9; // Auf Höhe der Raumdecke
    scene.add(ceiling);

    // Interaktive Box
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const boxMat = new THREE.MeshStandardMaterial({ color: objectColor });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(2, 0.5, 0);
    scene.add(box);

    // Kommode
    loader.load(
        'src/objects/models/wardrobe/kids_dresser_chest_of_drawers.glb', // Pfad
        function (gltf) {
        const wardrobe = gltf.scene;
        wardrobe.scale.set(2.5, 2.5, 2.5); // Größe anpassen
        wardrobe.position.set(0, 1.2, -9.2); // Position
        scene.add(wardrobe);
    }
    );

    // Bed
    loader.load(
        'src/objects/models/bed/old_bed.glb', // Pfad
        function (gltf) {
        const bed = gltf.scene;
        bed.scale.set(4, 4, 4); // Größe anpassen
        bed.position.set(7, 0.1, -5); // Position
        scene.add(bed);
        }
    );

    registerInteractive(box, () => {
    box.material.color.set(0xf352f0); // Neue Farbe
    console.log("✅ Box getroffen und geändert");
});
  
  // Optional: Rückgabe für Interaktion
  return box;

}