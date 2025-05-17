document.addEventListener('DOMContentLoaded', () => {
  let learningCards = [];
  let currentLearnIndex = 0;
  let currentPDFLink = "";
  let currentImageLink = "";
  
  async function populateLearnSubtopics() {
    const subject = document.getElementById('learn-subject').value;
    const subtopicSelect = document.getElementById('learn-subtopic');
    subtopicSelect.innerHTML = "<option value=''>Válassz tételt</option>";
    if (!subject) return;
    const res = await fetch(`/api/flashcards?subject=${subject}`);
    const data = await res.json();
    if (data.flashcards && data.flashcards.length > 0) {
      const uniqueSubtopics = [...new Set(data.flashcards.map(fc => fc.subtopic))];
      uniqueSubtopics.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.textContent = sub;
        subtopicSelect.appendChild(opt);
      });
    }
  }
  
  document.getElementById('learn-subject').addEventListener('change', populateLearnSubtopics);
  
  async function startLearning() {
    const subject = document.getElementById('learn-subject').value;
    const subtopic = document.getElementById('learn-subtopic').value;
    if (!subject || !subtopic) {
      alert("Válaszd ki a tantárgyat és a tételt!");
      return;
    }
    const res = await fetch(`/api/flashcards?subject=${subject}&subtopic=${subtopic}`);
    const data = await res.json();
    if (data.flashcards && data.flashcards.length > 0) {
      learningCards = data.flashcards.sort(() => Math.random() - 0.5);
      currentLearnIndex = 0;
      showLearningCard();
      document.getElementById('learn-card-container').classList.remove('hidden');
      document.getElementById('next-card-btn').classList.add('hidden');
      const cardInner = document.querySelector('.card-inner');
      if (cardInner) cardInner.classList.remove('flipped');
    } else {
      alert("Nincs kártya ebben a tételben.");
    }
  }
  
  document.getElementById('start-learn-btn').addEventListener('click', startLearning);
  
  function showLearningCard() {
    if (currentLearnIndex < learningCards.length) {
      const card = learningCards[currentLearnIndex];
      document.getElementById('learn-question').textContent = card.question;
      document.getElementById('learn-answer').textContent = card.answer;
      currentPDFLink = card.pdf || "";
      currentImageLink = card.image || "";
    } else {
      alert("Nincsenek több kártya.");
      document.getElementById('learn-card-container').classList.add('hidden');
    }
  }
  
  document.getElementById('flip-card-btn').addEventListener('click', () => {
    const cardInner = document.querySelector('.card-inner');
    cardInner.classList.toggle('flipped');
    if (cardInner.classList.contains('flipped')) {
      setTimeout(() => { document.getElementById('next-card-btn').classList.remove('hidden'); }, 600);
    } else {
      document.getElementById('next-card-btn').classList.add('hidden');
    }
  });
  
  document.getElementById('next-card-btn').addEventListener('click', () => {
    const cardInner = document.querySelector('.card-inner');
    cardInner.classList.remove('flipped');
    document.getElementById('next-card-btn').classList.add('hidden');
    currentLearnIndex++;
    showLearningCard();
  });
  
  document.getElementById('open-attachments-btn').addEventListener('click', () => {
    if (currentPDFLink && currentImageLink) {
      const choice = prompt("Melyiket szeretnéd megnyitni? Írd be: 'pdf' vagy 'kép'");
      if (choice && choice.toLowerCase() === 'pdf') {
        window.open(currentPDFLink, '_blank');
      } else if (choice && (choice.toLowerCase() === 'kép' || choice.toLowerCase() === 'kep')) {
        window.open(currentImageLink, '_blank');
      } else {
        alert("Érvénytelen választás.");
      }
    } else if (currentPDFLink) {
      window.open(currentPDFLink, '_blank');
    } else if (currentImageLink) {
      window.open(currentImageLink, '_blank');
    } else {
      alert("Nincs elérhető fájl.");
    }
  });
});