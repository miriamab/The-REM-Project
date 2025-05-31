// hands.js
//import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


export function addRealHands(camera) {
    const loader = new GLTFLoader();
  
    loader.load('/public/hand_right.glb', (gltf) => {
        const rightHand = gltf.scene;
        rightHand.position.set(0.3, -0.3, -0.5);
        rightHand.rotation.set(-Math.PI / 2, 2, Math.PI);
        //rightHand.rotation.set(Math.PI / 2, -2, Math.PI);



        camera.add(rightHand);
      });
    

      
      
  
    loader.load('public/hand_left.glb', (gltf) => {
      const leftHand = gltf.scene;
      leftHand.position.set(-0.3, -0.3, -0.5);
      leftHand.rotation.set(0, Math.PI, 0);
      leftHand.rotation.set(Math.PI / 2, 2, Math.PI);
      camera.add(leftHand);
    });
  }



/*export function addPlaceholderHands(camera) {
  const leftHand = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.08, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xffcc66 })
  );
  leftHand.position.set(-0.2, -0.3, -0.5);

  const rightHand = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.08, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xffcc66 })
  );
  rightHand.position.set(0.2, -0.3, -0.5);

  camera.add(leftHand);
  camera.add(rightHand);
}
*/