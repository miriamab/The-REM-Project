import * as THREE from 'three';

// FUNKTION BLUT AM TEDDY
export function startBloodFountain(scene, position) {
  const particles = [];
  const geometry = new THREE.SphereGeometry(0.10, 8, 8); // größere Tropfen
  const material = new THREE.MeshBasicMaterial({ color: 0x5c0707, transparent: true, opacity: 0.95 });

  function spawnBloodParticle() {
    const particle = new THREE.Mesh(geometry, material.clone());
    particle.position.copy(position);
    particle.position.y += 1; // etwas höher am Teddy
    // Starke, zufällige Flugrichtung, vor allem nach oben und zur Seite
    particle.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.2,
      Math.random() * 0.4 + 0.05,
      (Math.random() - 0.5) * 0.2
    );
    scene.add(particle);
    particles.push(particle);
  }

  // Animation für alle Partikel
  function animateParticles() {
    // Jede Frame ein paar neue Partikel erzeugen
    for (let i = 0; i < 4; i++) spawnBloodParticle();

    // Partikel bewegen und verblassen lassen
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.position.add(p.userData.velocity);
      p.userData.velocity.y -= 0.003; // Schwerkraft
      p.material.opacity -= 0.010;  // wie schnell werden die tropfen durchsichtig
      if (p.material.opacity <= 0) {
        scene.remove(p);
        particles.splice(i, 1);
      }
    }
    requestAnimationFrame(animateParticles);
  }
  animateParticles();

}


// FUNKTION FÜR BLUT AM BODEN:
export function startBloodPool(scene, teddyPosition) {
  // Erstelle eine rote, halbtransparente Scheibe
  const geometry = new THREE.CircleGeometry(0.2, 40); // Start-Radius klein
  const material = new THREE.MeshBasicMaterial({ color: 0x5c0707, transparent: true, opacity: 0.7 });
  material.depthWrite = false; // Blut soll keine Tiefe schreiben
  material.depthTest = true;   // Blut wird von echten Objekten überdeckt
  const bloodPool = new THREE.Mesh(geometry, material);
  bloodPool.name = "bloodPool"; // <--- Name setzen, damit es gefunden wird
  bloodPool.rotation.x = -Math.PI / 2; // Flach auf den Boden legen
  bloodPool.position.set(teddyPosition.x, 0.016, teddyPosition.z); // Direkt auf dem Boden
  bloodPool.renderOrder = 1.5; // Leicht erhöht, aber nicht über allem

  scene.add(bloodPool);

  // Animation: Fläche langsam vergrößern
  let maxScale = 100; // Endgröße (Radius)
  let growSpeed = 0.013; // Wie schnell wächst die Fläche

  function animatePool() {
    if (bloodPool.scale.x < maxScale) {
      bloodPool.scale.x += growSpeed;
      bloodPool.scale.y += growSpeed;
      // Optional: opacity langsam erhöhen für "frischeres" Blut
      if (bloodPool.material.opacity < 0.85) {
        bloodPool.material.opacity += 0.001;
      }
      requestAnimationFrame(animatePool);
    }
  }
  animatePool();
}
