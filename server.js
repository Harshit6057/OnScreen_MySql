require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// DB connection pool — credentials come from .env, never sent to client
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,  
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
  const { fullname, email, password } = req.body;

  if (!fullname || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const db = process.env.DB_NAME;
    console.log('Querying DB:', db, '| email:', email);

    const [existing] = await pool.query(
      `SELECT id FROM \`${db}\`.users WHERE email = ?`, [email]
    );
    console.log('Existing rows found:', existing.length);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      `INSERT INTO \`${db}\`.users (fullname, email, password_hash) VALUES (?, ?, ?)`,
      [fullname, email, hashed]
    );
    console.log('Insert result — insertId:', result.insertId);

    res.status(201).json({ message: 'Registration successful!' });
  } catch (err) {
    console.error('DB error:', err.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Connected to DB: ${process.env.DB_NAME} on ${process.env.DB_HOST}`);
});
