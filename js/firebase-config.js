/**
 * CONFIG SYNC MULTI-DISPOSITIVO
 * -------------------------------
 * 1. Crea progetto gratis su https://console.firebase.google.com
 * 2. Aggiungi app Web → copia la config
 * 3. Realtime Database → crea database (modalità test per iniziare)
 * 4. Incolla sotto i valori firebaseConfig
 * 5. groupId: codice condiviso del gruppo (es. sisalman2026)
 *
 * Se leave firebaseConfig.apiKey vuoto → solo localStorage (questo dispositivo).
 */
window.MB_SYNC = {
  groupId: 'sisalman2026',
  firebaseConfig: {
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  }
};
