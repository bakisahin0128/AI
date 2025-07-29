/* ==========================================================================
   ANA UYGULAMA GİRİŞ NOKTASI (app.js)
   Tüm modülleri başlatır ve uygulamayı çalıştırır.
   ========================================================================== */

import { configureLibraries } from './config.js';
import { initSettings } from './components/settings.js';
import { initHistory } from './components/history.js';
import { initEventHandlers, initMessageListener } from './handlers.js';

// DOM tamamen yüklendiğinde uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    console.log("İvme Chat UI Başlatılıyor...");
    
    // 1. Harici kütüphaneleri yapılandır
    configureLibraries();
    
    // 2. Bileşenleri başlat (kendi olay dinleyicilerini eklerler)
    initSettings();
    initHistory();
    
    // 3. Genel olay dinleyicilerini ve mesaj alıcısını başlat
    initEventHandlers();
    initMessageListener();

    console.log("İvme Chat UI Hazır.");
});