export function playVideoCutscene(path, onEnd) {
    // Video-Element einmalig erzeugen oder wiederverwenden
    let video = document.getElementById('cutscene');
  
    if (!video) {
      video = document.createElement('video');
      video.id = 'cutscene';
      video.style.position = 'absolute';
      video.style.top = '0';
      video.style.left = '0';
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.zIndex = '1000';
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      document.body.appendChild(video);
      video.style.objectFit = 'cover';

    }
  
    video.src = path;
    video.style.display = 'block';
    video.play();
  
    // WebGL-Canvas ausblenden
    const canvas = document.querySelector('canvas');
    if (canvas) canvas.style.display = 'none';
  
    video.onended = () => {
      video.style.display = 'none';
      if (canvas) canvas.style.display = 'block';
      if (onEnd) onEnd();
    };
  }
  