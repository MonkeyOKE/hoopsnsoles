const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const db = new sqlite3.Database('database.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS stats (
    id INTEGER PRIMARY KEY,
    pairs_collected INTEGER DEFAULT 0,
    pairs_placed INTEGER DEFAULT 0,
    schools_served INTEGER DEFAULT 0
  )`);
  db.get('SELECT * FROM stats WHERE id = 1', (err, row) => {
    if (!row) {
      db.run('INSERT INTO stats (id, pairs_collected, pairs_placed, schools_served) VALUES (1, 0, 0, 0)');
    }
  });
  db.run(`CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    size TEXT,
    type TEXT,
    message TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    phone TEXT,
    size TEXT,
    type TEXT,
    message TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS volunteers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    role TEXT,
    message TEXT
  )`);
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false
}));

function requireLogin(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/admin/login');
}

app.get('/', (req, res) => {
  db.get('SELECT * FROM stats WHERE id = 1', (err, stats) => {
    res.render('index', { stats });
  });
});

app.get('/donate', (req, res) => {
  res.render('donate', { message: null });
});
app.post('/donate', (req, res) => {
  const { name, email, phone, address, size, type, message } = req.body;
  db.run('INSERT INTO donations (name, email, phone, address, size, type, message) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, email, phone, address, size, type, message],
    () => {
      res.render('donate', { message: 'Thanks for offering your shoes! We will be in touch.' });
    });
});

app.get('/get-shoes', (req, res) => {
  res.render('get', { message: null });
});
app.post('/get-shoes', (req, res) => {
  const { name, email, phone, size, type, message } = req.body;
  db.run('INSERT INTO requests (name, email, phone, size, type, message) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, phone, size, type, message],
    () => {
      res.render('get', { message: 'Your request has been submitted.' });
    });
});

app.get('/volunteer', (req, res) => {
  res.render('volunteer', { message: null });
});
app.post('/volunteer', (req, res) => {
  const { name, email, role, message } = req.body;
  db.run('INSERT INTO volunteers (name, email, role, message) VALUES (?, ?, ?, ?)',
    [name, email, role, message],
    () => {
      res.render('volunteer', { message: 'Thank you for offering to help!' });
    });
});

app.get('/impact', (req, res) => {
  db.get('SELECT * FROM stats WHERE id = 1', (err, stats) => {
    res.render('impact', { stats });
  });
});
app.get('/partners', (req, res) => {
  res.render('partners');
});
app.get('/about', (req, res) => {
  res.render('about');
});
app.get('/faq', (req, res) => {
  res.render('faq');
});
app.get('/contact', (req, res) => {
  res.render('contact');
});

app.get('/admin/login', (req, res) => {
  res.render('login', { error: null });
});
app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    req.session.user = email;
    return res.redirect('/admin');
  }
  res.render('login', { error: 'Invalid credentials' });
});

app.get('/admin', requireLogin, (req, res) => {
  db.all('SELECT * FROM donations', (err, donations) => {
    db.all('SELECT * FROM requests', (err2, requests) => {
      db.all('SELECT * FROM volunteers', (err3, volunteers) => {
        db.get('SELECT * FROM stats WHERE id = 1', (err4, stats) => {
          res.render('admin', { donations, requests, volunteers, stats });
        });
      });
    });
  });
});
app.post('/admin/stats', requireLogin, (req, res) => {
  const { pairs_collected, pairs_placed, schools_served } = req.body;
  db.run('UPDATE stats SET pairs_collected = ?, pairs_placed = ?, schools_served = ? WHERE id = 1',
    [pairs_collected, pairs_placed, schools_served],
    () => {
      res.redirect('/admin');
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
