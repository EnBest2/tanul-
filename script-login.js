document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('login-btn');
  loginBtn.addEventListener('click', async () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      // Bejelentkezés után a flashcard létrehozás oldalon folytassuk (create.html)
      window.location.href = 'create.html';
    }
  });
});
