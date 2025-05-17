document.addEventListener('DOMContentLoaded', () => {
  // --- Autentikációs elemek ---
  const authContainer = document.getElementById('auth-container');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showRegisterLink = document.getElementById('show-register');
  const showLoginLink = document.getElementById('show-login');
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  
  // --- Alkalmazás elemek ---
  const appContainer = document.getElementById('app-container');
  const logoutBtn = document.getElementById('logout-btn');
  const navCreate = document.getElementById('nav-create');
  const navManage = document.getElementById('nav-manage');
  const navLearn = document.getElementById('nav-learn');
  
  // Szekciók
  const createSection = document.getElementById('create-section');
  const manageSection = document.getElementById('manage-section');
  const learnSection = document.getElementById('learn-section');
  
  // Create flashcard elemek
  const flashcardSubject = document.getElementById('flashcard-subject');
  const flashcardSubtopic = document.getElementById('flashcard-subtopic');
  const questionInput = document.getElementById('question-input');
  const answerInput = document.getElementById('answer-input');
  const pdfUpload = document.getElementById('pdf-upload');
  const imageUpload = document.getElementById('image-upload');
  const saveFlashcardBtn = document.getElementById('save-flashcard-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  
  // Manage flashcards elemek
  const flashcardsList = document.getElementById('flashcards-list');
  
  // Learning mode elemek
  const learnSubject = document.getElementById('learn-subject');
  const learnSubtopic = document.getElementById('learn-subtopic');
  const startLearnBtn = document.getElementById('start-learn-btn');
  const learnCardContainer = document.getElementById('learn-card-container');
  const learnCard = document.getElementById('learn-card');
  const learnQuestion = document.getElementById('learn-question');
  const learnAnswer = document.getElementById('learn-answer');
  const learnAttachments = document.getElementById('learn-attachments');
  const flipCardBtn = document.getElementById('flip-card-btn');
  const nextCardBtn = document.getElementById('next-card-btn');
  
  let currentUser = '';
  let editingId = null;
  
  // Tanulási módhoz: kártyák tömbje és aktuális kártya indexe
  let learningCards = [];
  let currentLearnIndex = 0;
  
  // --- Autentikáció váltása (login / regisztráció) ---
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
      currentUser = data.username;
      authContainer.classList.add('hidden');
      appContainer.classList.remove('hidden');
      showSection('create'); // alapértelmezett szekció: kártya létrehozás
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
  
  // Navigáció
  navCreate.addEventListener('click', () => {
    showSection('create');
  });
  navManage.addEventListener('click', () => {
    showSection('manage');
    loadFlashcards();
  });
  navLearn.addEventListener('click', () => {
    showSection('learn');
  });
  
  function showSection(section) {
    createSection.classList.add('hidden');
    manageSection.classList.add('hidden');
    learnSection.classList.add('hidden');
    if (section === 'create') {
      createSection.classList.remove('hidden');
    } else if (section === 'manage') {
      manageSection.classList.remove('hidden');
    } else if (section === 'learn') {
      learnSection.classList.remove('hidden');
    }
  }
  
  // Kártya létrehozás / frissítés
  saveFlashcardBtn.addEventListener('click', async () => {
    const subject = flashcardSubject.value;
    const subtopic = flashcardSubtopic.value.trim();
    const question = questionInput.value.trim();
    const answer = answerInput.value.trim();
    
    if (!subject || !subtopic || !question || !answer) {
      alert("Minden mezőt tölts ki (a fájlok opciósak)!");
      return;
    }
    
    let formData = new FormData();
    formData.append('subject', subject);
    formData.append('subtopic', subtopic);
    formData.append('question', question);
    formData.append('answer', answer);
    if (pdfUpload.files[0]) formData.append('pdf', pdfUpload.files[0]);
    if (imageUpload.files[0]) formData.append('image', imageUpload.files[0]);
    
    let url = '/api/flashcards';
    let method = 'POST';
    if (editingId) {
      url += '/' + editingId;
      method = 'PUT';
    }
    const res = await fetch(url, { method, body: formData });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      alert(data.message);
      resetCreateForm();
      loadFlashcards();
    }
  });
  
  // Szerkesztés megszakítása
  cancelEditBtn.addEventListener('click', () => {
    resetCreateForm();
  });
  
  function resetCreateForm() {
    editingId = null;
    flashcardSubtopic.value = '';
    questionInput.value = '';
    answerInput.value = '';
    pdfUpload.value = '';
    imageUpload.value = '';
    cancelEditBtn.classList.add('hidden');
    saveFlashcardBtn.textContent = "Kártya Mentése";
  }
  
  // Flashcard-ok betöltése (Manage rész)
  async function loadFlashcards() {
    const res = await fetch('/api/flashcards');
    const data = await res.json();
    flashcardsList.innerHTML = '';
    if (data.flashcards && data.flashcards.length > 0) {
      data.flashcards.forEach(fc => {
        const div = document.createElement('div');
        div.className = 'flashcard-item';
        div.innerHTML = `
          <p><strong>Tantárgy:</strong> ${fc.subject}</p>
          <p><strong>Tétel:</strong> ${fc.subtopic}</p>
          <p><strong>Kérdés:</strong> ${fc.question}</p>
          <p><strong>Válasz:</strong> ${fc.answer}</p>
        `;
        const editBtn = document.createElement('button');
        editBtn.textContent = "Szerkesztés";
        editBtn.className = "edit-btn";
        editBtn.addEventListener('click', () => {
          editingId = fc.id;
          flashcardSubject.value = fc.subject;
          flashcardSubtopic.value = fc.subtopic;
          questionInput.value = fc.question;
          answerInput.value = fc.answer;
          saveFlashcardBtn.textContent = "Frissítés";
          cancelEditBtn.classList.remove('hidden');
          showSection('create');
        });
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = "Törlés";
        deleteBtn.className = "delete-btn";
        deleteBtn.addEventListener('click', async () => {
          if (confirm("Biztosan törlöd a kártyát?")) {
            const res = await fetch('/api/flashcards/' + fc.id, { method: 'DELETE' });
            const result = await res.json();
            if (result.error) {
              alert(result.error);
            } else {
              alert(result.message);
              loadFlashcards();
            }
          }
        });
        div.appendChild(editBtn);
        div.appendChild(deleteBtn);
        flashcardsList.appendChild(div);
      });
    } else {
      flashcardsList.innerHTML = "<p>Nincs megjeleníthető kártya.</p>";
    }
  }
  
  // Tanulási mód
  startLearnBtn.addEventListener('click', async () => {
    const subject = learnSubject.value;
    const subtopic = learnSubtopic.value.trim();
    if (!subject || !subtopic) {
      alert("Töltsd ki a tantárgyat és a tételt!");
      return;
    }
    const res = await fetch(`/api/flashcards?subject=${subject}&subtopic=${subtopic}`);
    const data = await res.json();
    if (data.flashcards && data.flashcards.length > 0) {
      // Keverjük meg véletlenszerű sorrendbe (Fisher-Yates algoritmus)
      learningCards = data.flashcards.sort(() => Math.random() - 0.5);
      currentLearnIndex = 0;
      showLearningCard();
      learnCardContainer.classList.remove('hidden');
      nextCardBtn.classList.add('hidden');
      flipCard(false); // állítsuk alaphelyzetbe a flip-et
    } else {
      alert("Nincsenek kártyák ebben a tételben.");
    }
  });
  
  function showLearningCard() {
    if (currentLearnIndex < learningCards.length) {
      const card = learningCards[currentLearnIndex];
      learnQuestion.textContent = card.question;
      learnAnswer.textContent = card.answer;
      learnAttachments.innerHTML = "";
      if (card.pdf) {
        const pdfLink = document.createElement('a');
        pdfLink.href = card.pdf;
        pdfLink.textContent = "PDF megnyitása";
        pdfLink.target = "_blank";
        learnAttachments.appendChild(pdfLink);
      }
      if (card.image) {
        const imgLink = document.createElement('a');
        imgLink.href = card.image;
        imgLink.textContent = "Kép megtekintése";
        imgLink.target = "_blank";
        learnAttachments.appendChild(document.createElement('br'));
        learnAttachments.appendChild(imgLink);
      }
    } else {
      alert("Nincsenek több kártya.");
      learnCardContainer.classList.add('hidden');
    }
  }
  
  flipCardBtn.addEventListener('click', () => {
    flipCard(true);
  });
  
  function flipCard(showNext) {
    const cardInner = document.querySelector('.card-inner');
    cardInner.classList.toggle('flipped');
    if (showNext) {
      setTimeout(() => {
        nextCardBtn.classList.remove('hidden');
      }, 600);
    }
  }
  
  nextCardBtn.addEventListener('click', () => {
    const cardInner = document.querySelector('.card-inner');
    cardInner.classList.remove('flipped');
    nextCardBtn.classList.add('hidden');
    currentLearnIndex++;
    showLearningCard();
  });
});
