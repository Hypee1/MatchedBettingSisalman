# MB Portal – Matched Betting Tracker

Sito statico (GitHub Pages) con **sync multi-dispositivo** opzionale via Firebase.

## Struttura
```
/
├── index.html
├── css/style.css
├── js/
│   ├── script.js
│   └── firebase-config.js   ← configura qui il sync
└── README.md
```

## Login
| Utente | PIN | Ruolo |
|--------|-----|-------|
| Biagio | 010203 | Admin |
| Mario | 111021 | Utente |
| Leonardo | 050106 | Utente |

## Sync su tutti i dispositivi

Di default i dati sono **solo localStorage** (un dispositivo).

Per sincronizzare telefono + PC:

1. https://console.firebase.google.com → progetto gratis
2. App **Web** + **Realtime Database**
3. Regole test o: `{ "rules": { "mb": { ".read": true, ".write": true } } }`
4. Copia config in **js/firebase-config.js**
5. Stesso `groupId` per tutti
6. Push su GitHub Pages

Pallino sync **verde** = attivo.

## Funzioni
- Wallet, giocate, debiti modificabili
- Preventivi + Invia richiesta + admin approva/rifiuta
- Notifiche, collegamento step↔wallet
- Reset calcoli non tocca wallet

## GitHub Pages
Settings → Pages → branch `main` / root
