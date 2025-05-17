document.addEventListener('DOMContentLoaded', () => {
  // --- Elemek lekérése ---
  const authContainer = document.getElementById('auth-container');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showRegisterLink = document.getElementById('show-register');
  const showLoginLink = document.getElementById('show-login');
  const appContainer = document.getElementById('app-container');
  const userDisplay = document.getElementById('user-display');
  
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  const logoutBtn = document.getElementById('logout-btn');
  
  const saveFlashcardBtn = document.getElementById('save-flashcard-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const editingIdInput = document.getElementById('editing-id');
  const flashcardFormTitle = document.getElementById('flashcard-form-title');
  
  // Űrlap váltás
  showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
  });
  showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  });
  
  // Bejelentkezés
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
      userDisplay.textContent = data.username;
      authContainer.classList.add('hidden');
      appContainer.classList.remove('hidden');
      loadFlashcards();
    }
  });
  
  // Regisztráció
  registerBtn.addEventListener('click', async () => {
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
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
      registerForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
    }
  });
  
  // Kijelentkezés
  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    location.reload();
  });
  
  // Flashcard mentése (új vagy szerkesztett)
  saveFlashcardBtn.addEventListener('click', async () => {
    const category = document.getElementById('flashcard-category').value;
    const question = document.getElementById('question-input').value.trim();
    const answer = document.getElementById('answer-input').value.trim();
    const pdfFile = document.getElementById('pdf-upload').files[0];
    const imageFile = document.getElementById('image-upload').files[0];
    
    if (!category || !question || !answer) {
      alert("Kategória, kérdés és válasz kötelező!");
      return;
    }
    
    let formData = new FormData();
    formData.append('category', category);
    formData.append('question', question);
    formData.append('answer', answer);
    if (pdfFile) formData.append('pdf', pdfFile);
    if (imageFile) formData.append('image', imageFile);
    
    // Ellenőrzi, hogy új flashcard vagy szerkesztett flashcard
    const editingId = editingIdInput.value;
    let method = 'POST';
    let url = '/api/flashcards';
    if (editingId) {
      method = 'PUT';
      url += '/' + editingId;
    }
    
    const res = await fetch(url, {
      method,
      body: formData
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      alert(data.message);
      resetFlashcardForm();
      loadFlashcards();
    }
  });
  
  // Flashcard-ok betöltése
  async function loadFlashcards(category = '') {
    let url = '/api/flashcards';
    if (category) {
      url += '?category=' + category;
    }
    const res = await fetch(url);
    const result = await res.json();
    const list = document.getElementById('flashcards-list');
    list.innerHTML = '';
    if (result.flashcards && result.flashcards.length > 0) {
      result.flashcards.forEach(fc => {
        const div = document.createElement('div');
        div.className = 'flashcard';
        div.innerHTML = `
          <p><strong>Kategória:</strong> ${fc.category}</p>
          <p><strong>Kérdés:</strong> ${fc.question}</p>
          <p><strong>Válasz:</strong> ${fc.answer}</p>
        `;
        if (fc.pdf) {
          const pdfLink = document.createElement('a');
          pdfLink.href = fc.pdf;
          pdfLink.download = 'flashcard.pdf';
          pdfLink.textContent = 'PDF letöltése';
          div.appendChild(pdfLink);
        }
        if (fc.image) {
          const img = document.createElement('img');
          img.src = fc.image;
          img.alt = 'Feltöltött kép';
          div.appendChild(img);
        }
        // Szerkesztés gomb
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Szerkesztés';
        editBtn.addEventListener('click', () => {
          populateFlashcardForm(fc);
        });
        div.appendChild(editBtn);
        // Törlés gomb
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Törlés';
        deleteBtn.style.backgroundColor = '#dc3545';
        deleteBtn.addEventListener('click', async () => {
          if (confirm("Valóban törlöd a kártyát?")) {
            const delRes = await fetch('/api/flashcards/' + fc.id, {
              method: 'DELETE'
            });
            const delData = await delRes.json();
            if (delData.error) {
              alert(delData.error);
            } else {
              alert(delData.message);
              loadFlashcards();
            }
          }
        });
        div.appendChild(deleteBtn);
        list.appendChild(div);
      });
    } else {
      list.innerHTML = '<p>Nincs megjeleníthető kártya.</p>';
    }
  }
  
  // Kategória szűrés kezelése
  const categoryButtons = document.querySelectorAll('.category-btn');
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-category');
      loadFlashcards(cat);
    });
  });
  
  // Flashcard űrlap szerkesztéshez: kitölti a mezőket a kiválasztott kártya adataival
  function populateFlashcardForm(fc) {
    editingIdInput.value = fc.id;
    document.getElementById('flashcard-category').value = fc.category;
    document.getElementById('question-input').value = fc.question;
    document.getElementById('answer-input').value = fc.answer;
    flashcardFormTitle.textContent = "Flashcard Szerkesztése";
    cancelEditBtn.classList.remove('hidden');
  }
  
  // Űrlap visszaállítása új kártya beviteléhez
  function resetFlashcardForm() {
    editingIdInput.value = '';
    document.getElementById('flashcard-category').value = 'toroknelem';
    document.getElementById('question-input').value = '';
    document.getElementById('answer-input').value = '';
    document.getElementById('pdf-upload').value = '';
    document.getElementById('image-upload').value = '';
    flashcardFormTitle.textContent = "Új Tanuló Kártya";
    cancelEditBtn.classList.add('hidden');
  }
  
  // Mégse gomb az űrlapnál (szerkesztés visszavonása)
  cancelEditBtn.addEventListener('click', () => {
    resetFlashcardForm();
  });
});
