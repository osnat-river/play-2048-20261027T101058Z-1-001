const tabs = document.querySelectorAll('.tab');
const AUTH_ADMIN_EMAIL = 'osnat9060@gmail.com';
const forms = {
  'login-form': document.querySelector('#login-form'),
  'register-form': document.querySelector('#register-form'),
  'admin-login-form': document.querySelector('#admin-login-form')
};

// מציג את הטופס שנבחר ומסתיר את שאר הטפסים
const showTab = (id) => {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.target === id));
  Object.entries(forms).forEach(([key, form]) => form.classList.toggle('hidden', key !== id));
  document.querySelector('#password-recovery').classList.add('hidden');
};

tabs.forEach(tab => tab.addEventListener('click', () => showTab(tab.dataset.target)));

if (new URLSearchParams(location.search).get('tab') === 'register') showTab('register-form');
if (new URLSearchParams(location.search).get('tab') === 'admin') showTab('admin-login-form');

// שומר את המשתמש המחובר ומעביר אותו למשחק
const enterGame = (username) => {
  sessionStorage.setItem('currentUser', username);
  location.href = 'game.html';
};

// בודק את פרטי ההרשמה ושומר חשבון חדש
forms['register-form'].addEventListener('submit', (event) => {
  event.preventDefault();
  const error = document.querySelector('#reg-error');
  const username = document.querySelector('#reg-user').value.trim();
  const email = document.querySelector('#reg-email').value.trim();
  const phone = document.querySelector('#reg-phone').value.trim();
  const pass = document.querySelector('#reg-pass').value;
  const pass2 = document.querySelector('#reg-pass2').value;
  const users = getUsers();
  if (!isValidUsername(username)) return error.textContent = 'שם המשתמש חייב להכיל בין 2 ל־20 תווים';
  if (!isValidEmail(email)) return error.textContent = 'כתובת הדואר האלקטרוני אינה תקינה';
  if (!isValidPhone(phone)) return error.textContent = 'מספר הטלפון אינו תקין. יש להזין 7–15 ספרות';
  if (!isValidPassword(pass)) return error.textContent = 'הסיסמה חייבת להכיל לפחות 4 תווים וללא רווחים';
  if (pass !== pass2) return error.textContent = 'הסיסמאות לא תואמות';
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) return error.textContent = 'שם המשתמש כבר תפוס';
  if (users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())) return error.textContent = 'כתובת הדואר האלקטרוני כבר בשימוש';

  users.push({ username, email, phone, password: pass, best: 0, last: 0 });
  store.set('users', users);
  enterGame(username);
});

// מאמת את פרטי המשתמש ומחבר אותו לחשבון
forms['login-form'].addEventListener('submit', (event) => {
  event.preventDefault();
  const error = document.querySelector('#login-error');
  const identifier = document.querySelector('#login-user').value.trim().toLowerCase();
  const pass = document.querySelector('#login-pass').value;
  if (identifier.includes('@') && !isValidEmail(identifier)) {
    error.textContent = 'כתובת הדואר האלקטרוני אינה תקינה';
    return;
  }
  const user = getUsers().find(u =>
    String(u.username || '').toLowerCase() === identifier || String(u.email || '').toLowerCase() === identifier
  );
  if (!user) {
    showTab('register-form');
    if (identifier.includes('@')) {
      document.querySelector('#reg-email').value = identifier;
    } else {
      document.querySelector('#reg-user').value = identifier;
    }
    document.querySelector('#reg-error').textContent = 'לא נמצא חשבון עם הפרטים האלה. אפשר להשלים הרשמה כאן.';
    return;
  }
  if (user.password !== pass) return error.textContent = 'שם משתמש או סיסמה שגויים';
  enterGame(user.username);
});

forms['admin-login-form'].addEventListener('submit', (event) => {
  event.preventDefault();
  const error = document.querySelector('#admin-login-error');
  const email = document.querySelector('#admin-email').value.trim().toLowerCase();
  const pass = document.querySelector('#admin-pass').value;
  if (!isValidEmail(email)) return error.textContent = 'כתובת הדואר האלקטרוני אינה תקינה';
  if (email !== AUTH_ADMIN_EMAIL) return error.textContent = 'כתובת הדואר האלקטרוני אינה מורשית כמנהל';

  const admin = getUsers().find(u => u.email && u.email.toLowerCase() === AUTH_ADMIN_EMAIL);
  if (!admin) return error.textContent = 'לא נמצא חשבון מנהל. יש להירשם תחילה עם כתובת המנהל המורשית';
  if (admin.password !== pass) return error.textContent = 'כתובת דואר אלקטרוני או סיסמה שגויות';
  sessionStorage.setItem('currentUser', admin.username);
  location.href = '../pages/admin.html';
});

let pendingRecovery = null;

// מאפשר להפעיל כפתור בשחזור הסיסמה באמצעות Enter
const enterActivates = (inputSelector, buttonSelector) => {
  document.querySelector(inputSelector).addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    document.querySelector(buttonSelector).click();
  });
};

enterActivates('#recovery-email', '#send-reset-code');
enterActivates('#recovery-code', '#verify-reset-code');
enterActivates('#new-password', '#save-new-password');
enterActivates('#confirm-new-password', '#save-new-password');

document.querySelectorAll('[data-open-recovery]').forEach(button => {
  button.addEventListener('click', () => {
    const panel = document.querySelector('#password-recovery');
    panel.classList.remove('hidden');
    document.querySelector('#recovery-error').textContent = '';
    document.querySelector('#recovery-email').focus();
  });
});

// יוצר ושולח קוד אימות לשחזור סיסמה
document.querySelector('#send-reset-code').addEventListener('click', () => {
  const email = document.querySelector('#recovery-email').value.trim().toLowerCase();
  const error = document.querySelector('#recovery-error');
  if (!isValidEmail(email)) {
    pendingRecovery = null;
    error.textContent = 'כתובת הדואר האלקטרוני אינה תקינה';
    return;
  }
  const user = getUsers().find(u => u.email && u.email.toLowerCase() === email);
  if (!user) {
    pendingRecovery = null;
    error.textContent = 'לא נמצא משתמש עם כתובת הדואר האלקטרוני הזו';
    return;
  }

  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  pendingRecovery = { email, code: String(values[0] % 1000000).padStart(6, '0'), expiresAt: Date.now() + 10 * 60 * 1000 };
  document.querySelector('#verify-code-section').classList.remove('hidden');
  document.querySelector('#set-password-section').classList.add('hidden');
  document.querySelector('#recovery-code').value = '';
  error.textContent = '';
  alert(`קוד האימות שנשלח למייל שלך הוא: ${pendingRecovery.code}`);
});

// מאמת את קוד השחזור ומציג את שדות הסיסמה החדשה
document.querySelector('#verify-reset-code').addEventListener('click', () => {
  const error = document.querySelector('#recovery-error');
  const code = document.querySelector('#recovery-code').value.trim();
  if (!pendingRecovery || Date.now() > pendingRecovery.expiresAt) {
    pendingRecovery = null;
    error.textContent = 'קוד האימות פג תוקף. בקשי קוד חדש';
    return;
  }
  if (!/^\d{6}$/.test(code)) {
    error.textContent = 'יש להזין קוד אימות בן 6 ספרות';
    return;
  }
  if (code !== pendingRecovery.code) {
    error.textContent = 'קוד האימות שגוי';
    return;
  }
  document.querySelector('#set-password-section').classList.remove('hidden');
  error.textContent = '';
});

// שומר את הסיסמה החדשה לאחר אימות הקוד
document.querySelector('#save-new-password').addEventListener('click', () => {
  const error = document.querySelector('#recovery-error');
  const password = document.querySelector('#new-password').value;
  const confirmation = document.querySelector('#confirm-new-password').value;
  if (!pendingRecovery || Date.now() > pendingRecovery.expiresAt) {
    pendingRecovery = null;
    error.textContent = 'קוד האימות פג תוקף. התחילי את השחזור מחדש';
    return;
  }
  if (!isValidPassword(password)) return error.textContent = 'הסיסמה חייבת להכיל לפחות 4 תווים וללא רווחים';
  if (password !== confirmation) return error.textContent = 'הסיסמאות לא תואמות';

  const users = getUsers();
  const user = users.find(u => u.email && u.email.toLowerCase() === pendingRecovery.email);
  if (!user) {
    pendingRecovery = null;
    error.textContent = 'לא נמצא משתמש עם כתובת הדואר האלקטרוני הזו';
    return;
  }
  user.password = password;
  store.set('users', users);
  pendingRecovery = null;
  document.querySelector('#password-recovery').classList.add('hidden');
  showTab('login-form');
  document.querySelector('#login-user').value = user.username;
  document.querySelector('#login-pass').value = '';
  alert('הסיסמה עודכנה בהצלחה. כעת ניתן להתחבר עם הסיסמה החדשה.');
  document.querySelector('#login-pass').focus();
});
