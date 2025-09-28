
// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ejemplo de endpoints
app.get('/clients', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, email, phone FROM clients ORDER BY id DESC');
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

app.post('/clients', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email || !phone) return res.status(400).json({ error: 'name, email y phone son requeridos' });
    const { rows: exists } = await pool.query('SELECT id FROM clients WHERE email=$1', [email]);
    if (exists.length) return res.status(409).json({ error: 'Email ya existe' });
    const { rows } = await pool.query(
      'INSERT INTO clients(name,email,phone) VALUES($1,$2,$3) RETURNING id,name,email,phone',
      [name, email, phone]
    );
    res.status(201).json(rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error del servidor' }); }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
