const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;
const STORE = path.join(__dirname, 'data', 'donor_store.json');

function ensureStore(){
  const dir = path.dirname(STORE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(STORE)) fs.writeFileSync(STORE, JSON.stringify({ donors: [], donations: [] }, null, 2));
}

function readStore(){
  ensureStore();
  const raw = fs.readFileSync(STORE, 'utf8');
  try { return JSON.parse(raw); } catch (e) { return { donors: [], donations: [] }; }
}

function writeStore(data){
  fs.writeFileSync(STORE, JSON.stringify(data, null, 2));
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/status', (req, res) => res.json({ ok: true, port: PORT }));

app.get('/donors', (req, res) => {
  const store = readStore();
  res.json({ success: true, donors: store.donors });
});


app.get('/api/donors', (req, res) => {
  const store = readStore();
  res.json({ success: true, donors: store.donors });
});

app.get('/donations', (req, res) => {
  const store = readStore();
  const donor_id = req.query.donor_id ? parseInt(req.query.donor_id, 10) : null;
  let list = store.donations || [];
  if (donor_id) list = list.filter(d => d.donor_id === donor_id);
  res.json({ success: true, donations: list });
});

app.get('/api/donations', (req, res) => {
  const store = readStore();
  const donor_id = req.query.donor_id ? parseInt(req.query.donor_id, 10) : null;
  let list = store.donations || [];
  if (donor_id) list = list.filter(d => d.donor_id === donor_id);
  res.json({ success: true, donations: list });
});

app.post('/donations', (req, res) => {
  const p = req.body || {};
  if (!p.donor_name && !p.donor_id) return res.status(400).json({ error: 'missing donor_name or donor_id' });
  
  if (p.donation_type === 'Financial') {
    if (p.amount === undefined || p.amount === null) return res.status(400).json({ error: 'missing_amount' });
  } else {
    if (p.quantity === undefined || p.quantity === null) return res.status(400).json({ error: 'missing_quantity' });
  }

  const store = readStore();
  let donorId = p.donor_id || null;
  if (donorId) {
    const found = store.donors.find(d => d.donor_id === donorId);
    if (!found) donorId = null;
  }
  if (!donorId) {
    if (p.donor_name) {
      const found = store.donors.find(d => d.donor_name.toLowerCase() === p.donor_name.toLowerCase());
      if (found) donorId = found.donor_id;
      else {
        donorId = (store.donors.reduce((m,d)=>Math.max(m,d.donor_id||0),0) || 0) + 1;
        const don = { donor_id: donorId, donor_name: p.donor_name, organization_name: p.organization_name || null };
        store.donors.push(don);
      }
    } else {
      donorId = (store.donors.reduce((m,d)=>Math.max(m,d.donor_id||0),0) || 0) + 1;
      store.donors.push({ donor_id: donorId, donor_name: 'Anonymous' });
    }
  }

  const donationId = (store.donations.reduce((m,d)=>Math.max(m,d.donation_id||0),0) || 0) + 1;
  const donation = {
    donation_id: donationId,
    donor_id: donorId,
    amount: p.amount !== undefined && p.amount !== null ? Number(p.amount) : null,
    amount_inr: p.amount_inr !== undefined && p.amount_inr !== null ? Number(p.amount_inr) : (p.amount ? Math.round(Number(p.amount)*83) : null),
    quantity: p.quantity !== undefined && p.quantity !== null ? Number(p.quantity) : null,
    donation_type: p.donation_type || 'Financial',
    organization_name: p.organization_name || null,
    donation_date: p.donation_date || (new Date().toISOString()),
    created_at: new Date().toISOString()
  };
  store.donations.push(donation);
  writeStore(store);
  res.json({ success: true, donation_id: donationId });
});

app.post('/api/donations', (req, res) => {
  
  const p = req.body || {};
  
  if (!p.donor_name && !p.donor_id) return res.status(400).json({ error: 'missing donor_name or donor_id' });
  if (p.donation_type === 'Financial') {
    if (p.amount === undefined || p.amount === null) return res.status(400).json({ error: 'missing_amount' });
  } else {
    if (p.quantity === undefined || p.quantity === null) return res.status(400).json({ error: 'missing_quantity' });
  }
  const store = readStore();
  let donorId = p.donor_id || null;
  if (donorId) {
    const found = store.donors.find(d => d.donor_id === donorId);
    if (!found) donorId = null;
  }
  if (!donorId) {
    if (p.donor_name) {
      const found = store.donors.find(d => d.donor_name.toLowerCase() === p.donor_name.toLowerCase());
      if (found) donorId = found.donor_id;
      else {
        donorId = (store.donors.reduce((m,d)=>Math.max(m,d.donor_id||0),0) || 0) + 1;
        const don = { donor_id: donorId, donor_name: p.donor_name, organization_name: p.organization_name || null };
        store.donors.push(don);
      }
    } else {
      donorId = (store.donors.reduce((m,d)=>Math.max(m,d.donor_id||0),0) || 0) + 1;
      store.donors.push({ donor_id: donorId, donor_name: 'Anonymous' });
    }
  }
  const donationId = (store.donations.reduce((m,d)=>Math.max(m,d.donation_id||0),0) || 0) + 1;
  const donation = {
    donation_id: donationId,
    donor_id: donorId,
    amount: p.amount !== undefined && p.amount !== null ? Number(p.amount) : null,
    amount_inr: p.amount_inr !== undefined && p.amount_inr !== null ? Number(p.amount_inr) : (p.amount ? Math.round(Number(p.amount)*83) : null),
    quantity: p.quantity !== undefined && p.quantity !== null ? Number(p.quantity) : null,
    donation_type: p.donation_type || 'Financial',
    organization_name: p.organization_name || null,
    donation_date: p.donation_date || (new Date().toISOString()),
    created_at: new Date().toISOString()
  };
  store.donations.push(donation);
  writeStore(store);
  res.json({ success: true, donation_id: donationId });
});

app.listen(PORT, () => console.log(`Donor server listening on port ${PORT}`));
