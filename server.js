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

// CLIENTS
app.post('/clients', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email || !phone) return res.status(400).json({ error: 'name, email y phone son requeridos' });
    const { rows: exists } = await pool.query('SELECT id FROM clients WHERE email = $1', [email]);
    if (exists.length) return res.status(409).json({ error: 'Email ya existe' });
    const { rows } = await pool.query(
      'INSERT INTO clients(name, email, phone) VALUES ($1, $2, $3) RETURNING id, name, email, phone',
      [name, email, phone]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/clients', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, email, phone FROM clients ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ORDERS
app.post('/orders', async (req, res) => {
  try {
    const { client_id, dish_name, notes } = req.body;
    if (!client_id || !dish_name) return res.status(400).json({ error: 'client_id y dish_name son requeridos' });
    const { rows: c } = await pool.query('SELECT id FROM clients WHERE id = $1', [client_id]);
    if (!c.length) return res.status(404).json({ error: 'Cliente no existe' });
    const { rows } = await pool.query(
      `INSERT INTO orders(client_id, dish_name, notes) 
       VALUES ($1, $2, $3) 
       RETURNING id, client_id, dish_name, notes, status, created_at`,
      [client_id, dish_name, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/orders/:clientId', async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);
    if (Number.isNaN(clientId)) return res.status(400).json({ error: 'clientId inválido' });
    const { rows } = await pool.query(
      `SELECT id, client_id, dish_name, notes, status, created_at 
       FROM orders WHERE client_id = $1 ORDER BY created_at DESC`,
      [clientId]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

function nextStatus(s) {
  if (s === 'pending') return 'in_progress';
  if (s === 'in_progress') return 'done';
  return 'done';
}

app.put('/orders/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });
    const { rows: curr } = await pool.query('SELECT id, status FROM orders WHERE id = $1', [id]);
    if (!curr.length) return res.status(404).json({ error: 'Orden no encontrada' });
    const newStatus = nextStatus(curr[0].status);
    const { rows } = await pool.query(
      `UPDATE orders SET status = $1 WHERE id = $2 
       RETURNING id, client_id, dish_name, notes, status, created_at`,
      [newStatus, id]
    );
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
