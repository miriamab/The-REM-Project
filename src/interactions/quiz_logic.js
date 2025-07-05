import * as THREE from 'three';
import { registerInteractive } from './useRayInteraction.js';

let currentQuestionIndex = 0;
let questionMesh = null;
let answerBoxes = [];
let quizGroup = null;
let wrongSound;

const questions = [
  {
    question: 'Wann haben Sie zuletzt durchgeschlafen?',
    answers: ['Diese Woche', 'Letztes Jahr', 'Noch nie'],
    correct: 0
  },
  {
    question: 'Wie oft fühlen Sie sich beobachtet?',
    answers: ['Täglich', 'Selten', 'Nie'],
    correct: 0
  }
];

// Die Funktion addQuizTrigger wird entfernt, da das Quiz jetzt über das Buch in room2.js getriggert wird.

// Die Quiz-Box wird NICHT mehr automatisch angezeigt!
// Entferne den Aufruf von showQuestion(scene) aus startQuiz, falls nötig.
export function startQuiz(scene) {
  if (quizGroup) return; // Nur ein Quiz gleichzeitig
  quizGroup = new THREE.Group();
  scene.add(quizGroup);
  currentQuestionIndex = 0;
  // Sound für falsche Antwort
  const listener = scene.children.find(obj => obj.type === 'AudioListener');
  if (listener) {
    wrongSound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('/sounds/wrong_answer.mp3', (buffer) => {
      wrongSound.setBuffer(buffer);
      wrongSound.setVolume(0.7);
    });
  }
  showQuestion(scene);
}

function showQuestion(scene) {
  const data = questions[currentQuestionIndex];

  // Terminal-Position und Größe
  const quizX = 110;
  const quizY = 14;
  const quizZ = -185;
  const quizRotationY = Math.PI / 2;
  const planeWidth = 22;
  const planeHeight = 11;

  // Vorher alle alten Quiz-Objekte entfernen
  if (quizGroup) {
    while (quizGroup.children.length > 0) {
      quizGroup.remove(quizGroup.children[0]);
    }
  }
  questionMesh = null;
  answerBoxes = [];

  // Text
  const lines = [data.question, ...data.answers.map((a, i) => `${i + 1}. ${a}`)];
  const canvas = createTextCanvas(lines, planeWidth, planeHeight);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: false });
  const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
  questionMesh = new THREE.Mesh(geometry, material);
  questionMesh.position.set(quizX, quizY, quizZ);
  questionMesh.rotation.y = quizRotationY;
  quizGroup.add(questionMesh);

  // Unsichtbare, aber klickbare Antwortboxen
  const canvasHeight = canvas.height;
  const pxPerUnit = canvasHeight / planeHeight;
  const boxWidth = planeWidth * 0.8;
  const boxHeight = 1.2;
  const fontSize = 48; // muss mit createTextCanvas übereinstimmen
  const lineHeight = 60;
  const scale = 3; // muss mit createTextCanvas übereinstimmen

  data.answers.forEach((_, i) => {
    // y-Position der Antwortbox berechnen
    const yPx = (40 + (i + 1) * lineHeight * scale);
    const yWorld = quizY + (canvasHeight/2 - yPx) / pxPerUnit;
    // Unsichtbar, aber klickbar
    const buttonGeometry = new THREE.BoxGeometry(boxWidth, boxHeight, 0.1);
    const buttonMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button.position.set(quizX, yWorld, quizZ + 0.06);
    button.rotation.y = quizRotationY;
    button.userData.isAnswer = true;
    button.userData.index = i;
    quizGroup.add(button);
    answerBoxes.push(button);
    registerInteractive(button, () => handleAnswer(scene, i));
  });
}

function createTextCanvas(lines, planeWidth = 22, planeHeight = 11) {
  // Klare, große Schrift und hoher Kontrast, dicker Rahmen
  const scale = 3;
  const canvas = document.createElement('canvas');
  canvas.width = 1024 * scale;
  canvas.height = 400 * scale;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.fillStyle = '#000';
  ctx.globalAlpha = 1.0;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const fontSize = 48 * scale;
  const lineHeight = 60 * scale;
  ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const centerX = canvas.width / 2;
  lines.forEach((line, i) => {
    if(i === 0) {
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 8 * scale;
    } else {
      ctx.fillStyle = '#ff2222';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 6 * scale;
    }
    ctx.fillText(line, centerX, (40 + i * lineHeight));
    ctx.shadowBlur = 0;
  });
  // Dickerer Rahmen
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 10 * scale;
  ctx.strokeRect(20 * scale, 20 * scale, (canvas.width - 40 * scale), (canvas.height - 40 * scale));
  return canvas;
}

export function handleAnswer(scene, index) {
  const question = questions[currentQuestionIndex];
  if (index === question.correct) {
    currentQuestionIndex++;
    if (currentQuestionIndex >= questions.length) {
      endQuiz(scene);
    } else {
      showQuestion(scene);
    }
  } else {
    if (wrongSound && wrongSound.isPlaying) wrongSound.stop();
    wrongSound.play();
  }
}

function endQuiz(scene) {
  // Belohnung (z.B. Schlüssel)
  const reward = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.6, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xffcc00 })
  );
  reward.position.set(140, 9, -179.5);
  scene.add(reward);

  // Quiz entfernen
  scene.remove(quizGroup);
  quizGroup = null;
  currentQuestionIndex = 0;
}
