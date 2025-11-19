const Users = [
  { username: 'admin', password: 'admin123', role: 'Admin' },
  { username: 'manager', password: 'mgr123', role: 'Manager' },
  { username: 'aisha', password: 'vol123', role: 'Volunteer', volunteer_id: 1 },
  { username: 'farah', password: 'ref123', role: 'Refugee', refugee_id: 1 },
  { username: 'john', password: 'don123', role: 'Donor', donor_id: 2 }
];

const Camps = [
  { camp_id: 1, camp_name: 'Hope Valley', city: 'Bekaa', capacity: 500, current_occupancy: 2 },
  { camp_id: 2, camp_name: 'Safe Haven', city: 'Gaziantep', capacity: 800, current_occupancy: 1 },
];

const Refugees = [
  { refugee_id: 1, first_name: 'Farah', last_name: 'Hassan', skills: 'Sewing, Childcare', status: 'Registered', camp_id: 1 },
  { refugee_id: 2, first_name: 'Omar', last_name: 'Al-Jamil', skills: 'Carpentry', status: 'Registered', camp_id: 2 }
];

const Volunteers = [
  { volunteer_id: 1, first_name: 'Aisha', last_name: 'Khan', domain: 'Medical, Translation', availability: 'Full-time' },
  { volunteer_id: 2, first_name: 'Ben', last_name: 'Carter', domain: 'Logistics', availability: 'Part-time' }
];

const Donors = [
  { donor_id: 1, donor_name: 'Global Aid Foundation' },
  { donor_id: 2, donor_name: 'John Doe' }
];

const Donations = [
  { donation_id: 1, donor_id: 1, organization_id: 1, amount: 50000, donation_date: '2025-09-15' },
  { donation_id: 2, donor_id: null, donor_name: 'Test Donor', organization_name: 'Test Org', donation_type: 'Financial', amount: 10, amount_inr: 830, donation_date: '2025-11-10T18:30:00.000Z' },
  { donation_id: 3, donor_id: 1, donor_name: null, organization_name: 'Global Aid Foundation', donation_type: 'Financial', amount: 1000, amount_inr: 83000, donation_date: '2025-10-01' },
  { donation_id: 4, donor_id: null, donor_name: 'ACME Supplies', organization_name: 'ACME Supplies', donation_type: 'Clothing', quantity: 200, donation_date: '2025-11-01' },
  { donation_id: 5, donor_id: 2, donor_name: null, organization_name: 'John Doe', donation_type: 'Financial', amount: 250, amount_inr: 20750, donation_date: '2025-08-20' },
  { donation_id: 6, donor_id: null, donor_name: 'Helping Hands', organization_name: 'Helping Hands', donation_type: 'Food', quantity: 50, donation_date: '2025-11-05' }
];

const Aid = [
  { aid_id: 1, aid_type: 'Food', stock: 200 },
  { aid_id: 2, aid_type: 'Medicine', stock: 25 },
  { aid_id: 3, aid_type: 'Clothing', stock: 120 },
  { aid_id: 4, aid_type: 'Hygiene Kit', stock: 60 }
];

const Aid_Distribution = [
  { distribution_id: 1, refugee_id: 1, aid_id: 1, quantity_distributed: 10 },
  { distribution_id: 2, refugee_id: 1, aid_id: 2, quantity_distributed: 2 },
  { distribution_id: 3, refugee_id: 2, aid_id: 1, quantity_distributed: 15 }
];

function saveState() {
  try {
    const state = { Users, Camps, Refugees, Volunteers, Donors, Donations, Aid, Aid_Distribution };
    localStorage.setItem('rms_state', JSON.stringify(state));
  } catch (e) { console.error('Failed to save state', e); }
}

function loadState() {
  try {
    const raw = localStorage.getItem('rms_state');
    if (!raw) return;
    const state = JSON.parse(raw);
    const assign = (arr, data) => { if (!data) return; arr.length = 0; data.forEach(x => arr.push(x)); };
    assign(Users, state.Users);
    assign(Camps, state.Camps);
    assign(Refugees, state.Refugees);
    assign(Volunteers, state.Volunteers);
    assign(Donors, state.Donors);
    assign(Donations, state.Donations);
    assign(Aid, state.Aid);
    assign(Aid_Distribution, state.Aid_Distribution);
  } catch (e) { console.error('Failed to load state', e); }
}


loadState();


try {
  const rawActive = localStorage.getItem('rms_active');
  if (rawActive) {
    activeUser = JSON.parse(rawActive);
    activeRole = activeUser && activeUser.role || null;
  }
} catch (e) { console.warn('Could not restore active user', e); }


const API_BASE = window.RMS_API_BASE || 'http://localhost:4000';


async function syncFromServer() {
  try {
    
    const [campsResp, refsResp, volsResp, donorsResp, donationsResp] = await Promise.all([
      fetch(`${API_BASE}/api/camps`),
      fetch(`${API_BASE}/api/refugees`),
      fetch(`${API_BASE}/api/volunteers`),
      fetch(`${API_BASE}/api/donors`),
      fetch(`${API_BASE}/api/donations`)
    ]);

    
    const donorServerBase = window.DONOR_SERVER_BASE || 'http://localhost:5001';
    let donorServerDonations = null;
    try {
      const dResp = await fetch(donorServerBase + '/api/donations');
      if (dResp.ok) {
        const dj = await dResp.json();
        if (dj && Array.isArray(dj.donations)) donorServerDonations = dj.donations;
      }
    } catch (e) {
      
      donorServerDonations = null;
    }

    if (campsResp.ok && refsResp.ok && volsResp.ok && donorsResp.ok && donationsResp.ok) {
      const campsJson = await campsResp.json();
      const refsJson = await refsResp.json();
      const volsJson = await volsResp.json();
      const donorsJson = await donorsResp.json();
      const donationsJson = await donationsResp.json();
      if (campsJson.success && refsJson.success && volsJson.success && donorsJson.success && donationsJson.success) {
        
        Camps.length = 0; campsJson.camps.forEach(c => Camps.push(c));
        Refugees.length = 0; refsJson.refugees.forEach(r => Refugees.push(r));
        Volunteers.length = 0; volsJson.volunteers.forEach(v => Volunteers.push(v));
        Donors.length = 0; donorsJson.donors.forEach(d => Donors.push(d));

        
        const mainServerDonations = (donationsJson.donations || []).map(d => ({
          donation_id: d.donation_id,
          server_id: d.donation_id,
          donor_id: d.donor_id,
          amount: d.amount ? parseFloat(d.amount) : null,
          amount_inr: d.amount_inr || null,
          quantity: d.quantity || null,
          donation_type: d.donation_type || null,
          organization_name: d.organization_name || null,
          donation_date: d.donation_date || null,
          synced: true
        }));

        
        const donorServerMapped = (donorServerDonations || []).map(d => ({
          donation_id: d.donation_id,
          server_id: `donor:${d.donation_id}`,
          donor_id: d.donor_id || null,
          donor_name: d.donor_name || d.donor || null,
          amount: d.amount ? parseFloat(d.amount) : null,
          amount_inr: d.amount_inr || null,
          quantity: d.quantity || null,
          donation_type: d.donation_type || d.type || null,
          organization_name: d.organization_name || d.organization || null,
          donation_date: d.donation_date || null,
          synced: true,
          source: 'donor_server'
        }));

        
        const serverDonations = mainServerDonations.slice();
        
        function isDuplicate(ds, mainList) {
          return mainList.some(m => {
            if ((m.amount || 0) && (ds.amount || 0) && Math.abs((m.amount||0) - (ds.amount||0)) < 0.001 && m.donation_date === ds.donation_date) return true;
            const mOrg = (m.organization_name || '').toString().toLowerCase();
            const dOrg = (ds.organization_name || '').toString().toLowerCase();
            if (mOrg && dOrg && mOrg === dOrg && m.donation_date === ds.donation_date) return true;
            return false;
          });
        }
        donorServerMapped.forEach(d => { if (!isDuplicate(d, serverDonations)) serverDonations.push(d); });

        const localUnsynced = Donations.filter(d => !d.server_id && !d.synced && !d.uploading).map(d => Object.assign({}, d));

        // Deduplicate local unsynced items that appear to already exist on server (match by donor+amount+date)
        function localMatchesServer(local, serverList) {
          if (!local) return false;
          // prefer server_id match
          if (local.server_id) return serverList.some(s => s.server_id === local.server_id);
          // if donor_id present, match by donor_id+amount+date
          return serverList.some(s => {
            if (local.donor_id && s.donor_id && local.donor_id === s.donor_id) {
              if ((local.amount || 0) && (s.amount || 0) && Math.abs((local.amount||0) - (s.amount||0)) < 0.001 && local.donation_date === s.donation_date) return true;
            }
            // fallback: match by donor_name + amount + date
            if (local.donor_name) {
              const sn = (Donors.find(x => x.donor_id === s.donor_id)?.donor_name || '').toString().toLowerCase();
              if (s.source === 'donor_server' && (local.donor_name || '').toString().toLowerCase() === (s.donor_name||'').toString().toLowerCase() && (local.amount||0) && (s.amount||0) && Math.abs((local.amount||0) - (s.amount||0)) < 0.001 && local.donation_date === s.donation_date) return true;
              if (local.donor_name.toString().toLowerCase() === sn && (local.amount||0) && (s.amount||0) && Math.abs((local.amount||0) - (s.amount||0)) < 0.001 && local.donation_date === s.donation_date) return true;
            }
            return false;
          });
        }

        Donations.length = 0;
        serverDonations.forEach(d => Donations.push(d));
        // append unsynced local donations so they're still visible until uploaded, but skip ones that match server
        localUnsynced.forEach(d => { if (!localMatchesServer(d, serverDonations)) Donations.push(d); });

        
        saveState();
        console.info('Synced data from server (merged local unsynced donations and donor-server backups)');
        
        try { refreshQuickStats(); } catch (e) {}
      }
    }
  } catch (e) {
    console.warn('Server sync failed, continuing with local state', e);
  }
}


try {
  
  setTimeout(() => { try { uploadUnsyncedDonations(); } catch (e) { console.warn('Initial upload failed', e); } }, 2000);
  
  setInterval(() => { try { uploadUnsyncedDonations(); } catch (e) {  } }, 60000);
} catch (e) { console.warn('Failed to initialize donation uploader', e); }


async function uploadUnsyncedDonations() {
  if (!API_BASE) return;
  const unsynced = Donations.filter(d => !d.server_id && !d.synced);
  if (!unsynced || unsynced.length === 0) return;
  for (const d of unsynced) {
    try {
      
      d.uploading = true;
      const payload = {
        donor_id: d.donor_id || null,
        donor_name: d.donor_name || (Donors.find(x => x.donor_id === d.donor_id)?.donor_name) || null,
        amount: d.amount || null,
        amount_inr: d.amount_inr || null,
        quantity: d.quantity || null,
        donation_type: d.donation_type || null,
        organization_name: d.organization_name || null,
        donation_date: d.donation_date || null
      };
      const resp = await fetch(API_BASE + '/api/donations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const j = await resp.json();
        if (j && j.success && j.donation_id) {
          d.server_id = j.donation_id;
          d.synced = true;
          d.uploading = false;
          console.info('Uploaded local donation', j.donation_id);
        }
      }
    } catch (err) {
      d.uploading = false;
      console.warn('Failed to upload donation', d, err);
    }
  }
  
  try { await syncFromServer(); } catch (e) { console.warn('Sync after upload failed', e); }
  saveState();
}


syncFromServer();



async function registerNewUser(payload) {
  
  try {
    const resp = await fetch(API_BASE + '/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (resp.ok) {
      const json = await resp.json();
      if (json && json.success) {
        
        try { await syncFromServer(); } catch (e) {}
        
        if (json.user) {
          activeUser = json.user;
          activeRole = json.user.role;
          try { localStorage.setItem('rms_active', JSON.stringify(activeUser)); } catch (e) {}
          
          switch (activeUser.role) {
            case 'Volunteer': window.location.href = 'volunteer.html'; break;
            case 'Manager': window.location.href = 'manager.html'; break;
            case 'Refugee': window.location.href = 'refugee.html'; break;
            case 'Donor': window.location.href = 'donor.html'; break;
            default: break;
          }
        }
        return true;
      }
      if (json && json.error === 'username_taken') { alert('Username already taken'); return false; }
    }
  } catch (e) {
    
    console.warn('Signup API not reachable, falling back to localStorage', e);
  }

  
  if (!payload || !payload.username || !payload.password || !payload.role) return false;
  const exists = Users.find(u => u.username === payload.username);
  if (exists) { alert('Username already taken'); return false; }

  const role = payload.role;
  const user = { username: payload.username, password: payload.password, role };

  if (role === 'Volunteer') {
    const nextId = (Volunteers.reduce((m, v) => Math.max(m, v.volunteer_id || 0), 0) || 0) + 1;
    const vol = { volunteer_id: nextId, first_name: payload.first_name || '', last_name: payload.last_name || '', domain: payload.domain || '', availability: 'On-call' };
    Volunteers.push(vol);
    user.volunteer_id = nextId;
  } else if (role === 'Refugee') {
    const nextId = (Refugees.reduce((m, r) => Math.max(m, r.refugee_id || 0), 0) || 0) + 1;
    const campId = Camps[0] && Camps[0].camp_id || null;
    const ref = {
      refugee_id: nextId,
      first_name: payload.first_name || '',
      middle_name: payload.middle_name || null,
      last_name: payload.last_name || '',
      date_of_birth: payload.date_of_birth || null,
      country_of_origin: payload.country_of_origin || null,
      status: 'Registered',
      skills: payload.skills || '',
      registration_date: new Date().toISOString(),
      camp_id: campId
    };
    Refugees.push(ref);
    user.refugee_id = nextId;
    const camp = Camps.find(c => c.camp_id === campId);
    if (camp) camp.current_occupancy = (camp.current_occupancy || 0) + 1;
  } else if (role === 'Donor') {
    const nextId = (Donors.reduce((m, d) => Math.max(m, d.donor_id || 0), 0) || 0) + 1;
    const donor = { donor_id: nextId, donor_name: payload.donor_name || payload.username };
    Donors.push(donor);
    user.donor_id = nextId;
  } else {
    alert('Sign up only supports Volunteer, Refugee, or Donor');
    return false;
  }

  Users.push(user);
  saveState();
  try { localStorage.setItem('rms_active', JSON.stringify(user)); } catch (e) {}
  return true;
}

function refreshQuickStats() {
  const elTotalCamps = document.getElementById('total-camps');
  if (elTotalCamps) elTotalCamps.innerText = Camps.length;
  const elTotalRefs = document.getElementById('total-refugees');
  if (elTotalRefs) elTotalRefs.innerText = Refugees.length;
  const elTotalVols = document.getElementById('total-vols');
  if (elTotalVols) elTotalVols.innerText = Volunteers.length;

  const medAid = Aid.filter(a => a.aid_type === 'Medicine')[0];
  const medCount = medAid ? Aid_Distribution.filter(d => d.aid_id === medAid.aid_id)
    .reduce((s, x) => s + x.quantity_distributed, 0) : 0;
  const elMedCount = document.getElementById('med-count');
  if (elMedCount) elMedCount.innerText = medCount;

  const elQuick = document.getElementById('quick-stats');
  if (elQuick) elQuick.innerHTML = `${Refugees.length} refugees • ${Volunteers.length} volunteers • ${Donations.length} donations`;

  const dl = document.getElementById('donation-list');
  if (dl) {
    dl.innerHTML = '';
    Donations.slice().reverse().forEach(d => {
      const donor = Donors.find(x => x.donor_id === d.donor_id);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${donor?.donor_name || 'Unknown'}</td><td>$${d.amount.toLocaleString()}</td>`;
      dl.appendChild(tr);
    });
  }

  renderCapacityChart();
  renderDepletion();
  renderPlacement();
}


function renderCapacityChart() {
  const container = document.getElementById('capacity-chart');
  if (!container) return;
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'bar-wrap';
  Camps.forEach(c => {
    const bar = document.createElement('div');
    bar.className = 'bar card';
    
    const percentRaw = c.capacity ? ((c.current_occupancy || 0) / c.capacity) * 100 : 0;
    const displayPct = (percentRaw > 0 && percentRaw < 1) ? '<1%' : Math.round(percentRaw) + '%';
    
    const barHeight = Math.min(100, Math.max(3, percentRaw));
    bar.style.background = `linear-gradient(180deg, rgba(46,231,255,0.06), rgba(110,255,166,0.03))`;
    bar.innerHTML = `<div style='height:${barHeight}%'></div>
                     <div class='val'>${c.camp_name}<br><small class='muted'>${displayPct}</small></div>`;
    wrap.appendChild(bar);
  });
  container.appendChild(wrap);
}


function renderDepletion() {
  const container = document.getElementById('depletion');
  if (!container) return;
  container.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'muted';
  const predictedLow = Aid.filter(a => a.stock < 50)
    .map(a => `${a.aid_type} (stock ${a.stock})`);
  if (predictedLow.length === 0)
    list.innerHTML = '<div class="status green">No immediate depletion predicted</div>';
  else
    list.innerHTML = predictedLow.map(x => `<div class='status red' style='margin-top:6px'>${x}</div>`).join('');
  container.appendChild(list);
}

// Skill matching visualization
function renderPlacement() {
  const container = document.getElementById('placement');
  if (!container) return;
  container.innerHTML = '';
  const skills = {};
  Refugees.forEach(r => {
    r.skills?.split(',').map(s => s.trim()).forEach(s => {
      if (!s) return;
      skills[s] = (skills[s] || 0) + 1;
    });
  });
  const openings = { 'Sewing': 3, 'Childcare': 2, 'Carpentry': 1 };
  const rows = Object.keys(openings).map(k => {
    const have = skills[k] || 0, need = openings[k];
    const match = have >= need
      ? '<span class="status green">Good</span>'
      : '<span class="status red">Gap</span>';
    return `<div style='margin-top:8px'><strong>${k}</strong> — ${have} refugees vs ${need} openings ${match}</div>`;
  }).join('');
  container.innerHTML = rows;
}

/***********************
 Login & role dispatch
***********************/
let activeRole = null;
let activeUser = null;

function openLogin(role) {
  activeRole = role;
  document.getElementById('login-role').innerText = `Sign in — ${role}`;
  document.getElementById('login-sub').innerText = `Demo portal for ${role}`;
  document.getElementById('modal-login').classList.add('open');
}



function openAdminDirect() {
  try {
    
    document.body.classList.remove('landing');
    document.body.classList.add('authenticated');
    activeUser = { username: 'admin', role: 'Admin' };
    activeRole = 'Admin';
    try { localStorage.setItem('rms_active', JSON.stringify(activeUser)); } catch (e) {}
    
    loadDashboard('Admin');
  } catch (e) {
    console.error('Could not open admin directly', e);
    
    openLogin('Admin');
  }
}

function closeLogin() {
  document.getElementById('modal-login').classList.remove('open');
}

function submitLogin() {
  const u = document.getElementById('inp-user').value.trim();
  const p = document.getElementById('inp-pass').value.trim();
  
  (async () => {
    try {
      const resp = await fetch(API_BASE + '/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p })
      });
      if (resp.ok) {
        const j = await resp.json();
        if (j && j.success && j.user) {
          const srv = j.user;
          
          if (activeRole && srv.role !== activeRole) {
            alert('Role mismatch for this account');
            return;
          }
          activeUser = srv;
          try { localStorage.setItem('rms_active', JSON.stringify(activeUser)); } catch (e) {}
          closeLogin();
          try { document.body.classList.remove('landing'); document.body.classList.add('authenticated'); } catch (e) {}
          
          switch (srv.role) {
            case 'Admin': loadDashboard('Admin'); break;
            case 'Manager': loadDashboard('Manager'); break;
            case 'Volunteer': loadDashboard('Volunteer'); break;
            case 'Refugee': loadDashboard('Refugee'); break;
            case 'Donor': loadDashboard('Donor'); break;
            default: alert('Unknown role');
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Login API not reachable, falling back to local auth', e);
    }

    
    const found = Users.find(x => x.username === u && x.password === p && (activeRole ? x.role === activeRole : true));
    if (!found) {
      
      
      
      console.info('Creating demo user for role', activeRole);
      const demoName = ((activeRole || 'guest').toString().toLowerCase() + '_demo');
      const demoUser = { username: demoName, password: '', role: activeRole || 'Volunteer' };
      Users.push(demoUser);
      activeUser = demoUser;
      try { localStorage.setItem('rms_active', JSON.stringify(activeUser)); } catch (e) {}
      closeLogin();
      try { document.body.classList.remove('landing'); document.body.classList.add('authenticated'); } catch (e) {}
      switch (activeUser.role) {
        case 'Admin': loadDashboard('Admin'); break;
        case 'Manager': window.location.href = 'manager.html'; break;
        case 'Volunteer': window.location.href = 'volunteer.html'; break;
        case 'Refugee': window.location.href = 'refugee.html'; break;
        case 'Donor': window.location.href = 'donor.html'; break;
        default: alert('Unknown role');
      }
      return;
    }
    activeUser = found; try { localStorage.setItem('rms_active', JSON.stringify(activeUser)); } catch (e) {}
    closeLogin();
    try { document.body.classList.remove('landing'); document.body.classList.add('authenticated'); } catch (e) {}
    switch (found.role) {
      case 'Admin': loadDashboard('Admin'); break;
      case 'Manager': loadDashboard('Manager'); break;
      case 'Volunteer': loadDashboard('Volunteer'); break;
      case 'Refugee': loadDashboard('Refugee'); break;
      case 'Donor': loadDashboard('Donor'); break;
      default: alert('Unknown role');
    }
  })();
}


function openSignup() {
  
  const modal = document.getElementById('modal-signup');
  if (!modal) { window.location.href = 'signup.html'; return; }
  
  const roleEl = document.getElementById('su-role-modal');
  const fieldsContainer = document.getElementById('su-profile-fields-modal');
  function renderFields() {
    const role = roleEl.value;
    if (role === 'Volunteer') {
      fieldsContainer.innerHTML = `
        <input id="su-first-modal" class="input" placeholder="First name" />
        <input id="su-last-modal" class="input" placeholder="Last name" />
        <input id="su-domain-modal" class="input" placeholder="Domain (e.g. Medical, Logistics)" />
      `;
    } else if (role === 'Refugee') {
      fieldsContainer.innerHTML = `
        <input id="su-first-modal" class="input" placeholder="First name" />
        <input id="su-last-modal" class="input" placeholder="Last name" />
        <input id="su-dob-modal" class="input" placeholder="Date of birth" type="date" />
        <input id="su-country-modal" class="input" placeholder="Country of origin" />
      `;
    } else if (role === 'Donor') {
      fieldsContainer.innerHTML = `
        <input id="su-donor-name-modal" class="input" placeholder="Organization or donor name" />
      `;
    }
  }
  roleEl.addEventListener('change', renderFields);
  renderFields();
  modal.classList.add('open');
}

function closeSignup() {
  const modal = document.getElementById('modal-signup');
  if (modal) modal.classList.remove('open');
}

async function submitSignupModal() {
  const username = document.getElementById('su-username-modal').value.trim();
  const password = document.getElementById('su-password-modal').value.trim();
  const role = document.getElementById('su-role-modal').value;
  if (!username || !password) { alert('Enter username and password'); return; }
  const payload = { username, password, role };
  if (role === 'Volunteer') {
    payload.first_name = document.getElementById('su-first-modal').value.trim();
    payload.last_name = document.getElementById('su-last-modal').value.trim();
    payload.domain = document.getElementById('su-domain-modal').value.trim();
  } else if (role === 'Refugee') {
    payload.first_name = document.getElementById('su-first-modal').value.trim();
    payload.last_name = document.getElementById('su-last-modal').value.trim();
    payload.date_of_birth = document.getElementById('su-dob-modal').value || null;
    payload.country_of_origin = document.getElementById('su-country-modal').value.trim() || null;
  } else if (role === 'Donor') {
    payload.donor_name = document.getElementById('su-donor-name-modal').value.trim() || username;
  }

  if (typeof registerNewUser === 'function') {
    try {
      const ok = await registerNewUser(payload);
      if (ok) {
        closeSignup();
        
        switch (role) {
          case 'Volunteer': loadDashboard('Volunteer'); break;
          case 'Refugee': loadDashboard('Refugee'); break;
          case 'Donor': loadDashboard('Donor'); break;
          default: break;
        }
        return;
      }
      alert('Account creation failed');
    } catch (e) {
      console.error('Signup error', e); alert('Signup failed');
    }
  } else {
    alert('Registration not available');
  }
}


function loadDashboard(role) {
  const canvas = document.getElementById('canvas');
  
  const mainEl = document.querySelector('main');
  if (mainEl) mainEl.classList.add('full');
  if (role === 'Admin') return loadAdmin(canvas);
  if (role === 'Manager') return loadManager(canvas);
  if (role === 'Volunteer') return loadVolunteer(canvas);
  if (role === 'Refugee') return loadRefugee(canvas);
  if (role === 'Donor') return loadDonor(canvas);
  canvas.innerHTML = '<div class="card">Unknown role</div>';
}


function loadAdmin(container) {
  
  try { syncFromServer(); } catch (e) {  }

  container.innerHTML = `
    <div class="admin-stack">
      <div class="admin-section">
        <div class="admin-header">
          <div>
            <div class='muted'>System Overview</div>
            <div class='big'>Admin Console</div>
          </div>
          <div class="kpis">
            <div class="kpi">Camps<br><strong id="kpi-camps">${Camps.length}</strong></div>
            <div class="kpi">Refugees<br><strong id="kpi-refs">${Refugees.length}</strong></div>
            <div class="kpi">Volunteers<br><strong id="kpi-vols">${Volunteers.length}</strong></div>
          </div>
        </div>
        <div id="admin-dashboard-summary" style="margin-top:12px;display:flex;justify-content:space-between;align-items:center">
          <div class="muted">Overview of system health and recent activity</div>
          <div style="display:flex;gap:8px">
            <button class='btn' onclick='syncFromServer(); loadAdmin(document.getElementById("canvas"))'>Refresh</button>
            <button class='btn' onclick='openSimulateModal()'>Simulate / Distribute Aid</button>
          </div>
        </div>
      </div>

      <div class="admin-section">
        <div class='muted'>Audit Trail</div>
        <div class='log' id='admin-log' style='margin-top:8px; max-height:220px; overflow:auto'></div>
      </div>

      <div class="admin-section">
        <div class='muted'>Resource Forecast</div>
        <div id='admin-forecast' style='margin-top:8px'></div>
      </div>

      <div id='admin-donations-section' class='admin-section donations-widget'></div>

      <div id='admin-volunteers-section' class='admin-section'></div>

      <div id='admin-refugees-section' class='admin-section'></div>
    </div>
  `;

  
  const auditHtml = Aid_Distribution.slice().reverse().map(d => {
    const r = Refugees.find(x => x.refugee_id === d.refugee_id) || { first_name: 'Unknown', last_name: '' };
    const a = Aid.find(x => x.aid_id === d.aid_id) || { aid_type: 'Aid' };
    return `<div class='log-item'>${r.first_name} ${r.last_name} received ${d.quantity_distributed} x ${a.aid_type}</div>`;
  }).join('');
  document.getElementById('admin-log').innerHTML = auditHtml;

  
  const forecast = Aid.slice().sort((a, b) => a.stock - b.stock)
    .map(a => `<div style='margin-top:6px'>${a.aid_type}: <strong>${a.stock}</strong> units</div>`)
    .join('');
  document.getElementById('admin-forecast').innerHTML = forecast;

  
  (function renderAdminDonations(){
    const container = document.getElementById('admin-donations-section');
    if (!container) return;
    container.innerHTML = `
      <div style='display:flex;align-items:center;justify-content:space-between'>
        <div><strong>Donations</strong><div class='muted'>Recent donations (server + local unsynced)</div></div>
        <div style='display:flex;gap:8px;align-items:center'>
          <input id='admin-donations-search' placeholder='Search donor or org' style='padding:6px;border-radius:6px;border:1px solid rgba(255,255,255,0.04)' />
          <button class='btn' id='admin-donations-refresh'>Refresh</button>
        </div>
      </div>
      <div style='margin-top:8px'>
        <table id='admin-donations-table' class='list-compact'>
          <thead><tr><th>Donor</th><th>Org</th><th>Type</th><th style='text-align:right'>Amount (USD)</th><th style='text-align:right'>Amount (INR)</th><th style='text-align:right'>Qty</th><th>Date</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    `;

    let page = 1, pageSize = 20;
    function getFiltered() {
      const q = (document.getElementById('admin-donations-search').value || '').toLowerCase();
      const all = Donations.slice().reverse(); // newest first
      if (!q) return all;
      return all.filter(d => {
        const donorName = (Donors.find(x => x.donor_id === d.donor_id)?.donor_name || d.donor_name || '').toString().toLowerCase();
        const org = (d.organization_name || '').toString().toLowerCase();
        const type = (d.donation_type || '').toString().toLowerCase();
        return donorName.includes(q) || org.includes(q) || type.includes(q);
      });
    }

    function renderPage() {
      const all = getFiltered();
      const start = (page - 1) * pageSize;
      const pageItems = all.slice(start, start + pageSize);
      const tbody = document.querySelector('#admin-donations-table tbody');
      tbody.innerHTML = '';
      pageItems.forEach(d => {
        const donorName = (Donors.find(dd => dd.donor_id === d.donor_id)?.donor_name) || (d.donor_name || 'Unknown');
        const org = d.organization_name || '';
        const amt = d.amount !== null && d.amount !== undefined ? `$${(d.amount).toLocaleString()}` : '-';
        const inr = d.amount_inr ? `₹${(d.amount_inr).toLocaleString()}` : '-';
        const qty = d.quantity ? d.quantity : '-';
        const type = d.donation_type || '-';
        const date = d.donation_date || '-';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${donorName}</td><td>${org}</td><td>${type}</td><td style='text-align:right'>${amt}</td><td style='text-align:right'>${inr}</td><td style='text-align:right'>${qty}</td><td>${date}</td>`;
        tbody.appendChild(tr);
      });
      
      const foot = document.createElement('div');
      foot.style.display = 'flex'; foot.style.justifyContent = 'flex-end'; foot.style.gap='8px'; foot.style.marginTop='8px';
      foot.innerHTML = `<button class='btn' id='admin-donations-prev'>Prev</button><div id='admin-donations-page' style='align-self:center'>${page}</div><button class='btn' id='admin-donations-next'>Next</button>`;
      
      const existingFoot = container.querySelector('.donation-footer'); if (existingFoot) existingFoot.remove();
      foot.className = 'donation-footer'; container.appendChild(foot);
    }

    document.getElementById('admin-donations-search').addEventListener('input', () => { page = 1; renderPage(); });
    container.addEventListener('click', (ev) => {
      if (ev.target && ev.target.id === 'admin-donations-prev') { if (page > 1) { page--; renderPage(); } }
      if (ev.target && ev.target.id === 'admin-donations-next') { page++; renderPage(); }
    });
    document.getElementById('admin-donations-refresh').addEventListener('click', async () => { await syncFromServer(); renderPage(); });

    renderPage();
  })();

  
  (function renderVolunteers(){
    const sec = document.getElementById('admin-volunteers-section');
    if (!sec) return;
    sec.innerHTML = `<div style='display:flex;justify-content:space-between;align-items:center'><div><strong>Volunteers (recent)</strong><div class='muted'>Signed-up volunteers</div></div><div class='muted'>Total: ${Volunteers.length}</div></div>
      <div style='margin-top:12px'><table class='list-compact'><thead><tr><th>ID</th><th>Name</th><th>Domain</th><th>Availability</th></tr></thead><tbody>${Volunteers.map(v=>`<tr><td>${v.volunteer_id||'-'}</td><td>${(v.first_name||'')+' '+(v.last_name||'')}</td><td>${v.domain||'-'}</td><td>${v.availability||'-'}</td></tr>`).join('')}</tbody></table></div>`;
  })();

  // Refugees box: show recent registrations and counts
  (function renderRefugees(){
    const sec = document.getElementById('admin-refugees-section');
    if (!sec) return;
    sec.innerHTML = `<div style='display:flex;justify-content:space-between;align-items:center'><div><strong>Refugee Registry</strong><div class='muted'>Recently registered refugees</div></div><div class='muted'>Total: ${Refugees.length}</div></div>
      <div style='margin-top:12px'><table class='list-compact'><thead><tr><th>ID</th><th>Name</th><th>Skills</th><th>Camp</th></tr></thead><tbody>${Refugees.map(r=>`<tr><td>${r.refugee_id||'-'}</td><td>${r.first_name||''} ${r.last_name||''}</td><td>${r.skills||'-'}</td><td>${Camps.find(c=>c.camp_id===r.camp_id)?.camp_name||'-'}</td></tr>`).join('')}</tbody></table></div>`;
  })();

  // update KPI elements (in case counts changed)
  try { document.getElementById('kpi-camps').innerText = Camps.length; document.getElementById('kpi-refs').innerText = Refugees.length; document.getElementById('kpi-vols').innerText = Volunteers.length; } catch (e) {}
}

function openSimulateModal() {
  
  const refSel = document.getElementById('sim-refugee');
  const aidSel = document.getElementById('sim-aid');
  if (refSel) {
    refSel.innerHTML = Refugees.map(r => {
      const campName = Camps.find(c => c.camp_id === r.camp_id)?.camp_name || 'Unassigned';
      return `<option value="${r.refugee_id}">${r.refugee_id} — ${r.first_name} ${r.last_name} (${campName})</option>`;
    }).join('');
  }
  if (aidSel) {
    aidSel.innerHTML = Aid.map(a => `<option value="${a.aid_id}">${a.aid_type} (stock ${a.stock})</option>`).join('');
  }
  const modal = document.getElementById('modal-simulate');
  if (modal) modal.classList.add('open');
}

function closeSimulate() {
  const modal = document.getElementById('modal-simulate');
  if (modal) modal.classList.remove('open');
}

function applySimulation() {
  const refId = parseInt(document.getElementById('sim-refugee').value, 10);
  const aidId = parseInt(document.getElementById('sim-aid').value, 10);
  const qty = parseInt(document.getElementById('sim-qty').value, 10) || 0;
  if (!refId || !aidId || qty <= 0) { alert('Please select refugee, aid and a positive quantity'); return; }
  const aid = Aid.find(a => a.aid_id === aidId);
  if (!aid) { alert('Selected aid not found'); return; }
  if (aid.stock < qty) { alert('Insufficient stock for selected aid'); return; }
  
  aid.stock -= qty;
  Aid_Distribution.push({ distribution_id: Aid_Distribution.length + 1, refugee_id: refId, aid_id: aidId, quantity_distributed: qty });
  saveState();
  refreshQuickStats();
  loadAdmin(document.getElementById('canvas'));
  closeSimulate();
  alert('Aid distributed');
}


async function loadVolunteer(container) {
  
  try {
    const respVols = await fetch(API_BASE + '/api/volunteers');
    const respCamps = await fetch(API_BASE + '/api/camps');
    if (respVols.ok) {
      const j = await respVols.json();
      if (j && j.success && Array.isArray(j.volunteers)) {
        Volunteers.length = 0; j.volunteers.forEach(v => Volunteers.push(v));
      }
    }
    if (respCamps.ok) {
      const j2 = await respCamps.json();
      if (j2 && j2.success && Array.isArray(j2.camps)) {
        Camps.length = 0; j2.camps.forEach(c => Camps.push(c));
      }
    }
    
    saveState();
  } catch (e) {
    
    console.warn('Could not fetch volunteers/camps from server, using local state', e);
  }

  
  container.innerHTML = `
    <div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:12px'>
      <div>
        <div class='muted'>Volunteer Hub</div>
        <div class='big'>Field Activities</div>
      </div>
      <div><button class='btn' onclick='recordAid()'>Record Aid Distribution</button></div>
    </div>

    <div class='card full widget'>
      <div style='display:flex;align-items:center;justify-content:space-between'>
        <div><strong>Volunteers</strong><div class='muted'>ID • Name • Assignment • Domain • Availability</div></div>
        <div><button class='btn' onclick='syncFromServer()'>Refresh</button></div>
      </div>
      <div style='margin-top:12px'>
        <table id='vol-table' style='width:100%'>
          <thead><tr><th>ID</th><th>Name</th><th>Assignment</th><th>Domain</th><th>Availability</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  
  const tbody = document.querySelector('#vol-table tbody');
  tbody.innerHTML = '';
  Volunteers.forEach(v => {
    const assignedCampId = v.assigned_camp_id || null;
    const camp = Camps.find(c => c.camp_id === assignedCampId) || { camp_name: 'Unassigned' };
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${v.volunteer_id}</td>
          <td>${v.first_name || ''} ${v.last_name || ''}</td>
          <td>${camp.camp_name || 'Unassigned'}</td>
          <td>${v.domain || '-'}</td>
          <td>${v.availability || '-'}</td>`;
    tbody.appendChild(tr);
  });

  
  if (activeUser && activeUser.volunteer_id) {
    const me = Volunteers.find(x => x.volunteer_id === activeUser.volunteer_id);
    if (me) {
      const top = document.createElement('div');
      top.style.marginTop = '12px';
      top.innerHTML = `<div class='muted'>Signed in as</div><div style='font-weight:700;margin-top:6px'>${me.first_name} ${me.last_name} — ID ${me.volunteer_id}</div>`;
      container.prepend(top);
    }
  }
}

function loadManager(container) {
  container.innerHTML = `
    <div class='grid' style='margin-bottom:12px'>
      <div class='widget'><div class='muted'>Camp Operations</div><div class='big'>Manager Console</div></div>
      <div class='widget'><div class='muted'>Camps</div><div id='mgr-camps'></div></div>
      <div class='widget'><div class='muted'>Volunteers</div><div id='mgr-vols'></div></div>
    </div>

    <div class='card widget'>
      <div style='display:flex;align-items:center;justify-content:space-between'>
        <div><strong>Refugee Registry</strong><div class='muted'>List of registered refugees</div></div>
        <div><button class='btn' onclick='openRegisterRefugee()'>Register Refugee</button></div>
      </div>
      <div style='margin-top:12px'>
        <table id='mgr-ref-table'><thead><tr><th>Name</th><th>Skills</th><th>Actions</th></tr></thead><tbody></tbody></table>
      </div>
    </div>
  `;

  
  const campsEl = document.getElementById('mgr-camps');
  if (campsEl) campsEl.innerHTML = Camps
    .map(c => `<div style='margin-top:6px'>${c.camp_name} • ${c.city} • ${c.current_occupancy}/${c.capacity}</div>`)
    .join('');

  const volsEl = document.getElementById('mgr-vols');
  if (volsEl) volsEl.innerHTML = Volunteers
    .map(v => `<div style='margin-top:6px'>${v.first_name} ${v.last_name} — ${v.domain || '-'}</div>`)
    .join('');

  const tbody = document.querySelector('#mgr-ref-table tbody');
  if (tbody) {
    tbody.innerHTML = '';
    Refugees.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.first_name} ${r.last_name}</td>
                      <td>${r.skills || '-'}</td>
                      <td>
                        <button onclick='distributeAid(${r.refugee_id})' class='btn'>Distribute Aid</button>
                        <button onclick='deleteRefugee(${r.refugee_id})' class='btn' style='margin-left:8px;background:linear-gradient(90deg,var(--danger),rgba(255,107,107,0.6));color:#fff'>Delete</button>
                      </td>`;
      tbody.appendChild(tr);
    });
  }
}


async function loadDonor(container) {
  const donorId = activeUser && activeUser.donor_id || null;
  let myDonations = [];
  
  try {
    if (donorId) {
      const resp = await fetch(API_BASE + '/api/donations?donor_id=' + donorId);
      if (resp.ok) {
        const j = await resp.json();
        if (j && j.success && Array.isArray(j.donations)) {
          myDonations = j.donations.map(d => ({
            donation_id: d.donation_id,
            donor_id: d.donor_id,
            amount: d.amount ? parseFloat(d.amount) : null,
            amount_inr: d.amount_inr || null,
            quantity: d.quantity || null,
            donation_date: d.donation_date,
            donation_type: d.donation_type || null,
            organization_name: d.organization_name || null
          }));
        }
      }
    }
  } catch (e) {
    console.warn('Could not fetch donations for donor, falling back to local', e);
  }
  if (!myDonations || myDonations.length === 0) {
    
    if (donorId) {
      myDonations = Donations.filter(d => d.donor_id === donorId).slice().reverse();
    } else {
      
      myDonations = Donations.slice().reverse();
    }
  }
  const trail = myDonations.map(d =>
    `<div class='log-item'>Donation $${(d.amount||0).toLocaleString()} on ${d.donation_date} → recorded</div>`
  ).join('');

  // A small donor form so donors can pledge/give donations from the portal.
  container.innerHTML = `
    <div class='grid' style='margin-bottom:12px'>
      <div class='widget'><div class='muted'>Impact & Transparency</div><div class='big'>Donor Portal</div></div>
      <div class='widget'><div class='muted'>Your Donations</div><div class='muted' id='donor-sum'></div></div>
      <div class='widget'><div class='muted'>Audit Trail</div><div class='log'>${trail}</div></div>
    </div>

    <div class='card widget full'>
      <div style='display:flex;align-items:center;justify-content:space-between'>
        <div style='font-weight:700'>Make a Donation</div>
        <div class='muted'>Support refugees with targeted aid</div>
      </div>
      <form id='donor-form' style='margin-top:12px' onsubmit='submitDonation(event)'>
        <div style='display:grid;grid-template-columns:1fr 1fr;gap:8px'>
          <div>
            <label class='muted'>Your Name</label>
            <input id='donor-name' type='text' placeholder='Full name' value='${activeUser && activeUser.username ? activeUser.username : ''}' />
          </div>
          <div>
            <label class='muted'>Organisation (optional)</label>
            <input id='donor-org' type='text' placeholder='Organisation name' />
          </div>
          <div>
            <label class='muted'>Amount (USD)</label>
            <input id='donor-amount' type='number' min='1' step='1' placeholder='Amount in USD' />
          </div>
          <div>
            <label class='muted'>Quantity (for in-kind donations)</label>
            <input id='donor-qty' type='number' min='1' step='1' placeholder='Quantity (e.g., boxes)' />
          </div>
          <div>
            <label class='muted'>Type of Donation</label>
            <select id='donor-type'>
              <option value='Financial'>Financial</option>
              <option value='Food'>Food</option>
              <option value='Clothing'>Clothing</option>
              <option value='Medicine'>Medicine</option>
              <option value='Hygiene'>Hygiene Kit</option>
              <option value='Other'>Other</option>
            </select>
          </div>
        </div>
        <div style='margin-top:12px;display:flex;gap:8px;justify-content:flex-end'>
          <button id='donor-donate-btn' type='button' class='btn'>Donate</button>
          <button id='donor-refresh-btn' type='button' class='btn'>Refresh</button>
        </div>
      </form>
    </div>

    <div class='card widget' style='margin-top:12px'>
      <div class='muted'>Allocation Summary</div>
      <div class='muted' style='margin-top:8px'>How funds were used (simulated)</div>
      <div style='margin-top:12px'>
        <table>
          <thead><tr><th>Program</th><th>Amount</th></tr></thead>
          <tbody>
            <tr><td>Medical Support</td><td>$20000</td></tr>
            <tr><td>Food & Shelter</td><td>$25000</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById('donor-sum').innerText =
    `$${myDonations.reduce((s, x) => s + x.amount, 0).toLocaleString()} (₹${myDonations.reduce((s, x) => s + (x.amount_inr || Math.round(x.amount * USD_TO_INR)), 0).toLocaleString()})`;

  // Replace Allocation Summary with a Donations table showing this donor's donations (or local donations)
  const allocEl = container.querySelector('.card.widget.full + .card.widget');
  const totalUSD = myDonations.reduce((s, x) => s + (x.amount || 0), 0);
  const totalINR = myDonations.reduce((s, x) => s + (x.amount_inr || Math.round((x.amount || 0) * USD_TO_INR)), 0);
  if (allocEl) {
    const rows = myDonations.map(d => {
      const donorName = (Donors.find(dd => dd.donor_id === d.donor_id)?.donor_name) || (activeUser && activeUser.username) || '';
      const org = d.organization_name || '';
      const amt = d.amount !== null && d.amount !== undefined ? `$${(d.amount).toLocaleString()}` : '-';
      const qty = d.quantity ? d.quantity : '-';
      const inr = d.amount_inr ? `₹${(d.amount_inr).toLocaleString()}` : '-';
      const type = d.donation_type || '-';
      const date = d.donation_date || '-';
      return `<tr>
        <td>${donorName}</td>
        <td>${org}</td>
        <td>${type}</td>
        <td style='text-align:right'>${amt}</td>
        <td style='text-align:right'>${inr}</td>
        <td style='text-align:right'>${qty}</td>
        <td>${date}</td>
      </tr>`;
    }).join('');

    allocEl.innerHTML = `
      <div class='muted'>Donations</div>
      <div class='muted' style='margin-top:8px'>All donations submitted from this portal (past & present)</div>
      <div style='margin-top:12px'>
        <table id='donor-donations-table' style='width:100%'>
          <thead><tr><th>Donor</th><th>Organisation</th><th>Type</th><th>Amount (USD)</th><th>Amount (INR)</th><th>Quantity</th><th>Date</th></tr></thead>
          <tbody>
            ${rows}
            <tr style='font-weight:700'><td colspan='3'>Totals</td><td style='text-align:right'>$${totalUSD.toLocaleString()}</td><td style='text-align:right'>₹${totalINR.toLocaleString()}</td><td></td><td></td></tr>
          </tbody>
        </table>
      </div>
    `;
  }
  // Wire the donation-type select to hide/show the amount/quantity fields when needed
  (function wireDonationFields(){
    const typeSel = document.getElementById('donor-type');
    const amtInput = document.getElementById('donor-amount');
    const qtyInput = document.getElementById('donor-qty');
    if (!typeSel || !amtInput || !qtyInput) return;
    function update() {
      if (typeSel.value === 'Financial') {
        amtInput.style.display = '';
        amtInput.disabled = false;
        qtyInput.style.display = 'none';
        qtyInput.disabled = true;
        qtyInput.value = '';
      } else {
        amtInput.style.display = 'none';
        amtInput.disabled = true;
        amtInput.value = '';
        qtyInput.style.display = '';
        qtyInput.disabled = false;
      }
    }
    typeSel.addEventListener('change', update);
    update();
  })();

  // Ensure Donate/Refresh buttons are wired (use explicit listeners to avoid relying on inline onsubmit)
  (function wireButtons(){
    const donateBtn = document.getElementById('donor-donate-btn');
    const refreshBtn = document.getElementById('donor-refresh-btn');
    if (donateBtn) {
      console.log('Wiring donate button');
      donateBtn.disabled = false;
      donateBtn.addEventListener('click', async (ev) => {
        console.log('donate button clicked (listener start)');
        try {
          // prefer global function reference to avoid accidental shadowing
          if (typeof window.submitDonation === 'function') {
            await window.submitDonation(ev);
          } else if (typeof submitDonation === 'function') {
            await submitDonation(ev);
          } else {
            console.error('submitDonation handler not found');
          }
          console.log('submitDonation finished');
        } catch (err) {
          console.error('submitDonation threw', err);
        }
      });
    }
    if (refreshBtn) refreshBtn.addEventListener('click', async () => { await syncFromServer(); try { refreshDonorView(); } catch(e){} });
  })();
}

function deleteRefugee(refId) {
  if (!confirm('Delete this refugee and all related records? This cannot be undone.')) return;
  (async () => {
    // Try server-side delete first
    try {
      const resp = await fetch(API_BASE + '/api/refugees/' + refId, { method: 'DELETE' });
      if (resp.ok) {
        const j = await resp.json();
        if (j && j.success) {
          // refresh local state from server if possible
          try { await syncFromServer(); } catch (e) {}
          refreshQuickStats();
          refreshCurrentView();
          alert('Refugee deleted');
          return;
        }
      }
    } catch (e) {
      console.warn('Delete API not reachable or failed, falling back to local removal', e);
    }

    // Local fallback: remove refugee, decrement camp occupancy and delete related aid distributions
    const idx = Refugees.findIndex(r => r.refugee_id === refId);
    if (idx === -1) { alert('Refugee not found'); return; }
    const ref = Refugees[idx];
    Refugees.splice(idx, 1);
    const camp = Camps.find(c => c.camp_id === ref.camp_id);
    if (camp) camp.current_occupancy = Math.max(0, (camp.current_occupancy || 0) - 1);
    for (let i = Aid_Distribution.length - 1; i >= 0; i--) {
      if (Aid_Distribution[i].refugee_id === refId) Aid_Distribution.splice(i, 1);
    }
  saveState();
  refreshQuickStats();
  refreshCurrentView();
    alert('Refugee deleted (local)');
  })();
}

// Refresh the visible dashboard/canvas depending on current page or active role
function refreshCurrentView() {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;
  const path = window.location.pathname || '';
  if (path.includes('manager.html')) return loadManager(canvas);
  if (path.includes('volunteer.html')) return loadVolunteer(canvas);
  if (path.includes('refugee.html')) return loadRefugee(canvas);
  if (path.includes('donor.html')) return loadDonor(canvas);
  if (path.includes('index.html') || path === '/' || !path) {
    if (activeUser && activeUser.role) return loadDashboard(activeUser.role);
    return loadAdmin(canvas);
  }
  if (activeRole) return loadDashboard(activeRole);
}

function openRegisterRefugee() {
  // Open a modal with a small form to collect refugee details
  const modal = document.getElementById('modal-register');
  const campSelect = document.getElementById('reg-camp');
  if (campSelect) {
    // include an "auto" option to let server/procedure pick the best camp
    campSelect.innerHTML = ['<option value="auto">Auto-assign best available camp</option>']
      .concat(Camps.map(c =>
        `<option value="${c.camp_id}">${c.camp_name} — ${c.city} (${c.current_occupancy}/${c.capacity})</option>`
      )).join('');
  }
  if (modal) modal.classList.add('open');
}

function closeRegister() {
  const modal = document.getElementById('modal-register');
  if (modal) modal.classList.remove('open');
}

function submitRegisterRefugee() {
  const first = document.getElementById('reg-first').value.trim();
  const middle = document.getElementById('reg-middle').value.trim();
  const last = document.getElementById('reg-last').value.trim();
  const dob = document.getElementById('reg-dob').value || null;
  const country = document.getElementById('reg-country').value.trim() || null;
  const status = document.getElementById('reg-status').value;
  const skills = document.getElementById('reg-skills').value.trim();
  const campVal = document.getElementById('reg-camp').value;

  if (!first || !last) {
    alert('Please enter first and last name');
    return;
  }

  // Determine camp assignment: either explicit or auto-pick camp with largest available capacity
  let assignedCampId = null;
  if (!campVal || campVal === 'auto') {
    // auto-assign: pick camp where (capacity - current_occupancy) is largest and > 0
    let best = null;
    Camps.forEach(c => {
      const avail = (c.capacity || 0) - (c.current_occupancy || 0);
      if (avail > 0 && (!best || avail > ((best.capacity || 0) - (best.current_occupancy || 0)))) {
        best = c;
      }
    });
    if (!best) {
      alert('No camp has available capacity. Cannot register at this time.');
      return;
    }
    assignedCampId = best.camp_id;
  } else {
    assignedCampId = parseInt(campVal, 10);
    const chosen = Camps.find(c => c.camp_id === assignedCampId);
    if (!chosen) {
      alert('Selected camp not found');
      return;
    }
    if ((chosen.current_occupancy || 0) >= (chosen.capacity || 0)) {
      alert('Selected camp is at full capacity. Choose another camp or use Auto-assign.');
      return;
    }
  }

  // Try to call server API to create refugee; fall back to local behavior if server is down
  const payload = {
    first_name: first,
    middle_name: middle || null,
    last_name: last,
    date_of_birth: dob,
    country_of_origin: country,
    status: status,
    skills: skills
  };
  if (campVal && campVal !== 'auto') payload.camp_id = parseInt(campVal, 10);


  // Wire the donation-type select to hide/show the amount field when needed
  const typeSel = document.getElementById('donor-type');
  const amtInput = document.getElementById('donor-amount');
  function updateAmountVisibility() {
    if (!typeSel || !amtInput) return;
    if (typeSel.value === 'Financial') {
      amtInput.style.display = '';
      amtInput.disabled = false;
    } else {
      amtInput.style.display = 'none';
      amtInput.disabled = true;
      amtInput.value = '';
    }
  }
  if (typeSel) {
    typeSel.addEventListener('change', updateAmountVisibility);
    // initialize
    updateAmountVisibility();
  }
  (async () => {
    try {
      const resp = await fetch(API_BASE + '/api/refugees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const j = await resp.json();
        if (j && j.success) {
          // Add to local arrays for UI immediately
          const newId = j.refugee_id || (Refugees.length + 1);
          const newRef = {
            refugee_id: newId,
            first_name: first,
            middle_name: middle || null,
            last_name: last,
            date_of_birth: dob,
            country_of_origin: country,
            status: status,
            skills: skills,
            registration_date: new Date().toISOString(),
            camp_id: payload.camp_id || assignedCampId
          };
          Refugees.push(newRef);
          const camp = Camps.find(c => c.camp_id === (newRef.camp_id));
          if (camp) camp.current_occupancy = (camp.current_occupancy || 0) + 1;
          saveState();
          closeRegister();
          refreshQuickStats();
          loadManager(document.getElementById('canvas'));
          alert(`Refugee registered: ${first} ${last} (ID ${newId})`);
          return;
        }
      }
      // if server responded but not success, fallthrough to client fallback
      console.warn('Server failed to create refugee, falling back to local', resp.status);
    } catch (e) {
      console.warn('Refugee API not reachable, falling back to local', e);
    }

    // --- local fallback (same as before) ---
    const newId = Refugees.length + 1;
    const newRef = {
      refugee_id: newId,
      first_name: first,
      middle_name: middle || null,
      last_name: last,
      date_of_birth: dob,
      country_of_origin: country,
      status: status,
      skills: skills,
      registration_date: new Date().toISOString(),
      camp_id: assignedCampId
    };
    Refugees.push(newRef);
    const camp = Camps.find(c => c.camp_id === assignedCampId);
    if (camp) camp.current_occupancy = (camp.current_occupancy || 0) + 1;
    saveState();
    closeRegister();
    refreshQuickStats();
    loadManager(document.getElementById('canvas'));
    alert(`Refugee registered (local): ${first} ${last} (ID ${newId})`);
  })();
}

function distributeAid(refId) {
  const aidChoices = Aid.map(a => `${a.aid_id}:${a.aid_type} (stock ${a.stock})`).join('\n');
  const sel = prompt('Choose aid by id:\n' + aidChoices);
  if (!sel) return;
  const aidId = parseInt(sel);
  const qty = parseInt(prompt('Quantity to distribute', '1')) || 0;
  const aid = Aid.find(a => a.aid_id === aidId);
  if (!aid || aid.stock < qty) {
    alert('Insufficient stock');
    return;
  }
  aid.stock -= qty;
  Aid_Distribution.push({
    distribution_id: Aid_Distribution.length + 1,
    refugee_id: refId,
    aid_id: aidId,
    quantity_distributed: qty
  });
  alert('Aid Distributed');
  refreshQuickStats();
  refreshCurrentView();
}

// Volunteer-facing helper: prompt to choose a refugee and then record aid using existing flow
function recordAid() {
  if (!Refugees || Refugees.length === 0) { alert('No refugees available to record aid for'); return; }
  const list = Refugees.map(r => `${r.refugee_id}: ${r.first_name} ${r.last_name} (${Camps.find(c=>c.camp_id===r.camp_id)?.camp_name || 'Unassigned'})`).join('\n');
  const sel = prompt('Choose refugee by id to record aid for:\n' + list);
  if (!sel) return;
  const refId = parseInt(sel, 10);
  if (!refId || !Refugees.find(r => r.refugee_id === refId)) { alert('Invalid refugee selected'); return; }
  // reuse existing distributeAid flow which handles prompts for aid and quantity and updates state
  distributeAid(refId);
}

// ---------- REFUGEE ----------
function loadRefugee(container) {
  const userRef = activeUser && Refugees.find(r => r.refugee_id === activeUser.refugee_id) || Refugees[0];
  const history = Aid_Distribution
    .filter(d => d.refugee_id === userRef.refugee_id)
    .map(d => {
      const a = Aid.find(x => x.aid_id === d.aid_id);
      return `<div class='log-item'>${d.quantity_distributed} x ${a.aid_type}</div>`;
    })
    .join('');
  

// Exchange rate (USD -> INR). Update as needed or replace with live fetch.
const USD_TO_INR = 83; // example rate

// Handle donor form submission. Tries server-first, falls back to local state.
async function submitDonation(e) {
  if (e && e.preventDefault) e.preventDefault();
  console.log('submitDonation called');
  const name = (document.getElementById('donor-name')?.value || '').trim();
  const org = (document.getElementById('donor-org')?.value || '').trim();
  const amountInput = document.getElementById('donor-amount');
  const qtyInput = document.getElementById('donor-qty');
  const amount = parseFloat(amountInput?.value || 0);
  const quantity = parseInt(qtyInput?.value || 0, 10) || 0;
  const type = document.getElementById('donor-type')?.value || 'Financial';
  // validation: Financial requires amount, in-kind requires quantity
  if (!name) { alert('Please enter your name'); return; }
  if (type === 'Financial') {
    if (!amount || amount <= 0) { alert('Please enter a valid amount for Financial donations'); return; }
  } else {
    if (!quantity || quantity <= 0) { alert('Please enter a quantity for non-financial donations'); return; }
  }

  // find or create donor record locally
  let donorId = activeUser && activeUser.donor_id;
  if (!donorId) {
    const found = Donors.find(d => d.donor_name && d.donor_name.toLowerCase() === name.toLowerCase());
    if (found) donorId = found.donor_id;
  }
  if (!donorId) {
    donorId = (Donors.reduce((m, d) => Math.max(m, d.donor_id || 0), 0) || 0) + 1;
    Donors.push({ donor_id: donorId, donor_name: name, organization: org || null });
    // if user not logged in, also add a lightweight Users entry so future logins can map (local-only)
    if (!activeUser) {
      Users.push({ username: name, password: 'donor', role: 'Donor', donor_id: donorId });
      // set this donor as active user locally so subsequent loads use donor_id and show user's donations
      try {
        activeUser = { username: name, role: 'Donor', donor_id: donorId };
        localStorage.setItem('rms_active', JSON.stringify(activeUser));
      } catch (e) { /* ignore */ }
    }
  }

  const donationObj = {
    donation_id: (Donations.reduce((m, d) => Math.max(m, d.donation_id || 0), 0) || 0) + 1,
    donor_id: donorId,
    organization_id: null,
  amount: amount,
  amount_inr: amount ? Math.round(amount * USD_TO_INR) : null,
  quantity: quantity || null,
    donor_name: name,
    local_id: 'local-' + Date.now() + '-' + Math.floor(Math.random()*10000),
    donation_date: new Date().toISOString().split('T')[0],
    donation_type: type,
    organization_name: org || null
  };

  // Try server API first (best-effort). Endpoint may not exist on the demo server; fallback follows.
  try {
    const resp = await fetch(API_BASE + '/api/donations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donor_id: donorId, donor_name: name, amount: amount || null, amount_inr: amount ? Math.round(amount * USD_TO_INR) : null, quantity: quantity || null, donation_type: type, organization_name: org || null })
    });
    if (resp.ok) {
      const j = await resp.json();
      if (j && j.success && j.donation_id) {
        // mark local record with server id and synced flag
        donationObj.server_id = j.donation_id;
        donationObj.synced = true;
        // refresh authoritative data from server so admin console and donor view reflect DB
        try { await syncFromServer(); } catch (e) { console.warn('Sync after donation failed', e); }
      }
    }
  } catch (err) {
    console.warn('Donation API not reachable; saving locally', err);
  }

  Donations.push(donationObj);
  saveState();
  refreshQuickStats();
  // Update donor UI immediately (prefer local update over full reload)
  try { refreshDonorView(); } catch (e) { try { await loadDonor(document.getElementById('canvas')); } catch (err) { console.warn('Could not reload donor view', err); } }
  alert('Thank you for your donation — it has been recorded.');
}

// Recompute and refresh donor summary and donations table on the donor page
function refreshDonorView() {
  const donorId = activeUser && activeUser.donor_id || null;
  let myDonations = [];
  if (donorId) {
    myDonations = Donations.filter(d => d.donor_id === donorId).slice().reverse();
  } else {
    myDonations = Donations.slice().reverse();
  }
  const donorSumEl = document.getElementById('donor-sum');
  const totalUSD = myDonations.reduce((s, x) => s + (x.amount || 0), 0);
  const totalINR = myDonations.reduce((s, x) => s + (x.amount_inr || Math.round((x.amount || 0) * USD_TO_INR)), 0);
  if (donorSumEl) donorSumEl.innerText = `$${totalUSD.toLocaleString()} (₹${totalINR.toLocaleString()})`;

  // Update the donations table body if present (use stable id)
  const tbody = document.querySelector('#donor-donations-table tbody');
  if (tbody) {
    tbody.innerHTML = '';
    myDonations.forEach(d => {
      const donorName = (Donors.find(dd => dd.donor_id === d.donor_id)?.donor_name) || (d.donor_name || 'Unknown');
      const org = d.organization_name || '';
      const amt = d.amount !== null && d.amount !== undefined ? `$${(d.amount).toLocaleString()}` : '-';
      const qty = d.quantity ? d.quantity : '-';
      const inr = d.amount_inr ? `₹${(d.amount_inr).toLocaleString()}` : '-';
      const type = d.donation_type || '-';
      const date = d.donation_date || '-';
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${donorName}</td><td>${org}</td><td>${type}</td><td style='text-align:right'>${amt}</td><td style='text-align:right'>${inr}</td><td style='text-align:right'>${qty}</td><td>${date}</td>`;
      tbody.appendChild(tr);
    });
    // append totals row
    const totalRow = document.createElement('tr');
    totalRow.style.fontWeight = '700';
    totalRow.innerHTML = `<td colspan='3'>Totals</td><td style='text-align:right'>$${totalUSD.toLocaleString()}</td><td style='text-align:right'>₹${totalINR.toLocaleString()}</td><td></td><td></td>`;
    tbody.appendChild(totalRow);
  }
}

  // ---------- INITIALIZE ----------
  refreshQuickStats();

  // Compute a small milestone-based progress model for refugees.
  // Milestones: Registration, Health Check, Skills Training, Employment Placement
  const milestones = [
    { id: 'registration', label: 'Registration', done: !!userRef.registration_date },
    { id: 'health', label: 'Health Check', done: !!userRef.health_check },
    { id: 'skills', label: 'Skills Training', done: !!(userRef.skills && userRef.skills.trim()) },
    { id: 'placement', label: 'Employment Placement', done: !!userRef.placement_assigned }
  ];
  const completed = milestones.filter(m => m.done).length;
  const total = milestones.length;
  const percent = Math.round((completed / total) * 100);
  // Levels: 1 (0-33), 2 (34-66), 3 (67-100)
  let level = 1 + Math.floor(percent / 33.3333);
  if (level > 3) level = 3;
  const completedLabels = milestones.filter(m => m.done).map(m => m.label);
  const next = milestones.find(m => !m.done);

  container.innerHTML = `
    <div class='grid' style='margin-bottom:12px'>
      <div class='widget'><div class='muted'>Welcome</div><div class='big'>${userRef.first_name} ${userRef.last_name}</div></div>
      <div class='widget'><div class='muted'>Status</div><div class='muted'>${userRef.status}</div></div>
      <div class='widget'><div class='muted'>Camp</div>
      <div class='muted'>${Camps.find(c => c.camp_id === userRef.camp_id)?.camp_name || '-'}</div></div>
    </div>

    <div class='card widget full'>
      <div style='display:flex;align-items:center;justify-content:space-between'>
        <div>
          <strong>Integration Journey</strong>
          <div class='muted'>Progress through milestones</div>
        </div>
        <div><div class='muted'>Level ${level}</div></div>
      </div>

      <div style='margin-top:12px'>
        <div class='journey'>
          <div class='prog' id='ref-journey' style='width:${percent}%;background:linear-gradient(90deg,var(--accent),var(--accent2))'></div>
        </div>
        <div class='muted' style='margin-top:8px'>
          Completed: ${completedLabels.length ? completedLabels.join(', ') : 'None' }.
          ${next ? ` Next: ${next.label}` : ' All milestones completed.'}
        </div>
      </div>
    </div>

    <div class='card widget'>
      <div class='muted'>Aid Distribution History</div>
      <div class='log' style='margin-top:8px'>${history}</div>
    </div>
  `;
}

function logout() {
  activeUser = null;
  activeRole = null;
  try { localStorage.removeItem('rms_active'); } catch (e) {}
  
  const mainEl = document.querySelector('main');
  if (mainEl) mainEl.classList.remove('full');
  
  try {
    document.body.classList.remove('authenticated');
    document.body.classList.add('landing');
  } catch (e) {}
  window.location.href = 'index.html';
}
