const cta = document.querySelector('#cta');

// יוצר קישור מעוצב לאזור הפעולות בדף הבית
const makeLink = (text, href, ghost = false) => {
  const a = document.createElement('a');
  a.textContent = text;
  a.setAttribute('href', href);
  a.className = ghost ? 'btn ghost' : 'btn';
  return a;
};

if (currentUser()) {
  cta.append(makeLink('המשך למשחק', 'pages/game.html'), makeLink('שיאים', 'pages/scores.html', true));
} else {
  cta.append(makeLink('התחברות', 'pages/login.html'), makeLink('הרשמה', 'pages/login.html?tab=register', true));
}
