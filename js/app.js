(function () {
'use strict';
const K = {
users: 'mb2_users',
data: 'mb2_data',
session: 'mb2_session',
calc: 'mb2_calc',
log: 'mb2_log',
ip: 'mb2_ip'
};
const DEFAULT_USERS = [
{ id: 'biagio', name: 'Biagio', pin: '010203', admin: true },
{ id: 'mario', name: 'Mario', pin: '111021', admin: false },
{ id: 'leonardo', name: 'Leonardo', pin: '050106', admin: false }
];
const DEFAULT_CALC = {
start: '',
days: 30,
freebet: '100',
tassa: '13',
vincita: '905',
budget: '280',
persone: 'Biagio, Mario, Leonardo',
steps: [
{ partita: '', quota: '', puntata: '', success: false },
{ partita: '', quota: '', puntata: '', success: false },
{ partita: '', quota: '', puntata: '', success: false },
{ partita: '', quota: '', puntata: '', success: false },
{ partita: '', quota: '', puntata: '', success: false }
]
};
let users = [];
let data = {};
let current = null;
let calc = null;
let log = [];
let ipLog = [];
let loginSel = null;
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
return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function esc(s) {
return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function letter(n) {
return (n || '?').charAt(0).toUpperCase();
}
function load(key, fallback) {
try {
const r = localStorage.getItem(key);
if (r) return JSON.parse(r);
} catch (e) {}
return fallback;
}
function save(key, val) {
try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}
function ensure(id) {
if (!data[id]) {
data[id] = { movements: [], debts: [], books: [], invites: [], bankAdj: 0 };
}
if (!data[id].books) data[id].books = [];
if (!data[id].invites) data[id].invites = [];
if (data[id].bankAdj == null) data[id].bankAdj = 0;
}
function init() {
users = load(K.users, null);
if (!Array.isArray(users) || !users.length) users = JSON.parse(JSON.stringify(DEFAULT_USERS));
const b = users.find(u => u.id === 'biagio');
if (b && b.pin === '140523') b.pin = '010203';
data = load(K.data, {});
users.forEach(u => ensure(u.id));
calc = load(K.calc, null);
if (!calc || !calc.steps) {
calc = JSON.parse(JSON.stringify(DEFAULT_CALC));
calc.start = today();
}
log = load(K.log, []);
ipLog = load(K.ip, []);
checkExpiry();
const sid = localStorage.getItem(K.session);
current = sid ? users.find(u => u.id === sid) : null;
if (current) showApp();
else showLogin();
bind();
}
function checkExpiry() {
if (!calc.start || !calc.days) return;
const end = new Date(calc.start);
end.setDate(end.getDate() + num(calc.days));
if (new Date() > end) {
calc = JSON.parse(JSON.stringify(DEFAULT_CALC));
calc.start = today();
save(K.calc, calc);
addLog('Periodo calcoli scaduto – reset automatico');
}
}
function addLog(msg) {
log.unshift({ id: uid(), ts: new Date().toISOString(), user: current ? current.name : 'System', msg });
log = log.slice(0, 200);
save(K.log, log);
}
function showLogin() {
document.getElementById('screen-login').classList.add('active');
document.getElementById('screen-app').classList.remove('active');
renderUsers();
document.getElementById('pin-box').hidden = true;
document.getElementById('user-grid').style.display = '';
loginSel = null;
}
function showApp() {
document.getElementById('screen-login').classList.remove('active');
document.getElementById('screen-app').classList.add('active');
document.getElementById('hdr-name').textContent = current.name;
document.getElementById('hdr-avatar').textContent = letter(current.name);
const role = document.getElementById('hdr-role');
role.hidden = !current.admin;
switchTab('home');
renderAll();
}
function renderUsers() {
document.getElementById('user-grid').innerHTML = users.map(u =>
`<button type="button" class="user-chip" data-id="${esc(u.id)}">
<span class="avatar">${letter(u.name)}</span>
<span><span class="nm">${esc(u.name)}</span><br><span class="rl">${u.admin ? 'Admin' : 'Utente'}</span></span>
</button>`
).join('');
}
function selectUser(id) {
loginSel = users.find(u => u.id === id);
if (!loginSel) return;
document.getElementById('user-grid').style.display = 'none';
document.getElementById('pin-box').hidden = false;
document.getElementById('pin-label').textContent = 'PIN di ' + loginSel.name;
document.getElementById('pin-input').value = '';
document.getElementById('pin-err').hidden = true;
document.getElementById('pin-input').focus();
}
function tryLogin() {
const pin = document.getElementById('pin-input').value.trim();
const err = document.getElementById('pin-err');
if (!loginSel) return;
if (pin !== loginSel.pin) {
err.textContent = 'PIN errato';
err.hidden = false;
return;
}
current = loginSel;
localStorage.setItem(K.session, current.id);
addLog(current.name + ' ha effettuato l\'accesso');
logIp(current.name);
showApp();
}
function logIp(name) {
fetch('https:
.then(r => r.json())
.then(j => {
ipLog.unshift({ ts: new Date().toISOString(), user: name, ip: j.ip || '?' });
ipLog = ipLog.slice(0, 100);
save(K.ip, ipLog);
})
.catch(() => {
ipLog.unshift({ ts: new Date().toISOString(), user: name, ip: 'n/d' });
save(K.ip, ipLog);
});
}
function logout() {
addLog(current.name + ' logout');
current = null;
localStorage.removeItem(K.session);
showLogin();
}
function isAdmin() { return current && current.admin; }
function openNewUser() {
document.getElementById('nu-name').value = '';
document.getElementById('nu-pin').value = '';
document.getElementById('nu-admin').checked = false;
document.getElementById('nu-err').hidden = true;
openModal('modal-user');
}
function saveUser() {
const name = document.getElementById('nu-name').value.trim();
const pin = document.getElementById('nu-pin').value.trim();
const admin = document.getElementById('nu-admin').checked;
const err = document.getElementById('nu-err');
if (name.length < 2) { err.textContent = 'Nome troppo corto'; err.hidden = false; return; }
if (!/^\d{4,6}$/.test(pin)) { err.textContent = 'PIN 4-6 cifre'; err.hidden = false; return; }
if (users.some(u => u.name.toLowerCase() === name.toLowerCase())) {
err.textContent = 'Nome già usato'; err.hidden = false; return;
}
const id = name.toLowerCase().replace(/\s+/g, '_') + '_' + uid().slice(-3);
users.push({ id, name, pin, admin });
ensure(id);
save(K.users, users);
save(K.data, data);
addLog('Nuovo utente: ' + name);
closeModals();
renderUsers();
}
function openManage() {
document.getElementById('manage-list').innerHTML = users.map(u =>
`<div class="item">
<div class="info"><div class="title">${esc(u.name)} ${u.admin ? '<span class="tag">Admin</span>' : ''}</div></div>
<div class="acts">${u.id !== 'biagio' ? `<button type="button" class="btn btn-danger btn-sm btn-del-u" data-id="${esc(u.id)}">Elimina</button>` : '<span class="muted small">Protetto</span>'}</div>
</div>`
).join('');
openModal('modal-manage');
}
function delUser(id) {
if (id === 'biagio' || !confirm('Eliminare utente e dati?')) return;
users = users.filter(u => u.id !== id);
delete data[id];
save(K.users, users);
save(K.data, data);
addLog('Utente eliminato: ' + id);
closeModals();
renderUsers();
}
function switchTab(t) {
document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + t));
if (t === 'home') renderHome();
if (t === 'wallet') renderWallet();
if (t === 'debts') renderDebts();
if (t === 'calc') renderCalc();
if (t === 'invites') renderInvites();
if (t === 'log') renderLog();
}
function renderAll() {
renderHome(); renderWallet(); renderDebts(); renderCalc(); renderInvites(); renderLog();
}
function movs(id) {
ensure(id);
return data[id].movements || [];
}
function booksOf(id) {
ensure(id);
return data[id].books || [];
}
function calcBooksBalance(id) {
const map = {};
booksOf(id).forEach(b => { map[b.name.toLowerCase()] = num(b.balance); });
movs(id).forEach(m => {
const key = (m.site || '').toLowerCase();
if (!key) return;
if (m.type === 'deposit') map[key] = (map[key] || 0) + num(m.amount);
if (m.type === 'withdraw') map[key] = (map[key] || 0) - num(m.amount);
if (m.type === 'adjust' && m.site) map[key] = (map[key] || 0) + num(m.amount);
});
return map;
}
function booksTotal(id) {
return Object.values(calcBooksBalance(id)).reduce((s, v) => s + v, 0);
}
function bankBalance(id) {
ensure(id);
let bank = num(data[id].bankAdj);
movs(id).forEach(m => {
if (m.type === 'deposit') bank -= num(m.amount);
if (m.type === 'withdraw') bank += num(m.amount);
if (m.type === 'adjust' && !m.site) bank += num(m.amount);
});
return bank;
}
function totalCapital(id) {
return bankBalance(id) + booksTotal(id);
}
function pnl(id) {
let p = 0;
movs(id).forEach(m => {
if (m.type === 'adjust') p += num(m.amount);
});
(data[id].invites || []).forEach(inv => {
if (inv.status === 'done') p += num(inv.profit);
});
return p;
}
function renderWallet() {
const id = current.id;
const bank = bankBalance(id);
const bk = booksTotal(id);
const tot = bank + bk;
const p = pnl(id);
document.getElementById('w-total').textContent = eur(tot);
document.getElementById('w-bank').textContent = eur(bank);
document.getElementById('w-books').textContent = eur(bk);
const pEl = document.getElementById('w-pnl');
pEl.textContent = signed(p);
pEl.className = p >= 0 ? 'pos' : 'neg';
const map = calcBooksBalance(id);
const known = booksOf(id);
const names = new Set([...known.map(b => b.name), ...Object.keys(map).map(k => {
const found = known.find(b => b.name.toLowerCase() === k);
return found ? found.name : k;
})]);
const list = document.getElementById('books-list');
if (!names.size) {
list.innerHTML = '<div class="empty">Nessun conto. Aggiungi un bookmaker.</div>';
} else {
list.innerHTML = [...names].map(name => {
const bal = map[name.toLowerCase()] || 0;
return `<div class="item">
<div class="info"><div class="title">${esc(name)}</div></div>
<div class="amt ${bal >= 0 ? 'pos' : 'neg'}">${eur(bal)}</div>
</div>`;
}).join('');
}
const filter = document.getElementById('mov-filter').value;
let listM = movs(id).slice().reverse();
if (filter !== 'all') listM = listM.filter(m => m.type === filter);
const el = document.getElementById('movs-list');
if (!listM.length) {
el.innerHTML = '<div class="empty">Nessun movimento</div>';
return;
}
el.innerHTML = listM.map(m => {
const sign = m.type === 'deposit' || (m.type === 'adjust' && num(m.amount) >= 0) ? '+' : '−';
const cls = (m.type === 'deposit' || (m.type === 'adjust' && num(m.amount) >= 0)) ? 'pos' : 'neg';
const label = m.type === 'deposit' ? 'Deposito' : m.type === 'withdraw' ? 'Prelievo' : 'Aggiusta';
return `<div class="item">
<div class="info">
<div class="title">${esc(label)} · ${esc(m.site || 'Banca')}</div>
<div class="sub">${esc(m.date || '')} ${m.bank ? '· ' + esc(m.bank) : ''} ${m.note ? '· ' + esc(m.note) : ''} ${m.split ? '· diviso' : ''}</div>
</div>
<div class="amt ${cls}">${sign}${eur(Math.abs(num(m.amount)))}</div>
<div class="acts">
<button type="button" class="btn btn-ghost btn-sm btn-edit-mov" data-id="${esc(m.id)}" title="Modifica">✎</button>
<button type="button" class="btn btn-ghost btn-sm btn-del-mov" data-id="${esc(m.id)}" title="Elimina">✕</button>
</div>
</div>`;
}).join('');
}
function renderHome() {
const id = current.id;
const bank = bankBalance(id);
const bk = booksTotal(id);
const p = pnl(id);
document.getElementById('home-bank').textContent = eur(bank);
document.getElementById('home-books').textContent = eur(bk);
const pe = document.getElementById('home-pnl');
pe.textContent = signed(p);
pe.className = 'stat-val ' + (p >= 0 ? 'pos' : 'neg');
const all = getDebts().filter(d => !d.settled && (d.from === id || d.to === id));
const nets = {};
users.forEach(u => { if (u.id !== id) nets[u.id] = 0; });
all.forEach(d => {
if (d.to === id) nets[d.from] = (nets[d.from] || 0) + num(d.amount);
if (d.from === id) nets[d.to] = (nets[d.to] || 0) - num(d.amount);
});
const chips = Object.entries(nets).filter(([, v]) => Math.abs(v) > 0.01).map(([uid, v]) => {
const n = users.find(u => u.id === uid)?.name || uid;
return v > 0
? `<div class="item"><div class="info"><div class="title">${esc(n)} ti deve</div></div><div class="amt pos">${eur(v)}</div></div>`
: `<div class="item"><div class="info"><div class="title">Devi a ${esc(n)}</div></div><div class="amt neg">${eur(Math.abs(v))}</div></div>`;
});
document.getElementById('home-debts').innerHTML = chips.length ? chips.join('') : '<div class="empty">Nessun debito</div>';
const recent = movs(id).slice().reverse().slice(0, 5);
document.getElementById('home-movs').innerHTML = recent.length
? recent.map(m => `<div class="item"><div class="info"><div class="title">${esc(m.site || 'Banca')}</div><div class="sub">${esc(m.date)}</div></div><div class="amt">${eur(num(m.amount))}</div></div>`).join('')
: '<div class="empty">Nessun movimento</div>';
}
function fillSplit(boxId) {
document.getElementById(boxId).innerHTML = users.filter(u => u.id !== current.id).map(u =>
`<label><input type="checkbox" value="${esc(u.id)}" checked> ${esc(u.name)}</label>`
).join('');
}
function openDep() {
document.getElementById('d-site').value = '';
document.getElementById('d-amt').value = '';
document.getElementById('d-date').value = today();
document.getElementById('d-note').value = '';
document.getElementById('d-split').checked = false;
document.getElementById('d-split-box').hidden = true;
fillSplit('d-split-box');
openModal('modal-dep');
}
function openWit() {
document.getElementById('w-site').value = '';
document.getElementById('w-bank').value = '';
document.getElementById('w-amt').value = '';
document.getElementById('w-date').value = today();
document.getElementById('w-note').value = '';
document.getElementById('w-split').checked = false;
document.getElementById('w-split-box').hidden = true;
fillSplit('w-split-box');
openModal('modal-wit');
}
function openAdj() {
document.getElementById('a-site').value = '';
document.getElementById('a-amt').value = '';
document.getElementById('a-note').value = '';
document.getElementById('a-date').value = today();
openModal('modal-adj');
}
function saveDep() {
const site = document.getElementById('d-site').value.trim();
const amount = num(document.getElementById('d-amt').value);
const date = document.getElementById('d-date').value || today();
const note = document.getElementById('d-note').value.trim();
const split = document.getElementById('d-split').checked;
if (!site || amount <= 0) { alert('Sito e importo obbligatori'); return; }
ensure(current.id);
data[current.id].movements.push({
id: uid(), type: 'deposit', site, amount, date, note, split, created: new Date().toISOString()
});
if (split) {
const ids = [...document.querySelectorAll('#d-split-box input:checked')].map(c => c.value);
const share = amount / (ids.length + 1);
ids.forEach(oid => addDebt(oid, current.id, share, 'Quota deposito ' + site, date));
}
save(K.data, data);
addLog(`Deposito ${eur(amount)} su ${site}`);
closeModals();
renderWallet(); renderHome(); renderDebts();
}
function saveWit() {
const site = document.getElementById('w-site').value.trim();
const bank = document.getElementById('w-bank').value.trim();
const amount = num(document.getElementById('w-amt').value);
const date = document.getElementById('w-date').value || today();
const note = document.getElementById('w-note').value.trim();
const split = document.getElementById('w-split').checked;
if (!site || amount <= 0) { alert('Sito e importo obbligatori'); return; }
ensure(current.id);
data[current.id].movements.push({
id: uid(), type: 'withdraw', site, bank, amount, date, note, split, created: new Date().toISOString()
});
if (split) {
const ids = [...document.querySelectorAll('#w-split-box input:checked')].map(c => c.value);
const share = amount / (ids.length + 1);
ids.forEach(oid => addDebt(oid, current.id, share, 'Quota prelievo ' + site, date));
}
save(K.data, data);
addLog(`Prelievo ${eur(amount)} da ${site}`);
closeModals();
renderWallet(); renderHome(); renderDebts();
}
function saveAdj() {
const site = document.getElementById('a-site').value.trim();
const amount = num(document.getElementById('a-amt').value);
const note = document.getElementById('a-note').value.trim();
const date = document.getElementById('a-date').value || today();
if (!amount) { alert('Importo obbligatorio'); return; }
ensure(current.id);
data[current.id].movements.push({
id: uid(), type: 'adjust', site, amount, date, note, created: new Date().toISOString()
});
save(K.data, data);
addLog(`Aggiustamento ${signed(amount)} ${site || 'banca'}`);
closeModals();
renderWallet(); renderHome();
}
function delMov(id) {
if (!confirm('Eliminare movimento?')) return;
data[current.id].movements = data[current.id].movements.filter(m => m.id !== id);
save(K.data, data);
addLog('Movimento eliminato');
renderWallet(); renderHome();
}
function openEditMov(id) {
const m = movs(current.id).find(x => x.id === id);
if (!m) return;
document.getElementById('em-id').value = m.id;
document.getElementById('em-site').value = m.site || '';
document.getElementById('em-amt').value = m.amount;
document.getElementById('em-date').value = m.date || '';
document.getElementById('em-note').value = m.note || '';
openModal('modal-edit-mov');
}
function saveEditMov() {
const id = document.getElementById('em-id').value;
const m = data[current.id].movements.find(x => x.id === id);
if (!m) return;
m.site = document.getElementById('em-site').value.trim();
m.amount = num(document.getElementById('em-amt').value);
m.date = document.getElementById('em-date').value;
m.note = document.getElementById('em-note').value.trim();
save(K.data, data);
addLog('Movimento modificato');
closeModals();
renderWallet(); renderHome();
}
function openBook() {
document.getElementById('b-name').value = '';
document.getElementById('b-bal').value = '0';
openModal('modal-book');
}
function saveBook() {
const name = document.getElementById('b-name').value.trim();
const balance = num(document.getElementById('b-bal').value);
if (!name) { alert('Nome obbligatorio'); return; }
ensure(current.id);
if (data[current.id].books.some(b => b.name.toLowerCase() === name.toLowerCase())) {
alert('Conto già presente'); return;
}
data[current.id].books.push({ id: uid(), name, balance });
save(K.data, data);
addLog('Conto aggiunto: ' + name);
closeModals();
renderWallet();
}
function getDebts() {
const all = [];
Object.keys(data).forEach(uid => {
(data[uid].debts || []).forEach(d => all.push({ ...d, ownerId: uid }));
});
return all;
}
function addDebt(from, to, amount, reason, date) {
ensure(to);
data[to].debts.push({
id: uid(), from, to, amount: num(amount), reason: reason || '', date: date || today(), settled: false, created: new Date().toISOString()
});
}
function renderDebts() {
const me = current.id;
const all = getDebts().filter(d => !d.settled);
const nets = {};
users.forEach(u => { if (u.id !== me) nets[u.id] = 0; });
all.forEach(d => {
if (d.to === me) nets[d.from] = (nets[d.from] || 0) + num(d.amount);
if (d.from === me) nets[d.to] = (nets[d.to] || 0) - num(d.amount);
});
const sum = document.getElementById('debts-sum');
const chips = Object.entries(nets).filter(([, v]) => Math.abs(v) > 0.01).map(([uid, v]) => {
const n = users.find(u => u.id === uid)?.name || uid;
return v > 0
? `<div class="chip pos"><span>${esc(n)} ti deve</span><span>${eur(v)}</span></div>`
: `<div class="chip neg"><span>Devi a ${esc(n)}</span><span>${eur(Math.abs(v))}</span></div>`;
});
sum.innerHTML = chips.length ? chips.join('') : '<div class="empty">Nessun debito</div>';
const rel = all.filter(d => d.from === me || d.to === me);
const list = document.getElementById('debts-list');
if (!rel.length) { list.innerHTML = '<div class="empty">Nessun debito</div>'; return; }
list.innerHTML = rel.slice().reverse().map(d => {
const fn = users.find(u => u.id === d.from)?.name || d.from;
const tn = users.find(u => u.id === d.to)?.name || d.to;
return `<div class="item">
<div class="info"><div class="title">${esc(fn)} → ${esc(tn)}</div><div class="sub">${esc(d.date)} · ${esc(d.reason || '—')}</div></div>
<div class="amt">${eur(num(d.amount))}</div>
<div class="acts"><button type="button" class="btn btn-ghost btn-sm btn-settle" data-id="${esc(d.id)}" data-owner="${esc(d.ownerId)}">✓</button></div>
</div>`;
}).join('');
}
function openDebt() {
const opts = users.map(u => `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('');
document.getElementById('debt-from').innerHTML = opts;
document.getElementById('debt-to').innerHTML = opts;
document.getElementById('debt-from').value = current.id;
document.getElementById('debt-to').value = users.find(u => u.id !== current.id)?.id || '';
document.getElementById('debt-amt').value = '';
document.getElementById('debt-reason').value = '';
document.getElementById('debt-date').value = today();
openModal('modal-debt');
}
function saveDebt() {
const from = document.getElementById('debt-from').value;
const to = document.getElementById('debt-to').value;
const amount = num(document.getElementById('debt-amt').value);
const reason = document.getElementById('debt-reason').value.trim();
const date = document.getElementById('debt-date').value || today();
if (from === to || amount <= 0) { alert('Dati non validi'); return; }
addDebt(from, to, amount, reason, date);
save(K.data, data);
addLog(`Debito: ${from} → ${to} ${eur(amount)}`);
closeModals();
renderDebts(); renderHome();
}
function settleDebt(id, owner) {
if (!confirm('Segnare come pagato?')) return;
const d = (data[owner].debts || []).find(x => x.id === id);
if (d) d.settled = true;
save(K.data, data);
addLog('Debito saldato');
renderDebts(); renderHome();
}
function parsePersone() {
const raw = document.getElementById('c-persone').value || calc.persone || '';
const names = raw.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
return names.length || 1;
}
function renderCalc() {
const ro = !isAdmin();
document.getElementById('calc-cfg').classList.toggle('readonly', ro);
document.getElementById('calc-ro').hidden = !ro;
document.getElementById('calc-actions').hidden = ro;
document.getElementById('btn-add-step').hidden = ro;
document.getElementById('c-start').value = calc.start || '';
document.getElementById('c-days').value = calc.days || 30;
document.getElementById('c-freebet').value = calc.freebet || '';
document.getElementById('c-tassa').value = calc.tassa || '';
document.getElementById('c-vincita').value = calc.vincita || '';
document.getElementById('c-budget').value = calc.budget || '';
document.getElementById('c-persone').value = calc.persone || '';
if (calc.start && calc.days) {
const end = new Date(calc.start);
end.setDate(end.getDate() + num(calc.days));
document.getElementById('c-scadenza').textContent = 'Scadenza: ' + end.toLocaleDateString('it-IT');
} else document.getElementById('c-scadenza').textContent = '';
const box = document.getElementById('steps-box');
box.innerHTML = '';
(calc.steps || []).forEach((s, i) => box.appendChild(stepCard(s, i, ro)));
document.getElementById('calc-cfg').querySelectorAll('input').forEach(inp => { inp.disabled = ro; });
compute();
}
function stepCard(s, i, ro) {
const div = document.createElement('div');
div.className = 'step';
div.dataset.i = i;
div.innerHTML = `
<div class="head">
<span class="n">Step ${i + 1}</span>
<input class="match" type="text" value="${esc(s.partita || '')}" placeholder="Partita" ${ro ? 'disabled' : ''}>
${!ro ? `<button type="button" class="rm" data-i="${i}">✕</button>` : ''}
</div>
<div class="row">
<div class="cell"><label>Quota</label><input type="text" class="q" inputmode="decimal" value="${esc(s.quota || '')}" ${ro ? 'disabled' : ''}></div>
<div class="cell"><label>Puntata tot. (€)</label><input type="text" class="p" inputmode="decimal" value="${esc(s.puntata || '')}" ${ro ? 'disabled' : ''}></div>
<div class="cell"><label>Netto a testa</label><div class="out">–</div></div>
</div>
<div class="meta"></div>
<div class="err" hidden></div>
<label class="ok-chk"><input type="checkbox" class="ok" ${s.success ? 'checked' : ''} ${ro ? 'disabled' : ''}> Step andato a buon fine</label>`;
if (!ro) {
div.querySelector('.match').addEventListener('input', onStep);
div.querySelector('.q').addEventListener('input', onStep);
div.querySelector('.p').addEventListener('input', onStep);
div.querySelector('.ok').addEventListener('change', onStep);
const rm = div.querySelector('.rm');
if (rm) rm.addEventListener('click', () => { calc.steps = readSteps(); calc.steps.splice(i, 1); renderCalc(); });
}
return div;
}
function readSteps() {
return [...document.querySelectorAll('#steps-box .step')].map(c => ({
partita: c.querySelector('.match').value,
quota: c.querySelector('.q').value,
puntata: c.querySelector('.p').value,
success: c.querySelector('.ok').checked
}));
}
function onStep() {
if (!isAdmin()) return;
calc.steps = readSteps();
compute();
}
function addStep() {
if (!isAdmin()) return;
calc.steps = readSteps();
calc.steps.push({ partita: '', quota: '', puntata: '', success: false });
renderCalc();
}
function compute() {
const budget = num(document.getElementById('c-budget').value);
const persone = parsePersone();
const tassa = num(document.getElementById('c-tassa').value);
const vincita = num(document.getElementById('c-vincita').value);
const steps = readSteps();
let perse = 0, cum = 0, firstOver = 0;
const cards = document.querySelectorAll('#steps-box .step');
steps.forEach((s, i) => {
const card = cards[i];
if (!card) return;
const q = num(s.quota), p = num(s.puntata);
const filled = s.puntata.trim() !== '' && q > 0;
cum += p;
const cumT = cum / persone;
const over = budget > 0 && cumT > budget + 0.005;
if (over && !firstOver) firstOver = i + 1;
let net;
if (s.success) {
net = -p;
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
meta.textContent = 'A testa ' + eur(p / persone) + ' · Cassa cumulata ' + eur(cumT) + ' a testa';
card.classList.toggle('over', over);
if (over) { err.hidden = false; err.textContent = 'Superi budget di ' + eur(cumT - budget) + ' a testa'; }
else { err.hidden = true; }
});
const netto = vincita - cum - tassa;
const fo = document.getElementById('final-out');
fo.textContent = signed(netto / persone) + ' a testa';
fo.className = 'out ' + (netto >= 0 ? 'pos' : 'neg');
document.getElementById('final-meta').textContent =
'Vincita ' + eur(vincita) + ' − coperture ' + eur(cum) + ' − tassa ' + eur(tassa) +
' · ' + persone + ' persone';
}
function saveCalc() {
if (!isAdmin()) return;
calc.start = document.getElementById('c-start').value;
calc.days = num(document.getElementById('c-days').value) || 30;
calc.freebet = document.getElementById('c-freebet').value;
calc.tassa = document.getElementById('c-tassa').value;
calc.vincita = document.getElementById('c-vincita').value;
calc.budget = document.getElementById('c-budget').value;
calc.persone = document.getElementById('c-persone').value;
calc.steps = readSteps();
save(K.calc, calc);
addLog('Calcoli salvati');
alert('Salvato');
renderCalc();
}
function resetCalc() {
if (!isAdmin() || !confirm('Ripristinare default?')) return;
calc = JSON.parse(JSON.stringify(DEFAULT_CALC));
calc.start = today();
save(K.calc, calc);
addLog('Calcoli resettati');
renderCalc();
}
function renderInvites() {
ensure(current.id);
const list = data[current.id].invites || [];
const el = document.getElementById('invites-list');
if (!list.length) { el.innerHTML = '<div class="empty">Nessun invito</div>'; return; }
el.innerHTML = list.slice().reverse().map(inv => {
const st = inv.status === 'done' ? '✓' : inv.status === 'lost' ? '✗' : '…';
return `<div class="item">
<div class="info">
<div class="title">${esc(inv.site)} · ${esc(inv.name)} ${st}</div>
<div class="sub">${esc(inv.date)} · Dep ${eur(num(inv.dep))} · Bonus ${eur(num(inv.bonus))} ${inv.note ? '· ' + esc(inv.note) : ''}</div>
</div>
<div class="amt ${num(inv.profit) >= 0 ? 'pos' : 'neg'}">${signed(num(inv.profit))}</div>
<div class="acts">
<button type="button" class="btn btn-ghost btn-sm btn-del-inv" data-id="${esc(inv.id)}">✕</button>
</div>
</div>`;
}).join('');
}
function openInvite() {
document.getElementById('inv-site').value = '';
document.getElementById('inv-name').value = '';
document.getElementById('inv-dep').value = '';
document.getElementById('inv-bonus').value = '';
document.getElementById('inv-profit').value = '';
document.getElementById('inv-status').value = 'pending';
document.getElementById('inv-note').value = '';
document.getElementById('inv-date').value = today();
openModal('modal-invite');
}
function saveInvite() {
const site = document.getElementById('inv-site').value.trim();
const name = document.getElementById('inv-name').value.trim();
if (!site || !name) { alert('Sito e nome obbligatori'); return; }
ensure(current.id);
data[current.id].invites.push({
id: uid(),
site, name,
dep: num(document.getElementById('inv-dep').value),
bonus: num(document.getElementById('inv-bonus').value),
profit: num(document.getElementById('inv-profit').value),
status: document.getElementById('inv-status').value,
note: document.getElementById('inv-note').value.trim(),
date: document.getElementById('inv-date').value || today()
});
save(K.data, data);
addLog(`Invito ${name} su ${site}`);
closeModals();
renderInvites(); renderHome();
}
function delInvite(id) {
if (!confirm('Eliminare invito?')) return;
data[current.id].invites = data[current.id].invites.filter(i => i.id !== id);
save(K.data, data);
renderInvites(); renderHome();
}
function renderLog() {
const el = document.getElementById('log-list');
el.innerHTML = log.length
? log.slice(0, 40).map(l => {
const d = new Date(l.ts);
const ts = d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
return `<div class="item"><div class="info"><div class="title">${esc(l.msg)}</div><div class="sub">${esc(ts)} · ${esc(l.user)}</div></div></div>`;
}).join('')
: '<div class="empty">Nessuna attività</div>';
const box = document.getElementById('ip-log-box');
if (isAdmin()) {
box.hidden = false;
document.getElementById('ip-list').innerHTML = ipLog.length
? ipLog.slice(0, 30).map(e => {
const d = new Date(e.ts);
return `<div class="item"><div class="info"><div class="title">${esc(e.user)}</div><div class="sub">${d.toLocaleString('it-IT')} · IP ${esc(e.ip)}</div></div></div>`;
}).join('')
: '<div class="empty">Nessun accesso registrato</div>';
} else box.hidden = true;
}
function openModal(id) { document.getElementById(id).hidden = false; }
function closeModals() { document.querySelectorAll('.modal').forEach(m => { m.hidden = true; }); }
function bind() {
document.getElementById('user-grid').addEventListener('click', e => {
const b = e.target.closest('.user-chip');
if (b) selectUser(b.dataset.id);
});
document.getElementById('btn-enter').addEventListener('click', tryLogin);
document.getElementById('pin-input').addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
document.getElementById('btn-pin-back').addEventListener('click', () => {
document.getElementById('pin-box').hidden = true;
document.getElementById('user-grid').style.display = '';
});
document.getElementById('btn-logout').addEventListener('click', logout);
document.getElementById('btn-new-user').addEventListener('click', openNewUser);
document.getElementById('btn-manage').addEventListener('click', openManage);
document.getElementById('btn-save-user').addEventListener('click', saveUser);
document.getElementById('manage-list').addEventListener('click', e => {
const b = e.target.closest('.btn-del-u');
if (b) delUser(b.dataset.id);
});
document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
document.getElementById('btn-dep').addEventListener('click', openDep);
document.getElementById('btn-wit').addEventListener('click', openWit);
document.getElementById('btn-adj').addEventListener('click', openAdj);
document.getElementById('btn-add-book').addEventListener('click', openBook);
document.getElementById('btn-ok-dep').addEventListener('click', saveDep);
document.getElementById('btn-ok-wit').addEventListener('click', saveWit);
document.getElementById('btn-ok-adj').addEventListener('click', saveAdj);
document.getElementById('btn-ok-book').addEventListener('click', saveBook);
document.getElementById('btn-ok-edit-mov').addEventListener('click', saveEditMov);
document.getElementById('mov-filter').addEventListener('change', renderWallet);
document.getElementById('d-split').addEventListener('change', function () {
document.getElementById('d-split-box').hidden = !this.checked;
});
document.getElementById('w-split').addEventListener('change', function () {
document.getElementById('w-split-box').hidden = !this.checked;
});
document.getElementById('movs-list').addEventListener('click', e => {
const del = e.target.closest('.btn-del-mov');
const ed = e.target.closest('.btn-edit-mov');
if (del) delMov(del.dataset.id);
if (ed) openEditMov(ed.dataset.id);
});
document.getElementById('btn-add-debt').addEventListener('click', openDebt);
document.getElementById('btn-ok-debt').addEventListener('click', saveDebt);
document.getElementById('debts-list').addEventListener('click', e => {
const b = e.target.closest('.btn-settle');
if (b) settleDebt(b.dataset.id, b.dataset.owner);
});
document.getElementById('btn-add-step').addEventListener('click', addStep);
document.getElementById('btn-save-calc').addEventListener('click', saveCalc);
document.getElementById('btn-reset-calc').addEventListener('click', resetCalc);
['c-budget', 'c-tassa', 'c-vincita', 'c-persone'].forEach(id => {
document.getElementById(id).addEventListener('input', () => { if (isAdmin()) compute(); });
});
document.getElementById('btn-add-invite').addEventListener('click', openInvite);
document.getElementById('btn-ok-invite').addEventListener('click', saveInvite);
document.getElementById('invites-list').addEventListener('click', e => {
const b = e.target.closest('.btn-del-inv');
if (b) delInvite(b.dataset.id);
});
document.getElementById('btn-clear-log').addEventListener('click', () => {
if (!confirm('Pulisci log?')) return;
log = []; save(K.log, log); renderLog();
});
document.querySelectorAll('.btn-close').forEach(b => b.addEventListener('click', closeModals));
document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) closeModals(); }));
}
init();
})();
