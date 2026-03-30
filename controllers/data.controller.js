import pool from '../config/db.js';

export const getCountries = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM countries ORDER BY name ASC');
    res.json(rows);
  } catch(e) { res.status(500).json({error: e.message}); }
};

export const getCities = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM cities ORDER BY name ASC');
    res.json(rows);
  } catch(e) { res.status(500).json({error: e.message}); }
};

export const getCategories = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM categories ORDER BY id ASC');

    res.json(rows.map(r => ({ ...r, label: r.name, key: r.name })));
  } catch(e) { res.status(500).json({error: e.message}); }
};

export const getCountryByName = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM countries WHERE name ILIKE $1', [req.params.name]);
    if (rows.length === 0) return res.status(404).json({error: 'Country not found'});
    res.json(rows[0]);
  } catch(e) { res.status(500).json({error: e.message}); }
};
