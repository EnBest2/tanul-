document.addEventListener('DOMContentLoaded', () => {
  async function loadFlashcards() {
    const res = await fetch('/api/flashcards');
    const data = await res.json();
    const list = document.getElementById('flashcards-list');
    list.innerHTML = "";
    if (data.flashcards && data.flashcards.length > 0) {
      data.flashcards.forEach(fc => {
        const div = document.createElement('div');
        div.className = "flashcard-item";
        div.innerHTML = `
          <p><strong>Tantárgy:</strong> ${fc.subject}</p>
          <p><strong>Tétel:</strong> ${fc.subtopic}</p>
          <p><strong>Kérdés:</strong> ${fc.question}</p>
          <p><strong>Válasz:</strong> ${fc.answer}</p>
        `;
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = "Törlés";
        deleteBtn.className = "delete-btn";
        deleteBtn.addEventListener('click', async () => {
          if (confirm("Biztosan törlöd a kártyát?")) {
            const resDel = await fetch(`/api/flashcards/${fc.id}`, { method: 'DELETE' });
            const delData = await resDel.json();
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
      list.innerHTML = "<p>Nincs kártya.</p>";
    }
  }
  
  loadFlashcards();
});
