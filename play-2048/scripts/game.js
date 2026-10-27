// מנהל את לוח המשחק, המהלכים, הניקוד והשלב
class Game {
  constructor(size) {
    this.size = size;
    this.reset();
  }

  // מאפס את הלוח ואת נתוני המשחק ומניח קוביות פתיחה
  reset() {
    this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    this.score = 0;
    this.moves = 0;      
    this.merges = 0;     
    this.popped = new Set();
    this.spawn();
    this.spawn();
  }

  get maxTile() { return Math.max(...this.grid.flat()); }

  // קובע את שלב המשחק לפי הקובייה הגבוהה ביותר
  get stage() { return this.maxTile < 128 ? 1 : this.maxTile < 512 ? 2 : 3; }

  // מוסיף קובייה אקראית למשבצת ריקה
  spawn() {
    const empty = [];
    this.grid.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
    if (!empty.length) return null;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    const fourChance = [0.1, 0.2, 0.3][this.stage - 1];
    this.grid[r][c] = Math.random() < fourChance ? 4 : 2;
    return [r, c];
  }

  // מזיז שורה ומחשב מיזוגים וניקוד
  slideLine(line) {
    const tiles = line.filter(v => v);
    const out = [], mergedIdx = [], merged = [];
    let gained = 0;
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] === tiles[i + 1]) {
        const v = tiles[i] * 2;
        mergedIdx.push(out.length);
        out.push(v); gained += v; merged.push(v);
        i++;
      } else out.push(tiles[i]);
    }
    while (out.length < this.size) out.push(0);
    return { line: out, gained, merged, mergedIdx };
  }

  // מזיז את הלוח בכיוון שנבחר ומעדכן את מצב המשחק
  move(dir) {
    const n = this.size;
    let moved = false, gained = 0;
    const merged = [];
    const popped = new Set();

    for (let i = 0; i < n; i++) {
      const coords = Array.from({ length: n }, (_, j) =>
        dir === 'left' ? [i, j] : dir === 'right' ? [i, n - 1 - j] : dir === 'up' ? [j, i] : [n - 1 - j, i]);
      const res = this.slideLine(coords.map(([r, c]) => this.grid[r][c]));
      res.line.forEach((v, j) => {
        const [r, c] = coords[j];
        if (this.grid[r][c] !== v) moved = true;
        this.grid[r][c] = v;
      });
      res.mergedIdx.forEach(j => popped.add(coords[j].join(',')));
      gained += res.gained;
      merged.push(...res.merged);
    }
    if (!moved) return null;

    this.score += gained;
    this.moves++;
    this.merges += merged.length;
    const added = this.spawn();
    if (added) popped.add(added.join(','));
    this.popped = popped;
    return { gained, merged };
  }

  // בודק אם נותר מהלך חוקי בלוח
  canMove() {
    const g = this.grid, n = this.size;
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        if (!g[r][c]) return true;
        if (g[r][c + 1] === g[r][c] || (g[r + 1] && g[r + 1][c] === g[r][c])) return true;
      }
    return false;
  }
}

const TIERS = [
  { min: 64,   text: 'Success!' },
  { min: 128,  text: 'Wonderful!' },
  { min: 256,  text: 'Wow!' },
  { min: 1024, text: 'Unbelievable!' }
];
const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

const $ = (sel) => document.querySelector(sel);
const params = new URLSearchParams(location.search);
const levelKey = params.get('level');
const username = currentUser();

if (!username) {
  location.replace('login.html');
} else if (!LEVELS[levelKey]) {
  showPicker();
} else {
  startPage();
}

// מציג את אפשרויות רמת המשחק
function showPicker() {
  $('#picker').classList.remove('hidden');
  const box = $('#levels');
  Object.entries(LEVELS).forEach(([key, lvl]) => {
    const a = document.createElement('a');
    a.className = 'level-card';
    a.setAttribute('href', `game.html?level=${key}`);
    a.dataset.level = key;
    const name = document.createElement('b');
    name.textContent = lvl.label;
    const size = document.createElement('span');
    size.textContent = `${lvl.size}×${lvl.size}`;
    a.append(name, size);
    box.appendChild(a);
  });
}
// מאתחל את לוח המשחק, הממשק והאירועים
function startPage() {
  $('#play').classList.remove('hidden');
  const level = LEVELS[levelKey];
  const game = new Game(level.size);
  const me = getUsers().find(u => u.username === username);

  let elapsedSeconds = 0, timerId = null, started = false, paused = false, over = false;
  let celebrated = 0, lastCelebration = 0, msgTimer = null;

  const board = $('#board');
  board.style.setProperty('--n', level.size);
  $('#best').textContent = me ? me.best : 0;
  $('#to-scores').setAttribute('href', `scores.html?level=${levelKey}`);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const tileStyle = (value) => {
    const step = Math.min(Math.log2(value), 12);
    return { bg: `hsl(335, 85%, ${96 - step * 5.5}%)`, color: step < 6 ? '#7a1f4a' : '#fff' };
  };

  // מצייר מחדש את מצב הלוח והניקוד
  const render = () => {
    board.replaceChildren();
    game.grid.forEach((row, r) => row.forEach((value, c) => {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.dataset.value = value;
      if (value) {
        const { bg, color } = tileStyle(value);
        tile.textContent = value;
        tile.style.background = bg;
        tile.style.color = color;
        tile.dataset.digits = String(value).length;
        if (game.popped.has(`${r},${c}`)) tile.classList.add('pop');
      }
      board.appendChild(tile);
    }));
    $('#score').textContent = game.score;
    $('#merges').textContent = game.merges;
    $('#moves').textContent = game.moves;
    $('#timer').textContent = fmt(elapsedSeconds);
  };

  // מציג הודעת הצלחה ואפקטים לאחר מיזוג משמעותי
  const celebrate = (merged) => {
    const biggest = Math.max(...merged);
    const now = Date.now();
    if (biggest < TIERS[0].min || biggest <= celebrated || now - lastCelebration < 1500) return;
    celebrated = biggest;
    lastCelebration = now;

    const reached = TIERS.filter(t => biggest >= t.min);
    const tier = reached.length - 1;
    const msg = $('#msg');
    msg.textContent = reached[tier].text;
    msg.classList.remove('show');
    void msg.offsetWidth;              
    msg.classList.add('show');
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => msg.classList.remove('show'), 1400);

    fx.chime(tier);
    if (tier >= 2) fx.confetti(tier === 2 ? 70 : 160);
  };

  // שומר תוצאות ועוצר את המשחק
  const finish = (reason) => {
    if (over) return;
    over = true;
    clearInterval(timerId);
    fx.stopMusic();
    $('#pause-btn').disabled = true;
    $('#pause-overlay').classList.add('hidden');
    const date = new Date().toISOString();

    const users = getUsers();
    const user = users.find(u => u.username === username);
    const isNewBest = !!user && game.score > (user.best || 0);
    if (user) {
      user.last = game.score;
      user.best = Math.max(user.best || 0, game.score);
      store.set('users', users);
    }
    const scores = store.get('scores', []);
    scores.push({
      username,
      score: game.score,
      level: levelKey,
      time: elapsedSeconds,
      moves: game.moves,
      merges: game.merges,
      stage: game.stage,
      date
    });
    scores.sort((a, b) => b.score - a.score);
    store.set('scores', scores.slice(0, 10));
    sessionStorage.setItem('lastGame', JSON.stringify({
      score: game.score,
      level: levelKey,
      time: elapsedSeconds,
      moves: game.moves,
      merges: game.merges,
      stage: game.stage,
      date
    }));

    $('#end-title').textContent = reason === 'stuck' ? 'אין יותר מהלכים' : reason === 'manual' ? 'המשחק הסתיים' : 'המשחק הסתיים!';
    $('#end-text').textContent = `הניקוד שלך: ${game.score} · זמן: ${fmt(elapsedSeconds)} · קוביות שנפתחו: ${game.merges} · ניסיונות: ${game.moves}`;
    board.parentElement.classList.add('overlay-active');
    setTimeout(() => $('#overlay').classList.remove('hidden'), 500);
    if (isNewBest) fx.confetti(90);
  };

  // מתחיל את מדידת הזמן ואת מוזיקת המשחק
  const startTimer = () => {
    started = true;
    fx.startMusic();
    timerId = setInterval(() => {
      elapsedSeconds++;
      $('#timer').textContent = fmt(elapsedSeconds);
    }, 1000);
  };

  // מעדכן את סמל כפתור העצירה או ההמשך
  const setPauseButton = (isPaused) => {
    const button = $('#pause-btn');
    button.innerHTML = isPaused
      ? '<svg class="play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5-12-7.5Z"></path></svg>'
      : '<svg class="pause-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>';
    button.setAttribute('aria-label', isPaused ? 'המשך משחק' : 'עצור משחק');
    button.title = isPaused ? 'המשך משחק' : 'עצור משחק';
    button.setAttribute('aria-pressed', String(isPaused));
  };

  // משהה את המשחק, הטיימר והמוזיקה
  const pauseGame = () => {
    if (over || paused) return;
    paused = true;
    clearInterval(timerId);
    fx.pauseMusic();
    setPauseButton(true);
    board.parentElement.classList.add('overlay-active');
    $('#pause-overlay').classList.remove('hidden');
  };

  // ממשיך משחק מושהה ומחדש את הטיימר והמוזיקה
  const resumeGame = () => {
    if (over || !paused) return;
    paused = false;
    setPauseButton(false);
    board.parentElement.classList.remove('overlay-active');
    $('#pause-overlay').classList.add('hidden');
    if (started) {
      fx.startMusic();
      timerId = setInterval(() => {
        elapsedSeconds++;
        $('#timer').textContent = fmt(elapsedSeconds);
      }, 1000);
    }
  };

  // מבצע מהלך ומסיים את המשחק אם אין עוד מהלכים
  const handleMove = (dir) => {
    if (over || paused) return;
    const result = game.move(dir);
    if (!result) return;
    if (!started) startTimer();
    render();
    if (result.merged.length) celebrate(result.merged);
    if (!game.canMove()) finish('stuck');
  };

  // מפעיל מהלכים באמצעות מקשי החצים
  document.addEventListener('keydown', (event) => {
    const dir = KEYS[event.key];
    if (!dir) return;
    if (over || paused) return;
    event.preventDefault();
    if (typeof fx !== 'undefined' && fx.startMusic) fx.startMusic();
    handleMove(dir);
  });

  // מאפשר להזיז את הלוח באמצעות החלקה במסך מגע
  let t0 = null;
  board.addEventListener('touchstart', (event) => {
    if (over || paused) return;
    t0 = event.touches[0];
  }, { passive: true });
  board.addEventListener('touchend', (event) => {
    if (!t0) return;
    const t1 = event.changedTouches[0];
    const dx = t1.clientX - t0.clientX, dy = t1.clientY - t0.clientY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 24)
      handleMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    t0 = null;
  });

  // מחבר את כפתורי המשחק לפעולות המתאימות
  const dlg = $('#help');
  $('#help-btn').addEventListener('click', () => dlg.showModal());
  $('#close-help').addEventListener('click', () => dlg.close());
  $('#pause-btn').addEventListener('click', () => paused ? resumeGame() : pauseGame());
  $('#resume-btn').addEventListener('click', resumeGame);
  $('#restart-btn').addEventListener('click', () => location.reload());
  $('#finish-btn').addEventListener('click', () => finish('manual'));
  $('#again-btn').addEventListener('click', () => location.reload());
  $('#music-btn').addEventListener('click', (event) => {
    const on = fx.toggleMusic(started && !paused);
    event.currentTarget.classList.toggle('muted', !on);
  });
  $('#music-btn').classList.toggle('muted', !fx.isMusicOn());

  render();
}