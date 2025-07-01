// Alle Erzähler-Audios zentral verwalten
const narratorClips = {

  eins: new Audio('assets/audio/1_Things_dont_work.mp3'),
  zwei: new Audio('assets/audio/2_Getting_warmer.mp3'),
  drei: new Audio('assets/audio/3_Bubbles_burst.mp3'),
  vier: new Audio('assets/audio/4_Theyre_gone.mp3'),
  fuenf: new Audio('assets/audio/5_Well_done.mp3'),
  // ...weitere Clips
};

// Funktion zum Abspielen eines Clips
export function playNarratorClip(name) {
  const clip = narratorClips[name];
  if (clip) {
    clip.currentTime = 0; // Startet immer von vorne
    clip.play();
  } else {
    console.warn(`Kein Audio-Clip mit dem Namen '${name}' gefunden.`);
  }
}

// Optional: Funktion, um alle Clips zu pausieren
export function stopAllNarratorClips() {
  Object.values(narratorClips).forEach(clip => {
    clip.pause();
    clip.currentTime = 0;
  });
}