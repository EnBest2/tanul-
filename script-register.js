document.addEventListener('DOMContentLoaded', () => {
  const registerBtn = document.getElementById('register-btn');
  registerBtn.addEventListener('click', async () => {
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.error) {
        alert(data.error);
      } else {
        alert(data.message);
        window.location.href = 'login.html';
      }
    } catch (err) {
      alert("Hiba történt: " + err);
    }
  });
});