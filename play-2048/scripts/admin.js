if (!isAdmin()) {
  alert('הגישה לדף הניהול מותרת למנהל בלבד');
  location.replace('login.html?tab=admin');
} else {
  const usersBody = document.querySelector('#users-body');
  const gamesBody = document.querySelector('#games-body');
  const sortSelect = document.querySelector('#user-sort');
  const addUserForm = document.querySelector('#add-user-form');
  const adminEmail = 'osnat9060@gmail.com';
  sortSelect.value = store.get('userSort', sortSelect.value);
  store.set('userSort', sortSelect.value);

  // יוצר תא בטבלה ומציב בו טקסט
  const makeCell = (text) => {
    const cell = document.createElement('td');
    cell.textContent = text;
    return cell;
  };

  // מציג זמן משחק בפורמט דקות ושניות
  const formatDuration = (seconds) => {
    const duration = Number(seconds);
    return Number.isFinite(duration)
      ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`
      : '—';
  };

  // מציג תאריך בפורמט המקומי
  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('he-IL');
  };

  // יוצר תא סיסמה עם אפשרות להצגה ולהסתרה
  const makePasswordCell = (password, username) => {
    const cell = document.createElement('td');
    const value = document.createElement('span');
    value.className = 'admin-password';
    value.textContent = '••••••••';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'text-button';
    toggle.textContent = 'הצג';
    toggle.setAttribute('aria-label', `הצגת סיסמת המשתמש ${username}`);
    let visible = false;
    toggle.addEventListener('click', () => {
      visible = !visible;
      value.textContent = visible ? (password || '—') : '••••••••';
      toggle.textContent = visible ? 'הסתר' : 'הצג';
      toggle.setAttribute('aria-label', `${visible ? 'הסתרת' : 'הצגת'} סיסמת המשתמש ${username}`);
    });
    cell.append(value, toggle);
    return cell;
  };

  // מרענן את טבלאות המשתמשים והמשחקים
  const renderUsers = () => {
    const users = getUsers();
    const scores = store.get('scores', []);
    const sort = sortSelect.value;
    // המיון משפיע על סדר התצוגה בלבד; הרשימה נשלפת מחדש מהאחסון בכל רענון.
    users.sort((a, b) => {
      if (sort === 'score-desc') return (Number(b.best) || 0) - (Number(a.best) || 0);
      if (sort === 'score-asc') return (Number(a.best) || 0) - (Number(b.best) || 0);
      return a.username.localeCompare(b.username, 'he');
    });

    const userRows = users.map((user, index) => {
      const row = document.createElement('tr');
      row.append(
        makeCell(index + 1),
        makeCell(user.username),
        makeCell(user.email || '—'),
        makeCell(user.phone || '—'),
        makePasswordCell(user.password, user.username)
      );
      const actionCell = document.createElement('td');
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'delete-user';
      deleteButton.textContent = '🗑';
      deleteButton.setAttribute('aria-label', `מחיקת המשתמש ${user.username}`);
      deleteButton.addEventListener('click', () => deleteUser(user));
      actionCell.appendChild(deleteButton);
      row.appendChild(actionCell);
      return row;
    });
    usersBody.replaceChildren(...userRows);
    document.querySelector('#no-users').textContent = users.length ? '' : 'עדיין לא נרשמו משתמשים.';

    const gameRows = [];
    let gameRowNumber = 0;
    users.forEach(user => {
      const userScores = scores.filter(score => score.username === user.username);
      // גם משתמש ללא משחקים מקבל שורה, כדי שפרטיו יישארו גלויים בטבלה.
      const entries = userScores.length ? userScores : [null];
      entries.forEach(score => {
        const row = document.createElement('tr');
        gameRowNumber++;
        row.append(
          makeCell(gameRowNumber),
          makeCell(user.username),
          makeCell(Number(user.best) || 0),
          makeCell(Number(user.last) || 0),
          makeCell(score ? score.score : '—'),
          makeCell(score ? (LEVELS[score.level] ? LEVELS[score.level].label : score.level || '—') : '—'),
          makeCell(score ? formatDuration(score.time) : '—'),
          makeCell(score ? formatDate(score.date) : '—')
        );
        gameRows.push(row);
      });
    });
    gamesBody.replaceChildren(...gameRows);
    document.querySelector('#no-games').textContent = gameRows.length ? '' : 'עדיין אין נתוני משחקים.';
  };

  // מוחק משתמש ואת נתוני המשחקים שלו לאחר אישור
  const deleteUser = (user) => {
    if (user.email && user.email.toLowerCase() === adminEmail) {
      alert('לא ניתן למחוק את חשבון המנהל המחובר');
      return;
    }
    if (!confirm(`למחוק את המשתמש ${user.username} ואת השיאים שלו?`)) return;

    store.set('users', getUsers().filter(item => item.username !== user.username));
    store.set('scores', store.get('scores', []).filter(score => score.username !== user.username));
    renderUsers();
  };

  document.querySelector('#toggle-add-user').addEventListener('click', () => {
    addUserForm.classList.toggle('hidden');
  });
  sortSelect.addEventListener('change', () => {
    store.set('userSort', sortSelect.value);
    renderUsers();
  });

  addUserForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const error = document.querySelector('#add-user-error');
    const username = document.querySelector('#new-user-name').value.trim();
    const email = document.querySelector('#new-user-email').value.trim();
    const phone = document.querySelector('#new-user-phone').value.trim();
    const password = document.querySelector('#new-user-password').value;
    const scoreValue = document.querySelector('#new-user-score').value.trim();
    const score = Number(scoreValue);
    const users = getUsers();

    // בודקים את הנתונים לפני הוספת המשתמש ועדכון האחסון.
    if (!isValidUsername(username)) {
      error.textContent = 'שם המשתמש חייב להכיל בין 2 ל־20 תווים';
      return;
    }
    if (!isValidEmail(email)) {
      error.textContent = 'כתובת הדואר האלקטרוני אינה תקינה';
      return;
    }
    if (!isValidPhone(phone)) {
      error.textContent = 'מספר הטלפון אינו תקין. יש להזין 7–15 ספרות';
      return;
    }
    if (!isValidPassword(password)) {
      error.textContent = 'הסיסמה חייבת להכיל לפחות 4 תווים וללא רווחים';
      return;
    }
    if (!scoreValue || !Number.isSafeInteger(score) || score < 0) {
      error.textContent = 'יש להזין ניקוד שלם שאינו שלילי';
      return;
    }
    if (users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
      error.textContent = 'שם המשתמש כבר תפוס';
      return;
    }
    if (users.some(user => user.email && user.email.toLowerCase() === email.toLowerCase())) {
      error.textContent = 'כתובת הדואר האלקטרוני כבר בשימוש';
      return;
    }
    users.push({ username, email, phone, password, best: score, last: score });
    store.set('users', users);
    addUserForm.reset();
    document.querySelector('#new-user-score').value = '0';
    error.textContent = '';
    addUserForm.classList.add('hidden');
    renderUsers();
  });

  renderUsers();
  // מרענן את הטבלאות כשמשתמש או ניקוד משתנים בלשונית אחרת.
  window.addEventListener('storage', event => {
    if (event.key === 'users' || event.key === 'scores') renderUsers();
  });
}
