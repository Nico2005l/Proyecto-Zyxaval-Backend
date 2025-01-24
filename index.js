const express = require('express');
const app = express();
const PORT = 5000; // Usamos un puerto diferente al 3000 para evitar conflictos.

const bcrypt = require('bcrypt'); // Para encriptar contraseñas
const crypto = require('crypto'); // Para generar tokens únicos

const cors = require('cors');

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

app.use(cors({
  origin: 'https://proyectozyxaval.vercel.app/', 
  methods: ['GET', 'POST', 'PUT','DELETE'], 
  credentials: true, // Si usas cookies o tokens
  allowedHeaders: ['Content-Type', 'Authorization', 'token'], // Asegúrate de permitir encabezados necesarios
}));

app.use(express.json()); // Middleware para analizar JSON.



// Crear tablas al iniciar el servidor
db.serialize(() => {

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password VARCHAR(255),
    token TEXT,
    pokemon TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS jars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    name TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS flies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jarId INTEGER,
    bodyColor TEXT
  )`);
  
});

module.exports = db;



app.get('/', (req, res) => {
  res.send('Backend funcionando correctamente!');
});

// Registro de usuarios
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10); // Encripta la contraseña
  const query = `INSERT INTO users (username, password) VALUES (?, ?)`;

  db.run(query, [username, hashedPassword], function (err) {
    if (err) return res.status(400).json({ error: 'El usuario ya existe' });
    res.status(201).json({ message: 'Usuario registrado' });
  });
});

// Login de usuarios
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = ?`;

  db.get(query, [username], async (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'Usuario no encontrado' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ error: 'Contraseña incorrecta' });

    // Generar un token simple y actualizarlo en la base de datos
    const token = crypto.randomBytes(16).toString('hex');
    db.run(`UPDATE users SET token = ? WHERE id = ?`, [token, user.id]);

    res.status(200).json({ messsage: 'Inicio de sesión exitoso', token });
  });
});

// Verificar sesión (opcional)
app.get('/profile', (req, res) => {
  const { token } = req.headers;

  const query = `SELECT username, pokemon FROM users WHERE token = ?`;
  db.get(query, [token], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Sesión no válida' });
    res.status(200).json({ message: 'Sesión activa', username: user.username, pokemon: user.pokemon });
  });
});

// Asignar un pokemon a un usuario
app.put('/profile', (req, res) => {
  const { token } = req.headers;
  const { pokemon } = req.body;

  const query = `UPDATE users SET pokemon = ? WHERE token = ?`;
  db.run(query, [pokemon, token], function (err) {
    if (err) return res.status(400).json({ error: 'Error al asignar el pokemon' });
    res.status(200).json({ message: 'Pokemon asignado' });
  });
});

// Crear un bote
app.post('/jars', (req, res) => {
  const { token} = req.headers;
  const { name } = req.body;

  const query = `SELECT id FROM users WHERE token = ?`;
  db.get(query, [token], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Sesión no válida' });

    const query = `INSERT INTO jars (userId, name) VALUES (?, ?)`;
    db.run(query, [user.id, name], function (err) {
      if (err) return res.status(400).json({ error: 'Error al crear el bote' });
      res.status(201).json({ message: 'Frasco creado' });
    });
  });
});

// Listar botes
app.get('/jars', (req, res) => {
  const { token } = req.headers;

  const query = `SELECT id FROM users WHERE token = ?`;
  db.get(query, [token], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Sesión no válida' });

    const query = `SELECT * FROM jars WHERE userId = ?`;
    db.all(query, [user.id], (err, jars) => {
      if (err) return res.status(400).json({ error: 'Error al listar los Frascos' });
      res.status(200).json(jars);
    });
  });
});

// Listar bote por id
app.get('/jars/:id', (req, res) => {
  const { token } = req.headers;
  const { id } = req.params;

  const query = `SELECT id FROM users WHERE token = ?`;
  db.get(query, [token], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Sesión no válida' });

    const query = `SELECT * FROM jars WHERE id = ? AND userId = ?`;
    db.get(query, [id, user.id], (err, jar) => {
      if (err) return res.status(400).json({ error: 'Error al listar el bote' });
      res.status(200).json(jar);
    });
  });
});

//Borrar bote
app.delete('/jars/:id', (req, res) => {
  const { token } = req.headers;
  const { id } = req.params;

  const query = `SELECT id FROM users WHERE token = ?`;
  db.get(query, [token], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Sesión no válida' });

    const query = `DELETE FROM jars WHERE id = ? AND userId = ?`;
    db.run(query, [id, user.id], function (err) {
      if (err) return res.status(400).json({ error: 'Error al borrar el bote' });
      res.status(200).json({ message: 'Bote borrado' });
    });
  });
});

//Modificar bote
app.put('/jars/:id', (req, res) => {
  const { token } = req.headers;
  const { id } = req.params;
  const { name } = req.body;

  const query = `SELECT id FROM users WHERE token = ?`;
  db.get(query, [token], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Sesión no válida' });

    const query = `UPDATE jars SET name = ? WHERE id = ? AND userId = ?`;
    db.run(query, [name, id, user.id], function (err) {
      if (err) return res.status(400).json({ error: 'Error al modificar el bote' });
      res.status(200).json({ message: 'Bote modificado' });
    });
  });
});

// Crear una mosca
app.post('/flies', (req, res) => {
  const { token } = req.headers;
  const { jarId, bodyColor } = req.body;

  const query = `SELECT id FROM users WHERE token = ?`;
  db.get(query, [token], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Sesión no válida' });

    const query = `INSERT INTO flies (jarId, bodyColor) VALUES (?, ?)`;
    db.run(query, [jarId, bodyColor], function (err) {
      if (err) return res.status(400).json({ error: 'Error al crear la mosca' });
      res.status(201).json({ message: 'Mosca creada' });
    });
  });
});

// Listar moscas
app.get('/flies/:jarId', (req, res) => {
  const { token } = req.headers;
  const { jarId } = req.params;

  const query = `SELECT id FROM users WHERE token = ?`;
  db.get(query, [token], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Sesión no válida' });

    const query = `SELECT * FROM flies WHERE jarId = ?`;
    db.all(query, [jarId], (err, flies) => {
      if (err) return res.status(400).json({ error: 'Error al listar las moscas' });
      res.status(200).json(flies);
    });
  });
});

// Borrar mosca
app.delete('/flies/:jarId/:id', (req, res) => {
  const { token } = req.headers;
  const { jarId, id } = req.params;

  const query = `SELECT id FROM users WHERE token = ?`;
  db.get(query, [token], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Sesión no válida' });

    const query = `DELETE FROM flies WHERE id = ? AND jarId = ?`;
    db.run(query, [id, jarId], function (err) {
      if (err) return res.status(400).json({ error: 'Error al borrar la mosca' });
      res.status(200).json({ message: 'Mosca borrada' });
    });
  });

});
  


app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});