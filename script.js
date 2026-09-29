/**
 * Matched Betting Tracker – Biagio, Mario, Leonardo & Co.
 * Static site · localStorage · GitHub Pages ready
 */
(function () {
  'use strict';

  // ========== CONSTANTS ==========
  const STORE_USERS = 'mb_users_v1';
  const STORE_DATA = 'mb_data_v1';
  const STORE_SESSION = 'mb_session_v1';
  const STORE_CALC = 'mb_calc_v1';
  const STORE_LOG = 'mb_log_v1';

  const DEFAULT_USERS = [
    { id: 'biagio', name: 'Biagio', pin: '140523', admin: true },
    { id: 'mario', name: 'Mario', pin: '111021', admin: false },
    { id: 'leonardo', name: 'Leonardo', pin: '050106', admin: false }
  ];

  const DEFAULT_CALC = {
    start: '',
    days: 30,
    tassa: '13',
    quota: '0',
    vincita: '905',
    persone: 3,
    budget: '280',
    vincitaAltro: '0',
    steps: [
      { partita: 'Norvegia - Portogallo', quota: '2.20', puntata: '15', success: true },
      { partita: 'Georgia - Ucraina', quota: '2.10', puntata: '0', success: true },
      { partita: 'Belgio - Francia', quota: '1.80', puntata: '70', success: true },
      { partita: 'Finlandia - Bielorussia', quota: '2.40', puntata: '138', success: false },
      { partita: 'Danimarca - Portogallo', quota: '2.30', puntata: '267', success: false }
    ]
  };

  // ========== STATE ==========
  let users = [];
  let data = {};      // { userId: { movements: [], debts: [] } }
  let currentUser = null;
  let calc = null;
  let log = [];
  let selectedLoginUser = null;

  // ========== HELPERS ==========
  function num(v) {
    const n = parseFloat(String(v).replace(',', '.'));
    return isFinite(n) ? n : 0;
  }

  function eur(n) {
    return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

  function signed(n) {
    return (n >= 0 ? '+' : '−') + eur(Math.abs(n));
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function avatarLetter(name) {
    return (name || '?').charAt(0).toUpperCase();
  }

  // ========== STORAGE ==========
  function loadUsers() {
    try {
      const raw = localStorage.getItem(STORE_USERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_USERS));
  }

  function saveUsers() {
    try { localStorage.setItem(STORE_USERS, JSON.stringify(users)); } catch (e) {}
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORE_DATA);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
  }

  function saveData() {
    try { localStorage.setItem(STORE_DATA, JSON.stringify(data)); } catch (e) {}
  }

  function ensureUserData(id) {
    if (!data[id]) data[id] = { movements: [], debts: [] };
  }

  function loadCalc() {
    try {
      const raw = localStorage.getItem(STORE_CALC);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.steps) return parsed;
      }
    } catch (e) {}
    const d = JSON.parse(JSON.stringify(DEFAULT_CALC));
    d.start = today();
    return d;
  }

  function saveCalc() {
    try { localStorage.setItem(STORE_CALC, JSON.stringify(calc)); } catch (e) {}
  }

  function loadLog() {
    try {
      const raw = localStorage.getItem(STORE_LOG);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function saveLog() {
    try { localStorage.setItem(STORE_LOG, JSON.stringify(log.slice(0, 200))); } catch (e) {}
  }

  function addLog(msg) {
    log.unshift({ id: uid(), ts: new Date().toISOString(), user: currentUser ? currentUser.name : 'System', msg });
    saveLog();
  }

  function loadSession() {
    try {
      const id = localStorage.getItem(STORE_SESSION);
      if (id) return users.find(u => u.id === id) || null;
    } catch (e) {}
    return null;
  }

  function saveSession(id) {
    try {
      if (id) localStorage.setItem(STORE_SESSION, id);
      else localStorage.removeItem(STORE_SESSION);
    } catch (e) {}
  }

  // ========== INIT ==========
  function init() {
    users = loadUsers();
    data = loadData();
    users.forEach(u => ensureUserData(u.id));
    calc = loadCalc();
    log = loadLog();
    checkCalcExpiry();

    currentUser = loadSession();
    if (currentUser) {
      showApp();
    } else {
      showLogin();
    }

    bindGlobalEvents();
  }

  function checkCalcExpiry() {
    if (!calc.start || !calc.days) return;
    const start = new Date(calc.start);
    const end = new Date(start);
    end.setDate(end.getDate() + num(calc.days));
    if (new Date() > end) {
      calc = JSON.parse(JSON.stringify(DEFAULT_CALC));
      calc.start = today();
      saveCalc();
      addLog('Periodo calcoli scaduto – dati resettati automaticamente');
    }
  }

  // ========== LOGIN ==========
  function showLogin() {
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('app-screen').classList.remove('active');
    renderUserList();
    document.getElementById('pin-section').hidden = true;
    selectedLoginUser = null;
  }

  function showApp() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');
    document.getElementById('header-name').textContent = currentUser.name;
    document.getElementById('header-avatar').textContent = avatarLetter(currentUser.name);
    document.getElementById('header-role').textContent = currentUser.admin ? 'Admin' : 'Utente';
    document.getElementById('header-role').style.display = currentUser.admin ? '' : 'none';
    switchTab('wallet');
    renderAll();
  }

  function renderUserList() {
    const el = document.getElementById('user-list');
    el.innerHTML = users.map(u => `
      <button type="button" class="user-btn" data-id="${esc(u.id)}">
        <span class="avatar">${avatarLetter(u.name)}</span>
        <span>
          <span class="name">${esc(u.name)}</span><br>
          <span class="role">${u.admin ? 'Admin' : 'Utente'}</span>
        </span>
      </button>
    `).join('');
  }

  function selectUserForPin(id) {
    selectedLoginUser = users.find(u => u.id === id);
    if (!selectedLoginUser) return;
    document.getElementById('user-list').style.display = 'none';
    document.getElementById('pin-section').hidden = false;
    document.getElementById('pin-user-name').textContent = 'PIN di ' + selectedLoginUser.name;
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-error').hidden = true;
    document.getElementById('pin-input').focus();
  }

  function tryLogin() {
    const pin = document.getElementById('pin-input').value.trim();
    const err = document.getElementById('pin-error');
    if (!selectedLoginUser) return;
    if (pin !== selectedLoginUser.pin) {
      err.textContent = 'PIN errato';
      err.hidden = false;
      return;
    }
    currentUser = selectedLoginUser;
    saveSession(currentUser.id);
    addLog(currentUser.name + ' ha effettuato l\'accesso');
    showApp();
  }

  function cancelPin() {
    selectedLoginUser = null;
    document.getElementById('pin-section').hidden = true;
    document.getElementById('user-list').style.display = '';
    document.getElementById('pin-input').value = '';
  }

  function logout() {
    addLog(currentUser.name + ' ha effettuato il logout');
    currentUser = null;
    saveSession(null);
    showLogin();
  }

  // ========== USERS MANAGEMENT ==========
  function openAddUser() {
    document.getElementById('new-user-name').value = '';
    document.getElementById('new-user-pin').value = '';
    document.getElementById('new-user-admin').checked = false;
    document.getElementById('add-user-error').hidden = true;
    openModal('modal-add-user');
  }

  function saveNewUser() {
    const name = document.getElementById('new-user-name').value.trim();
    const pin = document.getElementById('new-user-pin').value.trim();
    const admin = document.getElementById('new-user-admin').checked;
    const err = document.getElementById('add-user-error');

    if (!name || name.length < 2) {
      err.textContent = 'Nome troppo corto';
      err.hidden = false;
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      err.textContent = 'PIN deve essere 4-6 cifre';
      err.hidden = false;
      return;
    }
    if (users.some(u => u.name.toLowerCase() === name.toLowerCase())) {
      err.textContent = 'Nome già esistente';
      err.hidden = false;
      return;
    }

    const id = name.toLowerCase().replace(/\s+/g, '_') + '_' + uid().slice(-4);
    users.push({ id, name, pin, admin });
    ensureUserData(id);
    saveUsers();
    saveData();
    addLog('Nuovo utente creato: ' + name);
    closeModals();
    renderUserList();
  }

  function openManageUsers() {
    const el = document.getElementById('manage-user-list');
    el.innerHTML = users.map(u => `
      <div class="list-item">
        <div class="info">
          <div class="title">${esc(u.name)} ${u.admin ? '<span class="badge">Admin</span>' : ''}</div>
          <div class="sub">ID: ${esc(u.id)}</div>
        </div>
        <div class="actions">
          ${u.id !== 'biagio' ? `<button type="button" class="btn danger small btn-del-user" data-id="${esc(u.id)}">Elimina</button>` : '<span class="muted small">Protett o</span>'}
        </div>
      </div>
    `).join('');
    openModal('modal-manage-users');
  }

  function deleteUser(id) {
    if (id === 'biagio') return;
    if (!confirm('Eliminare definitivamente questo utente e tutti i suoi dati?')) return;
    users = users.filter(u => u.id !== id);
    delete data[id];
    saveUsers();
    saveData();
    addLog('Utente eliminato: ' + id);
    closeModals();
    renderUserList();
  }

  // ========== TABS ==========
  function switchTab(tab) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + tab));
    if (tab === 'wallet') renderWallet();
    if (tab === 'debts') renderDebts();
    if (tab === 'calcoli') renderCalcoli();
    if (tab === 'log') renderLog();
  }

  function renderAll() {
    renderWallet();
    renderDebts();
    renderCalcoli();
    renderLog();
  }

  // ========== WALLET ==========
  function getMovements(userId) {
    ensureUserData(userId);
    return data[userId].movements || [];
  }

  function calcBalance(userId) {
    const movs = getMovements(userId);
    return movs.reduce((s, m) => {
      if (m.type === 'deposit') return s + num(m.amount);
      if (m.type === 'withdraw') return s - num(m.amount);
      return s;
    }, 0);
  }

  function renderWallet() {
    const bal = calcBalance(currentUser.id);
    document.getElementById('wallet-balance').textContent = eur(bal);
    document.getElementById('wallet-balance').className = bal >= 0 ? 'pos' : 'neg';

    const filter = document.getElementById('filter-movements').value;
    let movs = getMovements(currentUser.id).slice().reverse();
    if (filter !== 'all') movs = movs.filter(m => m.type === filter);

    const el = document.getElementById('movements-list');
    if (!movs.length) {
      el.innerHTML = '<div class="empty">Nessun movimento</div>';
      return;
    }
    el.innerHTML = movs.map(m => {
      const isDep = m.type === 'deposit';
      return `
        <div class="list-item">
          <div class="info">
            <div class="title">${esc(m.site || '—')}</div>
            <div class="sub">${esc(m.date)} ${m.bank ? '· ' + esc(m.bank) : ''} ${m.note ? '· ' + esc(m.note) : ''} ${m.split ? '· ➗ diviso' : ''}</div>
          </div>
          <div class="amount ${isDep ? 'pos' : 'neg'}">${isDep ? '+' : '−'}${eur(num(m.amount))}</div>
          <div class="actions">
            <button type="button" class="btn ghost small btn-del-mov" data-id="${esc(m.id)}" title="Elimina">✕</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function openDeposit() {
    document.getElementById('dep-site').value = '';
    document.getElementById('dep-amount').value = '';
    document.getElementById('dep-date').value = today();
    document.getElementById('dep-note').value = '';
    document.getElementById('dep-split').checked = false;
    document.getElementById('dep-split-users').hidden = true;
    fillSplitUsers('dep-split-users');
    openModal('modal-deposit');
  }

  function openWithdraw() {
    document.getElementById('wit-site').value = '';
    document.getElementById('wit-bank').value = '';
    document.getElementById('wit-amount').value = '';
    document.getElementById('wit-date').value = today();
    document.getElementById('wit-note').value = '';
    document.getElementById('wit-split').checked = false;
    document.getElementById('wit-split-users').hidden = true;
    fillSplitUsers('wit-split-users');
    openModal('modal-withdraw');
  }

  function fillSplitUsers(containerId) {
    const el = document.getElementById(containerId);
    el.innerHTML = users
      .filter(u => u.id !== currentUser.id)
      .map(u => `
        <label>
          <input type="checkbox" value="${esc(u.id)}" checked> ${esc(u.name)}
        </label>
      `).join('');
  }

  function saveDeposit() {
    const site = document.getElementById('dep-site').value.trim();
    const amount = num(document.getElementById('dep-amount').value);
    const date = document.getElementById('dep-date').value || today();
    const note = document.getElementById('dep-note').value.trim();
    const split = document.getElementById('dep-split').checked;

    if (!site || amount <= 0) {
      alert('Inserisci sito e importo validi');
      return;
    }

    const mov = {
      id: uid(),
      type: 'deposit',
      site,
      amount,
      date,
      note,
      split,
      created: new Date().toISOString()
    };
    ensureUserData(currentUser.id);
    data[currentUser.id].movements.push(mov);

    if (split) {
      const checked = [...document.querySelectorAll('#dep-split-users input:checked')].map(c => c.value);
      const share = amount / (checked.length + 1);
      checked.forEach(uid2 => {
        addDebt(uid2, currentUser.id, share, 'Quota deposito su ' + site, date);
      });
    }

    saveData();
    addLog(currentUser.name + ' ha depositato ' + eur(amount) + ' su ' + site + (split ? ' (diviso)' : ''));
    closeModals();
    renderWallet();
    renderDebts();
  }

  function saveWithdraw() {
    const site = document.getElementById('wit-site').value.trim();
    const bank = document.getElementById('wit-bank').value.trim();
    const amount = num(document.getElementById('wit-amount').value);
    const date = document.getElementById('wit-date').value || today();
    const note = document.getElementById('wit-note').value.trim();
    const split = document.getElementById('wit-split').checked;

    if (!site || amount <= 0) {
      alert('Inserisci sito e importo validi');
      return;
    }

    const mov = {
      id: uid(),
      type: 'withdraw',
      site,
      bank,
      amount,
      date,
      note,
      split,
      created: new Date().toISOString()
    };
    ensureUserData(currentUser.id);
    data[currentUser.id].movements.push(mov);

    if (split) {
      const checked = [...document.querySelectorAll('#wit-split-users input:checked')].map(c => c.value);
      const share = amount / (checked.length + 1);
      checked.forEach(uid2 => {
        // Chi preleva ha ricevuto soldi: gli altri gli devono la quota
        addDebt(uid2, currentUser.id, share, 'Quota prelievo da ' + site, date);
      });
    }

    saveData();
    addLog(currentUser.name + ' ha prelevato ' + eur(amount) + ' da ' + site + (bank ? ' → ' + bank : '') + (split ? ' (diviso)' : ''));
    closeModals();
    renderWallet();
    renderDebts();
  }

  function deleteMovement(id) {
    if (!confirm('Eliminare questo movimento?')) return;
    const movs = data[currentUser.id].movements;
    const idx = movs.findIndex(m => m.id === id);
    if (idx >= 0) {
      const m = movs[idx];
      movs.splice(idx, 1);
      saveData();
      addLog('Movimento eliminato: ' + m.type + ' ' + eur(m.amount));
      renderWallet();
    }
  }

  // ========== DEBTS ==========
  function getAllDebts() {
    // Collect all debts from all users, normalize direction
    const all = [];
    Object.keys(data).forEach(uid => {
      (data[uid].debts || []).forEach(d => {
        all.push({ ...d, ownerId: uid });
      });
    });
    return all;
  }

  function addDebt(fromId, toId, amount, reason, date) {
    // fromId deve a toId
    ensureUserData(toId);
    data[toId].debts.push({
      id: uid(),
      from: fromId,
      to: toId,
      amount: num(amount),
      reason: reason || '',
      date: date || today(),
      settled: false,
      created: new Date().toISOString()
    });
  }

  function renderDebts() {
    const all = getAllDebts().filter(d => !d.settled);
    const me = currentUser.id;

    // Summary: net per other user
    const nets = {};
    users.forEach(u => { if (u.id !== me) nets[u.id] = 0; });

    all.forEach(d => {
      if (d.to === me && d.from !== me) {
        // qualcuno mi deve
        nets[d.from] = (nets[d.from] || 0) + num(d.amount);
      }
      if (d.from === me && d.to !== me) {
        // io devo a qualcuno
        nets[d.to] = (nets[d.to] || 0) - num(d.amount);
      }
    });

    const sumEl = document.getElementById('debts-summary');
    const chips = Object.entries(nets)
      .filter(([, v]) => Math.abs(v) > 0.005)
      .map(([uid, v]) => {
        const u = users.find(x => x.id === uid);
        const name = u ? u.name : uid;
        if (v > 0) {
          return `<div class="debt-chip pos"><span>${esc(name)} ti deve</span><span>${eur(v)}</span></div>`;
        }
        return `<div class="debt-chip neg"><span>Devi a ${esc(name)}</span><span>${eur(Math.abs(v))}</span></div>`;
      });
    sumEl.innerHTML = chips.length ? chips.join('') : '<div class="empty">Nessun debito in sospeso</div>';

    // Full list
    const listEl = document.getElementById('debts-list');
    const relevant = all.filter(d => d.from === me || d.to === me);
    if (!relevant.length) {
      listEl.innerHTML = '<div class="empty">Nessun debito registrato</div>';
      return;
    }
    listEl.innerHTML = relevant.slice().reverse().map(d => {
      const fromU = users.find(u => u.id === d.from);
      const toU = users.find(u => u.id === d.to);
      const fromN = fromU ? fromU.name : d.from;
      const toN = toU ? toU.name : d.to;
      return `
        <div class="list-item">
          <div class="info">
            <div class="title">${esc(fromN)} → ${esc(toN)}</div>
            <div class="sub">${esc(d.date)} · ${esc(d.reason || '—')}</div>
          </div>
          <div class="amount">${eur(num(d.amount))}</div>
          <div class="actions">
            <button type="button" class="btn ghost small btn-settle-debt" data-id="${esc(d.id)}" data-owner="${esc(d.ownerId)}" title="Segna come pagato">✓</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function openDebtModal() {
    const fromSel = document.getElementById('debt-from');
    const toSel = document.getElementById('debt-to');
    const opts = users.map(u => `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('');
    fromSel.innerHTML = opts;
    toSel.innerHTML = opts;
    fromSel.value = currentUser.id;
    toSel.value = users.find(u => u.id !== currentUser.id)?.id || '';
    document.getElementById('debt-amount').value = '';
    document.getElementById('debt-reason').value = '';
    document.getElementById('debt-date').value = today();
    openModal('modal-debt');
  }

  function saveDebt() {
    const from = document.getElementById('debt-from').value;
    const to = document.getElementById('debt-to').value;
    const amount = num(document.getElementById('debt-amount').value);
    const reason = document.getElementById('debt-reason').value.trim();
    const date = document.getElementById('debt-date').value || today();

    if (from === to) {
      alert('Seleziona due utenti diversi');
      return;
    }
    if (amount <= 0) {
      alert('Importo non valido');
      return;
    }

    addDebt(from, to, amount, reason, date);
    saveData();
    const fromN = users.find(u => u.id === from)?.name || from;
    const toN = users.find(u => u.id === to)?.name || to;
    addLog(`Debito aggiunto: ${fromN} deve ${eur(amount)} a ${toN}`);
    closeModals();
    renderDebts();
  }

  function settleDebt(id, ownerId) {
    const debts = data[ownerId]?.debts || [];
    const d = debts.find(x => x.id === id);
    if (!d) return;
    if (!confirm('Segnare come pagato?')) return;
    d.settled = true;
    saveData();
    addLog('Debito segnato come pagato: ' + eur(d.amount));
    renderDebts();
  }

  // ========== CALCOLI ==========
  function isAdmin() {
    return currentUser && currentUser.admin;
  }

  function renderCalcoli() {
    const readonly = !isAdmin();
    const cfg = document.getElementById('calcoli-config');
    cfg.classList.toggle('readonly', readonly);
    document.getElementById('calcoli-readonly-note').hidden = !readonly;
    document.getElementById('calc-actions').hidden = readonly;
    document.getElementById('btn-add-step').hidden = readonly;

    // Fill form
    document.getElementById('calc-start').value = calc.start || '';
    document.getElementById('calc-days').value = calc.days || 30;
    document.getElementById('calc-tassa').value = calc.tassa || '';
    document.getElementById('calc-quota').value = calc.quota || '';
    document.getElementById('calc-vincita').value = calc.vincita || '';
    document.getElementById('calc-persone').value = calc.persone || 3;
    document.getElementById('calc-budget').value = calc.budget || '';
    document.getElementById('calc-vincita-altro').value = calc.vincitaAltro || '';

    // Expiry info
    if (calc.start && calc.days) {
      const start = new Date(calc.start);
      const end = new Date(start);
      end.setDate(end.getDate() + num(calc.days));
      document.getElementById('calc-scadenza').textContent =
        'Scadenza: ' + end.toLocaleDateString('it-IT') + ' · Reset automatico alla scadenza';
    } else {
      document.getElementById('calc-scadenza').textContent = '';
    }

    // Steps
    const container = document.getElementById('steps-container');
    container.innerHTML = '';
    (calc.steps || []).forEach((s, i) => {
      container.appendChild(buildStepCard(s, i, readonly));
    });

    // Disable inputs if readonly
    cfg.querySelectorAll('input').forEach(inp => {
      inp.disabled = readonly;
    });

    computeCalcoli();
  }

  function buildStepCard(step, index, readonly) {
    const div = document.createElement('div');
    div.className = 'step' + (step.success ? ' done-step' : '');
    div.dataset.index = index;

    div.innerHTML = `
      <div class="head">
        <span class="n">Step ${index + 1}</span>
        <input class="match-input" type="text" value="${esc(step.partita || '')}" placeholder="Partita" ${readonly ? 'disabled' : ''}>
        ${!readonly ? `<button type="button" class="btn-remove-step" data-i="${index}">✕</button>` : ''}
      </div>
      <div class="row">
        <div class="cell">
          <label>Quota</label>
          <input type="text" class="inp-quota" inputmode="decimal" value="${esc(step.quota || '')}" ${readonly ? 'disabled' : ''}>
        </div>
        <div class="cell">
          <label>Puntata totale (€)</label>
          <input type="text" class="inp-puntata" inputmode="decimal" value="${esc(step.puntata || '')}" ${readonly ? 'disabled' : ''}>
        </div>
        <div class="cell">
          <label>Netto a testa</label>
          <div class="out">–</div>
        </div>
      </div>
      <div class="meta"></div>
      <div class="err" hidden></div>
      <label class="success-check">
        <input type="checkbox" class="inp-success" ${step.success ? 'checked' : ''} ${readonly ? 'disabled' : ''}>
        Step andato a buon fine (vinto su Eurobet)
      </label>
    `;

    if (!readonly) {
      div.querySelector('.match-input').addEventListener('input', () => onStepChange());
      div.querySelector('.inp-quota').addEventListener('input', () => onStepChange());
      div.querySelector('.inp-puntata').addEventListener('input', () => onStepChange());
      div.querySelector('.inp-success').addEventListener('change', () => onStepChange());
      const rm = div.querySelector('.btn-remove-step');
      if (rm) rm.addEventListener('click', () => removeStep(index));
    }

    return div;
  }

  function readStepsFromDOM() {
    const cards = document.querySelectorAll('#steps-container .step');
    return [...cards].map(card => ({
      partita: card.querySelector('.match-input').value,
      quota: card.querySelector('.inp-quota').value,
      puntata: card.querySelector('.inp-puntata').value,
      success: card.querySelector('.inp-success').checked
    }));
  }

  function onStepChange() {
    if (!isAdmin()) return;
    calc.steps = readStepsFromDOM();
    computeCalcoli();
  }

  function addStep() {
    if (!isAdmin()) return;
    calc.steps = readStepsFromDOM();
    calc.steps.push({ partita: '', quota: '', puntata: '', success: false });
    renderCalcoli();
  }

  function removeStep(index) {
    if (!isAdmin()) return;
    calc.steps = readStepsFromDOM();
    calc.steps.splice(index, 1);
    renderCalcoli();
  }

  function computeCalcoli() {
    const budget = num(document.getElementById('calc-budget').value);
    const persone = num(document.getElementById('calc-persone').value) || 1;
    const tassa = num(document.getElementById('calc-tassa').value);
    const vincita = num(document.getElementById('calc-vincita').value);
    const steps = readStepsFromDOM();

    let perse = 0;
    let cum = 0;
    let firstOver = 0;

    const cards = document.querySelectorAll('#steps-container .step');
    steps.forEach((s, i) => {
      const card = cards[i];
      if (!card) return;
      const q = num(s.quota);
      const p = num(s.puntata);
      const filled = s.puntata.trim() !== '' && q > 0;

      cum += p;
      const cumTesta = cum / persone;
      const over = budget > 0 && cumTesta > budget + 0.005;
      if (over && !firstOver) firstOver = i + 1;

      // Net = puntata * quota - (spese precedenti + questa puntata + tassa)
      // Se step già vinto (success), la copertura è persa → costo fisso
      let net;
      if (s.success) {
        net = -(p); // solo costo, già persa
        perse += p;
      } else {
        net = p * q - (perse + p + tassa);
        perse += p;
      }

      const out = card.querySelector('.out');
      const meta = card.querySelector('.meta');
      const err = card.querySelector('.err');

      if (filled) {
        out.textContent = signed(net / persone);
        out.className = 'out ' + (net >= 0 ? 'pos' : 'neg');
      } else {
        out.textContent = '–';
        out.className = 'out';
      }
      meta.textContent = 'A testa ' + eur(p / persone) + ' · Cassa cumulata ' + eur(cumTesta) + ' a testa';
      card.classList.toggle('over', over);
      if (over) {
        err.hidden = false;
        err.textContent = 'Errore: superi il budget di ' + eur(cumTesta - budget) + ' a testa.';
      } else {
        err.hidden = true;
      }
    });

    // Final
    const nettoEur = vincita - cum - tassa;
    const fo = document.getElementById('final-out');
    fo.textContent = signed(nettoEur / persone) + ' a testa';
    fo.className = 'out ' + (nettoEur >= 0 ? 'pos' : 'neg');
    document.getElementById('final-meta').textContent =
      'Vincita netta ' + eur(vincita) + ' − coperture ' + eur(cum) + ' − tassa ' + eur(tassa);
  }

  function saveCalcoli() {
    if (!isAdmin()) return;
    calc.start = document.getElementById('calc-start').value;
    calc.days = num(document.getElementById('calc-days').value) || 30;
    calc.tassa = document.getElementById('calc-tassa').value;
    calc.quota = document.getElementById('calc-quota').value;
    calc.vincita = document.getElementById('calc-vincita').value;
    calc.persone = num(document.getElementById('calc-persone').value) || 3;
    calc.budget = document.getElementById('calc-budget').value;
    calc.vincitaAltro = document.getElementById('calc-vincita-altro').value;
    calc.steps = readStepsFromDOM();
    saveCalc();
    addLog('Calcoli salvati da ' + currentUser.name);
    alert('Calcoli salvati');
    renderCalcoli();
  }

  function resetCalcoli() {
    if (!isAdmin()) return;
    if (!confirm('Ripristinare i valori di default?')) return;
    calc = JSON.parse(JSON.stringify(DEFAULT_CALC));
    calc.start = today();
    saveCalc();
    addLog('Calcoli resettati ai default');
    renderCalcoli();
  }

  // ========== LOG ==========
  function renderLog() {
    const el = document.getElementById('log-list');
    if (!log.length) {
      el.innerHTML = '<div class="empty">Nessuna attività</div>';
      return;
    }
    el.innerHTML = log.slice(0, 50).map(l => {
      const d = new Date(l.ts);
      const ts = d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      return `
        <div class="list-item">
          <div class="info">
            <div class="title">${esc(l.msg)}</div>
            <div class="sub">${esc(ts)} · ${esc(l.user)}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function clearLog() {
    if (!confirm('Cancellare tutto il log?')) return;
    log = [];
    saveLog();
    renderLog();
  }

  // ========== MODALS ==========
  function openModal(id) {
    document.getElementById(id).hidden = false;
  }

  function closeModals() {
    document.querySelectorAll('.modal').forEach(m => { m.hidden = true; });
  }

  // ========== EVENTS ==========
  function bindGlobalEvents() {
    // Login
    document.getElementById('user-list').addEventListener('click', e => {
      const btn = e.target.closest('.user-btn');
      if (btn) selectUserForPin(btn.dataset.id);
    });
    document.getElementById('btn-login').addEventListener('click', tryLogin);
    document.getElementById('pin-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') tryLogin();
    });
    document.getElementById('btn-cancel-pin').addEventListener('click', cancelPin);
    document.getElementById('btn-logout').addEventListener('click', logout);

    // Users
    document.getElementById('btn-add-user').addEventListener('click', openAddUser);
    document.getElementById('btn-manage-users').addEventListener('click', openManageUsers);
    document.getElementById('btn-save-user').addEventListener('click', saveNewUser);
    document.getElementById('manage-user-list').addEventListener('click', e => {
      const btn = e.target.closest('.btn-del-user');
      if (btn) deleteUser(btn.dataset.id);
    });

    // Tabs
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Wallet
    document.getElementById('btn-add-deposit').addEventListener('click', openDeposit);
    document.getElementById('btn-add-withdraw').addEventListener('click', openWithdraw);
    document.getElementById('btn-save-deposit').addEventListener('click', saveDeposit);
    document.getElementById('btn-save-withdraw').addEventListener('click', saveWithdraw);
    document.getElementById('filter-movements').addEventListener('change', renderWallet);
    document.getElementById('movements-list').addEventListener('click', e => {
      const btn = e.target.closest('.btn-del-mov');
      if (btn) deleteMovement(btn.dataset.id);
    });
    document.getElementById('dep-split').addEventListener('change', function () {
      document.getElementById('dep-split-users').hidden = !this.checked;
    });
    document.getElementById('wit-split').addEventListener('change', function () {
      document.getElementById('wit-split-users').hidden = !this.checked;
    });

    // Debts
    document.getElementById('btn-add-debt').addEventListener('click', openDebtModal);
    document.getElementById('btn-save-debt').addEventListener('click', saveDebt);
    document.getElementById('debts-list').addEventListener('click', e => {
      const btn = e.target.closest('.btn-settle-debt');
      if (btn) settleDebt(btn.dataset.id, btn.dataset.owner);
    });

    // Calcoli
    document.getElementById('btn-add-step').addEventListener('click', addStep);
    document.getElementById('btn-save-calc').addEventListener('click', saveCalcoli);
    document.getElementById('btn-reset-calc').addEventListener('click', resetCalcoli);
    ['calc-budget', 'calc-tassa', 'calc-vincita', 'calc-persone'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => {
        if (isAdmin()) computeCalcoli();
      });
    });

    // Log
    document.getElementById('btn-clear-log').addEventListener('click', clearLog);

    // Close modals
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', closeModals);
    });
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', e => {
        if (e.target === modal) closeModals();
      });
    });
  }

  // ========== START ==========
  init();
})();
