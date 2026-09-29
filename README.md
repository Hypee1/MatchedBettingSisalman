# MB Portal – Matched Betting Tracker

Portale statico per matched betting: wallet (banca + bookmaker), debiti, calcoli freebet, inviti/referral.

**Stack:** HTML5 · CSS3 · JavaScript vanilla · localStorage  
**Nessun backend · Compatibile GitHub Pages**

## Struttura

```
/
├── index.html
├── css/style.css
├── js/script.js
├── images/
├── assets/
└── README.md
```

Percorsi relativi → funziona su `https://USERNAME.github.io/REPO/`.

## Login

| Utente    | PIN    | Ruolo |
|-----------|--------|-------|
| Biagio    | 010203 | Admin |
| Mario     | 111021 | Utente |
| Leonardo  | 050106 | Utente |

Puoi aggiungere/eliminare utenti. Biagio è protetto.

## Funzionalità

### Home
Riepilogo banca, saldi sui book, P&L, debiti e ultimi movimenti.

### Wallet
- **Banca** vs **Bookmaker** separati
- Conti per sito (Eurobet, Snai, Sisal, Betfair…)
- Depositi / Prelievi / Aggiustamenti
- Divisione spese → crea debiti automatici
- Modifica ed elimina movimenti

### Debiti
Riepilogo “X ti deve / devi a Y”, aggiunta manuale, salda con ✓.

### Calcoli (freebet / coperture)
- Solo **admin (Biagio)** modifica; altri in sola lettura
- Periodo con scadenza e reset automatico
- Freebet, tassa/QL, vincita netta, budget a testa
- Partecipanti per nome (virgola)
- Step illimitati: partita, quota, puntata, “andato a buon fine”
- Netto a testa in tempo reale (logica dello script originale)

### Inviti / Referral
Traccia inviti su Snai, Sisal, ecc.: deposito anticipato, bonus, profitto, stato.

### Log
Attività recenti. **Solo admin** vede anche IP degli accessi (via ipify, best-effort).

## Pubblicare su GitHub Pages

1. Crea repository e carica tutti i file in root  
2. Settings → Pages → branch `main` / folder `/ (root)`  
3. Sito: `https://USERNAME.github.io/NOME-REPO/`

## Note

- Dati in `localStorage` del browser (non sincronizzati tra dispositivi)
- Nessuna API key o segreto nel codice
- Nessuna dipendenza esterna obbligatoria (solo fetch opzionale a ipify per IP)
