// מנהל צלילים, מוזיקת רקע ואפקטים חזותיים
const fx = (() => {
  let ctx = null;
  let musicOn = store.get('musicOn', true);
  let musicPlayRequest = null;

  // יוצר ומחדש לפי הצורך את הקשר השמע
  const audio = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    // דפדפנים עשויים להשהות שמע עד לאינטראקציה של המשתמש.
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  // מנגן צליל קצר בתדר ובעוצמה שנבחרו
  const tone = (freq, { vol = 0.05, dur = 1.2, type = 'sine' } = {}) => {
    const c = audio();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(vol, c.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + dur + 0.05);
  };

  // מפעיל את המוזיקה או ממשיך אותה מהמיקום שבו נעצרה
  const startMusic = () => {
    if (!musicOn) return Promise.resolve(false);
    const bgMusic = document.getElementById('gameMusic');
    if (!bgMusic) {
      console.error('Background music element #gameMusic was not found.');
      return Promise.resolve(false);
    }
    if (!bgMusic.paused) return Promise.resolve(true);
    // מונע הפעלות מקבילות בזמן שבקשת הניגון הקודמת עדיין בתהליך.
    if (musicPlayRequest) return musicPlayRequest;

    musicPlayRequest = bgMusic.play()
      .then(() => true)
      .catch(error => {
        console.error(`Unable to play background music from "${bgMusic.currentSrc || bgMusic.src}".`, error);
        return false;
      })
      .finally(() => {
        musicPlayRequest = null;
      });
    return musicPlayRequest;
  };

  // עוצר את המוזיקה ומחזיר אותה לתחילתה
  const stopMusic = () => {
    const bgMusic = document.getElementById('gameMusic');
    if (bgMusic) {
      bgMusic.pause();
      bgMusic.currentTime = 0;
    }
  };

  // משהה את המוזיקה בלי לאפס את מיקומה
  const pauseMusic = () => {
    const bgMusic = document.getElementById('gameMusic');
    if (bgMusic) bgMusic.pause();
  };

  // מחליף בין מצב מוזיקה מופעל למושתק
  const toggleMusic = (shouldPlay = true) => {
    musicOn = !musicOn;
    store.set('musicOn', musicOn);
    if (musicOn) {
      if (shouldPlay) startMusic();
      else pauseMusic();
    } else {
      pauseMusic();
    }
    return musicOn;
  };

  // מנגן צליל הצלחה בהתאם לשלב שהושג
  const chime = (tier) => {
    if (!musicOn) return;
    [523.3, 659.3, 784.0, 1046.5].slice(0, 2 + tier).forEach((f, i) => {
      setTimeout(() => tone(f, { vol: 0.05, dur: 0.9, type: 'triangle' }), i * 110);
    });
  };

  const COLORS = ['#ff9ec4', '#f0629b', '#ffd9e8', '#ffffff', '#c2336f', '#ffc2d9'];
  let canvas, g, parts = [], running = false;

  // מצייר את חלקיקי הקונפטי עד שהם נעלמים
  const loop = () => {
    g.clearRect(0, 0, canvas.width, canvas.height);
    parts = parts.filter(p => p.y < canvas.height + 20 && p.life > 0);
    parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.rot += p.vr; p.life -= 1;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillStyle = p.color;
      g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      g.restore();
    });
    if (parts.length) requestAnimationFrame(loop);
    else { running = false; g.clearRect(0, 0, canvas.width, canvas.height); }
  };

  // יוצר ומפעיל אפקט קונפטי
  const confetti = (count = 80) => {
    if (!canvas) {
      canvas = document.createElement('canvas');
     canvas.className = 'confetti';
      document.body.appendChild(canvas);
      g = canvas.getContext('2d');
    }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    Array.from({ length: count }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 10 - 3,
      s: 6 + Math.random() * 8,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
      life: 150 + Math.random() * 60,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    })).forEach(p => parts.push(p));
    // חלקיקים חדשים מצטרפים ללולאה הפעילה במקום ליצור לולאת ציור נוספת.
    if (!running) { running = true; loop(); }
  };

  return { startMusic, pauseMusic, stopMusic, toggleMusic, chime, confetti, isMusicOn: () => musicOn };
})();