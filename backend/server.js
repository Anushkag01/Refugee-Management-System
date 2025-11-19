
const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;


app.post('/api/signup', async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.username || !payload.password || !payload.role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    
    const [rows] = await conn.query('SELECT user_id FROM Users WHERE username = ?', [payload.username]);
    if (rows.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'username_taken' });
    }

    
    const hash = await bcrypt.hash(payload.password, 10);

    
    let insertProfileResult = null;
    if (payload.role === 'Volunteer') {
      const [r] = await conn.query(
        'INSERT INTO Volunteer (first_name, last_name, domain, availability) VALUES (?, ?, ?, ?)',
        [payload.first_name || '', payload.last_name || '', payload.domain || null, payload.availability || 'On-call']
      );
      insertProfileResult = { volunteer_id: r.insertId };
    } else if (payload.role === 'Refugee') {
      
      const [r] = await conn.query(
        'INSERT INTO Refugee (first_name, middle_name, last_name, date_of_birth, country_of_origin, status, skills) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [payload.first_name || '', payload.middle_name || null, payload.last_name || '', payload.date_of_birth || null, payload.country_of_origin || null, 'Registered', payload.skills || null]
      );
      insertProfileResult = { refugee_id: r.insertId };
    } else if (payload.role === 'Donor') {
      const [r] = await conn.query(
        'INSERT INTO Donor (donor_name) VALUES (?)',
        [payload.donor_name || payload.username]
      );
      insertProfileResult = { donor_id: r.insertId };
    } else {
      await conn.rollback();
      return res.status(400).json({ error: 'unsupported_role' });
    }

  
  const userInsertSql = `INSERT INTO Users (username, password_hash, role, volunteer_id, refugee_id, donor_id) VALUES (?, ?, ?, ?, ?, ?)`;
  const volunteerId = insertProfileResult.volunteer_id || null;
  const refugeeId = insertProfileResult.refugee_id || null;
  const donorId = insertProfileResult.donor_id || null;

  const [userIns] = await conn.query(userInsertSql, [payload.username, hash, payload.role, volunteerId, refugeeId, donorId]);
  const userId = userIns.insertId;

  await conn.commit();
  
  return res.json({ success: true, user: { user_id: userId, username: payload.username, role: payload.role, volunteer_id: volunteerId, refugee_id: refugeeId, donor_id: donorId } });
  } catch (err) {
    await conn.rollback();
    console.error('Signup error', err);
    return res.status(500).json({ error: 'server_error' });
  } finally {
    conn.release();
  }
});


app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'missing' });

  try {
    const [rows] = await pool.query('SELECT * FROM Users WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ error: 'invalid' });
    const u = rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid' });

    
    const profile = { user_id: u.user_id, username: u.username, role: u.role };
    if (u.volunteer_id) profile.volunteer_id = u.volunteer_id;
    if (u.refugee_id) profile.refugee_id = u.refugee_id;
    if (u.donor_id) profile.donor_id = u.donor_id;

    return res.json({ success: true, user: profile });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});




app.post('/api/refugees', async (req, res) => {
  const p = req.body || {};
  if (!p.first_name || !p.last_name) return res.status(400).json({ error: 'missing' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (p.camp_id) {
      
      const [ins] = await conn.query(
        'INSERT INTO Refugee (first_name, middle_name, last_name, date_of_birth, country_of_origin, status, skills, camp_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [p.first_name, p.middle_name || null, p.last_name, p.date_of_birth || null, p.country_of_origin || null, p.status || 'Registered', p.skills || null, p.camp_id]
      );
      
      const [[{ id }]] = await conn.query('SELECT LAST_INSERT_ID() as id');
      await conn.commit();
      return res.json({ success: true, refugee_id: id });
    } else {
      
      await conn.query('CALL AddNewRefugee(?, ?, ?, ?)', [p.first_name, p.last_name, p.date_of_birth || null, p.country_of_origin || null]);
      const [[{ id }]] = await conn.query('SELECT LAST_INSERT_ID() as id');
      await conn.commit();
      return res.json({ success: true, refugee_id: id });
    }
  } catch (err) {
    await conn.rollback();
    console.error('Create refugee error', err);
    return res.status(500).json({ error: 'server_error' });
  } finally {
    conn.release();
  }
});


app.get('/api/camps', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT camp_id, camp_name, city, capacity, current_occupancy FROM Camp');
    return res.json({ success: true, camps: rows });
  } catch (err) {
    console.error('GET camps error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/refugees', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT refugee_id, first_name, middle_name, last_name, date_of_birth, country_of_origin, status, skills, registration_date, camp_id FROM Refugee');
    return res.json({ success: true, refugees: rows });
  } catch (err) {
    console.error('GET refugees error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/volunteers', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT v.volunteer_id, v.first_name, v.last_name, v.domain, v.availability,
        (
          SELECT a.camp_id FROM Volunteer_Camp_Assignment a
          WHERE a.volunteer_id = v.volunteer_id
          ORDER BY a.assignment_id DESC LIMIT 1
        ) AS assigned_camp_id
      FROM Volunteer v
    `);
    return res.json({ success: true, volunteers: rows });
  } catch (err) {
    console.error('GET volunteers error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/donors', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT donor_id, donor_name FROM Donor');
    return res.json({ success: true, donors: rows });
  } catch (err) {
    console.error('GET donors error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});


async function ensureDonationsTable() {
  try {
    
    
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Donations (
        donation_id INT AUTO_INCREMENT PRIMARY KEY,
        donor_id INT DEFAULT NULL,
        amount DECIMAL(12,2) DEFAULT NULL,
        amount_inr INT DEFAULT NULL,
        donation_type VARCHAR(64) DEFAULT 'Financial',
        organization_name VARCHAR(255) DEFAULT NULL,
        donation_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Donations'`
    );
    const present = new Set((cols || []).map(r => r.COLUMN_NAME));

    
    async function addIfMissing(name, definition) {
      if (!present.has(name)) {
        try {
          await pool.query(`ALTER TABLE Donations ADD COLUMN ${definition}`);
          console.info(`Added missing Donations column: ${name}`);
        } catch (e) {
          console.warn(`Failed to add column ${name} to Donations`, e.message || e);
        }
      }
    }

    
    await addIfMissing('quantity', 'quantity INT DEFAULT NULL');
    await addIfMissing('amount_inr', 'amount_inr INT DEFAULT NULL');
    await addIfMissing('donation_type', "donation_type VARCHAR(64) DEFAULT 'Financial'");
    await addIfMissing('organization_name', "organization_name VARCHAR(255) DEFAULT NULL");
    await addIfMissing('donation_date', 'donation_date DATE');

  } catch (err) {
    console.error('Could not ensure Donations table', err);
  }
}


app.post('/api/donations', async (req, res) => {
  const p = req.body || {};
  const donation_type = p.donation_type || 'Financial';
  
  if (donation_type === 'Financial') {
    if (p.amount === undefined || p.amount === null) return res.status(400).json({ error: 'missing_amount' });
  } else {
    if (!p.quantity) return res.status(400).json({ error: 'missing_quantity' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    let donorId = p.donor_id || null;
    if (donorId) {
      
      const [dr] = await conn.query('SELECT donor_id FROM Donor WHERE donor_id = ?', [donorId]);
      if (dr.length === 0) {
        donorId = null; 
      }
    }
    if (!donorId) {
      if (p.donor_name) {
        
        const [found] = await conn.query('SELECT donor_id FROM Donor WHERE donor_name = ? LIMIT 1', [p.donor_name]);
        if (found.length > 0) donorId = found[0].donor_id;
        else {
          const [ins] = await conn.query('INSERT INTO Donor (donor_name) VALUES (?)', [p.donor_name]);
          donorId = ins.insertId;
          
          try { await conn.query('INSERT INTO Users (username, password_hash, role, donor_id) VALUES (?, ?, ?, ?)', [p.donor_name, '', 'Donor', donorId]); } catch (e) {}
        }
      } else {
        
        const [ins] = await conn.query('INSERT INTO Donor (donor_name) VALUES (?)', ['Anonymous']);
        donorId = ins.insertId;
      }
    }

    await ensureDonationsTable();

    const amount = p.amount !== undefined && p.amount !== null ? parseFloat(p.amount) : null;
    const quantity = p.quantity ? parseInt(p.quantity, 10) : null;
    const amount_inr = p.amount_inr ? parseInt(p.amount_inr, 10) : (amount ? Math.round(amount * (process.env.USD_TO_INR ? parseFloat(process.env.USD_TO_INR) : 83)) : null);
    const donation_type = p.donation_type || 'Financial';
    const organization_name = p.organization_name || null;
    const donation_date = p.donation_date || new Date().toISOString().split('T')[0];

    const [result] = await conn.query(
      'INSERT INTO Donations (donor_id, amount, amount_inr, quantity, donation_type, organization_name, donation_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [donorId, amount, amount_inr, quantity, donation_type, organization_name, donation_date]
    );
    await conn.commit();
    return res.json({ success: true, donation_id: result.insertId });
  } catch (err) {
    await conn.rollback();
    console.error('POST donation error', err);
    return res.status(500).json({ error: 'server_error' });
  } finally {
    conn.release();
  }
});


app.get('/api/donations', async (req, res) => {
  const donorId = req.query.donor_id ? parseInt(req.query.donor_id, 10) : null;
  try {
    await ensureDonationsTable();
    if (donorId) {
      const [rows] = await pool.query('SELECT * FROM Donations WHERE donor_id = ? ORDER BY created_at DESC', [donorId]);
      return res.json({ success: true, donations: rows });
    } else {
      const [rows] = await pool.query('SELECT * FROM Donations ORDER BY created_at DESC');
      return res.json({ success: true, donations: rows });
    }
  } catch (err) {
    console.error('GET donations error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});



app.delete('/api/refugees/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'invalid_id' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const [rows] = await conn.query('SELECT camp_id FROM Refugee WHERE refugee_id = ?', [id]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'not_found' });
    }
    const campId = rows[0].camp_id;

    
    await conn.query('DELETE FROM Aid_Distribution WHERE refugee_id = ?', [id]);

    
    await conn.query('DELETE FROM Refugee WHERE refugee_id = ?', [id]);

    
    if (campId) {
      await conn.query('UPDATE Camp SET current_occupancy = GREATEST(0, current_occupancy - 1) WHERE camp_id = ?', [campId]);
    }

    await conn.commit();
    return res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('DELETE refugee error', err);
    return res.status(500).json({ error: 'server_error' });
  } finally {
    conn.release();
  }
});

app.listen(PORT, () => {
  console.log(`RMS demo API listening on port ${PORT}`);
});
