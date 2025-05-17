const express = require('express');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// Multer konfiguráció – minden fájl a jelenlegi könyvtárba kerül
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, __dirname); // közvetlenül a gyökérben tároljuk
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      let prefix = '';
      if (file.fieldname === 'pdf') prefix = 'pdf_';
      else if (file.fieldname === 'image') prefix = 'img_';
      cb(null, prefix + Date.now() + ext);
    }
  })
});

// Middleware beállítása
app.use(express.static(__dirname)); // minden statikus fájl a gyökérből érhető el
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'your-secret-key', // produkcióban érdemes ezt környezeti változóból olvasni
  resave: false,
  saveUninitialized: false
}));

// Az adatok tárolása JSON fájlokban a gyökérben
const usersFile = path.join(__dirname, 'users.json');
const flashcardsFile = path.join(__dirname, 'flashcards.json');

// JSON fájl beolvasása és írása segédfüggvényekkel
function readJSON(file) {
  if (!fs.existsSync(file)) {
    return [];
  }
  try {
    const data = fs.readFileSync(file);
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ----------------------
// FELHASZNÁLÓ AUTHENTIKÁCIÓ
// ----------------------

// Regisztráció – POST /api/register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields." });
  let users = readJSON(usersFile);
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: "Username already taken." });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ username, password: hashedPassword });
  writeJSON(usersFile, users);
  res.json({ message: "Registration successful!" });
});

// Bejelentkezés – POST /api/login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  let users = readJSON(usersFile);
  const user = users.find(u => u.username === username);
  if (!user) return res.status(400).json({ error: "No such user." });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Incorrect password." });
  req.session.user = { username };
  res.json({ message: "Login successful!", username });
});

// Kijelentkezés – POST /api/logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: "Logged out successfully." });
});

// Middleware: ellenőrzi, hogy a felhasználó be van-e jelentkezve
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: "Not authenticated." });
}

// -----------------------
// FLASHCARD API (LÉTREHOZÁS, SZERKESZTÉS, TÖRLÉS, LEKÉRÉS)
// -----------------------

// Flashcard létrehozása – POST /api/flashcards
app.post('/api/flashcards', isAuthenticated, upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), (req, res) => {
  const { category, question, answer } = req.body;
  if (!category || !question || !answer) return res.status(400).json({ error: "Category, question and answer required." });
  let flashcards = readJSON(flashcardsFile);
  const newFlashcard = {
    id: Date.now(),
    username: req.session.user.username,
    category,
    question,
    answer,
    pdf: req.files && req.files.pdf ? req.files.pdf[0].filename : null,
    image: req.files && req.files.image ? req.files.image[0].filename : null
  };
  flashcards.push(newFlashcard);
  writeJSON(flashcardsFile, flashcards);
  res.json({ message: "Flashcard created.", flashcard: newFlashcard });
});

// Flashcard-ok lekérése a bejelentkezett felhasználónak – GET /api/flashcards
app.get('/api/flashcards', isAuthenticated, (req, res) => {
  const { category } = req.query;
  let flashcards = readJSON(flashcardsFile);
  let userFlashcards = flashcards.filter(fc => fc.username === req.session.user.username);
  if (category) {
    userFlashcards = userFlashcards.filter(fc => fc.category === category);
  }
  res.json({ flashcards: userFlashcards });
});

// Flashcard szerkesztése – PUT /api/flashcards/:id
app.put('/api/flashcards/:id', isAuthenticated, upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), (req, res) => {
  const flashcardId = parseInt(req.params.id);
  let flashcards = readJSON(flashcardsFile);
  const index = flashcards.findIndex(fc => fc.id === flashcardId && fc.username === req.session.user.username);
  if (index === -1) return res.status(404).json({ error: "Flashcard not found." });

  const { category, question, answer } = req.body;
  if (category) flashcards[index].category = category;
  if (question) flashcards[index].question = question;
  if (answer) flashcards[index].answer = answer;
  // Ha új fájlok érkeznek, frissítjük a mezőket (az előző fájlokat egyszerűen megtartjuk, de itt lehetőség van azok törlésére is)
  if (req.files && req.files.pdf) {
    flashcards[index].pdf = req.files.pdf[0].filename;
  }
  if (req.files && req.files.image) {
    flashcards[index].image = req.files.image[0].filename;
  }
  writeJSON(flashcardsFile, flashcards);
  res.json({ message: "Flashcard updated.", flashcard: flashcards[index] });
});

// Flashcard törlése – DELETE /api/flashcards/:id
app.delete('/api/flashcards/:id', isAuthenticated, (req, res) => {
  const flashcardId = parseInt(req.params.id);
  let flashcards = readJSON(flashcardsFile);
  const index = flashcards.findIndex(fc => fc.id === flashcardId && fc.username === req.session.user.username);
  if (index === -1) return res.status(404).json({ error: "Flashcard not found." });
  const removed = flashcards.splice(index, 1);
  writeJSON(flashcardsFile, flashcards);
  res.json({ message: "Flashcard deleted.", flashcard: removed[0] });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
