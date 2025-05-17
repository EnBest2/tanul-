document.addEventListener('DOMContentLoaded', () => {
  const saveFlashcardBtn = document.getElementById('save-flashcard-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  
  saveFlashcardBtn.addEventListener('click', async () => {
    const subject = document.getElementById('flashcard-subject').value;
    const subtopic = document.getElementById('flashcard-subtopic').value.trim();
    const question = document.getElementById('question-input').value.trim();
    const answer = document.getElementById('answer-input').value.trim();
    
    if (!subject || !subtopic || !question || !answer) {
      alert("Minden mezőt tölts ki!");
      return;
    }
    
    let formData = new FormData();
    formData.append('subject', subject);
    formData.append('subtopic', subtopic);
    formData.append('question', question);
    formData.append('answer', answer);
    
    const pdfFile = document.getElementById('pdf-upload').files[0];
    const imageFile = document.getElementById('image-upload').files[0];
    if (pdfFile) formData.append('pdf', pdfFile);
    if (imageFile) formData.append('image', imageFile);
    
    const res = await fetch('/api/flashcards', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      alert(data.message);
      document.getElementById('flashcard-subtopic').value = "";
      document.getElementById('question-input').value = "";
      document.getElementById('answer-input').value = "";
      document.getElementById('pdf-upload').value = "";
      document.getElementById('image-upload').value = "";
    }
  });
  
  cancelEditBtn.addEventListener('click', () => {
    document.getElementById('flashcard-subtopic').value = "";
    document.getElementById('question-input').value = "";
    document.getElementById('answer-input').value = "";
    document.getElementById('pdf-upload').value = "";
    document.getElementById('image-upload').value = "";
  });
});