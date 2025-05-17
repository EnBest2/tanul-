const express = require('express');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// Multer konfiguráció: A feltöltött fájlok a projekt gyökérében lesznek elmentve,
// a PDF fájloknál "pdf_" és a képeknél "img_" előtaggal.
const upload = multer({
  storage: multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, __dirname);
    },
    filename: function(req, file, cb) {
      let prefix = '';
      const ext = path.extname(file.originalname);
      if (file.fieldname === 'pdf') prefix = 'pdf_';
      else if (file.fieldname === 'image') prefix = 'img_';
      cb(null, prefix + Date.now() + ext);
    }
  })
});

// Middleware-ok
app.use(express.static(__dirname)); // statikus fájlok a gyökérből
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Adatok tárolása JSON fájlokban (users.json és flashcards.json)
const usersFile = path.join(__dirname, 'users.json');
const flashcardsFile = path.join(__dirname, 'flashcards.json');

// Segédfüggvények a JSON fájlok olvasásához és írásához
function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}
function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// -------------------------
// FELHASZNÁLÓ AUTHENTIKÁCIÓ
// -------------------------

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Missing fields" });
  let users = readJSON(usersFile);
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: "Username already taken" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ username, password: hashedPassword });
  writeJSON(usersFile, users);
  res.json({ message: "Registration successful" });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  let users = readJSON(usersFile);
  const user = users.find(u => u.username === username);
  if (!user) return res.status(400).json({ error: "User not found" });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Incorrect password" });
  req.session.user = { username };
  res.json({ message: "Login successful", username });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: "Logged out" });
});

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: "Not authenticated" });
}

// -------------------------
// FLASHCARD ENDPOINTOK
// -------------------------

// Flashcard létrehozása
app.post('/api/flashcards', isAuthenticated, upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), (req, res) => {
  const { subject, subtopic, question, answer } = req.body;
  if (!subject || !subtopic || !question || !answer)
    return res.status(400).json({ error: "Subject, subtopic, question and answer required" });
  let flashcards = readJSON(flashcardsFile);
  const newFlashcard = {
    id: Date.now(),
    username: req.session.user.username,
    subject,
    subtopic,
    question,
    answer,
    pdf: req.files && req.files.pdf ? req.files.pdf[0].filename : null,
    image: req.files && req.files.image ? req.files.image[0].filename : null
  };
  flashcards.push(newFlashcard);
  writeJSON(flashcardsFile, flashcards);
  res.json({ message: "Flashcard created", flashcard: newFlashcard });
});

// Flashcard-ok lekérése (szűrés subject és subtopic alapján)
app.get('/api/flashcards', isAuthenticated, (req, res) => {
  const { subject, subtopic } = req.query;
  let flashcards = readJSON(flashcardsFile);
  let userFlashcards = flashcards.filter(fc => fc.username === req.session.user.username);
  if (subject) {
    userFlashcards = userFlashcards.filter(fc => fc.subject === subject);
  }
  if (subtopic) {
    userFlashcards = userFlashcards.filter(fc => fc.subtopic === subtopic);
  }
  res.json({ flashcards: userFlashcards });
});

// Flashcard szerkesztése
app.put('/api/flashcards/:id', isAuthenticated, upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), (req, res) => {
  const flashcardId = parseInt(req.params.id);
  let flashcards = readJSON(flashcardsFile);
  const index = flashcards.findIndex(fc => fc.id === flashcardId && fc.username === req.session.user.username);
  if (index === -1) return res.status(404).json({ error: "Flashcard not found" });
  const { subject, subtopic, question, answer } = req.body;
  if (subject) flashcards[index].subject = subject;
  if (subtopic) flashcards[index].subtopic = subtopic;
  if (question) flashcards[index].question = question;
  if (answer) flashcards[index].answer = answer;
  if (req.files && req.files.pdf) {
    flashcards[index].pdf = req.files.pdf[0].filename;
  }
  if (req.files && req.files.image) {
    flashcards[index].image = req.files.image[0].filename;
  }
  writeJSON(flashcardsFile, flashcards);
  res.json({ message: "Flashcard updated", flashcard: flashcards[index] });
});

// Flashcard törlése
app.delete('/api/flashcards/:id', isAuthenticated, (req, res) => {
  const flashcardId = parseInt(req.params.id);
  let flashcards = readJSON(flashcardsFile);
  const index = flashcards.findIndex(fc => fc.id === flashcardId && fc.username === req.session.user.username);
  if (index === -1) return res.status(404).json({ error: "Flashcard not found" });
  const removed = flashcards.splice(index, 1);
  writeJSON(flashcardsFile, flashcards);
  res.json({ message: "Flashcard deleted", flashcard: removed[0] });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
