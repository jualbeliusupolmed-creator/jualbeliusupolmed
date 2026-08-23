// bot-wa/src/core/state.js

/**
 * Global State untuk bot-wa
 * Memusatkan variabel yang sebelumnya mengambang di index.js
 */
const state = {
    // 1. Konfigurasi
    settings: {},
    
    // 2. Infrastruktur
    waSocket: null,
    supabase: null,
    messageQueue: [],
    botSentIds: new Set(),
    botSentIdQueue: [],
    dibuangList: [],
    
    // 3. Status Koneksi & Jejak Putus
    connectedPhone: '',
    connectedAt: null,
    reconnectAttempts: 0,
    currentQR: '',
    offlineSince: null,
    lastOutage: null,
    outageCount: 0,
    offlineEscalations: 0,
    escalationResetTimer: null,
    outboxTimer: null,
    
    // 4. Kunci Sesi & Keamanan
    lockDipegang: false,
    logoutStrikes: 0,
    sessionLostAt: null,
    kunciSiklus: 0,
    sesiTerkunci: false,
    menungguPindai: false,
    siklusQrSiaSia: 0,
    
    // 5. Variabel Bisnis & Sapaan
    greetingText: '',
    
    // 6. Map Data
    nameMap: new Map(),
    lidResolutionMap: new Map(),
    greetedMap: new Map(),
    contactMap: new Map(),
    chatMap: new Map(),
    botSessions: new Map(),
    adminCallMap: new Map(),
    photoBuffer: new Map(),
    conversationContext: new Map(),
    authFails: new Map(),
    
    // 7. Modul Dinamis
    isStateDirty: false,
    msgArchive: [],
    msgArchiveDirty: false,
    stats: { total: {}, daily: {} },
    statsDirty: false,
    jejakKirim: [],
    
    // 8. Fungsi Kontrol Sesi
    clearAuthState: async () => {},
    flushAuthState: async () => {},
};

module.exports = state;
