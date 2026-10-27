// עזרי שמירה וטעינה מהאחסון המקומי
const store = {
  // משתמשים בערך ברירת המחדל אם המפתח חסר או שהמידע השמור אינו JSON תקין.
  get: (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value))
};

// מחזיר את המשתמשים ואת שם המשתמש המחובר
const getUsers = () => store.get('users', []);
// שם המשתמש נשמר רק למשך הלשונית הנוכחית, בניגוד לנתוני המשתמשים הקבועים.
const currentUser = () => sessionStorage.getItem('currentUser');
// הנתיב הבסיסי מאפשר לקישורים לעבוד גם בעמודים שבתיקיית pages.
const ROOT = document.body.dataset.root || '';
const ADMIN_EMAIL = 'osnat9060@gmail.com';

const isValidUsername = (value) => {
  const length = Array.from(value.trim()).length;
  return length >= 2 && length <= 20;
};
const isValidEmail = (value) => {
  if (value.length > 254 || /\s/.test(value)) return false;
  if (!value.toLowerCase().endsWith('@gmail.com')) return false;
  const parts = value.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!/^[a-z\d.!#$%&'*+/=?^_`{|}~-]+$/i.test(local) ||
      local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  return domain.toLowerCase() === 'gmail.com';
};
const isValidPhone = (value) => {
  if (!/^\+?\d(?:[\d\s().-]*\d)?$/.test(value)) return false;
  const openingParentheses = (value.match(/\(/g) || []).length;
  const closingParentheses = (value.match(/\)/g) || []).length;
  if (openingParentheses !== closingParentheses || openingParentheses > 1 ||
      (openingParentheses && value.indexOf('(') > value.indexOf(')'))) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};
const isValidPassword = (value) => value.length >= 4 && !/\s/.test(value);

// בודק אם המשתמש המחובר הוא מנהל
const isAdmin = () => {
  const username = currentUser();
  // בודקים גם את שם המשתמש המחובר וגם את כתובת המייל, ללא תלות באותיות גדולות.
  return !!username && getUsers().some(user =>
    user.username === username && user.email && user.email.toLowerCase() === ADMIN_EMAIL
  );
};

// לכל רמה מוגדרים גודל הלוח והשם שיוצג בממשק.
const LEVELS = {
  beginner: { size: 5, label: 'מתחילים' },
  advanced: { size: 4, label: 'מתקדמים' }
};

const logout = () => {
  sessionStorage.removeItem('currentUser');
  location.href = ROOT + 'index.html';
};

// מוסיף כפתור להצגה ולהסתרה של סיסמאות
const setupPasswordToggles = () => {
  document.querySelectorAll('input[type="password"]').forEach(input => {
    const wrapper = document.createElement('span');
    wrapper.className = 'password-field';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'password-toggle';
    toggle.setAttribute('aria-label', 'הצג סיסמה');
    toggle.setAttribute('aria-pressed', 'false');
    toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle><line class="password-slash" x1="4" y1="20" x2="20" y2="4"></line></svg>';
    toggle.addEventListener('click', () => {
      // מעדכנים גם את מצב הכפתור עבור קוראי מסך, יחד עם סוג שדה הסיסמה.
      const isVisible = input.type === 'text';
      input.type = isVisible ? 'password' : 'text';
      toggle.setAttribute('aria-label', isVisible ? 'הצג סיסמה' : 'הסתר סיסמה');
      toggle.setAttribute('aria-pressed', String(!isVisible));
      wrapper.classList.toggle('password-visible', !isVisible);
    });
    wrapper.appendChild(toggle);
  });
};

// בונה את סרגל הניווט ואת אזור המשתמש
const buildLayout = () => {
  const header = document.querySelector('#site-header');
  const footer = document.querySelector('#site-footer');

  if (!header) return;

  const hamburgerBtn = document.createElement('button');
  hamburgerBtn.className = 'hamburger';
  hamburgerBtn.id = 'hamburger-btn';
  hamburgerBtn.setAttribute('aria-label', 'פתח תפריט');
  for (let i = 0; i < 3; i++) {
    hamburgerBtn.appendChild(document.createElement('span'));
  }

  const brand = document.createElement('a');
  brand.textContent = '2048 🌸';
  brand.href = ROOT + 'index.html';
  brand.className = 'logo';

  const rightGroup = document.createElement('div');
  rightGroup.className = 'header-right';
  rightGroup.append(hamburgerBtn, brand);

  const nav = document.createElement('nav');
  nav.className = 'nav-menu';
  nav.id = 'nav-menu';

  const links = [
    { page: 'home', text: 'בית', href: ROOT + 'index.html' },
    { page: 'game', text: 'משחק', href: ROOT + 'pages/game.html' },
    { page: 'scores', text: 'שיאים', href: ROOT + 'pages/scores.html' }
  ];

  links.forEach(l => {
    const a = document.createElement('a');
    a.textContent = l.text;
    a.setAttribute('href', l.href);
    a.dataset.page = l.page;
    a.className = 'nav-link';
    if (l.page === document.body.dataset.page) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
    }
    nav.appendChild(a);
  });
  if (isAdmin()) {
    // קישור הניהול מוצג רק למנהל שעבר את בדיקת ההרשאה.
    const adminLink = document.createElement('a');
    adminLink.textContent = 'ניהול';
    adminLink.href = ROOT + 'pages/admin.html';
    adminLink.className = 'nav-link';
    if (document.body.dataset.page === 'admin') {
      adminLink.classList.add('active');
      adminLink.setAttribute('aria-current', 'page');
    }
    nav.appendChild(adminLink);
  }

  rightGroup.appendChild(nav);

  const user = document.createElement('div');
  user.className = 'user-box';
  if (currentUser()) {
    const hello = document.createElement('span');
    hello.textContent = `שלום, ${currentUser()}`;
    const out = document.createElement('button');
    out.className = 'btn ghost small-btn';
    out.textContent = 'יציאה';
    out.addEventListener('click', logout);
    user.append(hello, out);
  } else {
    const a = document.createElement('a');
    a.textContent = 'התחברות';
    a.className = 'nav-link login-link';
    a.setAttribute('href', ROOT + 'pages/login.html');
    if (document.body.dataset.page === 'login') {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
    }
    user.appendChild(a);
  }

  header.replaceChildren(rightGroup, user);

  if (footer) {
    footer.textContent = 'Osnat River•🌸2048 © 2026';
  }

  hamburgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    nav.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && !hamburgerBtn.contains(e.target)) {
      nav.classList.remove('active');
    }
  });

  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
  });
};

buildLayout();
setupPasswordToggles();