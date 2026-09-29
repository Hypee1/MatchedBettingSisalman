# Matched Betting Tracker – Biagio & Co.

Sito statico per tracciare matched betting, wallet, depositi/prelievi, debiti tra utenti e calcoli di copertura freebet.

**Tecnologie:** HTML5 · CSS3 · JavaScript vanilla (nessun framework, nessun backend).

**Compatibile con GitHub Pages.**

---

## Struttura del progetto

```
/
├── index.html          ← pagina principale
├── css/
│   └── style.css       ← stili (dark/light automatico)
├── js/
│   └── script.js       ← tutta la logica
├── images/             ← (vuota, pronta per immagini future)
├── assets/             ← (vuota, risorse extra)
└── README.md
```

Tutti i percorsi sono **relativi** → funziona sia in locale che su `https://USERNAME.github.io/NOME-REPOSITORY/`.

---

## Funzionalità

### Login multi-utente
- Seleziona **Biagio**, **Mario** o **Leonardo**
- PIN a 6 cifre:
  - **Biagio** (admin): `140523`
  - **Mario**: `111021`
  - **Leonardo**: `050106`
- Puoi aggiungere nuovi utenti o eliminarli (Biagio è protetto)
- I dati restano salvati nel browser (`localStorage`)

### Wallet
- Registra **depositi** (sito, importo, data, note)
- Registra **prelievi** (sito, banca, importo, data)
- Opzione **“Dividere con gli altri?”** → crea automaticamente i debiti proporzionali
- Saldo stimato aggiornato in tempo reale

### Debiti
- Riepilogo chiaro: “Mario ti deve 50 €” / “Devi a Leonardo 20 €”
- Aggiungi debiti manuali
- Segna come pagato con un tap

### Calcoli (Coperture freebet)
- Solo **Biagio (admin)** può modificare
- Mario, Leonardo e altri utenti vedono in sola lettura
- Form configurabile:
  - Data inizio + durata (giorni) → **reset automatico alla scadenza**
  - Tassa totale inizio betting
  - Quota a testa
  - Vincita netta Eurobet
  - N° persone
  - Budget max a testa
  - Vincita altro sito
- **5+ step modificabili**: partita, quota, puntata totale, checkbox “andato a buon fine”
- Calcolo netto a testa in tempo reale + controllo superamento budget
- Logica basata sul tuo script originale (tutti gli step editabili)

### Log attività
- Storico delle azioni principali (login, depositi, calcoli salvati, ecc.)

---

## Come pubblicare su GitHub Pages

1. Crea un nuovo repository su GitHub (es. `matched-betting`).
2. Carica **tutti** i file di questa cartella nella root del repository  
   (puoi usare l’interfaccia web, GitHub Desktop o `git`).
3. Vai su **Settings → Pages**.
4. In **Source** seleziona:
   - Branch: `main` (o `master`)
   - Folder: `/ (root)`
5. Salva. Dopo 1-2 minuti il sito sarà online su:
   ```
   https://TUO-USERNAME.github.io/matched-betting/
   ```

### Comandi Git rapidi (opzionale)

```bash
git init
git add .
git commit -m "Primo commit – Matched Betting Tracker"
git branch -M main
git remote add origin https://github.com/TUO-USERNAME/matched-betting.git
git push -u origin main
```

Poi configura GitHub Pages come sopra.

---

## Note importanti

- **Nessun backend / database**: tutto viene salvato nel `localStorage` del browser di chi usa il sito.
- Se cancelli i dati del browser (cache/cookie) i dati vengono persi.
- Per condividere gli stessi dati tra dispositivi diversi servirebbe un backend (non previsto in questa versione statica).
- Nessuna API key, password o token nel codice.
- Nessuna dipendenza esterna (CDN, librerie, framework).
- Responsive e ottimizzato per **mobile** (menu in basso, form touch-friendly).

---

## Personalizzazione rapida

- Cambiare PIN o aggiungere utenti di default → modifica `DEFAULT_USERS` in `js/script.js`
- Cambiare i valori di default dei calcoli → modifica `DEFAULT_CALC` in `js/script.js`
- Colori / tema → variabili CSS in cima a `css/style.css`

---

Buon matched betting! ⚽
