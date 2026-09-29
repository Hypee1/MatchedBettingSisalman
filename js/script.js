/* Matched Betting · Sisalman — portale di gruppo (static, localStorage) */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const K = 'mb2_data', KS = 'mb2_session';
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
const eur = n => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const sg = n => (n >= 0 ? '+' : '−') + eur(Math.abs(n));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toISOString().slice(0, 10);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cl = n => n > 0.004 ? 'pos' : n < -0.004 ? 'neg' : '';
const fd = d => d ? new Date(d).toLocaleDateString('it-IT') : '';

const newCalc = () => ({ id: uid(), name: 'Nuovo bonus', tassa: '', vincita: '', budget: '', people: [], steps: [{ m: '', q: '', p: '', ok: false }] });
const DEF = () => ({
  users: [
    { id: 'biagio', name: 'Biagio', pin: '010203', admin: true },
    { id: 'mario', name: 'Mario', pin: '111021' },
    { id: 'leonardo', name: 'Leonardo', pin: '050106' }],
  moves: [], debts: [], invites: [], active: 0, log: [],
  calcs: [{ id: uid(), name: 'Bonus Eurobet (esempio)', tassa: '13', vincita: '905', budget: '280', people: ['biagio', 'mario', 'leonardo'], steps: [
    { m: 'Norvegia - Portogallo', q: '2.20', p: '15', ok: true }, { m: 'Georgia - Ucraina', q: '2.10', p: '0', ok: true },
    { m: 'Belgio - Francia', q: '1.80', p: '70', ok: true }, { m: 'Finlandia - Bielorussia', q: '2.40', p: '138', ok: false },
    { m: 'Danimarca - Portogallo', q: '2.30', p: '267', ok: false }] }]
});
let S; try { S = JSON.parse(localStorage.getItem(K)); } catch (e) {}
S = Object.assign(DEF(), S || {});
let me = null, tab = 'wallet', fmov = 'all', pick = null;
const save = () => { try { localStorage.setItem(K, JSON.stringify(S)); } catch (e) {} };
const uname = id => (S.users.find(u => u.id === id) || { name: '?' }).name;
const UO = () => S.users.map(u => [u.id, u.name]);
const LOG = (msg, ip) => { S.log.unshift({ ts: new Date().toISOString(), user: me ? me.name : '—', msg, ip: ip || '', ua: navigator.userAgent.slice(0, 90) }); S.log = S.log.slice(0, 300); save(); };
const getIP = async () => { try { const c = new AbortController(); setTimeout(() => c.abort(), 4000); return (await (await fetch('https://api.ipify.org?format=json', { signal: c.signal })).json()).ip; } catch (e) { return 'n/d'; } };

/* ---------- DATI DERIVATI ---------- */
function books() {
  const b = {};
  [...S.moves].sort((a, c) => (a.date + a.c).localeCompare(c.date + c.c)).forEach(m => {
    const x = b[m.book] ??= { dep: 0, wd: 0, bal: 0 }, a = num(m.amount);
    if (m.type === 'dep') { x.dep += a; x.bal += a; } else if (m.type === 'wd') { x.wd += a; x.bal -= a; } else x.bal = a;
  });
  return b;
}
function allDebts() {
  const d = [];
  S.moves.forEach(m => {
    const p = m.people || []; if (m.type === 'adj' || p.length < 2) return;
    const sh = num(m.amount) / p.length;
    p.filter(x => x !== m.who).forEach(x => d.push(m.type === 'dep'
      ? { from: x, to: m.who, amt: sh, why: 'Quota deposito ' + m.book, date: m.date, src: m.id }
      : { from: m.who, to: x, amt: sh, why: 'Quota prelievo ' + m.book, date: m.date, src: m.id }));
  });
  S.debts.forEach(x => d.push({ ...x, amt: num(x.amount) }));
  return d;
}
function pairs() {
  const o = {}; allDebts().forEach(d => { const k = d.from + '>' + d.to; o[k] = (o[k] || 0) + (d.kind === 'pay' ? -1 : 1) * d.amt; });
  const out = [];
  S.users.forEach((a, i) => S.users.slice(i + 1).forEach(b => {
    const n = (o[a.id + '>' + b.id] || 0) - (o[b.id + '>' + a.id] || 0);
    if (Math.abs(n) > 0.005) out.push(n > 0 ? { from: a.id, to: b.id, amt: n } : { from: b.id, to: a.id, amt: -n });
  }));
  return out;
}
const C = () => S.calcs[S.active] || S.calcs[0];
function calc(c) {
  const n = c.people.length || 1, t = num(c.tassa), bud = num(c.budget); let cum = 0, lost = 0;
  const rows = c.steps.map(s => {
    const q = num(s.q), p = num(s.p); cum += p; const ct = cum / n;
    const net = s.ok ? -p : p * q - (lost + p + t); lost += p;
    return { net: net / n, ok: q > 0 && String(s.p).trim() !== '', ct, pt: p / n, over: bud > 0 && ct > bud + .005, ex: ct - bud };
  });
  return { rows, cum, n, t, net: (num(c.vincita) - cum - t) / n };
}

/* ---------- UI HELPERS ---------- */
const tile = (l, v, c = '', s = '', w = '') => `<div class="tile ${w}"><span>${l}</span><b class="${c}">${v}</b>${s ? `<small>${s}</small>` : ''}</div>`;
const item = (t, s, a, b) => `<div class="it"><div><b>${t}</b><small>${s}</small></div>${a ? `<span class="amt">${a}</span>` : ''}<div class="acts">${b || ''}</div></div>`;
const ib = (a, id, ic, x = '') => `<button data-a="${a}" data-id="${esc(id)}" ${x}>${ic}</button>`;
const empty = t => `<div class="empty">${t}</div>`;

function form(title, fs, v, cb) {
  const m = $('#modal'), dl = fs.find(f => f.list);
  m.innerHTML = `<div class="sheet"><h3>${title}</h3>${fs.map(f => `<div class="fld"><span>${f.l}</span>${
    f.t === 'multi' ? `<div class="chips">${f.o.map(([k, n]) => `<label class="chip"><input type="checkbox" name="${f.k}" value="${esc(k)}" ${(v[f.k] || []).includes(k) ? 'checked' : ''}>${esc(n)}</label>`).join('')}</div>`
    : f.t === 'sel' ? `<select name="${f.k}">${f.o.map(([k, n]) => `<option value="${esc(k)}" ${v[f.k] === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`
    : `<input name="${f.k}" type="${f.t === 'date' ? 'date' : f.t === 'pw' ? 'password' : 'text'}" ${f.t === 'num' ? 'inputmode="decimal"' : ''} value="${esc(v[f.k] ?? '')}" ${f.list ? 'list="dl"' : ''} autocomplete="off">`}</div>`).join('')}
    ${dl ? `<datalist id="dl">${dl.list.map(x => `<option value="${esc(x)}">`).join('')}</datalist>` : ''}
    <p class="err" id="ferr"></p><div class="row"><button class="btn" data-x>Annulla</button><button class="btn pri" data-ok>Salva</button></div></div>`;
  m.hidden = false;
  m.onclick = e => {
    if (e.target === m || e.target.hasAttribute('data-x')) m.hidden = true;
    else if (e.target.hasAttribute('data-ok')) {
      const o = {}; fs.forEach(f => o[f.k] = f.t === 'multi' ? $$(`[name=${f.k}]:checked`, m).map(i => i.value) : $(`[name=${f.k}]`, m).value);
      const er = cb(o); if (er) $('#ferr').textContent = er; else { m.hidden = true; save(); render(); }
    }
  };
}

/* ---------- WALLET ---------- */
function vWallet() {
  const b = books(), ks = Object.keys(b); let D = 0, W = 0, B = 0;
  ks.forEach(k => { D += b[k].dep; W += b[k].wd; B += b[k].bal; });
  const bank = W - D, tot = bank + B;
  let ms = [...S.moves].sort((a, c) => (c.date + c.c).localeCompare(a.date + a.c));
  if (fmov !== 'all') ms = ms.filter(m => m.type === fmov);
  return `<div class="tiles">
    ${tile('Risultato totale', sg(tot), cl(tot), (tot >= 0 ? 'In profitto' : 'In perdita') + ' · banca + bookmaker', 'w')}
    ${tile('In banca (teorico)', sg(bank), cl(bank), 'Prelievi − depositi')}
    ${tile('Sui bookmaker', eur(B), '', 'Saldo attuale nei siti')}
  </div>
  <div class="bar" style="margin-top:12px"><button class="btn pri" data-a="mov" data-t="dep">+ Deposito</button><button class="btn" data-a="mov" data-t="wd">− Prelievo</button><button class="btn" data-a="mov" data-t="adj">⟳ Saldo</button></div>
  <h2>Bookmaker</h2><div class="card">${ks.length ? ks.sort().map(k => { const x = b[k], pl = x.bal + x.wd - x.dep;
    return item(esc(k), `Depositato ${eur(x.dep)} · Prelevato ${eur(x.wd)}`, `${eur(x.bal)}<small class="${cl(pl)}" style="display:block;text-align:right">${sg(pl)}</small>`); }).join('') : empty('Nessun bookmaker: aggiungi un deposito')}</div>
  <h2>Movimenti <select id="fm" style="width:auto;min-height:32px;padding:2px 8px">${[['all', 'Tutti'], ['dep', 'Depositi'], ['wd', 'Prelievi'], ['adj', 'Saldi']].map(([v, l]) => `<option value="${v}" ${fmov === v ? 'selected' : ''}>${l}</option>`).join('')}</select></h2>
  <div class="card">${ms.length ? ms.map(m => { const a = m.type === 'adj';
    return item(`${a ? '⟳' : m.type === 'dep' ? '↓' : '↑'} ${esc(m.book)}`,
      `${fd(m.date)}${a ? ' · saldo aggiornato' : ' · ' + esc(uname(m.who)) + (m.bank ? ' → ' + esc(m.bank) : '')}${m.people && m.people.length > 1 ? ' · ➗ ' + m.people.map(uname).join(', ') : ''}${m.note ? ' · ' + esc(m.note) : ''}`,
      `<span class="${a ? '' : m.type === 'dep' ? 'neg' : 'pos'}">${a ? '=' : m.type === 'dep' ? '−' : '+'}${eur(num(m.amount))}</span>`, ib('em', m.id, '✎') + ib('dm', m.id, '✕')); }).join('') : empty('Nessun movimento')}</div>`;
}
function movForm(t, m) {
  const ed = !!m; m = m || { type: t, who: me.id, date: today(), people: S.users.map(u => u.id) }; t = m.type;
  const fs = [{ k: 'book', l: 'Bookmaker / exchange', t: 'text', list: Object.keys(books()) }, { k: 'amount', l: t === 'adj' ? 'Saldo attuale sul sito (€)' : 'Importo (€)', t: 'num' }, { k: 'date', l: 'Data', t: 'date' }];
  if (t !== 'adj') fs.push({ k: 'who', l: t === 'dep' ? 'Chi ha anticipato i soldi' : 'Chi li ha ricevuti in banca', t: 'sel', o: UO() });
  if (t === 'wd') fs.push({ k: 'bank', l: 'Banca / destinazione', t: 'text' });
  if (t !== 'adj') fs.push({ k: 'people', l: 'Dividi tra (incluso chi paga)', t: 'multi', o: UO() });
  fs.push({ k: 'note', l: 'Note', t: 'text' });
  form((ed ? 'Modifica ' : 'Nuovo ') + { dep: 'deposito', wd: 'prelievo', adj: 'saldo' }[t], fs, m, o => {
    if (!o.book.trim() || String(o.amount).trim() === '') return 'Compila sito e importo';
    if (t !== 'adj' && num(o.amount) <= 0) return 'Importo non valido';
    const r = { ...m, ...o, book: o.book.trim(), amount: num(o.amount), type: t, people: o.people || [] };
    if (ed) S.moves[S.moves.findIndex(x => x.id === m.id)] = r; else S.moves.push({ ...r, id: uid(), c: new Date().toISOString() });
    LOG(`${ed ? 'Modificato' : 'Aggiunto'} ${t === 'dep' ? 'deposito' : t === 'wd' ? 'prelievo' : 'saldo'} ${eur(r.amount)} su ${r.book}`);
  });
}

/* ---------- DEBITI ---------- */
function vDebts() {
  const P = pairs(); let up = 0, dn = 0;
  P.forEach(p => { if (p.to === me.id) up += p.amt; if (p.from === me.id) dn += p.amt; });
  const H = allDebts().sort((a, c) => String(c.date).localeCompare(String(a.date)));
  return `<div class="tiles">${tile('Ti devono', eur(up), up ? 'pos' : '')}${tile('Devi', eur(dn), dn ? 'neg' : '')}</div>
  <div class="bar" style="margin-top:12px"><button class="btn pri" data-a="debt">+ Debito</button><button class="btn" data-a="pay">Registra pagamento</button></div>
  <h2>Saldo tra persone</h2><div class="card">${P.length ? P.map(p => item(`${esc(uname(p.from))} deve a ${esc(uname(p.to))}`, '', eur(p.amt),
    `<button class="btn sm" data-a="settle" data-f="${p.from}" data-t="${p.to}" data-m="${p.amt}">Salda</button>`)).join('') : empty('Tutto in pari ✓')}</div>
  <h2>Storico</h2><div class="card">${H.length ? H.map(d => item(`${esc(uname(d.from))} → ${esc(uname(d.to))}`,
    `${fd(d.date)} · ${d.kind === 'pay' ? 'Pagamento' : esc(d.why || '—')}${d.src ? ' · auto' : ''}`, `<span class="${d.kind === 'pay' ? 'pos' : ''}">${d.kind === 'pay' ? '✓ ' : ''}${eur(d.amt)}</span>`,
    d.src ? ib('em', d.src, '✎') : ib('dd', d.id, '✕'))).join('') : empty('Nessun debito')}</div>
  <p class="m">I debiti da deposito/prelievo si calcolano da soli dai movimenti divisi. "Salda" registra un pagamento dell'intero importo.</p>`;
}
function debtForm(kind, pre = {}) {
  const pay = kind === 'pay';
  form(pay ? 'Registra pagamento' : 'Nuovo debito', [
    { k: 'from', l: pay ? 'Chi ha pagato' : 'Chi deve', t: 'sel', o: UO() }, { k: 'to', l: pay ? 'A chi' : 'A chi deve', t: 'sel', o: UO() },
    { k: 'amount', l: 'Importo (€)', t: 'num' }, ...(pay ? [] : [{ k: 'why', l: 'Motivo (es. ho anticipato lo step 3)', t: 'text' }]), { k: 'date', l: 'Data', t: 'date' }],
    { from: me.id, to: (S.users.find(u => u.id !== me.id) || {}).id, date: today(), ...pre }, o => {
      if (o.from === o.to) return 'Scegli due persone diverse'; if (num(o.amount) <= 0) return 'Importo non valido';
      S.debts.push({ id: uid(), kind, from: o.from, to: o.to, amount: num(o.amount), why: o.why || '', date: o.date || today() });
      LOG(`${pay ? 'Pagamento' : 'Debito'}: ${uname(o.from)} → ${uname(o.to)} ${eur(num(o.amount))}`);
    });
}

/* ---------- CALCOLI ---------- */
function vCalc() {
  const c = C(), a = me.admin, d = a ? '' : 'disabled';
  return `<div class="card"><div class="fld"><span>Bonus / campagna</span><select id="csel">${S.calcs.map((x, i) => `<option value="${i}" ${i === S.active ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
  ${a ? `<div class="bar"><button class="btn" data-a="cnew">+ Nuovo bonus</button><button class="btn x" data-a="cdel">Elimina</button></div>` : '<p class="m">Solo visualizzazione: modifica riservata all\'admin.</p>'}
  <div class="fld"><span>Nome bonus</span><input data-c="name" value="${esc(c.name)}" ${d}></div>
  <div class="grid"><div class="fld"><span>Tassa totale iniziale (€)</span><input data-c="tassa" inputmode="decimal" value="${esc(c.tassa)}" ${d}></div>
  <div class="fld"><span>Vincita netta Eurobet (€)</span><input data-c="vincita" inputmode="decimal" value="${esc(c.vincita)}" ${d}></div></div>
  <div class="fld"><span>Budget max a testa (€)</span><input data-c="budget" inputmode="decimal" value="${esc(c.budget)}" ${d}></div>
  <div class="fld"><span>Chi partecipa (quote e guadagni divisi tra loro)</span><div class="chips">${S.users.map(u => `<label class="chip"><input type="checkbox" data-cp="${u.id}" ${c.people.includes(u.id) ? 'checked' : ''} ${d}>${esc(u.name)}</label>`).join('')}</div></div></div>
  <h2>Step coperture ${a ? '<button class="btn sm" data-a="sadd">+ Step</button>' : ''}</h2>
  ${c.steps.map((s, i) => `<div class="step" id="st${i}"><div class="h"><b>Step ${i + 1}</b><input data-s="${i}" data-f="m" placeholder="Squadre (es. Belgio - Francia)" value="${esc(s.m)}" ${d}>${a ? `<button class="btn sm x" data-a="sdel" data-id="${i}">✕</button>` : ''}</div>
    <div class="s3"><div class="fld" style="margin:0"><span>Quota</span><input data-s="${i}" data-f="q" inputmode="decimal" value="${esc(s.q)}" ${d}></div>
    <div class="fld" style="margin:0"><span>Puntata tot. (€)</span><input data-s="${i}" data-f="p" inputmode="decimal" value="${esc(s.p)}" ${d}></div>
    <div class="fld" style="margin:0"><span>Netto a testa</span><div class="o" id="so${i}">–</div></div></div>
    <small id="sm${i}"></small><small class="e" id="se${i}"></small>
    <label class="chip"><input type="checkbox" data-s="${i}" data-f="ok" ${s.ok ? 'checked' : ''} ${d}>Step chiuso (vinto su Eurobet)</label></div>`).join('')}
  <div class="tile" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><span style="color:var(--t);font-weight:700;font-size:14px">Se vince Eurobet fino in fondo</span><small id="fm2"></small></div><b id="fo" style="font-size:18px;text-align:right">–</b></div>`;
}
function upd() {
  const c = C(), r = calc(c); if (!$('#fo')) return;
  r.rows.forEach((x, i) => {
    const o = $('#so' + i); if (!o) return;
    o.textContent = x.ok ? sg(x.net) : '–'; o.className = 'o ' + (x.ok ? cl(x.net) : '');
    $('#sm' + i).textContent = `A testa ${eur(x.pt)} · Cassa cumulata ${eur(x.ct)} a testa`;
    $('#se' + i).textContent = x.over ? `Superi il budget di ${eur(x.ex)} a testa` : '';
    $('#st' + i).classList.toggle('over', x.over); $('#st' + i).classList.toggle('dn', !!c.steps[i].ok);
  });
  $('#fo').textContent = sg(r.net) + ' a testa'; $('#fo').className = cl(r.net);
  $('#fm2').textContent = `Vincita ${eur(num(c.vincita))} − coperture ${eur(r.cum)} − tassa ${eur(r.t)} · ${r.n} ${r.n === 1 ? 'persona' : 'persone'}`;
}

/* ---------- INVITI ---------- */
const ip_ = i => num(i.inc) - num(i.spesa) - num(i.comp);
function vInv() {
  const I = [...S.invites].sort((a, c) => String(c.date).localeCompare(String(a.date)));
  let sp = 0, inc = 0; const bs = {};
  I.forEach(i => { sp += num(i.spesa) + num(i.comp); inc += num(i.inc); bs[i.site] = (bs[i.site] || 0) + ip_(i); });
  return `<div class="tiles">${tile('Profitto inviti', sg(inc - sp), cl(inc - sp), `${I.length} inviti`, 'w')}${tile('Speso', eur(sp), '', 'Soldi + compensi')}${tile('Incassato', eur(inc), '', 'Bonus')}</div>
  <div class="bar" style="margin-top:12px"><button class="btn pri" data-a="inv">+ Nuovo invito</button></div>
  ${Object.keys(bs).length ? `<h2>Per sito</h2><div class="card">${Object.keys(bs).map(k => item(esc(k), '', `<span class="${cl(bs[k])}">${sg(bs[k])}</span>`)).join('')}</div>` : ''}
  <h2>Inviti</h2><div class="card">${I.length ? I.map(i => item(`${esc(i.friend)} · ${esc(i.site)}`,
    `${fd(i.date)} · invitato da ${esc(uname(i.by))} · dati ${eur(num(i.spesa))}${num(i.comp) ? ' · compenso ' + eur(num(i.comp)) : ''} · bonus ${eur(num(i.inc))}${i.note ? ' · ' + esc(i.note) : ''}`,
    `<span class="${cl(ip_(i))}">${sg(ip_(i))}</span><small style="display:block;text-align:right">${i.st === 'closed' ? 'chiuso' : 'in corso'}</small>`, ib('ei', i.id, '✎') + ib('di', i.id, '✕'))).join('') : empty('Nessun invito registrato')}</div>`;
}
function invForm(id) {
  const x = S.invites.find(i => i.id === id), v = x || { by: me.id, date: today(), st: 'open' };
  form(x ? 'Modifica invito' : 'Nuovo invito', [
    { k: 'friend', l: 'Amico invitato', t: 'text' }, { k: 'site', l: 'Sito (Snai, Sisal…)', t: 'text', list: [...new Set(S.invites.map(i => i.site))] },
    { k: 'by', l: 'Chi ha fatto l\'invito', t: 'sel', o: UO() }, { k: 'spesa', l: 'Soldi dati all\'amico per depositare (€)', t: 'num' },
    { k: 'comp', l: 'Compenso extra all\'amico (€)', t: 'num' }, { k: 'inc', l: 'Bonus incassato (€)', t: 'num' },
    { k: 'st', l: 'Stato', t: 'sel', o: [['open', 'In corso'], ['closed', 'Chiuso']] }, { k: 'date', l: 'Data', t: 'date' }, { k: 'note', l: 'Note', t: 'text' }], v, o => {
      if (!o.friend.trim() || !o.site.trim()) return 'Inserisci amico e sito';
      const r = { ...v, ...o, friend: o.friend.trim(), site: o.site.trim() };
      if (x) S.invites[S.invites.indexOf(x)] = r; else S.invites.push({ ...r, id: uid() });
      LOG(`Invito ${x ? 'modificato' : 'aggiunto'}: ${r.friend} su ${r.site}`);
    });
}

/* ---------- LOG / ADMIN ---------- */
function vLog() {
  const a = me.admin;
  return `${a ? `<h2>Console admin</h2><div class="card">${S.users.map(u => item(esc(u.name), u.admin ? 'Admin' : 'Utente', '', `<button class="btn sm" data-a="pin" data-id="${u.id}">PIN</button>${u.admin ? '' : ib('du', u.id, '✕')}`)).join('')}
    <div class="bar" style="margin:10px 0 0"><button class="btn" data-a="user">+ Utente</button><button class="btn" data-a="exp">Esporta backup</button><button class="btn" data-a="imp">Importa</button></div></div>` : ''}
  <h2>Log attività ${a ? '<button class="btn sm x" data-a="clog">Pulisci</button>' : ''}</h2>
  <div class="card">${S.log.length ? S.log.slice(0, 80).map(l => item(esc(l.msg), `${new Date(l.ts).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · ${esc(l.user)}${a && l.ip ? ` · IP ${esc(l.ip)}` : ''}`)).join('') : empty('Nessuna attività')}</div>
  ${a ? '<p class="m">Nota: i dati stanno nel browser di questo dispositivo. Usa "Esporta backup" spesso.</p>' : ''}`;
}

/* ---------- RENDER ---------- */
const TABS = [['wallet', '💰', 'Wallet', vWallet], ['debts', '🤝', 'Debiti', vDebts], ['calc', '📊', 'Calcoli', vCalc], ['inv', '🎁', 'Inviti', vInv], ['log', '📝', 'Log', vLog]];
function render() {
  const L = $('#login'), A = $('#app');
  if (!me) {
    A.hidden = true; L.hidden = false;
    L.innerHTML = `<div class="lc"><div style="font-size:44px">⚽</div><h1>Matched Betting</h1><p>${pick ? 'PIN di ' + esc(pick.name) : 'Chi sei?'}</p>` + (pick
      ? `<input id="pin" class="pinbox" type="password" inputmode="numeric" maxlength="6" placeholder="••••••" autocomplete="off"><p class="err" id="perr"></p><div class="row"><button class="btn" data-a="back">Indietro</button><button class="btn pri" data-a="login">Entra</button></div>`
      : S.users.map(u => `<button class="ub" data-a="pick" data-id="${u.id}"><span class="av">${esc(u.name[0].toUpperCase())}</span><span><b>${esc(u.name)}</b><small>${u.admin ? 'Admin' : 'Utente'}</small></span></button>`).join('')) + '</div>';
    if (pick) $('#pin').focus();
    return;
  }
  L.hidden = true; A.hidden = false;
  $('#av').textContent = me.name[0].toUpperCase(); $('#nm').textContent = me.name;
  $('#nav').innerHTML = TABS.map(t => `<button data-tab="${t[0]}" class="${tab === t[0] ? 'on' : ''}"><i>${t[1]}</i>${t[2]}</button>`).join('');
  $('#view').innerHTML = TABS.find(t => t[0] === tab)[3]();
  if (tab === 'calc') upd();
}
async function login() {
  const p = $('#pin').value.trim(), ip = getIP();
  if (p !== pick.pin) { $('#perr').textContent = 'PIN errato'; const n = pick.name; ip.then(i => { me = null; LOG('PIN errato per ' + n, i); }); return; }
  me = pick; pick = null; try { localStorage.setItem(KS, me.id); } catch (e) {}
  render(); LOG('Accesso effettuato', await ip);
}

/* ---------- EVENTI ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-a],[data-tab]'); if (!t) return;
  if (t.dataset.tab) { tab = t.dataset.tab; return render(); }
  const a = t.dataset.a, id = t.dataset.id, D = t.dataset;
  const del = (arr, msg) => { if (confirm('Eliminare?')) { const i = S[arr].findIndex(x => x.id === id); if (i >= 0) S[arr].splice(i, 1); LOG(msg); save(); render(); } };
  ({
    pick: () => { pick = S.users.find(u => u.id === id); render(); },
    back: () => { pick = null; render(); },
    login,
    out: () => { LOG('Logout'); me = null; try { localStorage.removeItem(KS); } catch (x) {} render(); },
    mov: () => movForm(D.t),
    em: () => movForm(null, S.moves.find(m => m.id === id)),
    dm: () => del('moves', 'Movimento eliminato'),
    debt: () => debtForm('debt'), pay: () => debtForm('pay'),
    settle: () => { if (confirm(`Registrare pagamento di ${eur(num(D.m))}?`)) { S.debts.push({ id: uid(), kind: 'pay', from: D.f, to: D.t, amount: +num(D.m).toFixed(2), date: today(), why: '' }); LOG(`Saldato: ${uname(D.f)} → ${uname(D.t)} ${eur(num(D.m))}`); save(); render(); } },
    dd: () => del('debts', 'Debito eliminato'),
    cnew: () => { S.calcs.push(newCalc()); S.active = S.calcs.length - 1; LOG('Nuovo bonus creato'); save(); render(); },
    cdel: () => { if (S.calcs.length > 1 && confirm('Eliminare questo bonus?')) { LOG('Bonus eliminato: ' + C().name); S.calcs.splice(S.active, 1); S.active = 0; save(); render(); } },
    sadd: () => { C().steps.push({ m: '', q: '', p: '', ok: false }); save(); render(); },
    sdel: () => { C().steps.splice(+id, 1); save(); render(); },
    inv: () => invForm(), ei: () => invForm(id), di: () => del('invites', 'Invito eliminato'),
    user: () => form('Nuovo utente', [{ k: 'name', l: 'Nome', t: 'text' }, { k: 'pin', l: 'PIN (4-6 cifre)', t: 'pw' }, { k: 'admin', l: 'Ruolo', t: 'sel', o: [['0', 'Utente'], ['1', 'Admin']] }], { admin: '0' }, o => {
      if (o.name.trim().length < 2) return 'Nome troppo corto'; if (!/^\d{4,6}$/.test(o.pin)) return 'PIN: 4-6 cifre';
      if (S.users.some(u => u.name.toLowerCase() === o.name.trim().toLowerCase())) return 'Nome già presente';
      S.users.push({ id: uid(), name: o.name.trim(), pin: o.pin, admin: o.admin === '1' }); LOG('Utente creato: ' + o.name.trim()); }),
    pin: () => { const u = S.users.find(x => x.id === id); form('Nuovo PIN per ' + esc(u.name), [{ k: 'pin', l: 'PIN (4-6 cifre)', t: 'pw' }], {}, o => { if (!/^\d{4,6}$/.test(o.pin)) return 'PIN: 4-6 cifre'; u.pin = o.pin; LOG('PIN cambiato per ' + u.name); }); },
    du: () => { const u = S.users.find(x => x.id === id); if (confirm('Eliminare ' + u.name + '?')) { S.users = S.users.filter(x => x.id !== id); LOG('Utente eliminato: ' + u.name); save(); render(); } },
    exp: () => { const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' })); l.download = 'mb-backup-' + today() + '.json'; l.click(); LOG('Backup esportato'); },
    imp: () => $('#imp').click(),
    clog: () => { if (confirm('Cancellare il log?')) { S.log = []; save(); render(); } }
  }[a] || (() => {}))();
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'fm') { fmov = t.value; render(); }
  else if (t.id === 'csel') { S.active = +t.value; save(); render(); }
  else if (t.id === 'imp' && t.files[0]) {
    const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (!d.users || !d.moves) throw 0; if (confirm('Sostituire tutti i dati con il backup?')) { S = Object.assign(DEF(), d); me = S.users.find(u => u.id === me.id) || S.users[0]; LOG('Backup importato'); save(); render(); } } catch (x) { alert('File non valido'); } };
    r.readAsText(t.files[0]); t.value = '';
  }
});
document.addEventListener('input', e => {
  const t = e.target, c = C(); if (!me || !me.admin) return;
  if (t.dataset.c) c[t.dataset.c] = t.value;
  else if (t.dataset.s !== undefined) c.steps[+t.dataset.s][t.dataset.f] = t.dataset.f === 'ok' ? t.checked : t.value;
  else if (t.dataset.cp) c.people = S.users.map(u => u.id).filter(i => i === t.dataset.cp ? t.checked : c.people.includes(i));
  else return;
  save(); upd();
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'pin') login(); });

try { const s = localStorage.getItem(KS); me = S.users.find(u => u.id === s) || null; } catch (e) {}
render();
})();/* Matched Betting · Sisalman — portale di gruppo (static, localStorage) */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const K = 'mb2_data', KS = 'mb2_session';
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
const eur = n => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const sg = n => (n >= 0 ? '+' : '−') + eur(Math.abs(n));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toISOString().slice(0, 10);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cl = n => n > 0.004 ? 'pos' : n < -0.004 ? 'neg' : '';
const fd = d => d ? new Date(d).toLocaleDateString('it-IT') : '';

const newCalc = () => ({ id: uid(), name: 'Nuovo bonus', tassa: '', vincita: '', budget: '', people: [], steps: [{ m: '', q: '', p: '', ok: false }] });
const DEF = () => ({
  users: [
    { id: 'biagio', name: 'Biagio', pin: '010203', admin: true },
    { id: 'mario', name: 'Mario', pin: '111021' },
    { id: 'leonardo', name: 'Leonardo', pin: '050106' }],
  moves: [], debts: [], invites: [], active: 0, log: [],
  calcs: [{ id: uid(), name: 'Bonus Eurobet (esempio)', tassa: '13', vincita: '905', budget: '280', people: ['biagio', 'mario', 'leonardo'], steps: [
    { m: 'Norvegia - Portogallo', q: '2.20', p: '15', ok: true }, { m: 'Georgia - Ucraina', q: '2.10', p: '0', ok: true },
    { m: 'Belgio - Francia', q: '1.80', p: '70', ok: true }, { m: 'Finlandia - Bielorussia', q: '2.40', p: '138', ok: false },
    { m: 'Danimarca - Portogallo', q: '2.30', p: '267', ok: false }] }]
});
let S; try { S = JSON.parse(localStorage.getItem(K)); } catch (e) {}
S = Object.assign(DEF(), S || {});
let me = null, tab = 'wallet', fmov = 'all', pick = null;
const save = () => { try { localStorage.setItem(K, JSON.stringify(S)); } catch (e) {} };
const uname = id => (S.users.find(u => u.id === id) || { name: '?' }).name;
const UO = () => S.users.map(u => [u.id, u.name]);
const LOG = (msg, ip) => { S.log.unshift({ ts: new Date().toISOString(), user: me ? me.name : '—', msg, ip: ip || '', ua: navigator.userAgent.slice(0, 90) }); S.log = S.log.slice(0, 300); save(); };
const getIP = async () => { try { const c = new AbortController(); setTimeout(() => c.abort(), 4000); return (await (await fetch('https://api.ipify.org?format=json', { signal: c.signal })).json()).ip; } catch (e) { return 'n/d'; } };

/* ---------- DATI DERIVATI ---------- */
function books() {
  const b = {};
  [...S.moves].sort((a, c) => (a.date + a.c).localeCompare(c.date + c.c)).forEach(m => {
    const x = b[m.book] ??= { dep: 0, wd: 0, bal: 0 }, a = num(m.amount);
    if (m.type === 'dep') { x.dep += a; x.bal += a; } else if (m.type === 'wd') { x.wd += a; x.bal -= a; } else x.bal = a;
  });
  return b;
}
function allDebts() {
  const d = [];
  S.moves.forEach(m => {
    const p = m.people || []; if (m.type === 'adj' || p.length < 2) return;
    const sh = num(m.amount) / p.length;
    p.filter(x => x !== m.who).forEach(x => d.push(m.type === 'dep'
      ? { from: x, to: m.who, amt: sh, why: 'Quota deposito ' + m.book, date: m.date, src: m.id }
      : { from: m.who, to: x, amt: sh, why: 'Quota prelievo ' + m.book, date: m.date, src: m.id }));
  });
  S.debts.forEach(x => d.push({ ...x, amt: num(x.amount) }));
  return d;
}
function pairs() {
  const o = {}; allDebts().forEach(d => { const k = d.from + '>' + d.to; o[k] = (o[k] || 0) + (d.kind === 'pay' ? -1 : 1) * d.amt; });
  const out = [];
  S.users.forEach((a, i) => S.users.slice(i + 1).forEach(b => {
    const n = (o[a.id + '>' + b.id] || 0) - (o[b.id + '>' + a.id] || 0);
    if (Math.abs(n) > 0.005) out.push(n > 0 ? { from: a.id, to: b.id, amt: n } : { from: b.id, to: a.id, amt: -n });
  }));
  return out;
}
const C = () => S.calcs[S.active] || S.calcs[0];
function calc(c) {
  const n = c.people.length || 1, t = num(c.tassa), bud = num(c.budget); let cum = 0, lost = 0;
  const rows = c.steps.map(s => {
    const q = num(s.q), p = num(s.p); cum += p; const ct = cum / n;
    const net = s.ok ? -p : p * q - (lost + p + t); lost += p;
    return { net: net / n, ok: q > 0 && String(s.p).trim() !== '', ct, pt: p / n, over: bud > 0 && ct > bud + .005, ex: ct - bud };
  });
  return { rows, cum, n, t, net: (num(c.vincita) - cum - t) / n };
}

/* ---------- UI HELPERS ---------- */
const tile = (l, v, c = '', s = '', w = '') => `<div class="tile ${w}"><span>${l}</span><b class="${c}">${v}</b>${s ? `<small>${s}</small>` : ''}</div>`;
const item = (t, s, a, b) => `<div class="it"><div><b>${t}</b><small>${s}</small></div>${a ? `<span class="amt">${a}</span>` : ''}<div class="acts">${b || ''}</div></div>`;
const ib = (a, id, ic, x = '') => `<button data-a="${a}" data-id="${esc(id)}" ${x}>${ic}</button>`;
const empty = t => `<div class="empty">${t}</div>`;

function form(title, fs, v, cb) {
  const m = $('#modal'), dl = fs.find(f => f.list);
  m.innerHTML = `<div class="sheet"><h3>${title}</h3>${fs.map(f => `<div class="fld"><span>${f.l}</span>${
    f.t === 'multi' ? `<div class="chips">${f.o.map(([k, n]) => `<label class="chip"><input type="checkbox" name="${f.k}" value="${esc(k)}" ${(v[f.k] || []).includes(k) ? 'checked' : ''}>${esc(n)}</label>`).join('')}</div>`
    : f.t === 'sel' ? `<select name="${f.k}">${f.o.map(([k, n]) => `<option value="${esc(k)}" ${v[f.k] === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`
    : `<input name="${f.k}" type="${f.t === 'date' ? 'date' : f.t === 'pw' ? 'password' : 'text'}" ${f.t === 'num' ? 'inputmode="decimal"' : ''} value="${esc(v[f.k] ?? '')}" ${f.list ? 'list="dl"' : ''} autocomplete="off">`}</div>`).join('')}
    ${dl ? `<datalist id="dl">${dl.list.map(x => `<option value="${esc(x)}">`).join('')}</datalist>` : ''}
    <p class="err" id="ferr"></p><div class="row"><button class="btn" data-x>Annulla</button><button class="btn pri" data-ok>Salva</button></div></div>`;
  m.hidden = false;
  m.onclick = e => {
    if (e.target === m || e.target.hasAttribute('data-x')) m.hidden = true;
    else if (e.target.hasAttribute('data-ok')) {
      const o = {}; fs.forEach(f => o[f.k] = f.t === 'multi' ? $$(`[name=${f.k}]:checked`, m).map(i => i.value) : $(`[name=${f.k}]`, m).value);
      const er = cb(o); if (er) $('#ferr').textContent = er; else { m.hidden = true; save(); render(); }
    }
  };
}

/* ---------- WALLET ---------- */
function vWallet() {
  const b = books(), ks = Object.keys(b); let D = 0, W = 0, B = 0;
  ks.forEach(k => { D += b[k].dep; W += b[k].wd; B += b[k].bal; });
  const bank = W - D, tot = bank + B;
  let ms = [...S.moves].sort((a, c) => (c.date + c.c).localeCompare(a.date + a.c));
  if (fmov !== 'all') ms = ms.filter(m => m.type === fmov);
  return `<div class="tiles">
    ${tile('Risultato totale', sg(tot), cl(tot), (tot >= 0 ? 'In profitto' : 'In perdita') + ' · banca + bookmaker', 'w')}
    ${tile('In banca (teorico)', sg(bank), cl(bank), 'Prelievi − depositi')}
    ${tile('Sui bookmaker', eur(B), '', 'Saldo attuale nei siti')}
  </div>
  <div class="bar" style="margin-top:12px"><button class="btn pri" data-a="mov" data-t="dep">+ Deposito</button><button class="btn" data-a="mov" data-t="wd">− Prelievo</button><button class="btn" data-a="mov" data-t="adj">⟳ Saldo</button></div>
  <h2>Bookmaker</h2><div class="card">${ks.length ? ks.sort().map(k => { const x = b[k], pl = x.bal + x.wd - x.dep;
    return item(esc(k), `Depositato ${eur(x.dep)} · Prelevato ${eur(x.wd)}`, `${eur(x.bal)}<small class="${cl(pl)}" style="display:block;text-align:right">${sg(pl)}</small>`); }).join('') : empty('Nessun bookmaker: aggiungi un deposito')}</div>
  <h2>Movimenti <select id="fm" style="width:auto;min-height:32px;padding:2px 8px">${[['all', 'Tutti'], ['dep', 'Depositi'], ['wd', 'Prelievi'], ['adj', 'Saldi']].map(([v, l]) => `<option value="${v}" ${fmov === v ? 'selected' : ''}>${l}</option>`).join('')}</select></h2>
  <div class="card">${ms.length ? ms.map(m => { const a = m.type === 'adj';
    return item(`${a ? '⟳' : m.type === 'dep' ? '↓' : '↑'} ${esc(m.book)}`,
      `${fd(m.date)}${a ? ' · saldo aggiornato' : ' · ' + esc(uname(m.who)) + (m.bank ? ' → ' + esc(m.bank) : '')}${m.people && m.people.length > 1 ? ' · ➗ ' + m.people.map(uname).join(', ') : ''}${m.note ? ' · ' + esc(m.note) : ''}`,
      `<span class="${a ? '' : m.type === 'dep' ? 'neg' : 'pos'}">${a ? '=' : m.type === 'dep' ? '−' : '+'}${eur(num(m.amount))}</span>`, ib('em', m.id, '✎') + ib('dm', m.id, '✕')); }).join('') : empty('Nessun movimento')}</div>`;
}
function movForm(t, m) {
  const ed = !!m; m = m || { type: t, who: me.id, date: today(), people: S.users.map(u => u.id) }; t = m.type;
  const fs = [{ k: 'book', l: 'Bookmaker / exchange', t: 'text', list: Object.keys(books()) }, { k: 'amount', l: t === 'adj' ? 'Saldo attuale sul sito (€)' : 'Importo (€)', t: 'num' }, { k: 'date', l: 'Data', t: 'date' }];
  if (t !== 'adj') fs.push({ k: 'who', l: t === 'dep' ? 'Chi ha anticipato i soldi' : 'Chi li ha ricevuti in banca', t: 'sel', o: UO() });
  if (t === 'wd') fs.push({ k: 'bank', l: 'Banca / destinazione', t: 'text' });
  if (t !== 'adj') fs.push({ k: 'people', l: 'Dividi tra (incluso chi paga)', t: 'multi', o: UO() });
  fs.push({ k: 'note', l: 'Note', t: 'text' });
  form((ed ? 'Modifica ' : 'Nuovo ') + { dep: 'deposito', wd: 'prelievo', adj: 'saldo' }[t], fs, m, o => {
    if (!o.book.trim() || String(o.amount).trim() === '') return 'Compila sito e importo';
    if (t !== 'adj' && num(o.amount) <= 0) return 'Importo non valido';
    const r = { ...m, ...o, book: o.book.trim(), amount: num(o.amount), type: t, people: o.people || [] };
    if (ed) S.moves[S.moves.findIndex(x => x.id === m.id)] = r; else S.moves.push({ ...r, id: uid(), c: new Date().toISOString() });
    LOG(`${ed ? 'Modificato' : 'Aggiunto'} ${t === 'dep' ? 'deposito' : t === 'wd' ? 'prelievo' : 'saldo'} ${eur(r.amount)} su ${r.book}`);
  });
}

/* ---------- DEBITI ---------- */
function vDebts() {
  const P = pairs(); let up = 0, dn = 0;
  P.forEach(p => { if (p.to === me.id) up += p.amt; if (p.from === me.id) dn += p.amt; });
  const H = allDebts().sort((a, c) => String(c.date).localeCompare(String(a.date)));
  return `<div class="tiles">${tile('Ti devono', eur(up), up ? 'pos' : '')}${tile('Devi', eur(dn), dn ? 'neg' : '')}</div>
  <div class="bar" style="margin-top:12px"><button class="btn pri" data-a="debt">+ Debito</button><button class="btn" data-a="pay">Registra pagamento</button></div>
  <h2>Saldo tra persone</h2><div class="card">${P.length ? P.map(p => item(`${esc(uname(p.from))} deve a ${esc(uname(p.to))}`, '', eur(p.amt),
    `<button class="btn sm" data-a="settle" data-f="${p.from}" data-t="${p.to}" data-m="${p.amt}">Salda</button>`)).join('') : empty('Tutto in pari ✓')}</div>
  <h2>Storico</h2><div class="card">${H.length ? H.map(d => item(`${esc(uname(d.from))} → ${esc(uname(d.to))}`,
    `${fd(d.date)} · ${d.kind === 'pay' ? 'Pagamento' : esc(d.why || '—')}${d.src ? ' · auto' : ''}`, `<span class="${d.kind === 'pay' ? 'pos' : ''}">${d.kind === 'pay' ? '✓ ' : ''}${eur(d.amt)}</span>`,
    d.src ? ib('em', d.src, '✎') : ib('dd', d.id, '✕'))).join('') : empty('Nessun debito')}</div>
  <p class="m">I debiti da deposito/prelievo si calcolano da soli dai movimenti divisi. "Salda" registra un pagamento dell'intero importo.</p>`;
}
function debtForm(kind, pre = {}) {
  const pay = kind === 'pay';
  form(pay ? 'Registra pagamento' : 'Nuovo debito', [
    { k: 'from', l: pay ? 'Chi ha pagato' : 'Chi deve', t: 'sel', o: UO() }, { k: 'to', l: pay ? 'A chi' : 'A chi deve', t: 'sel', o: UO() },
    { k: 'amount', l: 'Importo (€)', t: 'num' }, ...(pay ? [] : [{ k: 'why', l: 'Motivo (es. ho anticipato lo step 3)', t: 'text' }]), { k: 'date', l: 'Data', t: 'date' }],
    { from: me.id, to: (S.users.find(u => u.id !== me.id) || {}).id, date: today(), ...pre }, o => {
      if (o.from === o.to) return 'Scegli due persone diverse'; if (num(o.amount) <= 0) return 'Importo non valido';
      S.debts.push({ id: uid(), kind, from: o.from, to: o.to, amount: num(o.amount), why: o.why || '', date: o.date || today() });
      LOG(`${pay ? 'Pagamento' : 'Debito'}: ${uname(o.from)} → ${uname(o.to)} ${eur(num(o.amount))}`);
    });
}

/* ---------- CALCOLI ---------- */
function vCalc() {
  const c = C(), a = me.admin, d = a ? '' : 'disabled';
  return `<div class="card"><div class="fld"><span>Bonus / campagna</span><select id="csel">${S.calcs.map((x, i) => `<option value="${i}" ${i === S.active ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
  ${a ? `<div class="bar"><button class="btn" data-a="cnew">+ Nuovo bonus</button><button class="btn x" data-a="cdel">Elimina</button></div>` : '<p class="m">Solo visualizzazione: modifica riservata all\'admin.</p>'}
  <div class="fld"><span>Nome bonus</span><input data-c="name" value="${esc(c.name)}" ${d}></div>
  <div class="grid"><div class="fld"><span>Tassa totale iniziale (€)</span><input data-c="tassa" inputmode="decimal" value="${esc(c.tassa)}" ${d}></div>
  <div class="fld"><span>Vincita netta Eurobet (€)</span><input data-c="vincita" inputmode="decimal" value="${esc(c.vincita)}" ${d}></div></div>
  <div class="fld"><span>Budget max a testa (€)</span><input data-c="budget" inputmode="decimal" value="${esc(c.budget)}" ${d}></div>
  <div class="fld"><span>Chi partecipa (quote e guadagni divisi tra loro)</span><div class="chips">${S.users.map(u => `<label class="chip"><input type="checkbox" data-cp="${u.id}" ${c.people.includes(u.id) ? 'checked' : ''} ${d}>${esc(u.name)}</label>`).join('')}</div></div></div>
  <h2>Step coperture ${a ? '<button class="btn sm" data-a="sadd">+ Step</button>' : ''}</h2>
  ${c.steps.map((s, i) => `<div class="step" id="st${i}"><div class="h"><b>Step ${i + 1}</b><input data-s="${i}" data-f="m" placeholder="Squadre (es. Belgio - Francia)" value="${esc(s.m)}" ${d}>${a ? `<button class="btn sm x" data-a="sdel" data-id="${i}">✕</button>` : ''}</div>
    <div class="s3"><div class="fld" style="margin:0"><span>Quota</span><input data-s="${i}" data-f="q" inputmode="decimal" value="${esc(s.q)}" ${d}></div>
    <div class="fld" style="margin:0"><span>Puntata tot. (€)</span><input data-s="${i}" data-f="p" inputmode="decimal" value="${esc(s.p)}" ${d}></div>
    <div class="fld" style="margin:0"><span>Netto a testa</span><div class="o" id="so${i}">–</div></div></div>
    <small id="sm${i}"></small><small class="e" id="se${i}"></small>
    <label class="chip"><input type="checkbox" data-s="${i}" data-f="ok" ${s.ok ? 'checked' : ''} ${d}>Step chiuso (vinto su Eurobet)</label></div>`).join('')}
  <div class="tile" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><span style="color:var(--t);font-weight:700;font-size:14px">Se vince Eurobet fino in fondo</span><small id="fm2"></small></div><b id="fo" style="font-size:18px;text-align:right">–</b></div>`;
}
function upd() {
  const c = C(), r = calc(c); if (!$('#fo')) return;
  r.rows.forEach((x, i) => {
    const o = $('#so' + i); if (!o) return;
    o.textContent = x.ok ? sg(x.net) : '–'; o.className = 'o ' + (x.ok ? cl(x.net) : '');
    $('#sm' + i).textContent = `A testa ${eur(x.pt)} · Cassa cumulata ${eur(x.ct)} a testa`;
    $('#se' + i).textContent = x.over ? `Superi il budget di ${eur(x.ex)} a testa` : '';
    $('#st' + i).classList.toggle('over', x.over); $('#st' + i).classList.toggle('dn', !!c.steps[i].ok);
  });
  $('#fo').textContent = sg(r.net) + ' a testa'; $('#fo').className = cl(r.net);
  $('#fm2').textContent = `Vincita ${eur(num(c.vincita))} − coperture ${eur(r.cum)} − tassa ${eur(r.t)} · ${r.n} ${r.n === 1 ? 'persona' : 'persone'}`;
}

/* ---------- INVITI ---------- */
const ip_ = i => num(i.inc) - num(i.spesa) - num(i.comp);
function vInv() {
  const I = [...S.invites].sort((a, c) => String(c.date).localeCompare(String(a.date)));
  let sp = 0, inc = 0; const bs = {};
  I.forEach(i => { sp += num(i.spesa) + num(i.comp); inc += num(i.inc); bs[i.site] = (bs[i.site] || 0) + ip_(i); });
  return `<div class="tiles">${tile('Profitto inviti', sg(inc - sp), cl(inc - sp), `${I.length} inviti`, 'w')}${tile('Speso', eur(sp), '', 'Soldi + compensi')}${tile('Incassato', eur(inc), '', 'Bonus')}</div>
  <div class="bar" style="margin-top:12px"><button class="btn pri" data-a="inv">+ Nuovo invito</button></div>
  ${Object.keys(bs).length ? `<h2>Per sito</h2><div class="card">${Object.keys(bs).map(k => item(esc(k), '', `<span class="${cl(bs[k])}">${sg(bs[k])}</span>`)).join('')}</div>` : ''}
  <h2>Inviti</h2><div class="card">${I.length ? I.map(i => item(`${esc(i.friend)} · ${esc(i.site)}`,
    `${fd(i.date)} · invitato da ${esc(uname(i.by))} · dati ${eur(num(i.spesa))}${num(i.comp) ? ' · compenso ' + eur(num(i.comp)) : ''} · bonus ${eur(num(i.inc))}${i.note ? ' · ' + esc(i.note) : ''}`,
    `<span class="${cl(ip_(i))}">${sg(ip_(i))}</span><small style="display:block;text-align:right">${i.st === 'closed' ? 'chiuso' : 'in corso'}</small>`, ib('ei', i.id, '✎') + ib('di', i.id, '✕'))).join('') : empty('Nessun invito registrato')}</div>`;
}
function invForm(id) {
  const x = S.invites.find(i => i.id === id), v = x || { by: me.id, date: today(), st: 'open' };
  form(x ? 'Modifica invito' : 'Nuovo invito', [
    { k: 'friend', l: 'Amico invitato', t: 'text' }, { k: 'site', l: 'Sito (Snai, Sisal…)', t: 'text', list: [...new Set(S.invites.map(i => i.site))] },
    { k: 'by', l: 'Chi ha fatto l\'invito', t: 'sel', o: UO() }, { k: 'spesa', l: 'Soldi dati all\'amico per depositare (€)', t: 'num' },
    { k: 'comp', l: 'Compenso extra all\'amico (€)', t: 'num' }, { k: 'inc', l: 'Bonus incassato (€)', t: 'num' },
    { k: 'st', l: 'Stato', t: 'sel', o: [['open', 'In corso'], ['closed', 'Chiuso']] }, { k: 'date', l: 'Data', t: 'date' }, { k: 'note', l: 'Note', t: 'text' }], v, o => {
      if (!o.friend.trim() || !o.site.trim()) return 'Inserisci amico e sito';
      const r = { ...v, ...o, friend: o.friend.trim(), site: o.site.trim() };
      if (x) S.invites[S.invites.indexOf(x)] = r; else S.invites.push({ ...r, id: uid() });
      LOG(`Invito ${x ? 'modificato' : 'aggiunto'}: ${r.friend} su ${r.site}`);
    });
}

/* ---------- LOG / ADMIN ---------- */
function vLog() {
  const a = me.admin;
  return `${a ? `<h2>Console admin</h2><div class="card">${S.users.map(u => item(esc(u.name), u.admin ? 'Admin' : 'Utente', '', `<button class="btn sm" data-a="pin" data-id="${u.id}">PIN</button>${u.admin ? '' : ib('du', u.id, '✕')}`)).join('')}
    <div class="bar" style="margin:10px 0 0"><button class="btn" data-a="user">+ Utente</button><button class="btn" data-a="exp">Esporta backup</button><button class="btn" data-a="imp">Importa</button></div></div>` : ''}
  <h2>Log attività ${a ? '<button class="btn sm x" data-a="clog">Pulisci</button>' : ''}</h2>
  <div class="card">${S.log.length ? S.log.slice(0, 80).map(l => item(esc(l.msg), `${new Date(l.ts).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · ${esc(l.user)}${a && l.ip ? ` · IP ${esc(l.ip)}` : ''}`)).join('') : empty('Nessuna attività')}</div>
  ${a ? '<p class="m">Nota: i dati stanno nel browser di questo dispositivo. Usa "Esporta backup" spesso.</p>' : ''}`;
}

/* ---------- RENDER ---------- */
const TABS = [['wallet', '💰', 'Wallet', vWallet], ['debts', '🤝', 'Debiti', vDebts], ['calc', '📊', 'Calcoli', vCalc], ['inv', '🎁', 'Inviti', vInv], ['log', '📝', 'Log', vLog]];
function render() {
  const L = $('#login'), A = $('#app');
  if (!me) {
    A.hidden = true; L.hidden = false;
    L.innerHTML = `<div class="lc"><div style="font-size:44px">⚽</div><h1>Matched Betting</h1><p>${pick ? 'PIN di ' + esc(pick.name) : 'Chi sei?'}</p>` + (pick
      ? `<input id="pin" class="pinbox" type="password" inputmode="numeric" maxlength="6" placeholder="••••••" autocomplete="off"><p class="err" id="perr"></p><div class="row"><button class="btn" data-a="back">Indietro</button><button class="btn pri" data-a="login">Entra</button></div>`
      : S.users.map(u => `<button class="ub" data-a="pick" data-id="${u.id}"><span class="av">${esc(u.name[0].toUpperCase())}</span><span><b>${esc(u.name)}</b><small>${u.admin ? 'Admin' : 'Utente'}</small></span></button>`).join('')) + '</div>';
    if (pick) $('#pin').focus();
    return;
  }
  L.hidden = true; A.hidden = false;
  $('#av').textContent = me.name[0].toUpperCase(); $('#nm').textContent = me.name;
  $('#nav').innerHTML = TABS.map(t => `<button data-tab="${t[0]}" class="${tab === t[0] ? 'on' : ''}"><i>${t[1]}</i>${t[2]}</button>`).join('');
  $('#view').innerHTML = TABS.find(t => t[0] === tab)[3]();
  if (tab === 'calc') upd();
}
async function login() {
  const p = $('#pin').value.trim(), ip = getIP();
  if (p !== pick.pin) { $('#perr').textContent = 'PIN errato'; const n = pick.name; ip.then(i => { me = null; LOG('PIN errato per ' + n, i); }); return; }
  me = pick; pick = null; try { localStorage.setItem(KS, me.id); } catch (e) {}
  render(); LOG('Accesso effettuato', await ip);
}

/* ---------- EVENTI ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-a],[data-tab]'); if (!t) return;
  if (t.dataset.tab) { tab = t.dataset.tab; return render(); }
  const a = t.dataset.a, id = t.dataset.id, D = t.dataset;
  const del = (arr, msg) => { if (confirm('Eliminare?')) { const i = S[arr].findIndex(x => x.id === id); if (i >= 0) S[arr].splice(i, 1); LOG(msg); save(); render(); } };
  ({
    pick: () => { pick = S.users.find(u => u.id === id); render(); },
    back: () => { pick = null; render(); },
    login,
    out: () => { LOG('Logout'); me = null; try { localStorage.removeItem(KS); } catch (x) {} render(); },
    mov: () => movForm(D.t),
    em: () => movForm(null, S.moves.find(m => m.id === id)),
    dm: () => del('moves', 'Movimento eliminato'),
    debt: () => debtForm('debt'), pay: () => debtForm('pay'),
    settle: () => { if (confirm(`Registrare pagamento di ${eur(num(D.m))}?`)) { S.debts.push({ id: uid(), kind: 'pay', from: D.f, to: D.t, amount: +num(D.m).toFixed(2), date: today(), why: '' }); LOG(`Saldato: ${uname(D.f)} → ${uname(D.t)} ${eur(num(D.m))}`); save(); render(); } },
    dd: () => del('debts', 'Debito eliminato'),
    cnew: () => { S.calcs.push(newCalc()); S.active = S.calcs.length - 1; LOG('Nuovo bonus creato'); save(); render(); },
    cdel: () => { if (S.calcs.length > 1 && confirm('Eliminare questo bonus?')) { LOG('Bonus eliminato: ' + C().name); S.calcs.splice(S.active, 1); S.active = 0; save(); render(); } },
    sadd: () => { C().steps.push({ m: '', q: '', p: '', ok: false }); save(); render(); },
    sdel: () => { C().steps.splice(+id, 1); save(); render(); },
    inv: () => invForm(), ei: () => invForm(id), di: () => del('invites', 'Invito eliminato'),
    user: () => form('Nuovo utente', [{ k: 'name', l: 'Nome', t: 'text' }, { k: 'pin', l: 'PIN (4-6 cifre)', t: 'pw' }, { k: 'admin', l: 'Ruolo', t: 'sel', o: [['0', 'Utente'], ['1', 'Admin']] }], { admin: '0' }, o => {
      if (o.name.trim().length < 2) return 'Nome troppo corto'; if (!/^\d{4,6}$/.test(o.pin)) return 'PIN: 4-6 cifre';
      if (S.users.some(u => u.name.toLowerCase() === o.name.trim().toLowerCase())) return 'Nome già presente';
      S.users.push({ id: uid(), name: o.name.trim(), pin: o.pin, admin: o.admin === '1' }); LOG('Utente creato: ' + o.name.trim()); }),
    pin: () => { const u = S.users.find(x => x.id === id); form('Nuovo PIN per ' + esc(u.name), [{ k: 'pin', l: 'PIN (4-6 cifre)', t: 'pw' }], {}, o => { if (!/^\d{4,6}$/.test(o.pin)) return 'PIN: 4-6 cifre'; u.pin = o.pin; LOG('PIN cambiato per ' + u.name); }); },
    du: () => { const u = S.users.find(x => x.id === id); if (confirm('Eliminare ' + u.name + '?')) { S.users = S.users.filter(x => x.id !== id); LOG('Utente eliminato: ' + u.name); save(); render(); } },
    exp: () => { const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' })); l.download = 'mb-backup-' + today() + '.json'; l.click(); LOG('Backup esportato'); },
    imp: () => $('#imp').click(),
    clog: () => { if (confirm('Cancellare il log?')) { S.log = []; save(); render(); } }
  }[a] || (() => {}))();
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'fm') { fmov = t.value; render(); }
  else if (t.id === 'csel') { S.active = +t.value; save(); render(); }
  else if (t.id === 'imp' && t.files[0]) {
    const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (!d.users || !d.moves) throw 0; if (confirm('Sostituire tutti i dati con il backup?')) { S = Object.assign(DEF(), d); me = S.users.find(u => u.id === me.id) || S.users[0]; LOG('Backup importato'); save(); render(); } } catch (x) { alert('File non valido'); } };
    r.readAsText(t.files[0]); t.value = '';
  }
});
document.addEventListener('input', e => {
  const t = e.target, c = C(); if (!me || !me.admin) return;
  if (t.dataset.c) c[t.dataset.c] = t.value;
  else if (t.dataset.s !== undefined) c.steps[+t.dataset.s][t.dataset.f] = t.dataset.f === 'ok' ? t.checked : t.value;
  else if (t.dataset.cp) c.people = S.users.map(u => u.id).filter(i => i === t.dataset.cp ? t.checked : c.people.includes(i));
  else return;
  save(); upd();
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'pin') login(); });

try { const s = localStorage.getItem(KS); me = S.users.find(u => u.id === s) || null; } catch (e) {}
render();
})();
