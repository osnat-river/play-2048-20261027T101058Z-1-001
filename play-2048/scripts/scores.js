const $ = (sel) => document.querySelector(sel);
const params = new URLSearchParams(location.search);
const levelSelect = $('#level-filter');
const nameInput = $('#name-search');

if (LEVELS[params.get('level')]) levelSelect.value = params.get('level');

// מציג את השיא האישי והמשחק האחרון של המשתמש
const renderPersonal = () => {
  const box = $('#personal');
  box.replaceChildren();
  const title = document.createElement('h2');
  box.appendChild(title);

  const me = getUsers().find(u => u.username === currentUser());
  if (!me) {
    title.textContent = 'השיא שלך';
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = 'התחברי כדי לראות ולשמור שיא אישי.';
    box.appendChild(p);
    return;
  }
  title.textContent = `השיא של ${me.username}`;
  const wrap = document.createElement('div');
  wrap.className = 'stats';
  [['שיא אישי', me.best], ['משחק אחרון', me.last]].forEach(([label, value]) => {
    const s = document.createElement('div');
    s.className = 'stat';
    const l = document.createElement('span'); l.textContent = label;
    const b = document.createElement('b'); b.textContent = value;
    s.append(l, b);
    wrap.appendChild(s);
  });
  box.appendChild(wrap);
};

// בונה שורה בטבלת השיאים
const buildRow = (entry, index) => {
  const tr = document.createElement('tr');
  const duration = Number(entry.time);
  const time = Number.isFinite(duration)
    ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`
    : '—';
  const date = new Date(entry.date);
  const cells = [
    index + 1,
    entry.username,
    entry.score,
    LEVELS[entry.level] ? LEVELS[entry.level].label : entry.level,
    time,
    Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('he-IL')
  ];
  cells.forEach(text => {
    const td = document.createElement('td');
    td.textContent = text;
    tr.appendChild(td);
  });
  if (entry.username === currentUser()) tr.classList.add('mine');
  return tr;
};

// מסנן, ממיין ומציג את עשרת השיאים
const renderTable = () => {
  const level = levelSelect.value;
  const query = nameInput.value.trim().toLowerCase();
  const sort = store.get('userSort', 'name');
  const scores = store.get('scores', [])
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  store.set('scores', scores);

  const rows = scores
    .filter(s => level === 'all' || s.level === level)
    .filter(s => s.username.toLowerCase().includes(query))
    .sort((a, b) => {
      if (sort === 'name') return a.username.localeCompare(b.username, 'he');
      return sort === 'score-asc' ? a.score - b.score : b.score - a.score;
    })
    .slice(0, 10);

  $('#scores-body').replaceChildren(...rows.map(buildRow));
  $('#empty').textContent = rows.length ? '' : 'עוד אין שיאים להצגה. שחקי משחק ראשון!';
};

levelSelect.addEventListener('change', renderTable);
nameInput.addEventListener('input', renderTable);

renderPersonal();
renderTable();

window.addEventListener('storage', event => {
  if (event.key === 'users' || event.key === 'scores' || event.key === 'userSort') {
    renderPersonal();
    renderTable();
  }
});
