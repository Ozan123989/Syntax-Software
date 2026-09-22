/**
 * SYNTAX SOFTWARE - MAIN JAVASCRIPT ENGINE
 * Handles starfield, interactive cheat panel, navigation, filter search, and modals.
 */


// ============================================================================
// GLOBAL TICKET & TRANSCRIPT HELPER ENGINE (DISCORD PRIVACY & DEDICATED CHANNELS)
// ============================================================================

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#039;';
      default: return m;
    }
  });
}
window.escapeHtml = escapeHtml;

function getTicketMeta(chatKey) {
  try {
    const raw = localStorage.getItem('syntax_ticket_meta_' + chatKey);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  const num = Math.abs(chatKey.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0) % 9000) + 1000;
  const defaultMeta = {
    status: 'open',
    ticketNum: num,
    createdAt: 'Bugün',
    category: 'Genel Destek',
    channelName: ('web-destek-' + (chatKey.startsWith('syntax_chat_user_') ? chatKey.replace('syntax_chat_user_', '') : 'uye'))
  };
  try {
    localStorage.setItem('syntax_ticket_meta_' + chatKey, JSON.stringify(defaultMeta));
  } catch (e) {}
  return defaultMeta;
}
window.getTicketMeta = getTicketMeta;

function saveTicketMeta(chatKey, meta) {
  try {
    localStorage.setItem('syntax_ticket_meta_' + chatKey, JSON.stringify(meta));
  } catch (e) {}
}
window.saveTicketMeta = saveTicketMeta;

function getTicketCategorySlug(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('val')) return 'val';
  if (c.includes('spoofer') || c.includes('spf')) return 'spoofer';
  if (c.includes('emu') || c.includes('vanguard')) return 'emu';
  if (c.includes('cs')) return 'cs2';
  if (c.includes('hwid') || c.includes('lisans') || c.includes('key')) return 'hwid';
  if (c.includes('sat') || c.includes('ode') || c.includes('siparis') || c.includes('fiyat')) return 'satis';
  return 'destek';
}
window.getTicketCategorySlug = getTicketCategorySlug;

function generateTicketChannelName(cat, username) {
  const slug = getTicketCategorySlug(cat);
  const cleanUser = (username || 'musteri').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'uye';
  return `web-${slug}-${cleanUser}`;
}
window.generateTicketChannelName = generateTicketChannelName;

function hasUserActiveTicket(chatKey) {
  try {
    if (!chatKey) return false;
    const rawMeta = localStorage.getItem('syntax_ticket_meta_' + chatKey);
    if (!rawMeta) return false;
    const meta = JSON.parse(rawMeta);
    const rawMsgs = localStorage.getItem(chatKey);
    const msgs = rawMsgs ? JSON.parse(rawMsgs) : [];
    return msgs.length > 0 && meta && meta.status !== 'closed';
  } catch (e) {
    return false;
  }
}
window.hasUserActiveTicket = hasUserActiveTicket;

function generateTicketTranscriptHtml(ticketKey, userObj, metaObj, messagesList) {
  try {
    if (!metaObj) {
      const raw = localStorage.getItem('syntax_ticket_meta_' + ticketKey);
      metaObj = raw ? JSON.parse(raw) : {};
    }
  } catch(e) { metaObj = {}; }

  try {
    if (!userObj) {
      userObj = (typeof getCurrentUser === 'function' && getCurrentUser()) || { username: (metaObj && metaObj.user) || 'Müşteri' };
    }
  } catch(e) { userObj = { username: 'Müşteri' }; }

  try {
    if (!messagesList) {
      const raw = localStorage.getItem(ticketKey);
      messagesList = raw ? JSON.parse(raw) : [];
    }
  } catch(e) { messagesList = []; }

  const chName = (metaObj && metaObj.channelName) || ('web-destek-' + ((userObj && userObj.username) || 'musteri'));
  const tNum = (metaObj && metaObj.ticketNum) || '1001';
  const statusText = (metaObj && metaObj.status === 'closed') ? 'KAPANDI / ÇÖZÜLDÜ' : 'AKTİF';
  const claimText = (metaObj && metaObj.claimedBy) ? `${metaObj.claimedBy.username} (${metaObj.claimedBy.role})` : 'Üstlenilmedi (Açıkta)';

  let msgsHtml = '';
  (messagesList || []).forEach(m => {
    const isStaff = m.sender === 'staff' || m.sender === 'admin';
    const isSys = m.sender === 'system';
    const senderName = isStaff ? (m.author || 'Syntax Yetkili') : (isSys ? 'SİSTEM BİLDİRİMİ' : ((userObj && userObj.username) || 'Müşteri'));
    const badgeClass = isStaff ? 'badge-staff' : (isSys ? 'badge-sys' : 'badge-user');
    const badgeText = isStaff ? 'STAFF' : (isSys ? 'SİSTEM' : 'MÜŞTERİ');

    msgsHtml += `
      <div class="msg-row ${isStaff ? 'staff-row' : ''}">
        <div class="msg-avatar ${badgeClass}">${escapeHtml(senderName.slice(0, 2).toUpperCase())}</div>
        <div class="msg-body">
          <div class="msg-header">
            <span class="msg-author">${escapeHtml(senderName)}</span>
            <span class="role-tag ${badgeClass}">${badgeText}</span>
            <span class="msg-time">${escapeHtml(m.time || '')}</span>
          </div>
          <div class="msg-content">${escapeHtml(m.text || '')}</div>
        </div>
      </div>
    `;
  });

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Transkript #${escapeHtml(String(tNum))} - ${escapeHtml(chName)} | Syntax Software</title>
  <style>
    body { background: #1e1f22; color: #dbdee1; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 2rem 1rem; }
    .transcript-card { max-width: 860px; margin: 0 auto; background: #2b2d31; border: 1px solid #383a40; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .tr-header { background: #111214; padding: 1.5rem; border-bottom: 1px solid #383a40; }
    .tr-brand { font-size: 1.25rem; font-weight: 900; color: #5865f2; display: flex; align-items: center; gap: 0.5rem; }
    .tr-channel { font-size: 1.1rem; color: #ffffff; margin-top: 0.25rem; font-family: monospace; }
    .tr-meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; margin-top: 1rem; background: #1e1f22; padding: 0.75rem; border-radius: 8px; font-size: 0.78rem; }
    .tr-meta-item strong { display: block; color: #949ba4; text-transform: uppercase; font-size: 0.7rem; margin-bottom: 2px; }
    .tr-messages { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .msg-row { display: flex; gap: 0.75rem; align-items: flex-start; }
    .staff-row { background: rgba(88, 101, 242, 0.05); border-radius: 8px; padding: 0.4rem; }
    .msg-avatar { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; color: #fff; flex-shrink: 0; }
    .badge-staff { background: #5865f2; }
    .badge-user { background: #10b981; }
    .badge-sys { background: #64748b; }
    .msg-body { flex: 1; }
    .msg-header { display: flex; align-items: center; gap: 0.45rem; margin-bottom: 0.25rem; }
    .msg-author { font-weight: 700; color: #f2f3f5; font-size: 0.92rem; }
    .role-tag { font-size: 0.65rem; padding: 0.1rem 0.35rem; border-radius: 4px; font-weight: 800; text-transform: uppercase; }
    .msg-time { color: #949ba4; font-size: 0.72rem; margin-left: 0.25rem; }
    .msg-content { color: #dbdee1; font-size: 0.88rem; line-height: 1.45; word-break: break-word; }
    .tr-footer { text-align: center; padding: 1rem; color: #80848e; font-size: 0.75rem; border-top: 1px solid #383a40; }
  </style>
</head>
<body>
  <div class="transcript-card">
    <div class="tr-header">
      <div class="tr-brand">⚡ Syntax Software Canlı Destek Masası</div>
      <div class="tr-channel">#${escapeHtml(chName)}</div>
      <div class="tr-meta-grid">
        <div class="tr-meta-item"><strong>Ticket No</strong>#ticket-${escapeHtml(String(tNum))}</div>
        <div class="tr-meta-item"><strong>Kullanıcı</strong>@${escapeHtml((userObj && userObj.username) || 'Müşteri')}</div>
        <div class="tr-meta-item"><strong>Kategori</strong>${escapeHtml((metaObj && metaObj.category) || 'Destek')}</div>
        <div class="tr-meta-item"><strong>Durum</strong>${escapeHtml(statusText)}</div>
        <div class="tr-meta-item"><strong>Üstlenen (Claim)</strong>${escapeHtml(claimText)}</div>
        <div class="tr-meta-item"><strong>Kayıt Zamanı</strong>${escapeHtml((metaObj && metaObj.createdAt) || 'Bugün')}</div>
      </div>
    </div>
    <div class="tr-messages">
      ${msgsHtml}
    </div>
    <div class="tr-footer">
      Bu transkript Syntax Software Discord & Web Köprüsü tarafından otomatik olarak üretilmiş ve doğrulanmıştır.
    </div>
  </div>
</body>
</html>`;
}
window.generateTicketTranscriptHtml = generateTicketTranscriptHtml;



  // Plan Chip Click Event Delegation (Store Duration & Price switcher)
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.plan-chip');
    if (!chip) return;
    const parent = chip.closest('.product-plan-selector');
    const card = chip.closest('.product-card-wrap');
    if (!parent || !card) return;

    parent.querySelectorAll('.plan-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    const priceEl = card.querySelector('.product-price');
    const price = chip.dataset.price;
    const period = chip.dataset.period;
    if (priceEl && price && period) {
      priceEl.innerHTML = `${price} <span>${period}</span>`;
      priceEl.style.transform = 'scale(1.06)';
      setTimeout(() => (priceEl.style.transform = 'scale(1)'), 160);
    }
  });

/* ==========================================================================
   7. INTERACTIVE PRODUCT DETAIL MODAL ENGINE ("KAÇ GÜN KAÇ FİYAT" & SPECS)
   ========================================================================== */
const PRODUCTS_DETAIL = {
  'cs-kernel': {
    id: 'cs-kernel',
    category: 'Counter-Strike 2',
    title: 'CS Kernel',
    badges: [{ text: 'RING-0 KERNEL', bg: '#ea580c' }, { text: '● UNDETECTED', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' }],
    tagline: 'Ring-0 & Ring-1 Düzeyinde Maksimum Gizlilik ve Kernel Taramalarından Tam Muafiyet',
    pricing: [
      { duration: '1 Günlük', priceStr: '₺340', priceNum: 340, currency: '₺', period: '/ 1 Günlük', badge: 'Standart Deneme', isPopular: false, shopierUrl: 'https://www.shopier.com/SyntaxSoftware/51032742' },
      { duration: '3 Günlük', priceStr: '₺1,000', priceNum: 1000, currency: '₺', period: '/ 3 Günlük', badge: 'Haftasonu Paketi', isPopular: false, shopierUrl: 'https://www.shopier.com/SyntaxSoftware/51033189' },
      { duration: '7 Günlük', priceStr: '₺1,500', priceNum: 1500, currency: '₺', period: '/ 7 Günlük', badge: 'Avantajlı (%37 Tasarruf)', isPopular: true, shopierUrl: 'https://www.shopier.com/SyntaxSoftware/51033280' },
      { duration: '30 Günlük', priceStr: '₺2,300', priceNum: 2300, currency: '₺', period: '/ 30 Günlük', badge: 'En Çok Satan (%55 İndirim)', isPopular: false, shopierUrl: 'https://www.shopier.com/SyntaxSoftware/51033317' }
    ],
    functions: [
      'ESP & Wallhack (Gelişmiş mesafe, can barı ve kutu göstergesi)',
      'Aimbot Only — Davranışsal ve istatistiksel tespit riskini sıfırlayan doğal yumuşak hedefleme',
      'Ring-0 Seviyesi — VAC LIVE kernel taramalarından tamamen gizli çalışma katmanı',
      'Ring-1 Teknolojisi — İşletim sistemi çekirdeğinin altında ultra gizlilik',
      'Başlatmada tam otomatik kurulum (Setup: Automatic on launch)',
      'Anında otomatik lisans teslimatı & 7/24 güvenli sipariş doğrulaması'
    ],
    specs: {
      'İşletim Sistemi': 'Windows 10 / 11 (Tüm derlemeler & sürümler)',
      'İşlemci (CPU)': 'Intel & AMD tüm işlemci aileleri',
      'Ekran Kartı (GPU)': 'Nvidia, AMD & Intel GPU',
      'Anakart': 'Tüm Anakart Üreticileri (Asus, MSI, Gigabyte vb.)',
      'Güvenlik Düzeyi': 'Ring 0 / Ring-1 Kernel Stealth (VAC LIVE Undetected)'
    }
  },
  'temp-spoofer': {
    id: 'temp-spoofer',
    category: 'Spoofer & HWID',
    title: 'Temp spoofer',
    badges: [{ text: 'GEÇİCİ SPOOFER', bg: '#0284c7' }, { text: '● UNDETECTED', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' }],
    tagline: 'Format Gerektirmeyen, Hızlı ve Güvenilir VAN 152 Donanım Banı Kaldırma',
    pricing: [
      { duration: 'Onetime (Tek Seferlik)', priceStr: '₺1,200', priceNum: 1200, currency: '₺', period: '/ Onetime', badge: 'Tek Kullanımlık Reset', isPopular: false, shopierUrl: 'https://www.shopier.com/SyntaxSoftware/51033675' },
      { duration: 'Lifetime (Sınırsız)', priceStr: '₺1,900', priceNum: 1900, currency: '₺', period: '/ Lifetime', badge: 'Sınırsız Ömür Boyu', isPopular: true, shopierUrl: 'https://www.shopier.com/SyntaxSoftware/51033682' }
    ],
    functions: [
      'VAN 152 Bypass — Vanguard donanım yasaklamasını anında kaldırır',
      'No Reinstall Required — Windows formatı veya yeniden kurulum GEREKMEZ',
      'Anti-Van 152 Gelişmiş Koruma Filtresi',
      'BIOS Update Required — BIOS güncellemesi ile tam donanım kimliği yenileme',
      'Anında donanım serilerini (Serial Number) sanallaştırma'
    ],
    specs: {
      'İşletim Sistemi': 'Windows 10 Desteği',
      'İşlemci & Ekran Kartı': 'All CPU & GPU Support (Intel & AMD)',
      'Anakart Desteği': 'All Motherboard Support (Tüm anakartlar)',
      'Sistem Ayarları': 'Hvci On/Off, Tpm On/Off, Secure Boot On/Off Uyumlu',
      'Ek Koruma': 'Anti-Van 152 Filtresi'
    }
  },
  'perm-spoofer': {
    id: 'perm-spoofer',
    category: 'Spoofer & HWID',
    title: 'Perm spoofer',
    badges: [{ text: 'KALICI SPOOFER', bg: '#9333ea' }, { text: '● UNDETECTED', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' }],
    tagline: 'Kalıcı Olarak Donanım Kimliğini Sıfırlayan Çift Katmanlı VAN 152 & VAL 5 Çözümü',
    pricing: [
      { duration: 'Onetime (Tek Seferlik)', priceStr: '₺1,500', priceNum: 1500, currency: '₺', period: '/ Onetime', badge: 'Kalıcı Tek Seferlik', isPopular: false, shopierUrl: 'https://www.shopier.com/SyntaxSoftware/51033588' },
      { duration: 'Lifetime (Sınırsız)', priceStr: '₺2,500', priceNum: 2500, currency: '₺', period: '/ Lifetime', badge: 'Kalıcı Sınırsız Paket', isPopular: true, shopierUrl: 'https://www.shopier.com/SyntaxSoftware/51033601' }
    ],
    functions: [
      'VAN 152 Bypass & VAL 5 Bypass kalıcı donanım kimliği sıfırlama',
      'Anti-Van 152 & Anti-Val 5 kalıcı koruma katmanı',
      'Reinstall Required — Temiz format ile tüm Vanguard log kalıntılarını yok etme',
      'BIOS Update Required — Anakart UUID & MAC adresi derin temizliği',
      'Kalıcı donanım bileşeni ID spoofing'
    ],
    specs: {
      'İşletim Sistemi': 'Windows 10 Desteği',
      'İşlemci & GPU': 'All CPU & GPU Support',
      'Anakart': 'All Motherboard Support',
      'Sistem Ayarları': 'Hvci Off, Tpm Off, Secure Boot Off',
      'Filtre Koruması': 'Anti-Van 152 & Anti-Val 5'
    }
  },
  'oneclick-spoofer': {
    id: 'oneclick-spoofer',
    category: 'Spoofer & HWID',
    title: 'OneClick Spoofer',
    badges: [{ text: 'ONECLICK HWID', bg: '#10b981' }, { text: '● UNDETECTED', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' }],
    tagline: 'Format ve BIOS Güncellemesi Gerektirmeyen Tek Tıkla Donanım Kimliği Sıfırlama',
    pricing: [
      { duration: '7 Günlük', priceStr: '₺3,999', priceNum: 3999, currency: '₺', period: '/ 7 Günlük', badge: '7 Günlük Lisans', isPopular: false },
      { duration: '30 Günlük', priceStr: '₺7,999', priceNum: 7999, currency: '₺', period: '/ 30 Günlük', badge: 'Aylık VIP', isPopular: true },
      { duration: '90 Günlük', priceStr: '₺19,999', priceNum: 19999, currency: '₺', period: '/ 90 Günlük', badge: 'Sezonluk Paket', isPopular: false },
      { duration: 'Lifetime (Sınırsız)', priceStr: '₺39,999', priceNum: 39999, currency: '₺', period: '/ Lifetime', badge: 'Sınırsız Lisans', isPopular: false }
    ],
    functions: [
      'VAN 152 Bypass — Riot Vanguard donanım yasaklarını tek tıkla kaldırma',
      'Val 5 Bypass — Bağlantı ve cihaz kilitlerini anında aşma',
      'No Reinstall Required — Format gerektirmez, dosyalarınız silinmez',
      'No BIOS Update Required — BIOS güncellemesi ve flashback gerekmez',
      'Oneclick Process — Tek tıkla otomatik süreç ve anında aktivasyon'
    ],
    specs: {
      'İşletim Sistemi': 'Windows 10 Support & Windows 11 Support',
      'Donanım Uyumu': 'All CPU & GPU Support, All Motherboard Support',
      'Sistem Gereksinimleri': 'Hvci On/off, Tpm On, Secure Boot On',
      'Ek Özellikler': 'Anti-Van 152, Anti-Val 5, Oneclick Process'
    }
  },
  'valorant-external': {
    id: 'valorant-external',
    category: 'Valorant',
    title: 'Valorant External',
    badges: [{ text: 'EXTERNAL SAFE', bg: '#f43f5e' }, { text: '● UNDETECTED', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' }],
    tagline: 'Belleğe Müdahale Etmeyen Güvenli External Görsel & Aimbot',
    pricing: [
      { duration: '1 Günlük', priceStr: '₺340', priceNum: 340, currency: '₺', period: '/ 1 Günlük', badge: 'Günlük Giriş', isPopular: false, shopierUrl: 'https://www.shopier.com/SyntaxSoftware/51033801' },
      { duration: '7 Günlük', priceStr: '₺2,000', priceNum: 2000, currency: '₺', period: '/ 7 Günlük', badge: 'Haftalık VIP', isPopular: true, shopierUrl: 'https://www.shopier.com/SyntaxSoftware/51033813' },
      { duration: '30 Günlük', priceStr: '₺3,000', priceNum: 3000, currency: '₺', period: '/ 30 Günlük', badge: 'Aylık Tam Paket', isPopular: false, shopierUrl: 'https://www.shopier.com/SyntaxSoftware/51033829' }
    ],
    functions: [
      'Safe Aimbot — Yumuşak FOV kontrolü, insansı tepki hızı, akıcı kilitlenme',
      'ESP — 2D Kutu, İskelet, Can Barı, Mesafe ve Ajan İsimleri',
      'Config System — Kendi ayarlarınızı kaydetme ve anında yükleme',
      'Bellek enjeksiyonu yapmaz, Vanguard taramalarında external katmanda kalır',
      'Ekran yayını ve video kayıtlarında görünmez (Stream Proof)'
    ],
    specs: {
      'İşletim Sistemi': 'Windows 10 Support & Windows 11 Support (Tüm Derlemeler)',
      'Donanım': 'All CPU & GPU Support, All Motherboard Support',
      'Güvenlik Uyumu': 'Hvci On/Off, Tpm On/Off, Secure Boot On/Off Uyumlu',
      'Misc': 'Config System (Özel Profil Kaydetme)'
    }
  },
  'valorant-internal': {
    id: 'valorant-internal',
    category: 'Valorant',
    title: 'Valorant Internal',
    badges: [{ text: 'FULL INTERNAL', bg: '#a855f7' }, { text: '● UNDETECTED', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' }],
    tagline: '80+ Fonksiyon ile Donatılmış En Kapsamlı Internal Valorant Gücü',
    pricing: [
      { duration: '1 Günlük', priceStr: '₺300', priceNum: 300, currency: '₺', period: '/ 1 Günlük', badge: 'Giriş Paketi', isPopular: false, shopierUrl: 'https://www.shopier.com/SyntaxSoftware/51033733' },
      { duration: '7 Günlük', priceStr: '₺1,300', priceNum: 1300, currency: '₺', period: '/ 7 Günlük', badge: 'Haftalık Avantaj', isPopular: false, shopierUrl: 'https://www.shopier.com/SyntaxSoftware/51033741' },
      { duration: '30 Günlük', priceStr: '₺2,000', priceNum: 2000, currency: '₺', period: '/ 30 Günlük', badge: 'En Popüler Aylık', isPopular: true, shopierUrl: 'https://www.shopier.com/SyntaxSoftware/51033768' },
      { duration: 'Lifetime', priceStr: '₺3,500', priceNum: 3500, currency: '₺', period: '/ Lifetime', badge: 'Ömür Boyu VIP Slot', isPopular: false, shopierUrl: 'https://www.shopier.com/SyntaxSoftware' }
    ],
    functions: [
      'Aimbot & Visuals: 360 FOV, Draw RGB FOV, Auto Shoot, Thru Smoke & Wallbang, Recoil Control, Visible Check, Serverside Anti-Aim, Fake Lag, Desync Range',
      'ESP & Wallhack: 2D/3D Box, Skeleton, Head Circle, Healthbar, Distance, Snapline, Traps & Skill Name, Spike Timer, Dropped Gun',
      'Chams & Visuals: Galaxy/Rainbow/Gun/Fresnel Chams, Aqua Fresnel, Wireframe (Hand, Self, Enemy, Weapon), Outline Chams, Rainbow Outlines',
      'Skins & Customizer: CS2 Skins, Buddy Changer & Slider, Unlock All, View Model Changer, Aspect Ratio Changer, Third Person, FOV Slider',
      'Movement: Bunny Hop, Anti AFK, Fast Crouch, Self Size, Custom Crosshair',
      'SkyBox & Troll: SkyBox Galaxy & RGB, Custom Sky, Custom Gun, Finisher, Custom Kill Sound, Kill Say, Chat Spammer, Cloud Speed',
      'Config: Save Config & Load Config ile sınırsız özel profil desteği'
    ],
    specs: {
      'İşletim Sistemi': 'Windows 10 Support & Windows 11 Support',
      'Donanım': 'All CPU & GPU Support, All Motherboard Support',
      'Sistem Ayarları': 'Hvci On/Off, Tpm On/Off, Secure Boot On/Off',
      'Profil Yönetimi': 'Config System (Save / Load Config)'
    }
  },
  'cheat-emu': {
    id: 'cheat-emu',
    category: 'Spoofer & Emulator',
    title: 'Cheat Emu',
    badges: [{ text: 'VAL 5 BYPASS', bg: '#059669' }, { text: '● UNDETECTED', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' }],
    tagline: 'Vanguard Kapatma ve Geçici Ban Riski Olmayan Gelişmiş Emülasyon Katmanı',
    pricing: [
      { duration: '1 Day Key', priceStr: '$35', priceNum: 35, currency: '$', period: '/ 1 Day Key', badge: 'Günlük Giriş', isPopular: false },
      { duration: '1 Week Key', priceStr: '$50', priceNum: 50, currency: '$', period: '/ 1 Week Key', badge: 'Haftalık Lisans', isPopular: false },
      { duration: '1 Month Key', priceStr: '$90', priceNum: 90, currency: '$', period: '/ 1 Month Key', badge: 'Aylık Avantajlı', isPopular: true },
      { duration: 'Lifetime Key', priceStr: '$150', priceNum: 150, currency: '$', period: '/ Lifetime Key', badge: 'Sınırsız Ömür Boyu', isPopular: false }
    ],
    functions: [
      'Val 5 Bypass — Vanguard Val 5 hata kodunu tamamen ortadan kaldırır',
      'UD (Undetected) & Vanguard Off mimarisi',
      'No Temp Bans — Geçici yasaklama ve VAN 102 problemlerini önler',
      'Anti-Van 152 & Anti-Val 5 koruma filtreleri',
      'Reinstall Required & BIOS Update Required — Temiz ve kalıcı çözüm'
    ],
    specs: {
      'İşletim Sistemi': 'Win 10 Support',
      'Donanım Desteği': 'All CPU & GPU Support, All Motherboard Support',
      'Sistem Ayarları': 'Hvci Off, Tpm Off, Secure Boot Off',
      'Filtre Koruması': 'Anti-Van 152 & Anti-Val 5'
    }
  },
  'vanguard-emulator': {
    id: 'vanguard-emulator',
    category: 'Spoofer & Emulator',
    title: 'Vanguard Emulator',
    badges: [{ text: 'EMULATOR PRO', bg: '#2563eb' }, { text: '● UNDETECTED', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' }],
    tagline: 'Format, BIOS Flash ve Yeniden Başlatma Olmadan Hem Valorant Hem LoL Desteği',
    pricing: [
      { duration: '3 Days Emulator', priceStr: '$39.99', priceNum: 39.99, currency: '$', period: '/ 3 Days', badge: '3 Günlük Deneme', isPopular: false, shopierUrl: 'https://www.shopier.com/SyntaxSoftware/51033462' },
      { duration: '1 Week Emulator', priceStr: '$69.99', priceNum: 69.99, currency: '$', period: '/ 1 Week', badge: 'Haftalık Paket', isPopular: false, shopierUrl: 'https://www.shopier.com/SyntaxSoftware/51033489' },
      { duration: '1 Month Emulator', priceStr: '$199.99', priceNum: 199.99, currency: '$', period: '/ 1 Month', badge: 'Aylık VIP', isPopular: true, shopierUrl: 'https://www.shopier.com/SyntaxSoftware/51033505' },
      { duration: 'Lifetime (3 Slot)', priceStr: '$400', priceNum: 400, currency: '$', period: '/ Lifetime (3 Slot)', badge: '3 Slot Sınırsız', isPopular: false, shopierUrl: 'https://www.shopier.com/SyntaxSoftware/51033513' }
    ],
    functions: [
      'No Restart Required — Bilgisayarı yeniden başlatma GEREKMEZ',
      'No Permanent System Changes — Kalıcı sistem değişikliği yapmaz',
      'No Reinstall or BIOS Flash Needed — Format veya BIOS güncellemesi GEREKMEZ',
      'Bypasses Common Errors: VAN 102, VAL 5, VAN 79, VAN 152, VAN 1067',
      'No Temporary Ban Issues — Geçici ban sorunlarını ve VAN102 hatalarını engeller',
      'TPM / Secure Boot / HVCI Bypass — Yeni nesil güvenlik gereksinimlerini atlar',
      'Hem Valorant hem League of Legends Vanguard sistemini destekler'
    ],
    specs: {
      'İşletim Sistemi': 'Win 10 Support (Tüm Derlemeler)',
      'Donanım': 'All CPU & GPU Support, All Motherboard Support',
      'Sistem Ayarları': 'Hvci On/Off, Tpm On/Off, Secure Boot On/Off',
      'Oyun Desteği': 'Valorant & League of Legends Vanguard'
    }
  }
};

function initProductDetailModal() {
  let modal = document.getElementById('syntaxProductDetailModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'syntaxProductDetailModal';
    modal.className = 'product-detail-modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="product-detail-modal-box">
        <div class="product-detail-header" id="prodDetailHeader"></div>
        <div class="product-detail-body-scroll" id="prodDetailBody"></div>
        <div class="product-detail-footer" id="prodDetailFooter"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const headerEl = document.getElementById('prodDetailHeader');
  const bodyEl = document.getElementById('prodDetailBody');
  const footerEl = document.getElementById('prodDetailFooter');

  let currentProd = null;
  let selectedPlan = null;

  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  function openDetail(productId) {
    const prod = PRODUCTS_DETAIL[productId];
    if (!prod) return;
    currentProd = prod;
    selectedPlan = prod.pricing[0]; // Default to first plan

    // Render Header
    headerEl.innerHTML = `
      <button class="detail-modal-close" id="detailCloseBtn" aria-label="Kapat" title="Kapat">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      <div class="detail-top-badges">
        ${prod.badges.map(b => `<span style="background:${b.bg}; color:${b.color || '#fff'}; border:${b.border ? '1px solid ' + b.border : 'none'}; font-size:0.75rem; font-weight:800; padding:0.25rem 0.65rem; border-radius:999px;">${b.text}</span>`).join('')}
      </div>
      <div class="detail-modal-category">${prod.category}</div>
      <h2 class="detail-modal-title">${prod.title}</h2>
      <div class="detail-modal-tagline">${prod.tagline}</div>
    `;

    document.getElementById('detailCloseBtn')?.addEventListener('click', closeModal);

    // Render Body: 1. Kaç gün kaç fiyat 2. Specs 3. Functions
    bodyEl.innerHTML = `
      <!-- 1. KAÇ GÜN KAÇ FİYAT (DURATION & PRICING SELECTOR) -->
      <div>
        <div class="detail-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span>Süre ve Fiyat Seçenekleri ("Kaç Gün Kaç Fiyat")</span>
        </div>
        <div class="detail-pricing-grid" id="detailPricingGrid">
          ${prod.pricing.map((plan, idx) => `
            <div class="detail-price-card ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
              ${plan.badge ? `<div class="detail-card-badge">${plan.badge}</div>` : ''}
              <div class="detail-card-duration">${plan.duration}</div>
              <div class="detail-card-price">${plan.priceStr}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 2. TEKNİK ÖZELLİKLER & SİSTEM UYUMLULUĞU -->
      <div>
        <div class="detail-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          <span>Teknik Uyumluluk & Sistem Gereksinimleri</span>
        </div>
        <div class="detail-specs-grid">
          ${Object.entries(prod.specs).map(([lbl, val]) => `
            <div class="detail-spec-item">
              <span class="detail-spec-label">${lbl}</span>
              <span class="detail-spec-val">${val}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 3. DETAYLI FONKSİYON LİSTESİ -->
      <div>
        <div class="detail-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>Tüm Özellikler ve Koruma Detayları</span>
        </div>
        <div class="detail-features-list">
          ${prod.functions.map(f => `
            <div class="detail-feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>${f}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Pricing card click handlers
    bodyEl.querySelectorAll('.detail-price-card').forEach(card => {
      card.addEventListener('click', () => {
        bodyEl.querySelectorAll('.detail-price-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const idx = parseInt(card.dataset.idx);
        selectedPlan = prod.pricing[idx];
        renderFooter();
      });
    });

    renderFooter();

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function renderFooter() {
    if (!currentProd || !selectedPlan) return;

    if (currentProd.isSoon) {
      footerEl.innerHTML = `
        <div class="detail-footer-price-wrap">
          <span class="detail-footer-price-val" style="color:#f59e0b;">Yakında Aktif</span>
          <span class="detail-footer-period-val">/ Geliştirme Sürüyor</span>
        </div>
        <a href="https://discord.gg/wFaNxzyMU" target="_blank" class="btn-detail-purchase-main" style="text-decoration:none; background:#f59e0b; color:#0b0e17;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
          <span>Discord'dan Takip Et</span>
        </a>
      `;
      return;
    }

    const targetShopier = selectedPlan.shopierUrl || 'https://www.shopier.com/SyntaxSoftware';
    footerEl.innerHTML = `
      <div class="detail-footer-price-wrap">
        <span class="detail-footer-price-val">${selectedPlan.priceStr}</span>
        <span class="detail-footer-period-val">${selectedPlan.period}</span>
      </div>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
        <button type="button" class="cart-shopier-link btn-modal-open-shopier" style="padding:0.6rem 0.9rem; font-size:0.82rem; font-weight:800; border-radius:8px; cursor:pointer; border:1px solid rgba(249, 115, 22, 0.4);">
          <span>Shopier'da Aç ↗</span>
        </button>
        <button class="btn-detail-purchase-main" id="btnModalPurchase">
          <span>Sepete Ekle / Satın Al</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </button>
      </div>
    `;

    footerEl.querySelector('.btn-modal-open-shopier')?.addEventListener('click', () => {
      closeModal();
      if (typeof window.openShopierModal === 'function') {
        window.openShopierModal({
          title: `${currentProd.title} (${selectedPlan.duration})`,
          url: targetShopier,
          price: selectedPlan.priceStr
        });
      } else {
        window.open(targetShopier, '_blank');
      }
    });

    document.getElementById('btnModalPurchase')?.addEventListener('click', () => {
      closeModal();
      // Add to cart via global window method or trigger
      if (typeof window.syntaxAddToCart === 'function') {
        window.syntaxAddToCart({
          title: currentProd.title,
          category: currentProd.category,
          priceStr: selectedPlan.priceStr,
          priceNum: selectedPlan.priceNum,
          currency: selectedPlan.currency,
          period: selectedPlan.period,
          shopierUrl: selectedPlan.shopierUrl,
          qty: 1
        });
      } else {
        // Fallback simulate buy button click on card
        const card = document.querySelector(`.product-card-wrap[data-product-id="${currentProd.id}"]`);
        if (card) {
          const priceEl = card.querySelector('.product-price');
          if (priceEl) priceEl.innerHTML = `${selectedPlan.priceStr} <span>${selectedPlan.period}</span>`;
          const buy = card.querySelector('.btn-buy-card');
          if (buy) buy.click();
        }
      }
    });
  }

  // Hook all card clicks to open detail modal
  document.querySelectorAll('.product-card-wrap[data-product-id]').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't trigger if clicked on buy button or plan chips
      if (e.target.closest('.btn-buy-card') || e.target.closest('.plan-chip')) return;
      const pid = card.dataset.productId;
      if (pid) openDetail(pid);
    });
  });

  // Expose helper globally
  window.openProductDetail = openDetail;
}


document.addEventListener('DOMContentLoaded', () => {
  initDynamicGameBackground();
  initStarfield();
  initMobileNav();
  setActiveNavLink();
  initCheatPanel();
  initStoreAndStatusFilters();
  initCartAndQuickActions();
  initCrispChat();
  initLanguageDropdown();
  initQuickSearchModal();
  initProductDetailModal();
  initAuthAndUserPanel();
});

/* ==========================================================================
   1. CANVAS STARFIELD WITH PARALLAX & TWINKLE
   ========================================================================== */
function initStarfield() {
  const canvas = document.querySelector('.stars-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const starCount = Math.floor((width * height) / 8000);
  const stars = [];

  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.4,
      alpha: Math.random() * 0.8 + 0.2,
      baseAlpha: Math.random() * 0.7 + 0.2,
      speed: Math.random() * 0.02 + 0.005,
      twinkleSpeed: Math.random() * 0.03 + 0.01,
      phase: Math.random() * Math.PI * 2,
    });
  }

  function render(time) {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.phase += s.twinkleSpeed;
      const currentAlpha = s.baseAlpha + Math.sin(s.phase) * 0.3;

      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, Math.min(1, currentAlpha))})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();

      // Subtle glow on larger stars
      if (s.size > 1.4) {
        ctx.fillStyle = `rgba(168, 85, 247, ${currentAlpha * 0.35})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });
}

/* ==========================================================================
   2. MOBILE NAVIGATION DRAWER
   ========================================================================== */
function initMobileNav() {
  const toggleBtn = document.querySelector('.mobile-toggle');
  const drawer = document.querySelector('.mobile-drawer');
  if (!toggleBtn || !drawer) return;

  toggleBtn.addEventListener('click', () => {
    drawer.classList.toggle('open');
    const isOpen = drawer.classList.contains('open');
    toggleBtn.innerHTML = isOpen 
      ? '<i data-lucide="x" style="width:24px;height:24px;"></i>' 
      : '<i data-lucide="menu" style="width:24px;height:24px;"></i>';
    if (window.lucide) window.lucide.createIcons();
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!drawer.contains(e.target) && !toggleBtn.contains(e.target) && drawer.classList.contains('open')) {
      drawer.classList.remove('open');
      toggleBtn.innerHTML = '<i data-lucide="menu" style="width:24px;height:24px;"></i>';
      if (window.lucide) window.lucide.createIcons();
    }
  });
}

/* ==========================================================================
   3. ACTIVE NAV LINK HIGHLIGHTER
   ========================================================================== */
function setActiveNavLink() {
  const path = window.location.pathname.toLowerCase();
  const currentFile = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

  document.querySelectorAll('.nav-link, .mobile-drawer .nav-link').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    const linkFile = href.substring(href.lastIndexOf('/') + 1);

    if (linkFile === currentFile || (currentFile === '' && linkFile === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/* ==========================================================================
   4. FULLY INTERACTIVE CHEAT PANEL (8 TABS + SLIDERS + CHECKBOXES + KEYBINDS)
   ========================================================================== */
function initCheatPanel() {
  const panel = document.getElementById('cheatControlPanel');
  if (!panel) return;

  const mainTabButtons = panel.querySelectorAll('.panel-tab-btn');
  const subTabButtons = panel.querySelectorAll('.panel-subtab-btn');
  const allTabContents = panel.querySelectorAll('.panel-tab-content');

  // Activate a specific tab key
  function switchTab(tabKey, isSubTab = false) {
    // Content switching
    allTabContents.forEach((c) => {
      if (c.dataset.panelContent === tabKey) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });

    // Button states
    if (!isSubTab) {
      mainTabButtons.forEach((b) => {
        b.classList.toggle('active', b.dataset.panelTab === tabKey);
      });
      subTabButtons.forEach((b) => b.classList.remove('active'));
    } else {
      subTabButtons.forEach((b) => {
        b.classList.toggle('active', b.dataset.panelTab === tabKey);
      });
      mainTabButtons.forEach((b) => b.classList.remove('active'));
    }
  }

  mainTabButtons.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.panelTab, false));
  });

  subTabButtons.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.panelTab, true));
  });

  // Checkboxes
  panel.querySelectorAll('.cyber-checkbox-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      item.classList.toggle('checked');

      // Subtle scale pulse
      const square = item.querySelector('.custom-cb-square');
      if (square) {
        square.style.transform = 'scale(1.25)';
        setTimeout(() => (square.style.transform = 'scale(1)'), 150);
      }
    });
  });

  // Sliders with live value badges and gradient fill
  panel.querySelectorAll('.cyber-slider').forEach((slider) => {
    const updateSlider = () => {
      const min = parseFloat(slider.min) || 0;
      const max = parseFloat(slider.max) || 100;
      const val = parseFloat(slider.value);
      const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));

      const activeColor = document.body.classList.contains('theme-cs2') ? '#f59e0b' : (document.body.classList.contains('theme-bw') ? '#ffffff' : '#a855f7');
      slider.style.background = `linear-gradient(to right, ${activeColor} 0%, ${activeColor} ${pct}%, #1f2438 ${pct}%, #1f2438 100%)`;

      // Update badge if present
      const valId = slider.dataset.valTarget;
      if (valId) {
        const badge = document.getElementById(valId);
        if (badge) {
          badge.textContent = val.toFixed(1);
        }
      }
    };

    slider.addEventListener('input', updateSlider);
    // Initial run
    updateSlider();
  });

  // Interactive Keybind Buttons
  panel.querySelectorAll('.keybind-trigger-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const originalText = btn.textContent;
      btn.textContent = 'Tuşa bas...';
      btn.style.borderColor = '#a855f7';
      btn.style.color = '#a855f7';

      const keyHandler = (e) => {
        e.preventDefault();
        let keyName = e.key.toUpperCase();
        if (keyName === ' ') keyName = 'SPACE';
        if (keyName === 'ESCAPE') keyName = originalText;

        btn.textContent = keyName;
        btn.style.borderColor = '';
        btn.style.color = '';
        window.removeEventListener('keydown', keyHandler);
      };

      window.addEventListener('keydown', keyHandler, { once: true });
    });
  });
}

/* ==========================================================================
   5. STORE & STATUS PAGE FILTERING & SEARCH & SORTING
   ========================================================================== */
function initStoreAndStatusFilters() {
  // Store Search & Category Filter & Sorting
  const storeSearch = document.getElementById('storeSearchInput');
  const storeSortSelect = document.getElementById('storeSortSelect') || document.querySelector('.sort-select');
  const storeFilterPills = document.querySelectorAll('.filter-pill[data-category-filter]');
  const storeCards = document.querySelectorAll('.product-card-wrap');
  const storeCountText = document.getElementById('storeVisibleCount');
  const productsGrid = document.querySelector('.products-display-grid');

  // Tag each card with its initial DOM order for recommended sort
  storeCards.forEach((card, idx) => {
    card.dataset.originalOrder = idx;
  });

  function getCardPriceValue(card) {
    const priceEl = card.querySelector('.product-price');
    if (!priceEl) return 0;
    const text = priceEl.childNodes[0]?.textContent?.trim() || priceEl.textContent;
    if (text.includes('$')) {
      const val = parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
      return val * 36; // Normalize USD to TRY for cross-currency price sorting
    }
    return parseFloat(text.replace(/[^0-9.]/g, '').replace('.', '')) || 0;
  }

  function getCardPopularityValue(card) {
    const title = (card.querySelector('.product-card-title')?.textContent || '').toLowerCase();
    const badge = (card.querySelector('.product-badges-layer')?.textContent || '').toLowerCase();
    let score = 0;
    if (badge.includes('ekip') || badge.includes('öneri') || badge.includes('staff')) score += 100;
    if (badge.includes('slotted') || title.includes('slotted')) score += 80;
    if (title.includes('spoofer') || title.includes('emulator')) score += 60;
    if (title.includes('cs') || title.includes('valorant')) score += 40;
    return score;
  }

  function sortStoreCards() {
    if (!productsGrid || !storeCards.length) return;
    const sortVal = (storeSortSelect?.value || '').toLowerCase();
    const cardsArr = Array.from(storeCards);

    cardsArr.sort((a, b) => {
      if (sortVal === 'price-asc' || sortVal.includes('artan') || sortVal.includes('low')) {
        return getCardPriceValue(a) - getCardPriceValue(b);
      } else if (sortVal === 'price-desc' || sortVal.includes('azalan') || sortVal.includes('high')) {
        return getCardPriceValue(b) - getCardPriceValue(a);
      } else if (sortVal === 'bestseller' || sortVal.includes('satan') || sortVal.includes('hit')) {
        return getCardPopularityValue(b) - getCardPopularityValue(a);
      } else {
        return parseInt(a.dataset.originalOrder || 0) - parseInt(b.dataset.originalOrder || 0);
      }
    });

    cardsArr.forEach(c => productsGrid.appendChild(c));
  }

  function filterStore() {
    if (!storeCards.length) return;
    const query = (storeSearch?.value || '').toLowerCase().trim();
    const activePill = document.querySelector('.filter-pill.active[data-category-filter]');
    const category = activePill ? activePill.dataset.categoryFilter : 'all';

    let visibleCount = 0;

    storeCards.forEach((card) => {
      const cardCategory = card.dataset.category || '';
      const title = (card.querySelector('.product-card-title')?.textContent || '').toLowerCase();
      const catText = (card.querySelector('.product-card-category')?.textContent || '').toLowerCase();

      const matchesCat = category === 'all' || cardCategory === category;
      const matchesSearch = query === '' || title.includes(query) || catText.includes(query);

      if (matchesCat && matchesSearch) {
        card.style.display = '';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    if (storeCountText) {
      const activeLang = localStorage.getItem('syntax_software_lang') || 'tr';
      const cWord = (LANG_DATA[activeLang] && LANG_DATA[activeLang].countWord) || 'ürün';
      storeCountText.textContent = `${visibleCount} ${cWord}`;
    }
  }

  if (storeSearch) {
    storeSearch.addEventListener('input', filterStore);
  }

  if (storeSortSelect) {
    storeSortSelect.addEventListener('change', () => {
      sortStoreCards();
      filterStore();
    });
  }

  storeFilterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      storeFilterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      filterStore();
    });
  });

  // Initial sort and filter
  sortStoreCards();
  filterStore();

  // Status Page Filter
  const statusFilterPills = document.querySelectorAll('.filter-pill[data-status-filter]');
  const statusCards = document.querySelectorAll('.status-card-box');

  statusFilterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      statusFilterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');

      const filter = pill.dataset.statusFilter;
      statusCards.forEach((card) => {
        const cat = card.dataset.category;
        const isDiscord = card.dataset.discord === 'true';
        if (filter === 'all') {
          card.style.display = '';
        } else if (filter === 'discord') {
          card.style.display = isDiscord ? '' : 'none';
        } else if (cat === filter) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // URL Query Param Filtering support (?cat=valorant or ?cat=cs2)
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get('cat');
  if (catParam) {
    const storePill = document.querySelector(`.filter-pill[data-category-filter="${catParam}"]`);
    if (storePill) {
      storeFilterPills.forEach((p) => p.classList.remove('active'));
      storePill.classList.add('active');
      filterStore();
    }
    const statusPill = document.querySelector(`.filter-pill[data-status-filter="${catParam}"]`);
    if (statusPill) {
      statusFilterPills.forEach((p) => p.classList.remove('active'));
      statusPill.classList.add('active');
      statusCards.forEach((card) => {
        const cat = card.dataset.category;
        card.style.display = (catParam === 'all' || cat === catParam) ? '' : 'none';
      });
    }
  }

  // Discord Status live timestamp
  const discordTimeEl = document.getElementById('discordStatusTime');
  if (discordTimeEl) {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const activeLang = localStorage.getItem('syntax_software_lang') || 'tr';
    const wordMap = { tr: 'Bugün', en: 'Today at', de: 'Heute um', ru: 'Сегодня в' };
    const todayWord = wordMap[activeLang] || 'Bugün';
    discordTimeEl.textContent = `${todayWord} ${h}:${m}`;
  }
}

/* ==========================================================================
   6. INTERACTIVE CART & MULTI-GATEWAY CHECKOUT ENGINE (Shopier, IBAN)
   ========================================================================== */
function initCartAndCheckout() {
  const CART_STORAGE_KEY = 'syntax_software_cart_items';
  let activeStep = 'cart'; // 'cart', 'checkout', 'success'
  let activePaymentTab = 'shopier'; // 'shopier', 'iban'
  let currentOrderData = null;

  // Wallet and Bank info constants
  const SHOPIER_STORE_URL = 'https://www.shopier.com/SyntaxSoftware';
  const SHOPIER_PRODUCT_LINKS = {
    // Valorant External
    'valorant-external-1day': 'https://www.shopier.com/SyntaxSoftware/51033801',
    'valorant-external-7day': 'https://www.shopier.com/SyntaxSoftware/51033813',
    'valorant-external-30day': 'https://www.shopier.com/SyntaxSoftware/51033829',
    
    // Valorant Internal
    'valorant-internal-1day': 'https://www.shopier.com/SyntaxSoftware/51033733',
    'valorant-internal-7day': 'https://www.shopier.com/SyntaxSoftware/51033741',
    'valorant-internal-30day': 'https://www.shopier.com/SyntaxSoftware/51033768',

    // Temp Spoofer
    'temp-spoofer-onetime': 'https://www.shopier.com/SyntaxSoftware/51033675',
    'temp-spoofer-lifetime': 'https://www.shopier.com/SyntaxSoftware/51033682',

    // Perm Spoofer
    'perm-spoofer-onetime': 'https://www.shopier.com/SyntaxSoftware/51033588',
    'perm-spoofer-lifetime': 'https://www.shopier.com/SyntaxSoftware/51033601',

    // Vanguard Emulator
    'vanguard-emulator-3day': 'https://www.shopier.com/SyntaxSoftware/51033462',
    'vanguard-emulator-7day': 'https://www.shopier.com/SyntaxSoftware/51033489',
    'vanguard-emulator-30day': 'https://www.shopier.com/SyntaxSoftware/51033505',
    'vanguard-emulator-lifetime': 'https://www.shopier.com/SyntaxSoftware/51033513',

    // CS Kernel
    'cs-kernel-1day': 'https://www.shopier.com/SyntaxSoftware/51032742',
    'cs-kernel-3day': 'https://www.shopier.com/SyntaxSoftware/51033189',
    'cs-kernel-7day': 'https://www.shopier.com/SyntaxSoftware/51033280',
    'cs-kernel-30day': 'https://www.shopier.com/SyntaxSoftware/51033317'
  };

  function resolveShopierUrl(item) {
    if (!item) return SHOPIER_STORE_URL;
    if (item.shopierUrl && typeof item.shopierUrl === 'string' && item.shopierUrl.startsWith('http')) {
      return item.shopierUrl;
    }

    const title = (item.title || '').toLowerCase();
    const period = (item.period || item.duration || '').toLowerCase();
    const priceNum = item.priceNum || 0;

    // Valorant External
    if (title.includes('external')) {
      if (period.includes('30') || period.includes('ay') || period.includes('month') || priceNum >= 3000) {
        return SHOPIER_PRODUCT_LINKS['valorant-external-30day'];
      }
      if (period.includes('7') || period.includes('hafta') || period.includes('week') || priceNum >= 2000) {
        return SHOPIER_PRODUCT_LINKS['valorant-external-7day'];
      }
      return SHOPIER_PRODUCT_LINKS['valorant-external-1day'];
    }

    // Valorant Internal
    if (title.includes('internal')) {
      if (period.includes('30') || period.includes('ay') || period.includes('month') || priceNum >= 2000) {
        return SHOPIER_PRODUCT_LINKS['valorant-internal-30day'];
      }
      if (period.includes('7') || period.includes('hafta') || period.includes('week') || priceNum >= 1300) {
        return SHOPIER_PRODUCT_LINKS['valorant-internal-7day'];
      }
      return SHOPIER_PRODUCT_LINKS['valorant-internal-1day'];
    }

    // Temp Spoofer
    if (title.includes('temp') || title.includes('geçici')) {
      if (period.includes('lifetime') || period.includes('sınırsız') || priceNum >= 1900) {
        return SHOPIER_PRODUCT_LINKS['temp-spoofer-lifetime'];
      }
      return SHOPIER_PRODUCT_LINKS['temp-spoofer-onetime'];
    }

    // Perm Spoofer
    if (title.includes('perm') || title.includes('kalıcı')) {
      if (period.includes('lifetime') || period.includes('sınırsız') || priceNum >= 2500) {
        return SHOPIER_PRODUCT_LINKS['perm-spoofer-lifetime'];
      }
      return SHOPIER_PRODUCT_LINKS['perm-spoofer-onetime'];
    }

    // Vanguard Emulator
    if (title.includes('vanguard') || title.includes('emulator') || title.includes('emu')) {
      if (period.includes('lifetime') || period.includes('sınırsız') || priceNum >= 15000 || priceNum >= 350) {
        return SHOPIER_PRODUCT_LINKS['vanguard-emulator-lifetime'];
      }
      if (period.includes('30') || period.includes('month') || priceNum >= 9000 || priceNum >= 180) {
        return SHOPIER_PRODUCT_LINKS['vanguard-emulator-30day'];
      }
      if (period.includes('7') || period.includes('week') || period.includes('hafta') || priceNum >= 3000 || priceNum >= 60) {
        return SHOPIER_PRODUCT_LINKS['vanguard-emulator-7day'];
      }
      return SHOPIER_PRODUCT_LINKS['vanguard-emulator-3day'];
    }

    // CS Kernel
    if (title.includes('cs') || title.includes('kernel')) {
      if (period.includes('30') || period.includes('ay') || priceNum >= 2300) {
        return SHOPIER_PRODUCT_LINKS['cs-kernel-30day'];
      }
      if (period.includes('7') || period.includes('hafta') || priceNum >= 1500) {
        return SHOPIER_PRODUCT_LINKS['cs-kernel-7day'];
      }
      if (period.includes('3') || priceNum >= 1000) {
        return SHOPIER_PRODUCT_LINKS['cs-kernel-3day'];
      }
      return SHOPIER_PRODUCT_LINKS['cs-kernel-1day'];
    }

    // OneClick Spoofer
    if (title.includes('oneclick') || (item.id && item.id.includes('oneclick'))) {
      if (item.shopierUrl && typeof item.shopierUrl === 'string' && item.shopierUrl.startsWith('http')) {
        return item.shopierUrl;
      }
      return SHOPIER_STORE_URL;
    }

    return SHOPIER_STORE_URL;
  }

  const PAYMENT_INFO = {
    shopier: {
      merchantName: 'Syntax Software Bilişim Hizmetleri',
      storeUrl: SHOPIER_STORE_URL,
      whatsapp: '+90 534 646 08 21',
      discord: 'https://discord.gg/wFaNxzyMU'
    },
    iban: {
      bank: 'Ziraat Bankası & Papara',
      recipient: 'Syntax Software Bilişim Hizmetleri',
      iban: 'TR68 0001 0002 0003 0004 0005 01',
      whatsapp: '905346460821',
      discord: 'https://discord.gg/wFaNxzyMU'
    }
  };

  // Helper: Cart Storage
  function getCart() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function saveCart(items) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    updateCartBadges();
  }

  function getCartTotals() {
    const items = getCart();
    let totalTRY = 0;
    let totalUSD = 0;
    let hasUSD = false;
    let hasTRY = false;
    let count = 0;

    items.forEach(item => {
      count += item.qty;
      if (item.currency === '$') {
        totalUSD += item.priceNum * item.qty;
        hasUSD = true;
      } else {
        totalTRY += item.priceNum * item.qty;
        hasTRY = true;
      }
    });

    let displayTotal = '';
    if (hasTRY && hasUSD) {
      displayTotal = `₺${totalTRY.toLocaleString('tr-TR')} + $${totalUSD.toFixed(2)}`;
    } else if (hasUSD) {
      displayTotal = `$${totalUSD.toFixed(2)}`;
    } else {
      displayTotal = `₺${totalTRY.toLocaleString('tr-TR')}`;
    }

    return { totalTRY, totalUSD, displayTotal, count, items };
  }

  function updateCartBadges() {
    const { count } = getCartTotals();
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;
      el.style.transform = 'scale(1.25)';
      setTimeout(() => (el.style.transform = 'scale(1)'), 180);
    });
    const drawerBadge = document.getElementById('cartDrawerCount');
    if (drawerBadge) drawerBadge.textContent = count;
  }

  // Inject Modal Backdrop & Drawer
  let modal = document.getElementById('syntaxCartModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'syntaxCartModal';
    modal.className = 'cart-modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="cart-drawer-panel">
        <!-- Drawer Header -->
        <div class="cart-header">
          <div class="cart-header-title-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <span class="cart-header-title" id="cartHeaderTitle">Alışveriş Sepeti</span>
            <span class="cart-count-pill" id="cartDrawerCount">0</span>
          </div>
          <button class="cart-close-btn" id="cartCloseBtn" aria-label="Kapat" title="Kapat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <!-- Scrollable Drawer Body -->
        <div class="cart-body-scroll" id="cartDrawerBody"></div>

        <!-- Drawer Footer -->
        <div class="cart-footer" id="cartDrawerFooter"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const drawerBody = document.getElementById('cartDrawerBody');
  const drawerFooter = document.getElementById('cartDrawerFooter');
  const drawerHeaderTitle = document.getElementById('cartHeaderTitle');
  const closeBtn = document.getElementById('cartCloseBtn');

  // Open & Close
  function openCart(step = 'cart') {
    if (step === 'checkout') {
      let curUser = null;
      try {
        curUser = JSON.parse(localStorage.getItem('syntax_current_user_v3'));
      } catch (e) {}

      if (!curUser) {
        showToast('Satın alım yapabilmek için lütfen önce üye girişi yapınız!', 'alert-circle');
        if (typeof window.openAuthModal === 'function') {
          window.openAuthModal('user');
        }
        return;
      }
    }
    activeStep = step;
    renderDrawer();
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', closeCart);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeCart();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeCart();
  });

  // Global Cart Open Buttons (navbar and everywhere)
  window.openCart = openCart;
  document.querySelectorAll('#navCartBtn, .btn-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openCart('cart');
    });
  });

  // Render Views
  function renderDrawer() {
    const { items, displayTotal, count } = getCartTotals();
    const activeLang = localStorage.getItem('syntax_software_lang') || 'tr';

    if (activeStep === 'cart') {
      drawerHeaderTitle.textContent = 'Alışveriş Sepeti';
      if (items.length === 0) {
        drawerBody.innerHTML = `
          <div class="cart-empty-state">
            <div class="cart-empty-icon">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            </div>
            <div class="cart-empty-title">Sepetiniz Boş</div>
            <div class="cart-empty-desc">Henüz sepetinize bir ürün eklemediniz. Avantajlı paketlerimizi inceleyin.</div>
            <a href="magaza.html" class="btn-cart-checkout-proceed" style="text-decoration:none; margin-top:0.75rem; width:auto; padding:0.75rem 1.75rem; font-size:0.9rem;">Ürünleri İncele</a>
          </div>
        `;
        drawerFooter.style.display = 'none';
      } else {
        drawerFooter.style.display = 'flex';
        let itemsHtml = '';
        items.forEach(item => {
          itemsHtml += `
            <div class="cart-item-card" data-id="${item.id}">
              <div class="cart-item-thumb">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
              </div>
              <div class="cart-item-details">
                <div class="cart-item-cat">${escapeHtml(item.category || 'Syntax Software')}</div>
                <div class="cart-item-name">${escapeHtml(item.title)} <span style="font-size:0.75rem; color:#a855f7; font-weight:600;">(${escapeHtml(item.period || '')})</span></div>
                <div class="cart-item-price">${escapeHtml(item.priceStr)}</div>
                <a href="${resolveShopierUrl(item)}" target="_blank" class="cart-shopier-link" title="Shopier'da doğrudan ürün sayfasına git">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                  <span>Shopier Sayfası ↗</span>
                </a>
              </div>
              <div class="cart-item-actions">
                <div class="cart-qty-stepper">
                  <button class="cart-qty-btn btn-qty-minus" data-id="${item.id}" title="Azalt">−</button>
                  <span class="cart-qty-num">${item.qty}</span>
                  <button class="cart-qty-btn btn-qty-plus" data-id="${item.id}" title="Artır">+</button>
                </div>
                <button class="cart-remove-btn btn-item-remove" data-id="${item.id}" title="Kaldır">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
          `;
        });
        drawerBody.innerHTML = itemsHtml;

        drawerFooter.innerHTML = `
          <div class="cart-summary-row">
            <span class="cart-summary-label">Ara Toplam</span>
            <span class="cart-summary-val">${displayTotal}</span>
          </div>
          <div class="cart-summary-row">
            <span class="cart-summary-label">Teslimat Şekli</span>
            <span class="cart-summary-val" style="color:#10b981;">Otomatik / Anında</span>
          </div>
          <div class="cart-summary-row" style="margin-top:-0.3rem;">
            <span class="cart-summary-total">Genel Toplam</span>
            <span class="cart-summary-total-val">${displayTotal}</span>
          </div>
          <button class="btn-cart-checkout-proceed" id="btnGoToCheckout">
            <span>Ödemeye Geç</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
          <div class="cart-trust-badges">
            <div class="cart-trust-item" style="color:#10b981; font-weight:700;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>WhatsApp & Discord Teslimat</span>
            </div>
            <div class="cart-trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <span>Shopier 3D Secure</span>
            </div>
            <div class="cart-trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              <span>7/24 Canlı Destek</span>
            </div>
          </div>
        `;

        // Wire Steppers and Remove buttons
        drawerBody.querySelectorAll('.btn-qty-minus').forEach(btn => {
          btn.addEventListener('click', () => updateItemQty(btn.dataset.id, -1));
        });
        drawerBody.querySelectorAll('.btn-qty-plus').forEach(btn => {
          btn.addEventListener('click', () => updateItemQty(btn.dataset.id, 1));
        });
        drawerBody.querySelectorAll('.btn-item-remove').forEach(btn => {
          btn.addEventListener('click', () => removeItem(btn.dataset.id));
        });

        // Wire Checkout Proceed Button (Require Login)
        const btnGo = document.getElementById('btnGoToCheckout');
        if (btnGo) {
          btnGo.addEventListener('click', () => {
            let curUser = null;
            try {
              curUser = JSON.parse(localStorage.getItem('syntax_current_user_v3'));
            } catch (e) {}

            if (!curUser) {
              showToast('Satın alım yapabilmek için lütfen önce üye girişi yapınız veya hesap oluşturunuz!', 'alert-circle');
              closeCart();
              if (typeof window.openAuthModal === 'function') {
                window.openAuthModal('user');
              }
              return;
            }

            activeStep = 'checkout';
            renderDrawer();
          });
        }
      }
    } else if (activeStep === 'checkout') {
      drawerHeaderTitle.textContent = 'Ödeme & Teslimat';
      drawerFooter.style.display = 'none';

      // Generate or retrieve persistent order reference for IBAN
      const orderRef = currentOrderData ? currentOrderData.orderId : ('SYN-' + Math.floor(10000 + Math.random() * 90000));
      if (!currentOrderData) {
        currentOrderData = { orderId: orderRef };
      }

      // Check current logged in user to prefill info
      let curUser = null;
      try {
        curUser = JSON.parse(localStorage.getItem('syntax_current_user_v3'));
      } catch (e) {}

      const defaultName = curUser ? (curUser.fullName || curUser.username || '') : '';
      const defaultEmail = curUser ? (curUser.email || '') : '';
      const defaultPhone = curUser ? (curUser.phone || '') : '';

      drawerBody.innerHTML = `
        <button class="checkout-back-btn" id="btnBackToCart">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          <span>Sepete Dön</span>
        </button>

        <div style="background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 10px; padding: 0.85rem 1rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <div>
            <div style="font-size:0.75rem; color:#9ca3af; text-transform:uppercase;">Ödenecek Tutar</div>
            <div style="font-size:1.25rem; font-weight:800; color:#2dd4bf;">${displayTotal}</div>
          </div>
          <div style="font-size:0.8rem; color:#d8b4fe; font-weight:700;">${count} Adet Ürün</div>
        </div>

        <!-- 2 Payment Method Tabs -->
        <div class="payment-methods-grid">
          <div class="payment-method-tab ${activePaymentTab === 'shopier' ? 'active' : ''}" data-pay="shopier">
            <div class="payment-method-icon" style="background:rgba(234, 88, 12, 0.15); color:#f97316;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            </div>
            <div class="payment-method-name">Shopier</div>
            <div class="payment-method-sub">Kredi / Banka (3D Secure)</div>
          </div>

          <div class="payment-method-tab ${activePaymentTab === 'iban' ? 'active' : ''}" data-pay="iban">
            <div class="payment-method-icon" style="background:rgba(37, 211, 102, 0.15); color:#25d366;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.93 11.93 0 0 0 12.04 0C5.43 0 .07 5.37.07 11.98c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.63a11.96 11.96 0 0 0 5.84 1.51h.01c6.61 0 11.97-5.36 11.97-11.98 0-3.2-.1.25-1.25-1.46-3.41zM12.05 21.9h-.01a9.92 9.92 0 0 1-5.06-1.39l-.36-.22-3.76.99 1-3.66-.24-.38a9.94 9.94 0 0 1-1.53-5.26c0-5.49 4.47-9.96 9.97-9.96 2.66 0 5.16 1.04 7.04 2.92a9.92 9.92 0 0 1 2.92 7.04c0 5.5-4.47 9.96-9.97 9.96zm5.46-7.46c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.95 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.18-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.93-2.25-.25-.6-.5-.52-.68-.53l-.58-.01c-.2 0-.53.08-.8.38-.28.3-1.06 1.04-1.06 2.54s1.09 2.95 1.24 3.15c.15.2 2.14 3.27 5.19 4.58.73.31 1.29.5 1.73.64.73.23 1.39.2 1.92.12.59-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.12-.28-.2-.58-.35z"/></svg>
            </div>
            <div class="payment-method-name">WhatsApp & Discord</div>
            <div class="payment-method-sub">Doğrudan İletişim & Sipariş</div>
          </div>
        </div>

        <!-- Tab 1: Shopier View -->
        <div id="tabContentShopier" style="display: ${activePaymentTab === 'shopier' ? 'block' : 'none'};">
          <div class="payment-detail-card">
            <div class="payment-detail-header">
              <div class="payment-detail-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                <span>Shopier Güvenli Ödeme Portalı</span>
              </div>
              <span class="payment-badge-pill" style="background:#f97316; color:#fff;">3D SECURE</span>
            </div>

            <!-- Delivery Warning Banner (No Emojis) -->
            <div class="delivery-exclusive-box">
              <svg class="delivery-exclusive-icon" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
              <div>
                <div class="delivery-exclusive-title">Ürün Teslimatı Yalnızca WhatsApp & Discord Üzerindendir</div>
                <div class="delivery-exclusive-desc">
                  Shopier üzerinden ödemenizi tamamladıktan sonra sipariş numaranızı giriniz. Lisans anahtarınız ve indirme bağlantınız <strong>yalnızca resmi WhatsApp destek hattımız veya Discord sunucumuz üzerinden</strong> Kurucu (Owner) onayıyla teslim edilir.
                </div>
              </div>
            </div>

            <!-- Step 1: Open Shopier Product -->
            <div style="background: rgba(249, 115, 22, 0.08); border: 1px solid rgba(249, 115, 22, 0.25); border-radius: 10px; padding: 0.85rem 1rem; margin-bottom: 1rem;">
              <div style="font-size: 0.74rem; color: #fdba74; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; margin-bottom: 0.4rem;">
                1. Adım: Shopier'dan Satın Alın
              </div>
              ${items.map(it => {
                const sUrl = resolveShopierUrl(it);
                return `
                  <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; padding: 0.4rem 0;">
                    <div>
                      <div style="font-size: 0.88rem; font-weight: 800; color: #fff;">${escapeHtml(it.title)} <span style="font-size:0.75rem; color:#a855f7; font-weight:600;">(${escapeHtml(it.period || '')})</span></div>
                      <div style="font-size: 0.8rem; color: #f97316; font-weight: 700;">${escapeHtml(it.priceStr)}</div>
                    </div>
                    <button type="button" class="btn-shopier-direct-pay btn-cart-open-shopier-item" data-title="${escapeHtml(it.title + (it.period ? ' (' + it.period + ')' : ''))}" data-url="${sUrl}" data-price="${escapeHtml(it.priceStr)}" style="padding: 0.45rem 0.85rem; font-size: 0.8rem; width: auto; border:none; cursor:pointer;">
                      <span>Shopier'da Aç</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                    </button>
                  </div>
                `;
              }).join('')}
              <button type="button" class="btn-shopier-direct-pay btn-cart-open-shopier-main" style="margin-top:0.65rem; width:100%; justify-content:center; padding:0.65rem 1rem; border:none; cursor:pointer;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                <span>Türk Kredi Kartı ile Öde (Shopier)</span>
              </button>
              <div style="font-size: 0.74rem; color: #9ca3af; margin-top: 0.4rem;">
                Ödemeyi tamamladıktan sonra Shopier'ın size verdiği <strong>Sipariş Numarasını</strong> aşağıdaki alana yazınız veya açılan pencereden kaydediniz.
              </div>
            </div>

            <!-- Step 2: Enter Order Number to trigger Owner Approval -->
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 0.85rem 1rem; margin-bottom: 0.6rem;">
              <div style="font-size: 0.74rem; color: #a855f7; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; margin-bottom: 0.75rem;">
                2. Adım: Shopier Sipariş Numaranızı Giriniz
              </div>

              <div class="checkout-input-group">
                <label class="checkout-input-label">Shopier Sipariş Numarası</label>
                <input type="text" id="shopierOrderNoInput" class="checkout-input-field" placeholder="Örn: 51033801 veya Shopier Sipariş Kodu" style="border-color: rgba(249, 115, 22, 0.4); font-weight: 700; letter-spacing: 0.03em;" required>
              </div>

              <div class="checkout-input-group">
                <label class="checkout-input-label">Adınız ve Soyadınız</label>
                <input type="text" id="shopierFullName" class="checkout-input-field" placeholder="Adınız ve Soyadınız" value="${escapeHtml(defaultName)}" required>
              </div>

              <div class="checkout-input-group">
                <label class="checkout-input-label">WhatsApp Numarası (Teslimat Bildirimi İçin)</label>
                <input type="tel" id="shopierPhone" class="checkout-input-field" placeholder="05XXXXXXXXX" value="${escapeHtml(defaultPhone)}" required>
              </div>

              <div class="checkout-input-group">
                <label class="checkout-input-label">E-posta Adresi</label>
                <input type="email" id="shopierEmail" class="checkout-input-field" placeholder="ornek@domain.com" value="${escapeHtml(defaultEmail)}" required>
              </div>

              <button class="btn-shopier-direct-pay" id="btnSubmitShopier" style="margin-top:0.6rem; width:100%; justify-content:center;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Siparişi Onaya Gönder (Owner Onayı Bekle)</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Tab 2: WhatsApp & Discord View -->
        <div id="tabContentIban" style="display: ${activePaymentTab === 'iban' ? 'block' : 'none'};">
          <div class="payment-detail-card">
            <div class="payment-detail-header">
              <div class="payment-detail-title" style="display:flex; align-items:center; gap:0.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="color:#25d366;"><path d="M20.52 3.48A11.93 11.93 0 0 0 12.04 0C5.43 0 .07 5.37.07 11.98c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.63a11.96 11.96 0 0 0 5.84 1.51h.01c6.61 0 11.97-5.36 11.97-11.98 0-3.2-.1.25-1.25-1.46-3.41zM12.05 21.9h-.01a9.92 9.92 0 0 1-5.06-1.39l-.36-.22-3.76.99 1-3.66-.24-.38a9.94 9.94 0 0 1-1.53-5.26c0-5.49 4.47-9.96 9.97-9.96 2.66 0 5.16 1.04 7.04 2.92a9.92 9.92 0 0 1 2.92 7.04c0 5.5-4.47 9.96-9.97 9.96zm5.46-7.46c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.95 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.18-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.93-2.25-.25-.6-.5-.52-.68-.53l-.58-.01c-.2 0-.53.08-.8.38-.28.3-1.06 1.04-1.06 2.54s1.09 2.95 1.24 3.15c.15.2 2.14 3.27 5.19 4.58.73.31 1.29.5 1.73.64.73.23 1.39.2 1.92.12.59-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.12-.28-.2-.58-.35z"/></svg>
                <span>WhatsApp & Discord ile İletişim</span>
              </div>
              <span class="payment-badge-pill" style="background:rgba(37,211,102,0.15); color:#25d366; border:1px solid rgba(37,211,102,0.3);">7/24 ANINDA İLETİŞİM</span>
            </div>

            <div style="font-size:0.83rem; color:#9ca3af; line-height:1.5; margin-bottom: 0.85rem;">
              Banka Havalesi / FAST / EFT, Papara, Kripto veya siparişinizle ilgili tüm detaylar için aşağıdaki <strong>WhatsApp</strong> veya <strong>Discord</strong> butonlarına basarak doğrudan yetkiliye ulaşabilir ve lisansınızı anında teslim alabilirsiniz.
            </div>

            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 0.85rem 1rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size:0.72rem; color:#a855f7; font-weight:700; text-transform:uppercase;">Seçili Ürün</div>
                <div style="font-size:0.88rem; font-weight:700; color:#fff;">${escapeHtml(items.map(i => i.title + (i.period ? ' (' + i.period + ')' : '')).join(', ') || 'Syntax Software Lisansı')}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:0.72rem; color:#9ca3af;">Tutar</div>
                <div style="font-size:1.05rem; font-weight:800; color:#2dd4bf;">${displayTotal}</div>
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.3rem;">
              <button type="button" class="btn-whatsapp-proof" id="btnIbanWhatsAppProceed" style="width:100%; justify-content:center; padding:0.9rem 1rem; font-size:0.92rem; font-weight:800; cursor:pointer; border:none; border-radius:10px; display:flex; align-items:center; gap:0.6rem; background:linear-gradient(135deg, #25D366 0%, #128C7E 100%); color:#fff; box-shadow:0 4px 14px rgba(37,211,102,0.3); transition:transform 0.15s, filter 0.15s;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.93 11.93 0 0 0 12.04 0C5.43 0 .07 5.37.07 11.98c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.63a11.96 11.96 0 0 0 5.84 1.51h.01c6.61 0 11.97-5.36 11.97-11.98 0-3.2-.1.25-1.25-1.46-3.41zM12.05 21.9h-.01a9.92 9.92 0 0 1-5.06-1.39l-.36-.22-3.76.99 1-3.66-.24-.38a9.94 9.94 0 0 1-1.53-5.26c0-5.49 4.47-9.96 9.97-9.96 2.66 0 5.16 1.04 7.04 2.92a9.92 9.92 0 0 1 2.92 7.04c0 5.5-4.47 9.96-9.97 9.96zm5.46-7.46c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.95 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.18-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.93-2.25-.25-.6-.5-.52-.68-.53l-.58-.01c-.2 0-.53.08-.8.38-.28.3-1.06 1.04-1.06 2.54s1.09 2.95 1.24 3.15c.15.2 2.14 3.27 5.19 4.58.73.31 1.29.5 1.73.64.73.23 1.39.2 1.92.12.59-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.12-.28-.2-.58-.35z"/></svg>
                <span>WhatsApp ile Sipariş Ver</span>
              </button>

              <button type="button" id="btnIbanDiscordProceed" style="width:100%; justify-content:center; padding:0.9rem 1rem; font-size:0.92rem; background:#5865f2; color:#fff; border:none; border-radius:10px; font-weight:800; display:flex; align-items:center; gap:0.6rem; cursor:pointer; box-shadow:0 4px 14px rgba(88,101,242,0.3); transition:background 0.2s, transform 0.15s;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                <span>Discord Sunucusuna Git & Ticket Aç</span>
              </button>
            </div>
          </div>
        </div>
      `;

      // Back to cart button
      document.getElementById('btnBackToCart').addEventListener('click', () => {
        activeStep = 'cart';
        renderDrawer();
      });

      // Switch payment tabs
      drawerBody.querySelectorAll('.payment-method-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          activePaymentTab = tab.dataset.pay;
          renderDrawer();
        });
      });

      // Shopier Modal Triggers from Cart Drawer
      drawerBody.querySelectorAll('.btn-cart-open-shopier-item').forEach(btn => {
        btn.addEventListener('click', () => {
          openShopierModal({
            title: btn.dataset.title || 'Syntax Software Lisansı',
            url: btn.dataset.url || SHOPIER_STORE_URL,
            price: btn.dataset.price || displayTotal
          });
        });
      });

      drawerBody.querySelector('.btn-cart-open-shopier-main')?.addEventListener('click', () => {
        const primary = items[0];
        const u = resolveShopierUrl(primary);
        openShopierModal({
          title: primary ? `${primary.title} (${primary.period || ''})` : 'Syntax Software Lisansı',
          url: u,
          price: displayTotal
        });
      });

      // Copy buttons handler
      drawerBody.querySelectorAll('[data-copy-target]').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetId = btn.getAttribute('data-copy-target');
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            navigator.clipboard.writeText(targetEl.textContent.trim()).then(() => {
              const original = btn.textContent;
              btn.textContent = 'Kopyalandı!';
              btn.style.background = '#10b981';
              btn.style.color = '#fff';
              setTimeout(() => {
                btn.textContent = original;
                btn.style.background = '';
                btn.style.color = '';
              }, 1800);
            });
          }
        });
      });

      // Input validation helpers
      function isFieldValidName(val) {
        if (!val || typeof val !== 'string') return false;
        const str = val.trim();
        if (str.length < 5 || str.length > 50) return false;
        if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/.test(str)) return false;
        const words = str.split(/\s+/).filter(w => w.length >= 2);
        if (words.length < 2) return false;
        if (/([a-zA-ZğüşıöçĞÜŞİÖÇ])\1{3,}/i.test(str)) return false;
        if (!/[aeıioöuüAEIİOÖUÜ]/i.test(str)) return false;
        return true;
      }

      function isFieldValidEmail(val) {
        if (!val || typeof val !== 'string') return false;
        const str = val.trim();
        if (str.length < 6 || str.length > 80) return false;
        const emailRe = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        if (!emailRe.test(str)) return false;
        const parts = str.split('@');
        if (parts.length !== 2) return false;
        const domain = parts[1];
        if (!domain.includes('.') || domain.split('.').pop().length < 2) return false;
        return true;
      }

      function isFieldValidPhone(val) {
        if (!val || typeof val !== 'string') return false;
        const clean = val.replace(/[\s\-\(\)\+]/g, '');
        if (/^(90)?(5[0-9]{9})$/.test(clean)) return true;
        if (/^05[0-9]{9}$/.test(clean)) return true;
        return false;
      }

      function isFieldValidTxid(val) {
        if (!val || typeof val !== 'string') return false;
        const str = val.trim();
        if (!/^[a-zA-Z0-9]{24,80}$/.test(str)) return false;
        if (/^(.)\1+$/.test(str)) return false;
        return true;
      }

      function highlightInputError(el, message) {
        if (!el) return;
        el.classList.add('input-invalid');
        el.focus();
        showToast('' + message, 'alert-circle');
        const onInput = () => {
          el.classList.remove('input-invalid');
          el.removeEventListener('input', onInput);
        };
        el.addEventListener('input', onInput);
      }



      // Submit handlers with Shopier Order Number verification & Owner Approval trigger
      const btnSubmitShopier = document.getElementById('btnSubmitShopier');
      if (btnSubmitShopier) {
        btnSubmitShopier.addEventListener('click', () => {
          const orderNoEl = document.getElementById('shopierOrderNoInput');
          const nameEl = document.getElementById('shopierFullName');
          const emailEl = document.getElementById('shopierEmail');
          const phoneEl = document.getElementById('shopierPhone');

          const orderNo = orderNoEl?.value.trim() || '';
          const name = nameEl?.value.trim() || '';
          const email = emailEl?.value.trim() || '';
          const phone = phoneEl?.value.trim() || '';

          if (!orderNo || orderNo.length < 3) {
            highlightInputError(orderNoEl, 'Lütfen Shopier ödemesi sonrasında verilen Sipariş Numaranızı giriniz.');
            return;
          }
          if (!isFieldValidName(name)) {
            highlightInputError(nameEl, 'Lütfen geçerli Ad ve Soyad giriniz (En az 2 kelime, örn: Ahmet Yılmaz).');
            return;
          }
          if (!isFieldValidEmail(email)) {
            highlightInputError(emailEl, 'Lütfen geçerli bir e-posta adresi giriniz (Örn: adiniz@domain.com).');
            return;
          }
          if (!isFieldValidPhone(phone)) {
            highlightInputError(phoneEl, 'Lütfen geçerli bir WhatsApp cep telefonu numarası giriniz (Örn: 05XXXXXXXXX).');
            return;
          }

          const cartItems = getCart();
          const primaryItem = cartItems[0] || null;
          const targetShopierUrl = resolveShopierUrl(primaryItem);

          // Use the exact Shopier order number entered by customer
          const formattedOrderId = orderNo.toUpperCase().startsWith('SHOP-') ? orderNo.toUpperCase() : ('SHOP-' + orderNo);
          currentOrderData = { orderId: formattedOrderId };

          // Process order with KEY BEKLİYOR status
          processOrderSuccess('Shopier', { 
            name, 
            email, 
            phone, 
            shopierOrderNo: orderNo,
            shopierUrl: targetShopierUrl,
            productName: primaryItem ? `${primaryItem.title} (${primaryItem.period})` : 'Syntax Software Lisansı'
          }, 'KEY BEKLİYOR');

          showToast('Shopier sipariş numaranız kaydedildi. Kurucu (Owner) onayı bekleniyor.', 'check-circle');
        });
      }

      function triggerIbanPlatformRedirect(platform) {
        let sender = defaultName || '';
        if (!sender) {
          let curU = null;
          try {
            curU = JSON.parse(localStorage.getItem('syntax_current_user_v3'));
          } catch(e) {}
          sender = curU?.fullName || curU?.username || 'Müşteri';
        }

        const cartItems = getCart();
        const itemsSummary = cartItems.map(i => `${i.title || i.name} (${i.period || i.duration || ''}) x${i.qty}`).join(', ') || 'Syntax Software Lisansı';
        
        processOrderSuccess(platform === 'whatsapp' ? 'WhatsApp İletişim' : 'Discord Ticket', { sender }, 'KEY BEKLİYOR');

        const prefilledMsg = `Merhaba Syntax Software! ${orderRef} numaralı siparişim için doğrudan satın alma / bilgi almak istiyorum.\nÜrün: ${itemsSummary}\nTutar: ${displayTotal}\nMüşteri: ${sender}`;

        if (platform === 'whatsapp') {
          const waUrl = `https://wa.me/${PAYMENT_INFO.iban.whatsapp}?text=${encodeURIComponent(prefilledMsg)}`;
          window.open(waUrl, '_blank');
          showToast('WhatsApp destek sohbetine yönlendiriliyorsunuz...', 'message-circle');
        } else if (platform === 'discord') {
          window.open(PAYMENT_INFO.iban.discord, '_blank');
          showToast('Discord sunucumuza yönlendiriliyorsunuz... Lütfen destek talebi açınız.', 'message-circle');
        }
      }

      document.getElementById('btnIbanWhatsAppProceed')?.addEventListener('click', () => triggerIbanPlatformRedirect('whatsapp'));
      document.getElementById('btnIbanDiscordProceed')?.addEventListener('click', () => triggerIbanPlatformRedirect('discord'));

    } else if (activeStep === 'success') {
      let ordersLog = [];
      try {
        ordersLog = JSON.parse(localStorage.getItem('syntax_orders_log') || '[]');
      } catch (e) {}

      const currentId = currentOrderData?.orderId;
      const liveOrder = (currentId && ordersLog.find(o => o.orderId === currentId)) || currentOrderData || {
        orderId: 'SYN-' + Math.floor(10000 + Math.random() * 90000),
        licenseKey: '',
        method: 'Shopier (3D Secure)',
        status: 'KEY BEKLİYOR',
        amount: '₺1.200'
      };

      const isApproved = liveOrder.status === 'ONAYLANDI' && !!liveOrder.licenseKey;
      drawerHeaderTitle.textContent = isApproved ? 'Sipariş Tamamlandı & Lisans Teslim Edildi' : 'Kurucu (Owner) Key Onayı Bekleniyor';
      drawerFooter.style.display = 'none';

      drawerBody.innerHTML = `
        <div class="order-success-box">
          <div class="order-success-icon-wrap ${isApproved ? '' : 'pending-icon'}">
            ${isApproved ? `
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ` : `
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            `}
          </div>

          <div>
            <h3 style="font-size:1.25rem; font-weight:800; color:#fff; margin-bottom:0.35rem;">
              ${isApproved ? 'Siparişiniz Onaylandı' : 'Kurucu (Owner) Onayı Bekleniyor'}
            </h3>
            <div class="delivery-exclusive-box" style="margin-top:0.75rem; text-align:left;">
              <svg class="delivery-exclusive-icon" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
              <div>
                <div class="delivery-exclusive-title">Ürün Teslimatı Yalnızca WhatsApp veya Discord Üzerindendir</div>
                <div class="delivery-exclusive-desc">
                  Sipariş numaranız sisteme kaydedildi. Lisans anahtarınız Kurucu (Owner) kontrolü ve onayı sonrasında <strong>yalnızca resmi WhatsApp destek hattımız veya Discord sunucumuz üzerinden</strong> teslim edilir.
                </div>
              </div>
            </div>
          </div>

          <!-- Order Summary Card -->
          <div style="background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:0.85rem 1rem; width:100%; max-width:420px; display:flex; flex-direction:column; gap:0.45rem; font-size:0.83rem; text-align:left;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:#9ca3af;">Sipariş Numarası:</span>
              <span style="font-weight:800; color:#a855f7; font-family:monospace; font-size:0.95rem;">${liveOrder.orderId}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:#9ca3af;">Ödeme Yöntemi:</span>
              <span style="color:#e2e8f0; font-weight:600;">${escapeHtml(liveOrder.method || 'Shopier')}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:#9ca3af;">Durum:</span>
              <span class="order-status-pill ${isApproved ? 'status-approved' : 'status-pending'}">
                ${isApproved ? 'ONAYLANDI - LİSANS AKTİF' : 'KEY BEKLİYOR (OWNER ONAYI)'}
              </span>
            </div>
          </div>

          <!-- License Key Box: Revealed or Locked (No Emojis) -->
          ${isApproved ? `
            <div class="license-key-box">
              <div style="font-size:0.75rem; color:#2dd4bf; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;">LİSANS ANAHTARINIZ</div>
              <div class="license-key-code" id="successLicenseKey">${liveOrder.licenseKey}</div>
              <button class="btn-copy-chip" id="btnCopySuccessKey" style="align-self:center; margin-top:0.25rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span>Anahtarı Kopyala</span>
              </button>
            </div>
          ` : `
            <div class="license-key-box" style="border:1px dashed rgba(245, 158, 11, 0.6); background:rgba(245, 158, 11, 0.05);">
              <div style="font-size:0.75rem; color:#fbbf24; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; display:flex; align-items:center; justify-content:center; gap:0.35rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span>LİSANS ANAHTARI KİLİTLİ</span>
              </div>
              <div class="license-key-code" style="color:#fde047; font-size:0.86rem; letter-spacing:0.03em; text-align:center;">
                [KURUCU / OWNER KEY ÜRETİMİ BEKLENİYOR]
              </div>
              <div style="font-size:0.75rem; color:#9ca3af; line-height:1.4; text-align:center;">
                Lisans anahtarları güvenlik gereği otomatik verilmemektedir. Kurucu (Owner) panelden siparişinizi kontrol edip anahtarınızı ürettiğinde teslim edilecektir.
              </div>
            </div>
          `}

          <!-- Actions -->
          <div style="display:flex; flex-direction:column; gap:0.6rem; width:100%; max-width:420px; margin-top:0.3rem;">
            ${isApproved ? `
              <button class="btn-cart-checkout-proceed" id="btnDownloadLoader">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>Syntax Loader İndir (.exe)</span>
              </button>

              <a href="https://wa.me/905346460821?text=${encodeURIComponent('Merhaba Syntax Software! ' + liveOrder.orderId + ' numaralı siparişim onaylandı. Lisans anahtarım: ' + (liveOrder.licenseKey || ''))}" target="_blank" class="btn-whatsapp-proof" style="text-decoration:none; justify-content:center; padding:0.7rem; background:linear-gradient(135deg, #25D366 0%, #128C7E 100%); color:#fff; border-radius:8px; font-weight:700; display:flex; align-items:center; gap:0.5rem; margin-top:0.15rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.93 11.93 0 0 0 12.04 0C5.43 0 .07 5.37.07 11.98c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.63a11.96 11.96 0 0 0 5.84 1.51h.01c6.61 0 11.97-5.36 11.97-11.98 0-3.2-.1.25-1.25-1.46-3.41zM12.05 21.9h-.01a9.92 9.92 0 0 1-5.06-1.39l-.36-.22-3.76.99 1-3.66-.24-.38a9.94 9.94 0 0 1-1.53-5.26c0-5.49 4.47-9.96 9.97-9.96 2.66 0 5.16 1.04 7.04 2.92a9.92 9.92 0 0 1 2.92 7.04c0 5.5-4.47 9.96-9.97 9.96zm5.46-7.46c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.95 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.18-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.93-2.25-.25-.6-.5-.52-.68-.53l-.58-.01c-.2 0-.53.08-.8.38-.28.3-1.06 1.04-1.06 2.54s1.09 2.95 1.24 3.15c.15.2 2.14 3.27 5.19 4.58.73.31 1.29.5 1.73.64.73.23 1.39.2 1.92.12.59-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.12-.28-.2-.58-.35z"/></svg>
                <span>WhatsApp ile İletişime Geç & Bilgi Al</span>
              </a>
            ` : `
              <button class="btn-cart-checkout-proceed" id="btnCheckOrderStatus" style="background:linear-gradient(135deg, #eab308 0%, #ca8a04 100%); color:#000; font-weight:800;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                <span>Ödeme Durumunu Kontrol Et / Yenile</span>
              </button>

              <a href="https://wa.me/905346460821?text=${encodeURIComponent('Merhaba Syntax Software! ' + liveOrder.orderId + ' numaralı siparişimi ilettim. Tutar: ' + liveOrder.total + '. Lisans anahtarımı ve kurulum desteğimi WhatsApp üzerinden teslim almak istiyorum.')}" target="_blank" class="btn-whatsapp-proof" style="text-decoration:none; justify-content:center; padding:0.8rem; background:linear-gradient(135deg, #25D366 0%, #128C7E 100%); color:#fff; font-weight:800; border-radius:10px; box-shadow:0 4px 14px rgba(37,211,102,0.35);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.93 11.93 0 0 0 12.04 0C5.43 0 .07 5.37.07 11.98c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.63a11.96 11.96 0 0 0 5.84 1.51h.01c6.61 0 11.97-5.36 11.97-11.98 0-3.2-.1.25-1.25-1.46-3.41zM12.05 21.9h-.01a9.92 9.92 0 0 1-5.06-1.39l-.36-.22-3.76.99 1-3.66-.24-.38a9.94 9.94 0 0 1-1.53-5.26c0-5.49 4.47-9.96 9.97-9.96 2.66 0 5.16 1.04 7.04 2.92a9.92 9.92 0 0 1 2.92 7.04c0 5.5-4.47 9.96-9.97 9.96zm5.46-7.46c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.95 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.18-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.93-2.25-.25-.6-.5-.52-.68-.53l-.58-.01c-.2 0-.53.08-.8.38-.28.3-1.06 1.04-1.06 2.54s1.09 2.95 1.24 3.15c.15.2 2.14 3.27 5.19 4.58.73.31 1.29.5 1.73.64.73.23 1.39.2 1.92.12.59-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.12-.28-.2-.58-.35z"/></svg>
                <span>WhatsApp ile Lisansımı Teslim Al</span>
              </a>

              <a href="https://discord.gg/wFaNxzyMU" target="_blank" class="btn-discord-checkout" style="text-decoration:none; justify-content:center; padding:0.8rem; background:#5865f2; color:#fff; border-radius:10px; font-weight:800; display:flex; align-items:center; gap:0.5rem; box-shadow:0 4px 14px rgba(88,101,242,0.35);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                <span>Discord Sunucusundan Ticket Aç & Lisans Al</span>
              </a>
            `}

            <button class="checkout-back-btn" id="btnGoToDashboard" style="justify-content:center; color:#c084fc; padding:0.6rem; background:rgba(168,85,247,0.1); border-radius:8px; border:1px solid rgba(168,85,247,0.25);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>Müşteri Paneline Git</span>
            </button>

            <button class="checkout-back-btn" id="btnCloseAndShop" style="justify-content:center; color:#9ca3af; margin-top:0.2rem;">
              <span>Alışverişe Devam Et</span>
            </button>
          </div>
        </div>
      `;

      // Live status check button handler
      document.getElementById('btnCheckOrderStatus')?.addEventListener('click', () => {
        let latestOrders = [];
        try {
          latestOrders = JSON.parse(localStorage.getItem('syntax_orders_log') || '[]');
        } catch (e) {}

        const target = latestOrders.find(o => o.orderId === liveOrder.orderId);
        if (target && target.status === 'ONAYLANDI') {
          showToast('Tebrikler! Ödemeniz onaylandı, lisans anahtarınız teslim edildi!', 'check-circle');
          currentOrderData = target;
          renderDrawer();
        } else {
          showToast('Ödemeniz henüz banka hesabında teyit edilmedi. Lütfen dekontunuzu WhatsApp veya canlı destekten iletiniz.', 'clock');
        }
      });

      // Copy key button
      document.getElementById('btnCopySuccessKey')?.addEventListener('click', () => {
        navigator.clipboard.writeText(liveOrder.licenseKey).then(() => {
          showToast('Anahtar panoya kopyalandı!');
        });
      });

      // Download Loader button
      document.getElementById('btnDownloadLoader')?.addEventListener('click', () => {
        showToast('Syntax_Loader_v3.4.exe indiriliyor...', 'download');
      });

      // Panel button
      document.getElementById('btnGoToDashboard')?.addEventListener('click', () => {
        closeCart();
        if (typeof window.openAuthModal === 'function') {
          window.openAuthModal('dashboard');
        } else {
          window.location.href = 'bayi.html';
        }
      });

      // Continue shopping
      document.getElementById('btnCloseAndShop')?.addEventListener('click', () => {
        closeCart();
      });
    }

    // Apply i18n translation to newly rendered elements if language is not TR
    if (activeLang !== 'tr' && typeof translateDOM === 'function') {
      translateDOM(activeLang);
    }
  }

  // Process order completion simulation with strict verification status
  function processOrderSuccess(method, extraData, initialStatus = 'KEY BEKLİYOR') {
    const { items, displayTotal } = getCartTotals();
    const isApproved = (initialStatus === 'ONAYLANDI');
    const license = isApproved ? ('SYN-VAL-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-2026') : '';
    const orderId = currentOrderData?.orderId || ('SYN-' + Math.floor(10000 + Math.random() * 90000));

    currentOrderData = {
      orderId,
      licenseKey: license,
      method,
      total: displayTotal,
      date: new Date().toISOString(),
      status: initialStatus,
      items: items,
      extraData: extraData
    };

    // Auto-register license into user's account ONLY if order is approved
    if (isApproved) {
      try {
        const activeUser = JSON.parse(localStorage.getItem('syntax_auth_current_user') || 'null');
        if (activeUser) {
          if (!activeUser.licenses) activeUser.licenses = [];
          activeUser.licenses.push({
            product: items[0]?.title || 'Valorant Private Slotted',
            key: license,
            status: 'UNDETECTED & AKTİF',
            daysLeft: 30,
            expires: '2026-12-31'
          });
          localStorage.setItem('syntax_auth_current_user', JSON.stringify(activeUser));
        }
      } catch (e) {}
    }

    // Log order to persistent orders log for Admin & Owner Order Control
    try {
      let ordersLog = JSON.parse(localStorage.getItem('syntax_orders_log') || '[]');
      const customerName = (extraData && (extraData.name || extraData.sender)) || (extraData?.txid ? 'Kripto Transferi (' + extraData.txid.slice(0, 10) + '...)' : 'Müşteri #' + Math.floor(100 + Math.random() * 900));
      const customerEmail = (extraData && extraData.email) || 'musteri@syntaxsoftware.com';
      const customerPhone = (extraData && extraData.phone) || '';

      ordersLog.unshift({
        orderId: orderId,
        customer: customerName,
        email: customerEmail,
        phone: customerPhone,
        amount: displayTotal,
        method: method,
        date: 'Bugün ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        status: initialStatus,
        licenseKey: license,
        items: items.map(i => i.title).join(', ') || 'Valorant Private Slotted',
        extraData: extraData
      });
      localStorage.setItem('syntax_orders_log', JSON.stringify(ordersLog));
    } catch (e) {}

    // Clear cart
    saveCart([]);

    // Show appropriate toast feedback
    if (initialStatus === 'ONAYLANDI') {
      showToast('Ödemeniz onaylandı, lisans anahtarınız teslim edildi!', 'check-circle');
    } else {
      showToast('Siparişiniz alındı! Ödemeniz yönetici kontrolüne iletildi.', 'clock');
    }

    activeStep = 'success';
    renderDrawer();
  }

  // Shopier Embedded Modal (Exact Design Match for User Request & Screenshot)
  function openShopierModal({
    title = 'Vanguard Emulator',
    url = 'https://www.shopier.com/SyntaxSoftware',
    price = '',
    name = '',
    phone = '',
    email = '',
    onSuccess = null
  } = {}) {
    let existing = document.getElementById('syntaxShopierModal');
    if (existing) existing.remove();

    let curUser = null;
    try {
      curUser = JSON.parse(localStorage.getItem('syntax_current_user_v3') || 'null');
      if (!curUser) curUser = JSON.parse(localStorage.getItem('syntax_auth_current_user') || 'null');
    } catch (e) {}

    const defName = name || curUser?.name || curUser?.fullName || curUser?.username || '';
    const defPhone = phone || curUser?.phone || '';
    const defEmail = email || curUser?.email || '';

    const overlay = document.createElement('div');
    overlay.id = 'syntaxShopierModal';
    overlay.className = 'shopier-modal-overlay';

    const displayTitle = title ? `Türk Kredi Kartı ile Öde — ${title}` : 'Türk Kredi Kartı ile Öde — Shopier';

    overlay.innerHTML = `
      <div class="shopier-modal-card">
        <div class="shopier-modal-scrollable">
          
          <!-- Header Top Box -->
          <div class="shopier-modal-header-box">
            <div>
              <div class="shopier-modal-tag">SHOPIER</div>
              <div class="shopier-modal-title">${escapeHtml(displayTitle)}</div>
              <div class="shopier-modal-subtext">
                Eğer “bağlantı reddedildi” görürseniz <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Yeni sekmede aç</a>.
              </div>
            </div>
            <div class="shopier-header-actions">
              <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="btn-shopier-pill-newtab">
                <span>Yeni sekmede aç</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </a>
              <button type="button" class="btn-shopier-pill-close" id="btnCloseShopierModal" aria-label="Kapat">✕</button>
            </div>
          </div>

          <!-- Support Assistance Card -->
          <div class="shopier-support-box">
            <div class="shopier-support-info">
              <svg class="shopier-support-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              <div class="shopier-support-text">
                Satın alma sonrası kurulumda yardımcıyız. Anında destek için Discord veya WhatsApp üzerinden ulaşın.
              </div>
            </div>
            <div class="shopier-support-buttons">
              <a href="https://wa.me/905346460821?text=${encodeURIComponent('Merhaba Syntax Software! Shopier üzerinden ' + title + ' alımı yapıyorum, destek ve kurulum için bilgi almak istiyorum.')}" target="_blank" class="btn-shopier-support-action whatsapp">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.93 11.93 0 0 0 12.04 0C5.43 0 .07 5.37.07 11.98c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.63a11.96 11.96 0 0 0 5.84 1.51h.01c6.61 0 11.97-5.36 11.97-11.98 0-3.2-.1.25-1.25-1.46-3.41zM12.05 21.9h-.01a9.92 9.92 0 0 1-5.06-1.39l-.36-.22-3.76.99 1-3.66-.24-.38a9.94 9.94 0 0 1-1.53-5.26c0-5.49 4.47-9.96 9.97-9.96 2.66 0 5.16 1.04 7.04 2.92a9.92 9.92 0 0 1 2.92 7.04c0 5.5-4.47 9.96-9.97 9.96zm5.46-7.46c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.95 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.18-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.93-2.25-.25-.6-.5-.52-.68-.53l-.58-.01c-.2 0-.53.08-.8.38-.28.3-1.06 1.04-1.06 2.54s1.09 2.95 1.24 3.15c.15.2 2.14 3.27 5.19 4.58.73.31 1.29.5 1.73.64.73.23 1.39.2 1.92.12.59-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.12-.28-.2-.58-.35z"/></svg>
                <span>WhatsApp</span>
              </a>
              <a href="https://discord.gg/wFaNxzyMU" target="_blank" class="btn-shopier-support-action discord">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                <span>Discord'a katıl</span>
              </a>
            </div>
          </div>

          <!-- Order Registration Card (Requested: "sipariş numarasını kullanıcı satın aldıktan sonra kaydetsin") -->
          <div class="shopier-order-register-box" id="shopierOrderRegisterContainer">
            <div class="shopier-order-register-title">
              <div class="shopier-order-title-text">Sipariş Numarasını Kaydet (Owner Onayı)</div>
              <span class="shopier-order-badge">KURUCU ONAYLI</span>
            </div>
            <div class="shopier-order-register-desc">
              Shopier üzerinden ödemenizi tamamladıktan sonra verilen <strong>Sipariş Numarasını</strong> girip kaydediniz. Siparişiniz sisteme kaydedildiğinde anında Kurucu (Owner) onayına düşer ve lisansınız teslim edilir.
            </div>
            <div class="shopier-order-inputs-grid">
              <div class="shopier-order-input-wrap">
                <label class="shopier-order-input-label">Shopier Sipariş No</label>
                <input type="text" id="modalShopierOrderNo" class="shopier-order-input" placeholder="Örn: 51033801" required>
              </div>
              <div class="shopier-order-input-wrap">
                <label class="shopier-order-input-label">Ad Soyad</label>
                <input type="text" id="modalShopierName" class="shopier-order-input" placeholder="Adınız Soyadınız" value="${escapeHtml(defName)}">
              </div>
              <div class="shopier-order-input-wrap">
                <label class="shopier-order-input-label">WhatsApp No</label>
                <input type="tel" id="modalShopierPhone" class="shopier-order-input" placeholder="05XXXXXXXXX" value="${escapeHtml(defPhone)}">
              </div>
              <button type="button" id="btnModalSaveOrder" class="btn-save-shopier-order">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Siparişi Kaydet</span>
              </button>
            </div>
            <div id="modalShopierError" style="color: #ef4444; font-size: 0.75rem; font-weight: 600; display: none; margin-top: 0.35rem;"></div>
          </div>

          <!-- Embedded Shopier Frame -->
          <div class="shopier-frame-wrapper">
            <iframe src="${escapeHtml(url)}" id="shopierEmbedIframe" class="shopier-frame-iframe" allow="payment" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"></iframe>
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector('#btnCloseShopierModal');
    const closeModal = () => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKey);
    closeBtn?.addEventListener('click', closeModal);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Save order number logic
    const saveBtn = overlay.querySelector('#btnModalSaveOrder');
    const errEl = overlay.querySelector('#modalShopierError');
    const inpOrderNo = overlay.querySelector('#modalShopierOrderNo');
    const inpName = overlay.querySelector('#modalShopierName');
    const inpPhone = overlay.querySelector('#modalShopierPhone');

    setTimeout(() => inpOrderNo?.focus(), 100);

    saveBtn?.addEventListener('click', () => {
      const orderNo = inpOrderNo?.value.trim() || '';
      let custName = inpName?.value.trim() || '';
      let custPhone = inpPhone?.value.trim() || '';
      let custEmail = defEmail || (custName ? custName.toLowerCase().replace(/\s+/g,'') + '@musteri.com' : 'musteri@syntaxsoftware.com');

      if (!orderNo || orderNo.length < 3) {
        if (errEl) {
          errEl.textContent = 'Lütfen geçerli bir Shopier Sipariş Numarası giriniz (En az 3 karakter).';
          errEl.style.display = 'block';
        }
        inpOrderNo?.focus();
        return;
      }

      if (errEl) errEl.style.display = 'none';

      const formattedOrderId = orderNo.toUpperCase().startsWith('SHOP-') ? orderNo.toUpperCase() : ('SHOP-' + orderNo);
      const orderPrice = price || '₺1.200';
      const orderProduct = title || 'Syntax Software Lisansı';

      // Save to localStorage syntax_orders_log
      let ords = [];
      try {
        ords = JSON.parse(localStorage.getItem('syntax_orders_log') || '[]');
      } catch (e) {}

      const newOrderRecord = {
        orderId: formattedOrderId,
        customer: custName || 'Müşteri',
        email: custEmail,
        phone: custPhone,
        amount: orderPrice,
        method: 'Shopier (Kredi Kartı)',
        date: 'Bugün ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        status: 'KEY BEKLİYOR',
        licenseKey: '',
        items: orderProduct,
        shopierOrderNo: orderNo,
        createdAt: new Date().toISOString()
      };

      const existingIdx = ords.findIndex(o => o.orderId === formattedOrderId || o.shopierOrderNo === orderNo);
      if (existingIdx >= 0) {
        ords[existingIdx] = Object.assign({}, ords[existingIdx], newOrderRecord);
      } else {
        ords.unshift(newOrderRecord);
      }
      localStorage.setItem('syntax_orders_log', JSON.stringify(ords));

      // Also update cart drawer state
      try {
        currentOrderData = { orderId: formattedOrderId };
        processOrderSuccess('Shopier', {
          name: custName,
          email: custEmail,
          phone: custPhone,
          shopierOrderNo: orderNo,
          shopierUrl: url,
          productName: orderProduct
        }, 'KEY BEKLİYOR');
      } catch (e) {}

      // Dispatch real-time events for Owner panel
      window.dispatchEvent(new CustomEvent('syntax_orders_updated', { detail: { newOrder: newOrderRecord } }));
      window.dispatchEvent(new StorageEvent('storage', { key: 'syntax_orders_log' }));

      // Render success state inside modal
      const regContainer = overlay.querySelector('#shopierOrderRegisterContainer');
      if (regContainer) {
        regContainer.innerHTML = `
          <div class="shopier-order-success-card">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
              <span class="order-status-pill status-pending" style="font-size: 0.72rem; font-weight: 800; letter-spacing: 0.04em;">
                KURUCU (OWNER) ONAYI BEKLENİYOR
              </span>
              <span style="font-family: monospace; font-weight: 800; color: #a855f7; font-size: 0.95rem;">
                ${escapeHtml(formattedOrderId)}
              </span>
            </div>
            <div style="font-size: 0.85rem; color: #fff; font-weight: 700;">
              Sipariş Numaranız (#${escapeHtml(orderNo)}) sisteme başarıyla kaydedildi!
            </div>
            <div style="font-size: 0.78rem; color: #94a3b8; line-height: 1.45;">
              Lisans anahtarınız Kurucu (Owner) kontrolü ve onayı sonrasında <strong>WhatsApp veya Discord üzerinden</strong> teslim edilecektir.
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.4rem;">
              <a href="https://wa.me/905346460821?text=${encodeURIComponent('Merhaba Syntax Software! Shopier siparişimi verdim ve sipariş numaramı kaydettim.\nSipariş Kodu: ' + formattedOrderId + '\nÜrün: ' + orderProduct + '\nAd Soyad: ' + (custName || 'Müşteri') + '\nLütfen lisans anahtarımı onaylayınız.')}" target="_blank" class="btn-shopier-support-action whatsapp">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.93 11.93 0 0 0 12.04 0C5.43 0 .07 5.37.07 11.98c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.63a11.96 11.96 0 0 0 5.84 1.51h.01c6.61 0 11.97-5.36 11.97-11.98 0-3.2-.1.25-1.25-1.46-3.41zM12.05 21.9h-.01a9.92 9.92 0 0 1-5.06-1.39l-.36-.22-3.76.99 1-3.66-.24-.38a9.94 9.94 0 0 1-1.53-5.26c0-5.49 4.47-9.96 9.97-9.96 2.66 0 5.16 1.04 7.04 2.92a9.92 9.92 0 0 1 2.92 7.04c0 5.5-4.47 9.96-9.97 9.96zm5.46-7.46c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.95 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.18-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.93-2.25-.25-.6-.5-.52-.68-.53l-.58-.01c-.2 0-.53.08-.8.38-.28.3-1.06 1.04-1.06 2.54s1.09 2.95 1.24 3.15c.15.2 2.14 3.27 5.19 4.58.73.31 1.29.5 1.73.64.73.23 1.39.2 1.92.12.59-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.12-.28-.2-.58-.35z"/></svg>
                <span>WhatsApp ile Kurucuya İlet</span>
              </a>
              <a href="https://discord.gg/wFaNxzyMU" target="_blank" class="btn-shopier-support-action discord">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                <span>Discord Destek Talebi</span>
              </a>
            </div>
          </div>
        `;
      }

      showToast(`Shopier sipariş numaranız (${orderNo}) kaydedildi! Kurucu onayı bekleniyor.`, 'check-circle');
      if (typeof onSuccess === 'function') onSuccess(newOrderRecord);
    });
  }

  window.openShopierModal = openShopierModal;

  // Cart item mutations
  function addItem(item) {
    const items = getCart();
    const existing = items.find(i => i.title.toLowerCase() === item.title.toLowerCase());
    if (existing) {
      existing.qty += 1;
    } else {
      items.push({
        id: 'prod_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        title: item.title,
        category: item.category || 'Syntax Software',
        priceStr: item.priceStr || item.price || (item.currency === '$' ? '$' + (item.priceNum || 0) : '₺' + (item.priceNum || 0)),
        priceNum: item.priceNum || 0,
        currency: item.currency || '₺',
        period: item.period || '',
        shopierUrl: item.shopierUrl || resolveShopierUrl(item),
        qty: 1
      });
    }
    saveCart(items);
    showToast('Ürün sepete eklendi!');
    openCart('cart');
  }
  window.syntaxAddToCart = addItem;
  window.syntaxOpenCart = openCart;

  function updateItemQty(id, delta) {
    let items = getCart();
    const target = items.find(i => i.id === id);
    if (!target) return;
    target.qty += delta;
    if (target.qty <= 0) {
      items = items.filter(i => i.id !== id);
      showToast('Ürün sepetten kaldırıldı.');
    }
    saveCart(items);
    renderDrawer();
  }

  function removeItem(id) {
    let items = getCart();
    items = items.filter(i => i.id !== id);
    saveCart(items);
    showToast('Ürün sepetten kaldırıldı.');
    renderDrawer();
  }

  // Hook all ".btn-buy-card" buttons across the site
  document.querySelectorAll('.btn-buy-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.product-card-wrap');
      let title = 'Syntax VIP Access';
      let category = 'Valorant & CS2';
      let priceStr = '₺1,200';
      let priceNum = 1200;
      let currency = '₺';
      let period = '/ Ay';

      if (card) {
        const titleEl = card.querySelector('.product-card-title');
        const catEl = card.querySelector('.product-card-category');
        const priceEl = card.querySelector('.product-price');

        if (titleEl) title = titleEl.textContent.trim();
        if (catEl) category = catEl.textContent.trim();
        if (priceEl) {
          priceStr = priceEl.textContent.trim();
          const cleanText = priceEl.childNodes[0]?.textContent?.trim() || priceStr;
          if (cleanText.includes('$')) {
            currency = '$';
            priceNum = parseFloat(cleanText.replace(/[^0-9.]/g, '')) || 39.99;
          } else {
            currency = '₺';
            priceNum = parseFloat(cleanText.replace(/[^0-9.]/g, '').replace('.', '')) || 1200;
          }
          const periodEl = priceEl.querySelector('span');
          if (periodEl) period = periodEl.textContent.trim();
        }
      }

      addItem({
        title,
        category,
        priceStr,
        priceNum,
        currency,
        period
      });
    });
  });

  // Initial badge update
  updateCartBadges();

  // Expose globally for testing or direct access
  window.openCart = openCart;
  window.closeCart = closeCart;
  window.addItemToCart = addItem;
}
window.initCartAndCheckout = initCartAndCheckout;
window.initCartAndQuickActions = initCartAndCheckout;


/* ==========================================================================
   7. CRISP STYLE LIVE CHAT WIDGET (WITH ADMIN / STAFF MESSAGING & PERSISTENCE)
   ========================================================================== */
function initCrispChat() {
  // Check if widget already exists
  let widget = document.getElementById('crispChatWidget');
  if (!widget) {
    widget = document.createElement('div');
    widget.id = 'crispChatWidget';
    widget.className = 'crisp-chat-widget';
    widget.innerHTML = `
      <!-- Support Ticket Dark Header -->
      <div class="crisp-header">
        <div class="crisp-header-topbar">
          <div class="crisp-messages-pill" id="crispMessagesPill" title="Aktif Destek Bileti" role="button" tabindex="0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            <span id="ticketPillTitle">Bilet / Sohbet</span>
          </div>

          <button type="button" class="ticket-open-tab-btn" id="btnNewTicketFormToggle" title="Yeni Destek Bileti Aç">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Ticket Aç</span>
          </button>

          <div class="crisp-top-actions">
            <button class="crisp-admin-toggle-btn owner-only-secret" id="crispOwnerSecretBtn" type="button" title="Kurucu (Owner) Gizli Kanalı" style="display:none; background:rgba(245,158,11,0.2); border-color:#f59e0b; color:#fbbf24;">
              <span>👑 Owner</span>
            </button>
            <button class="crisp-icon-action" id="crispOptionsBtn" title="Seçenekler">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
            </button>
            <button class="crisp-icon-action" id="crispCloseBtn" title="Kapat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <!-- Avatars Trio -->
        <div class="crisp-avatars-trio">
          <div class="crisp-avatar-circle" title="Discord Canlı Köprü">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
          </div>
          <div class="crisp-avatar-circle" title="Destek Ekibi">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#a78bfa"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>
          <div class="crisp-avatar-circle primary" title="Syntax Bot">
            <img src="images/syntax-logo.webp" alt="Syntax" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">
          </div>
        </div>

        <h3 class="crisp-header-title">Syntax Destek & Ticket Sistemi</h3>
        <div class="crisp-header-sub">
          <span class="sub-pulse-green"></span>
          <span>Çevrimiçi · Discord Web-Ticket Köprüsü Aktif</span>
        </div>

        <div class="crisp-ticket-status-pill" id="crispLiveTicketPill">
          <span class="sub-pulse-green"></span>
          <span id="crispTicketStatusText">Discord Canlı Senkronizasyon Hazır</span>
        </div>
      </div>

      <!-- Quick Topic Chips (Hızlı Destek Başlıkları) -->
      <div class="crisp-customer-quickchips" id="crispCustomerQuickChips">
        <button type="button" class="crisp-user-chip" data-quick="🛒 Satın alım ve ödeme yöntemleri hakkında bilgi almak istiyorum.">
          <span>🛒 Satın Alım & Fiyat</span>
        </button>
        <button type="button" class="crisp-user-chip" data-quick="🔑 HWID sıfırlama veya lisans anahtarı aktivasyon yardımı rica ediyorum.">
          <span>🔑 Lisans / HWID Sıfırla</span>
        </button>
        <button type="button" class="crisp-user-chip" data-quick="🛠️ Kurulum adımları ve defender / bios ayarları için yardım istiyorum.">
          <span>🛠️ Kurulum & Destek</span>
        </button>
        <button type="button" class="crisp-user-chip" data-quick="🟢 Valorant ve CS2 hilelerinin anlık ban ve undetected durumu nedir?">
          <span>🟢 Undetected Durumu</span>
        </button>
      </div>

      <!-- Admin Status Banner -->
      <div class="crisp-admin-banner" id="crispAdminBanner" style="display: none;">
        <div class="crisp-admin-banner-content">
          <span class="admin-pulse-dot"></span>
          <span><strong>YÖNETİCİ MODU AKTİF</strong> · Yetkili Yanıtı</span>
        </div>
        <button class="crisp-admin-exit-btn" id="crispAdminExitBtn" type="button" title="Müşteri Moduna Dön">Çıkış</button>
      </div>

      <!-- Options Dropdown Menu -->
      <div class="crisp-options-menu" id="crispOptionsMenu" style="display: none;">
        <button type="button" class="crisp-opt-item" id="crispOptOpenNewTicket">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Yeni Ticket Aç</span>
        </button>
        <button type="button" class="crisp-opt-item" id="crispOptToggleAdmin">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <span id="crispOptAdminText">Yönetici Modunu Aç</span>
        </button>
        <button type="button" class="crisp-opt-item text-danger" id="crispOptClearHistory">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          <span>Sohbet Geçmişini Temizle</span>
        </button>
        <a href="https://discord.gg/wFaNxzyMU" target="_blank" rel="noopener" class="crisp-opt-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
          <span>Discord Desteğe Git</span>
        </a>
      </div>

      <!-- Dedicated Ticket Creation View (Web-Ticket Form) -->
      <div class="ticket-create-form-wrap" id="ticketCreateFormView" style="display: none;">
        <div style="background:rgba(168,85,247,0.12); border:1px solid rgba(168,85,247,0.35); border-radius:10px; padding:0.75rem 0.9rem; font-size:0.78rem; color:#d8b4fe; line-height:1.4;">
          🎫 <strong>Yeni Destek Bileti Açın:</strong> Talebiniz anında Discord'daki <strong>#web-ticket</strong> kategorisine düşer. Yetkili ekibimiz canlı olarak buradan yanıtlar.
        </div>

        <div>
          <label class="ticket-form-label">Destek Talebi Konusu:</label>
          <select class="ticket-form-select" id="ticketCategorySelect">
            <option value="Satın Alım & Lisans">🛒 Satın Alım & Sipariş Kontrolü</option>
            <option value="Lisans / HWID Sıfırlama">🔑 Lisans Aktivasyonu / HWID Sıfırlama</option>
            <option value="Teknik Destek & Kurulum">🛠️ Kurulum, BIOS / HVCI Desteği</option>
            <option value="Undetected & Durum">🟢 Yazılım Durumu ve Bilgi</option>
            <option value="Diğer Sorular">❓ Genel / Diğer Konular</option>
          </select>
        </div>

        <div>
          <label class="ticket-form-label">Adınız veya Discord Kullanıcı Adınız:</label>
          <input type="text" class="ticket-form-input" id="ticketDiscordUsernameInput" placeholder="Örn: NOXY veya @kullanici#0001">
        </div>

        <div>
          <label class="ticket-form-label">Mesajınız / Destek Talebiniz:</label>
          <textarea class="ticket-form-textarea" id="ticketInitialMessageInput" rows="3" placeholder="Sorununuzu veya talebinizi detaylıca belirtiniz..."></textarea>
        </div>

        <button type="button" class="btn-submit-new-ticket" id="btnSubmitNewTicket">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          <span>Ticket Aç (Discord #web-ticket'a Gönder)</span>
        </button>
      </div>

      <!-- Messages Body -->
      <div class="crisp-body" id="crispMessagesContainer"></div>

      <!-- Emoji Popover -->
      <div class="crisp-emoji-popover" id="crispEmojiPopover">
        <button class="crisp-emoji-btn" type="button">👍</button>
        <button class="crisp-emoji-btn" type="button">🔥</button>
        <button class="crisp-emoji-btn" type="button">❤️</button>
        <button class="crisp-emoji-btn" type="button">🎮</button>
        <button class="crisp-emoji-btn" type="button">⚡</button>
        <button class="crisp-emoji-btn" type="button">🛡️</button>
      </div>

      <!-- Admin Quick Replies Bar -->
      <div class="crisp-admin-quickbar" id="crispAdminQuickbar" style="display: none;">
        <button type="button" class="crisp-quick-chip" data-reply="👋 Merhaba! Size nasıl yardımcı olabiliriz?">👋 Merhaba</button>
        <button type="button" class="crisp-quick-chip" data-reply="✅ Siparişiniz ve lisans anahtarınız onaylandı.">✅ Onaylandı</button>
        <button type="button" class="crisp-quick-chip" data-reply="🎧 Discord biletinizi kontrol edin, size oradan yazıldı: https://discord.gg/wFaNxzyMU">🎧 Discord</button>
        <button type="button" class="crisp-quick-chip" data-reply="🟢 Yazılımımız şu anda tamamen UNDETECTED ve günceldir.">🟢 Undetected</button>
        <button type="button" class="crisp-quick-chip" data-reply="🛡️ Spoofer VAN152 & VAL5 bypass güncel olarak hazırdır.">🛡️ Spoofer</button>
        <button type="button" class="crisp-quick-chip chip-danger" id="crispClearChatChip" title="Sohbeti Sıfırla">🗑️ Temizle</button>
      </div>

      <!-- Footer / Input Box -->
      <div class="crisp-footer">
        <div class="crisp-input-container">
          <textarea class="crisp-textarea" id="crispInputText" placeholder="Sorunuzu veya mesajınızı buraya yazın... (Enter)" rows="1"></textarea>
          
          <div class="crisp-input-actions">
            <div class="crisp-media-buttons">
              <button class="crisp-tool-btn" id="crispEmojiTrigger" type="button" title="Emoji Ekle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
              </button>
              
              <button class="crisp-tool-btn" id="crispAttachBtn" type="button" title="Dosya Ekle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
              </button>

              <button class="crisp-tool-btn" id="crispAudioBtn" type="button" title="Ses Kaydı">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
              </button>
            </div>

            <button class="crisp-send-btn" id="crispSendBtn" type="button" title="Gönder">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>

        <div class="crisp-branding">
          <span>⚡ Güvenli Altyapı ·</span>
          <span class="brand-name" style="color:#c084fc; font-weight:800;">Syntax Shield & Discord Live Bridge</span>
        </div>
      </div>
    `;
    document.body.appendChild(widget);
  }

  const chatButtons = document.querySelectorAll('.float-btn-chat');
  const closeBtn = document.getElementById('crispCloseBtn');
  const sendBtn = document.getElementById('crispSendBtn');
  const textarea = document.getElementById('crispInputText');
  const messagesContainer = document.getElementById('crispMessagesContainer');
  const emojiTrigger = document.getElementById('crispEmojiTrigger');
  const emojiPopover = document.getElementById('crispEmojiPopover');
  const adminToggleBtn = document.getElementById('crispAdminToggleBtn');
  const adminBanner = document.getElementById('crispAdminBanner');
  const adminExitBtn = document.getElementById('crispAdminExitBtn');
  const adminQuickbar = document.getElementById('crispAdminQuickbar');
  const optionsBtn = document.getElementById('crispOptionsBtn');
  const optionsMenu = document.getElementById('crispOptionsMenu');
  const optToggleAdmin = document.getElementById('crispOptToggleAdmin');
  const optAdminText = document.getElementById('crispOptAdminText');
  const optClearHistory = document.getElementById('crispOptClearHistory');
  const clearChatChip = document.getElementById('crispClearChatChip');
  const optOpenNewTicket = document.getElementById('crispOptOpenNewTicket');

  // Ticket creation form elements
  const ticketFormView = document.getElementById('ticketCreateFormView');
  const btnNewTicketFormToggle = document.getElementById('btnNewTicketFormToggle');
  const btnSubmitNewTicket = document.getElementById('btnSubmitNewTicket');
  const ticketCategorySelect = document.getElementById('ticketCategorySelect');
  const ticketDiscordUsernameInput = document.getElementById('ticketDiscordUsernameInput');
  const ticketInitialMessageInput = document.getElementById('ticketInitialMessageInput');
  const crispMessagesPill = document.getElementById('crispMessagesPill');
  const crispOwnerSecretBtn = document.getElementById('crispOwnerSecretBtn');

  function showTicketForm() {
    if (ticketFormView && messagesContainer) {
      ticketFormView.style.display = 'flex';
      messagesContainer.style.display = 'none';
      const curUser = (typeof getCurrentUser === 'function' && getCurrentUser());
      const chatKey = getCurrentChatKey();

      // Check if user already has an active open ticket
      if (hasUserActiveTicket(chatKey)) {
        const meta = getTicketMeta(chatKey);
        const chName = meta.channelName || generateTicketChannelName(meta.category, curUser ? curUser.username : 'musteri');
        ticketFormView.innerHTML = `
          <div class="ticket-active-blocked-wrap">
            <div class="ticket-active-badge-icon">⚠️</div>
            <div class="ticket-active-title">Zaten Açık Bir Destek Talebiniz Var!</div>
            <div class="ticket-active-channel-tag">#${escapeHtml(chName)}</div>
            <div class="ticket-active-desc">
              Syntax Software kuralları gereği, işlemlerin çakışmaması ve hızlı yanıt verilebilmesi için <strong>aynı anda yalnızca 1 aktif destek talebi</strong> açabilirsiniz.
              <br><br>
              Talebiniz yetkili ekibimizce takibe alınmıştır. Lütfen mevcut talebiniz üzerinden yazışmaya devam ediniz.
            </div>
            <div class="ticket-active-meta-row">
              <span>Talep No: <strong>#ticket-${meta.ticketNum}</strong></span>
              <span>Kategori: <strong>${escapeHtml(meta.category || 'Genel Destek')}</strong></span>
              <span>Durum: <strong style="color:#34d399;">● AKTİF</strong></span>
            </div>
            <button type="button" class="btn-goto-active-ticket" id="btnGoToActiveTicket">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <span>Mevcut Talebime Git & Mesaj Yaz</span>
            </button>
          </div>
        `;
        document.getElementById('btnGoToActiveTicket')?.addEventListener('click', () => {
          showMessagesView();
        });
        return;
      }

      // If no active ticket, restore form view
      if (!document.getElementById('ticketCategorySelect')) {
        ticketFormView.innerHTML = `
          <div style="background:rgba(168,85,247,0.12); border:1px solid rgba(168,85,247,0.35); border-radius:10px; padding:0.75rem 0.9rem; font-size:0.78rem; color:#d8b4fe; line-height:1.4;">
            🎫 <strong>Yeni Destek Bileti Açın:</strong> Talebiniz anında size özel <strong>#web-kategori-kişi</strong> kanalına iletilir. Sadece Yönetici ve Kurucu (Owner) erişebilir.
          </div>
          <div>
            <label class="ticket-form-label">Destek Talebi Konusu:</label>
            <select class="ticket-form-select" id="ticketCategorySelect">
              <option value="Satın Alım & Lisans">🛒 Satın Alım & Sipariş Kontrolü</option>
              <option value="Lisans / HWID Sıfırlama">🔑 Lisans Aktivasyonu / HWID Sıfırlama</option>
              <option value="Teknik Destek & Kurulum">🛠️ Kurulum, BIOS / HVCI Desteği</option>
              <option value="Undetected & Durum">🟢 Yazılım Durumu ve Bilgi</option>
              <option value="Diğer Sorular">❓ Genel / Diğer Konular</option>
            </select>
          </div>
          <div>
            <label class="ticket-form-label">Adınız veya Discord Kullanıcı Adınız:</label>
            <input type="text" class="ticket-form-input" id="ticketDiscordUsernameInput" placeholder="Örn: NOXY veya @kullanici#0001">
          </div>
          <div>
            <label class="ticket-form-label">Mesajınız / Destek Talebiniz:</label>
            <textarea class="ticket-form-textarea" id="ticketInitialMessageInput" rows="3" placeholder="Sorununuzu veya talebinizi detaylıca belirtiniz..."></textarea>
          </div>
          <button type="button" class="btn-submit-new-ticket" id="btnSubmitNewTicket">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            <span>Ticket Aç (Özel Kanala Gönder)</span>
          </button>
        `;
        bindTicketSubmitButton();
      }

      const inpDc = document.getElementById('ticketDiscordUsernameInput');
      if (curUser && inpDc && !inpDc.value) {
        inpDc.value = curUser.username;
      }
    }
  }

  function showMessagesView() {
    if (ticketFormView && messagesContainer) {
      ticketFormView.style.display = 'none';
      messagesContainer.style.display = 'flex';
    }
  }

  if (btnNewTicketFormToggle) {
    btnNewTicketFormToggle.onclick = () => {
      if (ticketFormView && (ticketFormView.style.display === 'flex' || ticketFormView.style.display === 'block')) {
        showMessagesView();
      } else {
        showTicketForm();
      }
    };
  }

  if (crispMessagesPill) {
    crispMessagesPill.onclick = () => showMessagesView();
  }

  if (optOpenNewTicket) {
    optOpenNewTicket.onclick = () => {
      if (optionsMenu) optionsMenu.style.display = 'none';
      showTicketForm();
    };
  }

  // Update Owner secret button in chat header
  function updateChatOwnerButton() {
    const curUser = (typeof getCurrentUser === 'function' && getCurrentUser());
    if (crispOwnerSecretBtn) {
      if (curUser && curUser.role === 'owner') {
        crispOwnerSecretBtn.style.display = 'inline-flex';
        crispOwnerSecretBtn.onclick = () => {
          if (typeof openOwnerSecretModal === 'function') openOwnerSecretModal();
        };
      } else {
        crispOwnerSecretBtn.style.display = 'none';
      }
    }
  }
  updateChatOwnerButton();
  window.addEventListener('storage', updateChatOwnerButton);

  function handleTicketSubmit() {
    const catInp = document.getElementById('ticketCategorySelect');
    const dcUserInp = document.getElementById('ticketDiscordUsernameInput');
    const msgInp = document.getElementById('ticketInitialMessageInput');

    const cat = catInp?.value || 'Genel Destek';
    const dcUser = dcUserInp?.value.trim() || 'Müşteri';
    const msg = msgInp?.value.trim();

    if (!msg) {
      if (typeof showToast === 'function') showToast('Lütfen bilet mesajınızı veya talebinizi yazınız.', 'alert-circle');
      msgInp?.focus();
      return;
    }

    const curUser = (typeof getCurrentUser === 'function' && getCurrentUser());
    const chatKey = getCurrentChatKey();

    // Enforce 1 active ticket limit
    if (hasUserActiveTicket(chatKey)) {
      if (typeof showToast === 'function') {
        showToast('Zaten açık bir destek talebiniz var! Yeni talep açmadan önce lütfen mevcut talebinizi tamamlayın.', 'alert-circle');
      }
      showTicketForm();
      return;
    }

    // Format dedicated channel name: web-{kategori}-{kişi}
    const channelName = generateTicketChannelName(cat, dcUser);
    const ticketNum = Math.floor(1000 + Math.random() * 9000);

    const dossier = (typeof collectFullUserDossier === 'function') ? collectFullUserDossier(curUser) : {};
    dossier.category = cat;
    dossier.discordUser = dcUser;
    dossier.channelName = channelName;

    // Save ticket meta with channelName and open status
    const meta = {
      status: 'open',
      ticketNum: ticketNum,
      channelName: channelName,
      category: cat,
      categorySlug: getTicketCategorySlug(cat),
      claimedBy: null,
      createdAt: new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      closedAt: null
    };
    saveTicketMeta(chatKey, meta);

    const formattedFirstMsg = `[Kategori: ${cat}] ${msg}`;

    // Save to local message history
    saveMessage('user', formattedFirstMsg, formatCurrentTime());
    renderHistory();
    showMessagesView();

    // Open ticket in Discord bot bridge on port 5055 (private web-{kategori}-{kişi} channel)
    fetch('http://127.0.0.1:5055/api/ticket/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatKey: chatKey,
        username: dcUser,
        channelName: channelName,
        category: getTicketCategorySlug(cat),
        subject: cat,
        message: formattedFirstMsg,
        userDossier: dossier
      })
    }).then(r => r.json()).then(res => {
      if (res && res.success) {
        localStorage.setItem('syntax_dc_ticket_opened_' + chatKey, 'true');
      }
    }).catch(() => {});

    if (typeof showToast === 'function') {
      showToast(`Destek talebiniz oluşturuldu! Özel kanal #${channelName} yetkililere iletildi.`, 'check-circle');
    }

    if (msgInp) msgInp.value = '';
  }

  function bindTicketSubmitButton() {
    const btn = document.getElementById('btnSubmitNewTicket');
    if (btn) btn.onclick = handleTicketSubmit;
  }
  bindTicketSubmitButton();

  // Customer quick topic chips
  const customerQuickChips = widget.querySelectorAll('.crisp-user-chip');
  customerQuickChips.forEach(chip => {
    chip.onclick = () => {
      const qText = chip.getAttribute('data-quick');
      if (qText && textarea) {
        textarea.value = qText;
        sendMessage();
      }
    };
  });

  // Audio chime synthesized via Web Audio API for incoming staff messages
  function playStaffChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(587.33, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      osc2.frequency.setValueAtTime(880, now + 0.1);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc2.start(now + 0.1);
      osc1.stop(now + 0.1);
      osc2.stop(now + 0.35);
    } catch (e) {}
  }

  // --- STATE & PERSISTENCE ---
  function getChatKeyForUser(username) {
    if (!username) return 'syntax_chat_anonymous';
    return 'syntax_chat_user_' + username.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }
  function getCurrentChatKey() {
    try {
      const cu = JSON.parse(localStorage.getItem('syntax_current_user_v3') || 'null');
      return getChatKeyForUser(cu ? cu.username : null);
    } catch (e) { return 'syntax_chat_anonymous'; }
  }
  window._getChatKeyForUser = getChatKeyForUser;
  window._getChatKeyForAnonymous = () => 'syntax_chat_anonymous';

  const ADMIN_STORAGE_KEY = 'syntax_chat_admin_mode';

  let isAdminMode = localStorage.getItem(ADMIN_STORAGE_KEY) === 'true';

  function getHistory() {
    try {
      const raw = localStorage.getItem(getCurrentChatKey());
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [
      {
        sender: 'bot',
        text: '👋 Merhaba! Syntax Software canlı destek hattına hoş geldiniz. Mesajınız anında Discord yetkili ekibimize köprülenir. Size nasıl yardımcı olabiliriz?',
        time: ''
      }
    ];
  }

  function saveMessage(sender, text, time) {
    const list = getHistory();
    list.push({ sender, text, time });
    localStorage.setItem(getCurrentChatKey(), JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('syntax_chat_updated', { detail: { key: getCurrentChatKey() } }));
  }

  function formatCurrentTime() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function createMessageElement(msg) {
    const row = document.createElement('div');
    if (msg.sender === 'user') {
      row.className = 'crisp-msg-row outgoing';
      row.innerHTML = `<div class="crisp-msg-bubble">${escapeHtml(msg.text)}</div>`;
    } else if (msg.sender === 'staff' || msg.sender === 'admin') {
      const isDiscord = msg.source === 'discord' || (msg.author && (msg.author.toLowerCase().includes('discord') || msg.author.includes('#')));
      const authorTitle = msg.author || 'Syntax Destek Yetkilisi';
      row.className = 'crisp-msg-row incoming staff-row' + (isDiscord ? ' discord-staff' : '');
      row.innerHTML = `
        <div class="crisp-msg-avatar staff-avatar" style="${isDiscord ? 'background:#5865F2 !important; box-shadow:0 0 10px rgba(88,101,242,0.6);' : ''}" title="${escapeHtml(authorTitle)}">
          ${isDiscord ? `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#ffffff"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
          ` : `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          `}
        </div>
        <div class="crisp-msg-bubble staff-bubble">
          <div class="crisp-staff-badge-row">
            <span class="crisp-staff-name" style="${isDiscord ? 'color:#5865F2;' : ''}">${escapeHtml(authorTitle)}</span>
            <span class="crisp-admin-pill" style="${isDiscord ? 'background:#5865F2 !important; color:#ffffff !important;' : ''}">${isDiscord ? 'DISCORD' : 'YÖNETİCİ'}</span>
          </div>
          <div class="crisp-staff-text">${escapeHtml(msg.text)}</div>
          ${msg.time ? `<div class="crisp-staff-timestamp">${escapeHtml(msg.time)}</div>` : ''}
        </div>
      `;
    } else {
      // bot
      row.className = 'crisp-msg-row incoming';
      row.innerHTML = `
        <div class="crisp-msg-avatar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        </div>
        <div class="crisp-msg-bubble">${escapeHtml(msg.text)}</div>
      `;
    }
    return row;
  }

  function renderHistory() {
    if (!messagesContainer) return;
    messagesContainer.innerHTML = '';
    const list = getHistory();
    list.forEach(msg => {
      messagesContainer.appendChild(createMessageElement(msg));
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function clearHistory() {
    localStorage.removeItem(getCurrentChatKey());
    renderHistory();
    window.dispatchEvent(new CustomEvent('syntax_chat_updated', { detail: { key: getCurrentChatKey() } }));
    if (window.showToast) showToast('Sohbet geçmişi temizlendi.', 'trash-2');
  }

  function setAdminMode(active, notify = false) {
    isAdminMode = !!active;
    localStorage.setItem(ADMIN_STORAGE_KEY, isAdminMode ? 'true' : 'false');

    if (isAdminMode) {
      widget.classList.add('admin-active');
      if (adminToggleBtn) adminToggleBtn.classList.add('active');
      if (adminBanner) adminBanner.style.display = 'flex';
      if (adminQuickbar) adminQuickbar.style.display = 'flex';
      if (textarea) textarea.placeholder = 'Yönetici olarak cevap yazın... (Enter)';
      if (optAdminText) optAdminText.textContent = 'Müşteri Moduna Dön';
      if (notify && window.showToast) {
        showToast('Yönetici Modu Açık: Artık yetkili olarak yanıt veriyorsunuz.', 'shield-check');
      }
    } else {
      widget.classList.remove('admin-active');
      if (adminToggleBtn) adminToggleBtn.classList.remove('active');
      if (adminBanner) adminBanner.style.display = 'none';
      if (adminQuickbar) adminQuickbar.style.display = 'none';
      if (textarea) textarea.placeholder = 'Sorunuzu veya mesajınızı buraya yazın... (Enter)';
      if (optAdminText) optAdminText.textContent = 'Yönetici Modunu Aç';
      if (notify && window.showToast) {
        showToast('Müşteri Moduna Geçildi.', 'user');
      }
    }
  }

  // Initial load
  renderHistory();
  setAdminMode(isAdminMode, false);

  // Bi-directional Discord Bridge Poller (Fetch Discord responses back to web)
  let _dcSyncInterval = null;
  function pollDiscordTicketReplies(fast = false) {
    if (_dcSyncInterval) clearInterval(_dcSyncInterval);
    const intervalMs = fast ? 1500 : 4000;
    _dcSyncInterval = setInterval(async () => {
      const curKey = getCurrentChatKey();
      if (!curKey || curKey === 'syntax_chat_anonymous') return;
      try {
        const res = await fetch(`http://127.0.0.1:5055/api/ticket/messages?chatKey=${encodeURIComponent(curKey)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.messages && Array.isArray(data.messages)) {
          const localList = getHistory();
          let updated = false;
          data.messages.forEach(srvMsg => {
            if (srvMsg.sender === 'staff' || srvMsg.sender === 'admin') {
              const exists = localList.some(lm => 
                (lm.sender === 'staff' || lm.sender === 'admin') && 
                lm.text === srvMsg.text &&
                (Math.abs((lm.timestamp || 0) - (srvMsg.timestamp || 0)) < 20)
              );
              if (!exists) {
                localList.push({
                  sender: 'staff',
                  author: srvMsg.author || 'Discord Destek Yetkilisi',
                  text: srvMsg.text,
                  time: srvMsg.time || formatCurrentTime(),
                  timestamp: srvMsg.timestamp || Date.now(),
                  source: 'discord'
                });
                updated = true;
              }
            }
          });
          if (updated) {
            localStorage.setItem(curKey, JSON.stringify(localList));
            renderHistory();
            playStaffChime();
            const statusText = document.getElementById('crispTicketStatusText');
            if (statusText) statusText.textContent = '● Discord Yetkilisi Yanıtladı';
            if (window.showToast) {
              window.showToast('💬 Discord Yetkilisinden yeni bilet yanıtı geldi!', 'message-circle');
            }
          }
        }
      } catch (err) {
        // Bridge might be idle or offline
      }
    }, intervalMs);
  }
  pollDiscordTicketReplies(false);

  // Real-time synchronization: update Crisp live chat when admin replies or ticket changes
  window.addEventListener('syntax_chat_updated', (e) => {
    if (!e.detail || !e.detail.key || e.detail.key === getCurrentChatKey()) {
      renderHistory();
    }
  });
  window.addEventListener('storage', (e) => {
    if (e.key === getCurrentChatKey()) {
      renderHistory();
    }
  });

  function toggleWidget(open) {
    if (open === undefined) {
      widget.classList.toggle('active');
    } else if (open) {
      widget.classList.add('active');
    } else {
      widget.classList.remove('active');
    }

    const isOpen = widget.classList.contains('active');
    pollDiscordTicketReplies(isOpen);

    if (isOpen) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      if (textarea) {
        setTimeout(() => textarea.focus(), 150);
      }
    }
  }

  chatButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleWidget();
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => toggleWidget(false));
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && widget.classList.contains('active')) {
      if (optionsMenu && optionsMenu.style.display === 'flex') {
        optionsMenu.style.display = 'none';
      } else {
        toggleWidget(false);
      }
    }
  });

  // Crisp Official Live Chat Bridge & Messages Pill Link
  const messagesPill = document.getElementById('crispMessagesPill');
  const optConnectCrisp = document.getElementById('crispOptConnectCrisp');

  window.$crisp = window.$crisp || [];
  window.CRISP_WEBSITE_ID = window.CRISP_WEBSITE_ID || localStorage.getItem('syntax_crisp_website_id') || "";

  function loadOfficialCrisp(id) {
    if (!id) return;
    window.CRISP_WEBSITE_ID = id;
    localStorage.setItem('syntax_crisp_website_id', id);
    if (!document.getElementById('crispOfficialScript')) {
      const s = document.createElement("script");
      s.id = 'crispOfficialScript';
      s.src = "https://client.crisp.chat/l.js";
      s.async = 1;
      document.getElementsByTagName("head")[0].appendChild(s);
    }
    try {
      if (window.$crisp && window.$crisp.push) {
        window.$crisp.push(['do', 'chat:open']);
      }
    } catch(e) {}
  }

  if (window.CRISP_WEBSITE_ID) {
    loadOfficialCrisp(window.CRISP_WEBSITE_ID);
  }

  function handleCrispConnectAction() {
    if (window.$crisp && window.CRISP_WEBSITE_ID) {
      try {
        window.$crisp.push(['do', 'chat:open']);
        if (window.showToast) showToast('Crisp Canlı Destek açıldı.', 'check');
        return;
      } catch(e) {}
    }
    const currentId = window.CRISP_WEBSITE_ID || '';
    const userPrompt = prompt('Crisp Canlı Destek Website ID giriniz (veya doğrudan Crisp paneline gitmek için Tamam\'a basınız):', currentId);
    if (userPrompt && userPrompt.trim()) {
      loadOfficialCrisp(userPrompt.trim());
      if (window.showToast) showToast('Crisp canlı desteği başarıyla bağlandı!', 'check');
    } else if (userPrompt !== null) {
      window.open('https://go.crisp.chat', '_blank');
    }
  }

  if (messagesPill) {
    messagesPill.addEventListener('click', () => {
      handleCrispConnectAction();
    });
    messagesPill.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCrispConnectAction();
      }
    });
  }

  if (optConnectCrisp) {
    optConnectCrisp.addEventListener('click', () => {
      if (optionsMenu) optionsMenu.style.display = 'none';
      handleCrispConnectAction();
    });
  }

  // Admin button listeners
  if (adminToggleBtn) {
    adminToggleBtn.addEventListener('click', () => {
      setAdminMode(!isAdminMode, true);
    });
  }

  if (adminExitBtn) {
    adminExitBtn.addEventListener('click', () => {
      setAdminMode(false, true);
    });
  }

  if (optToggleAdmin) {
    optToggleAdmin.addEventListener('click', () => {
      setAdminMode(!isAdminMode, true);
      if (optionsMenu) optionsMenu.style.display = 'none';
    });
  }

  if (optClearHistory) {
    optClearHistory.addEventListener('click', () => {
      clearHistory();
      if (optionsMenu) optionsMenu.style.display = 'none';
    });
  }

  if (clearChatChip) {
    clearChatChip.addEventListener('click', () => {
      clearHistory();
    });
  }

  // Quick reply chips
  if (adminQuickbar) {
    adminQuickbar.querySelectorAll('.crisp-quick-chip[data-reply]').forEach(chip => {
      chip.addEventListener('click', () => {
        const replyText = chip.getAttribute('data-reply');
        sendMessage(replyText);
      });
    });
  }

  // Helper: Collect complete user registration dossier for Discord Embed (CONFIDENTIAL - never shown to user in web chat)
  function collectFullUserDossier(curUser) {
    if (!curUser) {
      return {
        fullName: 'Ziyaretçi (Giriş Yapılmamış)',
        username: 'misafir',
        email: 'web-ziyaretci@syntaxsoftware.com',
        phone: 'Belirtilmemiş',
        role: 'Ziyaretçi',
        createdAt: new Date().toLocaleDateString('tr-TR'),
        ip: 'Web İstemcisi (' + (window.location.hostname || 'localhost') + ')',
        deviceInfo: navigator.userAgent ? (navigator.userAgent.includes('Windows') ? 'Windows PC / Chrome' : navigator.userAgent.substring(0, 40)) : 'Bilinmiyor',
        licenses: [],
        orders: []
      };
    }

    let allUsers = [];
    try {
      allUsers = JSON.parse(localStorage.getItem('syntax_users_v3') || '[]');
    } catch (e) {}
    const fullUser = allUsers.find(u => u.username && curUser.username && u.username.toLowerCase() === curUser.username.toLowerCase()) || curUser;

    let allOrders = [];
    try {
      allOrders = JSON.parse(localStorage.getItem('syntax_shopier_orders') || '[]');
    } catch (e) {}
    const userOrders = allOrders.filter(o => 
      (o.customer && curUser.username && o.customer.toLowerCase() === curUser.username.toLowerCase()) ||
      (o.email && curUser.email && o.email.toLowerCase() === curUser.email.toLowerCase()) ||
      (o.phone && curUser.phone && o.phone === curUser.phone)
    );

    return {
      fullName: fullUser.fullName || fullUser.name || curUser.username,
      username: curUser.username,
      email: fullUser.email || curUser.email || 'Belirtilmemiş',
      phone: fullUser.phone || curUser.phone || 'Belirtilmemiş',
      role: fullUser.role === 'owner' ? 'Owner (Kurucu)' : (fullUser.role === 'admin' ? 'Admin' : (fullUser.rank || 'Müşteri')),
      createdAt: fullUser.createdAt || fullUser.registeredDate || new Date().toLocaleDateString('tr-TR'),
      ip: 'Web İstemcisi (' + (window.location.hostname || 'localhost') + ')',
      deviceInfo: navigator.userAgent ? (navigator.userAgent.includes('Windows') ? 'Windows PC / Chrome' : navigator.userAgent.substring(0, 45)) : 'Bilinmiyor',
      licenses: fullUser.licenses || [],
      orders: userOrders
    };
  }

  function sendMessage(textOverride) {
    const text = (textOverride || (textarea ? textarea.value : '')).trim();
    if (!text) return;

    let curUser = null;
    try {
      curUser = JSON.parse(localStorage.getItem('syntax_current_user_v3'));
    } catch (e) {}

    if (!isAdminMode) {
      if (!curUser) {
        if (window.showToast) window.showToast('Canlı destek ve sohbete katılabilmek için lütfen önce üye girişi yapınız!', 'alert-circle');
        if (typeof window.openAuthModal === 'function') {
          window.openAuthModal('user');
        }
        return;
      }
    }

    const timeStr = formatCurrentTime();

    if (isAdminMode) {
      // Send as verified Admin / Staff
      const msgObj = { sender: 'staff', text: text, time: timeStr, author: (curUser && curUser.username) ? curUser.username : 'Yönetici' };
      saveMessage('staff', text, timeStr);
      messagesContainer.appendChild(createMessageElement(msgObj));
      if (!textOverride && textarea) {
        textarea.value = '';
        textarea.style.height = '38px';
      }
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      if (window.showToast) showToast('Yönetici mesajı iletildi.', 'check');

      // Forward to Discord bridge as staff reply
      const cKey = getCurrentChatKey();
      fetch('http://127.0.0.1:5055/api/ticket/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatKey: cKey,
          username: curUser ? curUser.username : 'Yönetici',
          sender: 'staff',
          text: text
        })
      }).catch(() => {});
      return;
    }

    // Customer message
    // CRITICAL: Only the text message is rendered to the user. Dossier is NEVER rendered on web!
    const userMsgObj = { sender: 'user', text: text, time: timeStr };
    saveMessage('user', text, timeStr);
    messagesContainer.appendChild(createMessageElement(userMsgObj));

    if (!textOverride && textarea) {
      textarea.value = '';
      textarea.style.height = '38px';
    }
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // --- DISCORD BOT INTEGRATION DISPATCH ---
    const chatKey = getCurrentChatKey();
    const isTicketAlreadyOpened = localStorage.getItem('syntax_dc_ticket_opened_' + chatKey);

    if (!isTicketAlreadyOpened) {
      // First message: Open ticket in Discord with FULL USER REGISTRATION DOSSIER
      const userDossier = collectFullUserDossier(curUser);
      fetch('http://127.0.0.1:5055/api/ticket/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatKey: chatKey,
          username: curUser ? curUser.username : 'Müşteri',
          message: text,
          userDossier: userDossier
        })
      }).then(r => r.json()).then(res => {
        if (res && res.success) {
          localStorage.setItem('syntax_dc_ticket_opened_' + chatKey, 'true');
          console.log('[Discord Bridge] Ticket embed sent to Discord:', res);
        }
      }).catch(err => {
        console.log('[Discord Bridge] Offline/local note:', err.message);
      });
    } else {
      // Subsequent messages from customer: Forward to Discord
      fetch('http://127.0.0.1:5055/api/ticket/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatKey: chatKey,
          username: curUser ? curUser.username : 'Müşteri',
          sender: 'user',
          text: text
        })
      }).catch(() => {});
    }

    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'crisp-msg-row incoming';
    typingIndicator.id = 'crispTyping';
    typingIndicator.innerHTML = `
      <div class="crisp-msg-avatar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      </div>
      <div class="crisp-typing-bubble">
        <div class="crisp-typing-dot"></div>
        <div class="crisp-typing-dot"></div>
        <div class="crisp-typing-dot"></div>
      </div>
    `;
    messagesContainer.appendChild(typingIndicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Bot response
    setTimeout(() => {
      const typingElem = document.getElementById('crispTyping');
      if (typingElem) typingElem.remove();

      let reply = "Mesajınız için teşekkürler! Destek ekibimiz aktif olduğunda size buradan dönüş yapacaktır. Anında canlı destek almak için resmi Discord sunucumuza da katılabilirsiniz: https://discord.gg/wFaNxzyMU";

      const lower = text.toLowerCase();
      if (lower.includes('spoofer') || lower.includes('hwid') || lower.includes('van 152') || lower.includes('val 5')) {
        reply = " Spoofer Seçeneklerimiz:\n• t3mp spoofer (Onetime: 1.200 TL / Lifetime: 1.700 TL)\n• p3rm spoofer (Onetime: 1.500 TL / Lifetime: 2.500 TL)\nVAN 152 & VAL 5 bypass tam desteklidir.";
      } else if (lower.includes('emulator') || lower.includes('vanguard')) {
        reply = " Vanguard Emulator: 3 Günlük $39.99, 1 Haftalık $69.99, 1 Aylık $199.99, Lifetime $400. Format veya BIOS gerektirmez, VAN 102, VAL 5, VAN 79, VAN 152 hatalarını çözer!";
      } else if (lower.includes('cs') || lower.includes('cs2') || lower.includes('counter')) {
        reply = " CS2 External & Private Hilelerimiz:\n• Günlük: 340 TL\n• 3 Günlük: 1.000 TL\n• 7 Günlük: 1.500 TL\n• 30 Günlük: 2.300 TL\nAimbot, ESP, Stream Proof ve tam HVCI/TPM uyumludur.";
      } else if (lower.includes('fiyat') || lower.includes('ücret') || lower.includes('kaç') || lower.includes('tl') || lower.includes('para') || lower.includes('fiyatı')) {
        reply = "Tüm güncel Valorant ve Counter-Strike 2 yazılımlarımızın fiyatlarını 'Ürünler' (Mağaza) sayfamızdan inceleyebilir veya Discord sunucumuzdan destek alabilirsiniz!";
      } else if (lower.includes('ban') || lower.includes('risk') || lower.includes('durum') || lower.includes('güven')) {
        reply = "Tüm ürünlerimizin anlık durumunu 'Durum' sayfamızdan kontrol edebilirsiniz. p3rm, t3mp spoofer, emulator ve slotted ürünlerimiz şu anda tamamen UNDETECTED durumdadır.";
      } else if (lower.includes('bayi') || lower.includes('reseller') || lower.includes('panel')) {
        reply = " Bayi Programı: Kendi markanız, otomatik API teslimatı ve sınırsız lisans üretimi ile %100 white-label panel başlatabilirsiniz. 'Bayi' sayfamızdan detayları inceleyebilirsiniz.";
      } else if (lower.includes('selam') || lower.includes('merhaba') || lower.includes('sa')) {
        reply = "Merhaba! Syntax Software canlı desteğe hoş geldiniz. Size hangi ürünümüz hakkında yardımcı olabiliriz?";
      }

      saveMessage('bot', reply, formatCurrentTime());
      const botMsgObj = { sender: 'bot', text: reply, time: '' };
      messagesContainer.appendChild(createMessageElement(botMsgObj));
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 1000);
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', () => sendMessage());
  }

  if (textarea) {
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 85) + 'px';
    });
  }

  // Emoji popover toggle
  if (emojiTrigger && emojiPopover) {
    emojiTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      emojiPopover.classList.toggle('active');
    });

    emojiPopover.querySelectorAll('.crisp-emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        textarea.value += btn.textContent;
        emojiPopover.classList.remove('active');
        textarea.focus();
      });
    });

    document.addEventListener('click', (e) => {
      if (!emojiPopover.contains(e.target) && e.target !== emojiTrigger) {
        emojiPopover.classList.remove('active');
      }
    });
  }

  // Attach & Audio buttons
  const attachBtn = document.getElementById('crispAttachBtn');
  if (attachBtn) {
    attachBtn.addEventListener('click', () => {
      if (window.showToast) showToast('Dosya ve ekran görüntüsü paylaşımı için lütfen Discord bilet sistemimizi kullanın: https://discord.gg/wFaNxzyMU');
    });
  }

  const audioBtn = document.getElementById('crispAudioBtn');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      let curUser = null;
      try {
        curUser = JSON.parse(localStorage.getItem('syntax_current_user_v3'));
      } catch (e) {}

      if (!curUser) {
        if (window.showToast) window.showToast('Sesli sohbet ve canlı destek için lütfen önce üye girişi yapınız!', 'alert-circle');
        if (typeof window.openAuthModal === 'function') {
          window.openAuthModal('user');
        }
        return;
      }

      if (window.showToast) window.showToast('️ Canlı sesli destek odası açılıyor... Mikrofon bağlantısı kuruluyor.', 'mic');
      setTimeout(() => {
        if (window.showToast) window.showToast('️ Sesli destek yetkilisine bağlanıldı. Konuşabilirsiniz.', 'check-circle');
      }, 1200);
    });
  }

  // Options button
  if (optionsBtn && optionsMenu) {
    optionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      optionsMenu.style.display = optionsMenu.style.display === 'flex' ? 'none' : 'flex';
    });

    document.addEventListener('click', (e) => {
      if (!optionsMenu.contains(e.target) && e.target !== optionsBtn) {
        optionsMenu.style.display = 'none';
      }
    });
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

/* ==========================================================================
   TOAST NOTIFICATION ENGINE
   ========================================================================== */
let toastTimeout = null;
function showToast(message, iconName = 'check-circle') {
  let toast = document.querySelector('.syntax-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'syntax-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="syntax-toast-icon"></i>
    <span>${message}</span>
  `;
  if (window.lucide) window.lucide.createIcons();
  toast.classList.add('active');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('active');
  }, 3200);
}
window.showToast = showToast;

/* ==========================================================================
   LANGUAGE DROPDOWN & BIDIRECTIONAL FULL-SITE I18N ENGINE
   ========================================================================== */
const LANG_DATA = {
  tr: {
    name: 'Türkçe',
    code: 'TR',
    flagSvg: `<svg viewBox="0 0 1200 800" width="18" height="12"><rect width="1200" height="800" fill="#E30A17"/><circle cx="425" cy="400" r="200" fill="#ffffff"/><circle cx="475" cy="400" r="160" fill="#E30A17"/><polygon points="583.33,400 706.87,440.14 630.52,335.86 630.52,464.14 706.87,359.86" fill="#ffffff"/></svg>`,
    toast: 'Dil Türkçe olarak güncellendi.',
    countWord: 'ürün',
    labels: {
      home1: 'Ana',
      home2: 'sayfa',
      products: 'Ürünler',
      reseller: 'Bayi',
      status: 'Durum',
      terms: 'Şartlar',
      support: 'Destek',
      cart: 'Sepet',
      panel: 'Panel',
      panel_login: 'Panel / Giriş'
    }
  },
  en: {
    name: 'English',
    code: 'EN',
    flagSvg: `<svg viewBox="0 0 60 30" width="18" height="12"><clipPath id="flag-en-c1"><path d="M0,0 v30 h60 v-30 z"/></clipPath><clipPath id="flag-en-c2"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath><g clip-path="url(#flag-en-c1)"><path d="M0,0 v30 h60 v-30 z" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#flag-en-c2)" stroke="#C8102E" stroke-width="4"/><path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/></g></svg>`,
    toast: 'Language changed to English.',
    countWord: 'products',
    labels: {
      home1: 'Home',
      home2: 'page',
      products: 'Products',
      reseller: 'Reseller',
      status: 'Status',
      terms: 'Terms',
      support: 'Support',
      cart: 'Cart',
      panel: 'Panel',
      panel_login: 'Panel / Login'
    }
  },
  de: {
    name: 'Deutsch',
    code: 'DE',
    flagSvg: `<svg viewBox="0 0 5 3" width="18" height="12"><rect width="5" height="1" y="0" fill="#000000"/><rect width="5" height="1" y="1" fill="#DD0000"/><rect width="5" height="1" y="2" fill="#FFCE00"/></svg>`,
    toast: 'Sprache auf Deutsch umgestellt.',
    countWord: 'Produkte',
    labels: {
      home1: 'Start',
      home2: 'seite',
      products: 'Produkte',
      reseller: 'Reseller',
      status: 'Status',
      terms: 'AGB',
      support: 'Support',
      cart: 'Warenkorb',
      panel: 'Panel',
      panel_login: 'Panel / Anmelden'
    }
  },
  ru: {
    name: 'Русский',
    code: 'RU',
    flagSvg: `<svg viewBox="0 0 3 2" width="18" height="12"><rect width="3" height="2" fill="#d52b1e"/><rect width="3" height="1.333" fill="#0039a6"/><rect width="3" height="0.667" fill="#ffffff"/></svg>`,
    toast: 'Язык переключен на Русский.',
    countWord: 'товаров',
    labels: {
      home1: 'Глав',
      home2: 'ная',
      products: 'Товары',
      reseller: 'Реселлерам',
      status: 'Статус',
      terms: 'Правила',
      support: 'Поддержка',
      cart: 'Корзина',
      panel: 'Панель',
      panel_login: 'Панель / Вход'
    }
  }
};

/* COMPREHENSIVE FULL-SITE I18N DICTIONARY (409 Phrases) */
const I18N_PHRASES = [
  {"tr": "Alışveriş Sepeti", "en": "Shopping Cart", "de": "Warenkorb", "ru": "Корзина покупок"},
  {"tr": "Sepetiniz Boş", "en": "Your Cart is Empty", "de": "Ihr Warenkorb ist leer", "ru": "Ваша корзина пуста"},
  {"tr": "Henüz sepetinize bir ürün eklemediniz.", "en": "You haven't added any products to your cart yet.", "de": "Sie haben noch keine Produkte hinzugefügt.", "ru": "Вы еще не добавили товары в корзину."},
  {"tr": "Avantajlı paketlerimizi inceleyin.", "en": "Explore our advantageous packages.", "de": "Entdecken Sie unsere Vorteils-Pakete.", "ru": "Ознакомьтесь с нашими пакетами."},
  {"tr": "Ürünleri İncele", "en": "Browse Products", "de": "Produkte ansehen", "ru": "Просмотреть товары"},
  {"tr": "Ödemeye Geç", "en": "Proceed to Checkout", "de": "Zur Kasse", "ru": "Перейти к оплате"},
  {"tr": "Ara Toplam", "en": "Subtotal", "de": "Zwischensumme", "ru": "Подытог"},
  {"tr": "Genel Toplam", "en": "Total", "de": "Gesamtsumme", "ru": "Итого"},
  {"tr": "Sepete Dön", "en": "Back to Cart", "de": "Zurück zum Warenkorb", "ru": "Назад в корзину"},
  {"tr": "Ödeme Yöntemi", "en": "Payment Method", "de": "Zahlungsmethode", "ru": "Способ оплаты"},
  {"tr": "Ödeme Yöntemi Seçin", "en": "Select Payment Method", "de": "Zahlungsart wählen", "ru": "Выберите способ оплаты"},
  {"tr": "Kredi / Banka Kartı", "en": "Credit / Debit Card", "de": "Kredit- / Debitkarte", "ru": "Кредитная / Дебетовая карта"},
  {"tr": "Havale / EFT / FAST", "en": "Bank Transfer / FAST", "de": "Banküberweisung / FAST", "ru": "Банковский перевод / FAST"},
  {"tr": "Kripto Para", "en": "Cryptocurrency", "de": "Kryptowährung", "ru": "Криптовалюта"},
  {"tr": "3D Secure ile Anında Teslimat", "en": "Instant Delivery with 3D Secure", "de": "Sofortige Lieferung mit 3D Secure", "ru": "Мгновенная выдача с 3D Secure"},
  {"tr": "TR Bankaları & FAST", "en": "TR Banks & FAST Transfer", "de": "TR Banken & FAST Transfer", "ru": "Банки Турции и FAST"},
  {"tr": "USDT, LTC, BTC", "en": "USDT, LTC, BTC", "de": "USDT, LTC, BTC", "ru": "USDT, LTC, BTC"},
  {"tr": "Ad Soyad", "en": "Full Name", "de": "Vollständiger Name", "ru": "Имя и Фамилия"},
  {"tr": "E-posta Adresi", "en": "Email Address", "de": "E-Mail-Adresse", "ru": "Электронная почта"},
  {"tr": "Telefon Numarası", "en": "Phone Number", "de": "Telefonnummer", "ru": "Номер телефона"},
  {"tr": "Shopier ile Güvenli Öde", "en": "Pay Securely with Shopier", "de": "Sicher bezahlen mit Shopier", "ru": "Безопасная оплата через Shopier"},
  {"tr": "Alıcı", "en": "Recipient", "de": "Empfänger", "ru": "Получатель"},
  {"tr": "Banka", "en": "Bank", "de": "Bank", "ru": "Банк"},
  {"tr": "IBAN Numarası", "en": "IBAN Number", "de": "IBAN-Nummer", "ru": "Номер IBAN"},
  {"tr": "Sipariş Referans Kodu", "en": "Order Reference Code", "de": "Bestell-Referenzcode", "ru": "Код заказа"},
  {"tr": "Kopyala", "en": "Copy", "de": "Kopieren", "ru": "Копировать"},
  {"tr": "Kopyalandı!", "en": "Copied!", "de": "Kopiert!", "ru": "Скопировано!"},
  {"tr": "Gönderen Adı Soyadı", "en": "Sender Full Name", "de": "Name des Absenders", "ru": "Имя отправителя"},
  {"tr": "WhatsApp ile Dekont İlet", "en": "Send Receipt via WhatsApp", "de": "Beleg per WhatsApp senden", "ru": "Отправить чек через WhatsApp"},
  {"tr": "Ödemeyi Bildir ve Tamamla", "en": "Confirm Transfer & Finish", "de": "Zahlung melden & abschließen", "ru": "Подтвердить перевод"},
  {"tr": "Cüzdan Adresi", "en": "Wallet Address", "de": "Wallet-Adresse", "ru": "Адрес кошелька"},
  {"tr": "İşlem TXID / Hash Kodu", "en": "Transaction TXID / Hash", "de": "Transaktions-TXID / Hash", "ru": "TXID / Хэш транзакции"},
  {"tr": "Kripto Ödemesini Doğrula", "en": "Verify Crypto Payment", "de": "Krypto-Zahlung verifizieren", "ru": "Подтвердить криптоплатеж"},
  {"tr": "Siparişiniz Başarıyla Alındı!", "en": "Order Received Successfully!", "de": "Bestellung erfolgreich erhalten!", "ru": "Заказ успешно принят!"},
  {"tr": "Ödemeniz onaylandı. Lisans anahtarınız ve yazılımınız hazır.", "en": "Payment confirmed. Your license key and software are ready.", "de": "Zahlung bestätigt. Ihr Lizenzschlüssel und Ihre Software sind bereit.", "ru": "Оплата подтверждена. Ваш ключ лицензии и программа готовы."},
  {"tr": "Lisans Anahtarınız", "en": "Your License Key", "de": "Ihr Lizenzschlüssel", "ru": "Ваш лицензионный ключ"},
  {"tr": "Syntax Loader İndir (.exe)", "en": "Download Syntax Loader (.exe)", "de": "Syntax Loader herunterladen (.exe)", "ru": "Скачать Syntax Loader (.exe)"},
  {"tr": "Müşteri Paneline Git", "en": "Go to Customer Dashboard", "de": "Zum Kundenbereich", "ru": "В личный кабинет"},
  {"tr": "Alışverişe Devam Et", "en": "Continue Shopping", "de": "Weiter einkaufen", "ru": "Продолжить покупки"},
  {"tr": "Ürün sepete eklendi!", "en": "Product added to cart!", "de": "Produkt zum Warenkorb hinzugefügt!", "ru": "Товар добавлен в корзину!"},
  {"tr": "Sepetten çıkarıldı", "en": "Removed from cart", "de": "Aus dem Warenkorb entfernt", "ru": "Удалено из корзины"},
  {"tr": "Ödenecek Tutar", "en": "Amount to Pay", "de": "Zu zahlender Betrag", "ru": "Сумма к оплате"},
  {"tr": "Sipariş No", "en": "Order No", "de": "Bestellnummer", "ru": "Номер заказа"},
  {"tr": "Satın Alınan Ürünler", "en": "Purchased Items", "de": "Gekaufte Artikel", "ru": "Купленные товары"},
  {"tr": "Havale Bildirimi Alındı", "en": "Transfer Notification Received", "de": "Überweisungsbestätigung erhalten", "ru": "Уведомление о переводе получено"},
  {"tr": "Kripto Ödeme Bildirimi Alındı", "en": "Crypto Payment Received", "de": "Krypto-Zahlung erhalten", "ru": "Криптоплатеж получен"},
  {"tr": "Ödeme güvenliği için lütfen formu eksiksiz doldurun.", "en": "Please complete all fields for payment security.", "de": "Bitte füllen Sie alle Felder für die Zahlungssicherheit aus.", "ru": "Пожалуйста, заполните все поля для безопасности платежа."},
  {"tr": "Lütfen havale açıklama alanına sadece sipariş kodunu yazınız.", "en": "Please write only the order code in the bank transfer note.", "de": "Bitte geben Sie im Überweisungszweck nur den Bestellcode an.", "ru": "Пожалуйста, укажите только код заказа в назначении платежа."},
  {"tr": "Lütfen geçerli bir TXID veya gönderici cüzdan adresi giriniz.", "en": "Please enter a valid TXID or sender wallet address.", "de": "Bitte geben Sie eine gültige TXID oder Senderadresse ein.", "ru": "Пожалуйста, введите корректный TXID или адрес кошелька."},
  {"tr": "Anahtarı Kopyala", "en": "Copy Key", "de": "Schlüssel kopieren", "ru": "Скопировать ключ"},
  {"tr": "Anahtar Panoya Kopyalandı!", "en": "Key Copied to Clipboard!", "de": "Schlüssel in die Zwischenablage kopiert!", "ru": "Ключ скопирован в буфер обмена!"},

  {
    "tr": "Anında teslim",
    "en": "Instant delivery",
    "de": "Sofortige Lieferung",
    "ru": "Мгновенная выдача"
  },
  {
    "tr": "Humanizer Delay ve Tıklama Koruması",
    "en": "Humanizer Delay & Click Protection",
    "de": "Humanizer-Verzögerung & Klickschutz",
    "ru": "Хуманизированная задержка и защита кликов"
  },
  {
    "tr": "Mağaza",
    "en": "Store",
    "de": "Store",
    "ru": "Магазин"
  },
  {
    "tr": "Syntax Software",
    "en": "Syntax Software",
    "de": "Syntax Software",
    "ru": "Syntax Software"
  },
  {
    "tr": "Valorant",
    "en": "Valorant",
    "de": "Valorant",
    "ru": "Valorant"
  },
  {
    "tr": "Ana sayfa",
    "en": "Home page",
    "de": "Startseite",
    "ru": "Главная"
  },
  {
    "tr": "Ana",
    "en": "Home",
    "de": "Start",
    "ru": "Глав"
  },
  {
    "tr": "sayfa",
    "en": "page",
    "de": "seite",
    "ru": "ная"
  },
  {
    "tr": "Ürünler",
    "en": "Products",
    "de": "Produkte",
    "ru": "Товары"
  },
  {
    "tr": "Bayi",
    "en": "Reseller",
    "de": "Reseller",
    "ru": "Реселлерам"
  },
  {
    "tr": "Durum",
    "en": "Status",
    "de": "Status",
    "ru": "Статус"
  },
  {
    "tr": "Şartlar",
    "en": "Terms",
    "de": "AGB",
    "ru": "Правила"
  },
  {
    "tr": "Destek",
    "en": "Support",
    "de": "Support",
    "ru": "Поддержка"
  },
  {
    "tr": "Sepet",
    "en": "Cart",
    "de": "Warenkorb",
    "ru": "Корзина"
  },
  {
    "tr": "Panel",
    "en": "Panel",
    "de": "Panel",
    "ru": "Панель"
  },
  {
    "tr": "VALORANT HİLELERİ",
    "en": "VALORANT SOFTWARE",
    "de": "VALORANT SOFTWARE",
    "ru": "VALORANT ЧИТЫ"
  },
  {
    "tr": "Valorant Hileleri",
    "en": "Valorant Software",
    "de": "Valorant Software",
    "ru": "Valorant Читы"
  },
  {
    "tr": "HİLELERİ",
    "en": "SOFTWARE",
    "de": "SOFTWARE",
    "ru": "ЧИТЫ"
  },
  {
    "tr": "SYNTAX",
    "en": "SYNTAX",
    "de": "SYNTAX",
    "ru": "SYNTAX"
  },
  {
    "tr": "TOPLULUK",
    "en": "COMMUNITY",
    "de": "COMMUNITY",
    "ru": "СООБЩЕСТВО"
  },
  {
    "tr": "Topluluk",
    "en": "Community",
    "de": "Community",
    "ru": "Сообщество"
  },
  {
    "tr": "Topluluğa katıl",
    "en": "Join Community",
    "de": "Community beitreten",
    "ru": "Вступить в сообщество"
  },
  {
    "tr": "Discord destek",
    "en": "Discord Support",
    "de": "Discord Support",
    "ru": "Поддержка Discord"
  },
  {
    "tr": "Discord Destek",
    "en": "Discord Support",
    "de": "Discord Support",
    "ru": "Поддержка Discord"
  },
  {
    "tr": "Discord’a katıl",
    "en": "Join Discord",
    "de": "Discord beitreten",
    "ru": "Войти в Discord"
  },
  {
    "tr": "Discord Topluluğu",
    "en": "Discord Community",
    "de": "Discord Community",
    "ru": "Сообщество Discord"
  },
  {
    "tr": "Discord Kanalına Katıl",
    "en": "Join Discord Channel",
    "de": "Discord-Kanal beitreten",
    "ru": "Перейти в Discord-канал"
  },
  {
    "tr": "WhatsApp Destek",
    "en": "WhatsApp Support",
    "de": "WhatsApp Support",
    "ru": "Поддержка WhatsApp"
  },
  {
    "tr": "WhatsApp Destek Hattı",
    "en": "WhatsApp Support Line",
    "de": "WhatsApp-Support-Hotline",
    "ru": "Линия поддержки в WhatsApp"
  },
  {
    "tr": "Canlı Destek",
    "en": "Live Support",
    "de": "Live-Support",
    "ru": "Онлайн поддержка"
  },
  {
    "tr": "Bayi Programı | Syntax Software",
    "en": "Reseller Program | Syntax Software",
    "de": "Reseller-Programm | Syntax Software",
    "ru": "Партнерская программа | Syntax Software"
  },
  {
    "tr": "Mağaza | Syntax Software",
    "en": "Store | Syntax Software",
    "de": "Store | Syntax Software",
    "ru": "Магазин | Syntax Software"
  },
  {
    "tr": "Ürün Durumu | Syntax Software",
    "en": "Product Status | Syntax Software",
    "de": "Produktstatus | Syntax Software",
    "ru": "Статус продуктов | Syntax Software"
  },
  {
    "tr": "Müşteri Kuralları & Satış Sözleşmesi | Syntax Software",
    "en": "Customer Rules & Sales Agreement | Syntax Software",
    "de": "Kundenregeln & Kaufvertrag | Syntax Software",
    "ru": "Правила для клиентов и договор | Syntax Software"
  },
  {
    "tr": "Syntax Software | Premium Hileler & Güvenli Çözümler",
    "en": "Syntax Software | Premium Software & Secure Solutions",
    "de": "Syntax Software | Premium Software & Sichere Lösungen",
    "ru": "Syntax Software | Премиум Софт и Безопасные Решения"
  },
  {
    "tr": "1,994 memnun müşteri tarafından tercih ediliyor",
    "en": "Trusted by 1,994 satisfied customers",
    "de": "Von 1.994 zufriedenen Kunden gewählt",
    "ru": "Выбор более 1,994 довольных клиентов"
  },
  {
    "tr": "Premium Hileler",
    "en": "Premium Software",
    "de": "Premium Software",
    "ru": "Премиум Читы"
  },
  {
    "tr": "Gerçek Avantaj İçin",
    "en": "For Real Advantage",
    "de": "Für Echten Vorteil",
    "ru": "Для Реального Преимущества"
  },
  {
    "tr": "Tutarlılığı ve kontrolü artırmak için özel olarak geliştirilmiş, akıcı görseller ve güvenilir maç içi performans sunan araçlar.",
    "en": "Specifically engineered tools to maximize consistency and control, offering smooth visuals and reliable in-game performance.",
    "de": "Speziell entwickelte Tools zur Maximierung von Beständigkeit und Kontrolle mit flüssiger Optik und zuverlässiger Leistung.",
    "ru": "Специально разработанные инструменты для максимального контроля и стабильности с плавными визуалами и надежным геймплеем."
  },
  {
    "tr": "Mağazaya git",
    "en": "Visit Store",
    "de": "Zum Store",
    "ru": "Перейти в магазин"
  },
  {
    "tr": "Aimbot",
    "en": "Aimbot",
    "de": "Aimbot",
    "ru": "Аимбот"
  },
  {
    "tr": "ESP",
    "en": "ESP",
    "de": "ESP",
    "ru": "ESP"
  },
  {
    "tr": "Visuals",
    "en": "Visuals",
    "de": "Visuals",
    "ru": "Визуалы"
  },
  {
    "tr": "Misc",
    "en": "Misc",
    "de": "Sonstiges",
    "ru": "Разное"
  },
  {
    "tr": "Skin",
    "en": "Skin",
    "de": "Skins",
    "ru": "Скины"
  },
  {
    "tr": "Thirdperson",
    "en": "Thirdperson",
    "de": "Third-Person",
    "ru": "Вид от 3-го лица"
  },
  {
    "tr": "Effects",
    "en": "Effects",
    "de": "Effekte",
    "ru": "Эффекты"
  },
  {
    "tr": "Setup",
    "en": "Setup",
    "de": "Setup",
    "ru": "Настройка"
  },
  {
    "tr": "aimfov",
    "en": "aimfov",
    "de": "Aim-FOV",
    "ru": "Угол обзора аима"
  },
  {
    "tr": "auto wallbang",
    "en": "auto wallbang",
    "de": "Auto-Wallbang",
    "ru": "Авто прострел"
  },
  {
    "tr": "(key: =)",
    "en": "(key: =)",
    "de": "(Taste: =)",
    "ru": "(клавиша: =)"
  },
  {
    "tr": "thru smoke",
    "en": "thru smoke",
    "de": "Durch Rauch",
    "ru": "Сквозь дым"
  },
  {
    "tr": "headbox aiming",
    "en": "headbox aiming",
    "de": "Headbox-Aiming",
    "ru": "Прицел в голову"
  },
  {
    "tr": "prediction",
    "en": "prediction",
    "de": "Vorhersage",
    "ru": "Упреждение"
  },
  {
    "tr": "smooth",
    "en": "smooth",
    "de": "Glättung",
    "ru": "Сглаживание"
  },
  {
    "tr": "nospread",
    "en": "nospread",
    "de": "Keine Streuung",
    "ru": "Антиразброс"
  },
  {
    "tr": "Thumb Mouse Button",
    "en": "Thumb Mouse Button",
    "de": "Daumen-Maustaste",
    "ru": "Боковая кнопка мыши"
  },
  {
    "tr": "aimkey",
    "en": "aimkey",
    "de": "Aim-Taste",
    "ru": "Клавиша аима"
  },
  {
    "tr": "psilent",
    "en": "psilent",
    "de": "Silent-Aim",
    "ru": "Сайлент аим"
  },
  {
    "tr": "trigger",
    "en": "trigger",
    "de": "Triggerbot",
    "ru": "Триггербот"
  },
  {
    "tr": "Thumb Mouse Button 2",
    "en": "Thumb Mouse Button 2",
    "de": "Daumen-Maustaste 2",
    "ru": "Боковая кнопка мыши 2"
  },
  {
    "tr": "aimkey 2",
    "en": "aimkey 2",
    "de": "Aim-Taste 2",
    "ru": "Клавиша аима 2"
  },
  {
    "tr": "Head",
    "en": "Head",
    "de": "Kopf",
    "ru": "Голова"
  },
  {
    "tr": "bone",
    "en": "bone",
    "de": "Knochen",
    "ru": "Кость"
  },
  {
    "tr": "render distance",
    "en": "render distance",
    "de": "Sichtweite",
    "ru": "Дистанция прорисовки"
  },
  {
    "tr": "box 2d / 3d",
    "en": "box 2d / 3d",
    "de": "Box 2D / 3D",
    "ru": "Боксы 2D / 3D"
  },
  {
    "tr": "skeleton esp",
    "en": "skeleton esp",
    "de": "Skelett-ESP",
    "ru": "Скелеты ESP"
  },
  {
    "tr": "health bar",
    "en": "health bar",
    "de": "Lebensbalken",
    "ru": "Полоска HP"
  },
  {
    "tr": "agent name",
    "en": "agent name",
    "de": "Agentenname",
    "ru": "Имя агента"
  },
  {
    "tr": "snaplines",
    "en": "snaplines",
    "de": "Snaplines",
    "ru": "Линии к игрокам"
  },
  {
    "tr": "distance tag",
    "en": "distance tag",
    "de": "Distanzanzeige",
    "ru": "Дистанция"
  },
  {
    "tr": "F1",
    "en": "F1",
    "de": "F1",
    "ru": "F1"
  },
  {
    "tr": "F2",
    "en": "F2",
    "de": "F2",
    "ru": "F2"
  },
  {
    "tr": "toggle esp",
    "en": "toggle esp",
    "de": "ESP umschalten",
    "ru": "Переключить ESP"
  },
  {
    "tr": "chams opacity",
    "en": "chams opacity",
    "de": "Chams-Deckkraft",
    "ru": "Прозрачность Chams"
  },
  {
    "tr": "glow chams",
    "en": "glow chams",
    "de": "Glow-Chams",
    "ru": "Подсветка Chams"
  },
  {
    "tr": "visible check",
    "en": "visible check",
    "de": "Sichtbarkeitsprüfung",
    "ru": "Проверка видимости"
  },
  {
    "tr": "wireframe mode",
    "en": "wireframe mode",
    "de": "Drahtgittermodus",
    "ru": "Каркасный режим"
  },
  {
    "tr": "remove smoke/flash",
    "en": "remove smoke/flash",
    "de": "Rauch/Flash entfernen",
    "ru": "Убрать дым/флеш"
  },
  {
    "tr": "night mode map",
    "en": "night mode map",
    "de": "Nachtmodus-Karte",
    "ru": "Ночная карта"
  },
  {
    "tr": "custom crosshair",
    "en": "custom crosshair",
    "de": "Eigenes Fadenkreuz",
    "ru": "Кастомный прицел"
  },
  {
    "tr": "toggle chams",
    "en": "toggle chams",
    "de": "Chams umschalten",
    "ru": "Переключить Chams"
  },
  {
    "tr": "bhop speed",
    "en": "bhop speed",
    "de": "Bhop-Tempo",
    "ru": "Скорость бхопа"
  },
  {
    "tr": "bunny hop",
    "en": "bunny hop",
    "de": "Bunny-Hop",
    "ru": "Баннихоп"
  },
  {
    "tr": "radar hack 2d",
    "en": "radar hack 2d",
    "de": "2D Radar-Hack",
    "ru": "2D Радар"
  },
  {
    "tr": "fast reload",
    "en": "fast reload",
    "de": "Schnelles Nachladen",
    "ru": "Быстрая перезарядка"
  },
  {
    "tr": "auto accept match",
    "en": "auto accept match",
    "de": "Match automatisch annehmen",
    "ru": "Авто-принятие матча"
  },
  {
    "tr": "SPACE",
    "en": "SPACE",
    "de": "SPACE",
    "ru": "ПРОБЕЛ"
  },
  {
    "tr": "bhop key",
    "en": "bhop key",
    "de": "Bhop-Taste",
    "ru": "Клавиша бхопа"
  },
  {
    "tr": "skin brightness",
    "en": "skin brightness",
    "de": "Skin-Helligkeit",
    "ru": "Яркость скинов"
  },
  {
    "tr": "weapon skins",
    "en": "weapon skins",
    "de": "Waffen-Skins",
    "ru": "Скины оружия"
  },
  {
    "tr": "knife model",
    "en": "knife model",
    "de": "Messermodell",
    "ru": "Модель ножа"
  },
  {
    "tr": "custom gloves",
    "en": "custom gloves",
    "de": "Eigene Handschuhe",
    "ru": "Кастомные перчатки"
  },
  {
    "tr": "agent re-texture",
    "en": "agent re-texture",
    "de": "Agenten-Textur",
    "ru": "Ретекстур агентов"
  },
  {
    "tr": "Prime Bundle",
    "en": "Prime Bundle",
    "de": "Prime Bundle",
    "ru": "Prime Bundle"
  },
  {
    "tr": "active preset",
    "en": "active preset",
    "de": "Aktives Preset",
    "ru": "Активный пресет"
  },
  {
    "tr": "camera distance",
    "en": "camera distance",
    "de": "Kameradistanz",
    "ru": "Дистанция камеры"
  },
  {
    "tr": "camera height offset",
    "en": "camera height offset",
    "de": "Kamerahöhenversatz",
    "ru": "Высота камеры"
  },
  {
    "tr": "enable thirdperson",
    "en": "enable thirdperson",
    "de": "Third-Person aktivieren",
    "ru": "Включить вид от 3-го лица"
  },
  {
    "tr": "wall collision",
    "en": "wall collision",
    "de": "Wandkollision",
    "ru": "Коллизия со стенами"
  },
  {
    "tr": "toggle view",
    "en": "toggle view",
    "de": "Ansicht umschalten",
    "ru": "Переключить вид"
  },
  {
    "tr": "bullet tracer thickness",
    "en": "bullet tracer thickness",
    "de": "Kugelspuren-Stärke",
    "ru": "Толщина трассеров"
  },
  {
    "tr": "bullet tracers",
    "en": "bullet tracers",
    "de": "Kugelspuren",
    "ru": "Трассеры пуль"
  },
  {
    "tr": "hit effect sound",
    "en": "hit effect sound",
    "de": "Treffersound",
    "ru": "Звук попадания"
  },
  {
    "tr": "kill animation",
    "en": "kill animation",
    "de": "Kill-Animation",
    "ru": "Анимация убийства"
  },
  {
    "tr": "screen shake",
    "en": "screen shake",
    "de": "Bildschirmwackeln",
    "ru": "Тряска экрана"
  },
  {
    "tr": "stream proof (obs)",
    "en": "stream proof (obs)",
    "de": "Stream-Proof (OBS)",
    "ru": "Скрытие на стриме (OBS)"
  },
  {
    "tr": "anti-screenshot",
    "en": "anti-screenshot",
    "de": "Anti-Screenshot",
    "ru": "Защита от скриншотов"
  },
  {
    "tr": "auto-inject driver",
    "en": "auto-inject driver",
    "de": "Treiber automatisch injizieren",
    "ru": "Авто-инжект драйвера"
  },
  {
    "tr": "debug console",
    "en": "debug console",
    "de": "Debug-Konsole",
    "ru": "Консоль отладки"
  },
  {
    "tr": "INSERT",
    "en": "INSERT",
    "de": "EINFG",
    "ru": "INSERT"
  },
  {
    "tr": "menu key",
    "en": "menu key",
    "de": "Menütaste",
    "ru": "Клавиша меню"
  },
  {
    "tr": "DELETE",
    "en": "DELETE",
    "de": "ENTF",
    "ru": "DELETE"
  },
  {
    "tr": "panic key",
    "en": "panic key",
    "de": "Panik-Taste",
    "ru": "Клавиша паники"
  },
  {
    "tr": "default.cfg",
    "en": "default.cfg",
    "de": "default.cfg",
    "ru": "default.cfg"
  },
  {
    "tr": "config slot",
    "en": "config slot",
    "de": "Config-Slot",
    "ru": "Слот конфига"
  },
  {
    "tr": "Tuşa bas...",
    "en": "Press key...",
    "de": "Taste drücken...",
    "ru": "Нажмите клавишу..."
  },
  {
    "tr": "1 NUMARALI ÖNERİMİZ",
    "en": "OUR #1 RECOMMENDATION",
    "de": "UNSERE #1 EMPFEHLUNG",
    "ru": "НАША РЕКОМЕНДАЦИЯ №1"
  },
  {
    "tr": "Vanguard Emulator Private Slotted",
    "en": "Vanguard Emulator Private Slotted",
    "de": "Vanguard Emulator Private Slotted",
    "ru": "Vanguard Emulator Private Slotted"
  },
  {
    "tr": "Her müşteriye ilk önerdiğimiz ürün — arkasında durduğumuz en üst düzey güvenlik mimarisi ve sıfır gecikmeli emülasyon kurulumu.",
    "en": "The first product we recommend to every customer — top-tier security architecture and zero-delay emulation setup.",
    "de": "Das Produkt, das wir jedem Kunden empfehlen — erstklassige Sicherheitsarchitektur und verzögerungsfreie Emulation.",
    "ru": "Продукт №1, который мы рекомендуем каждому клиенту — передовая архитектура безопасности и эмуляция без задержек."
  },
  {
    "tr": "Başlangıç",
    "en": "Starting at",
    "de": "Ab",
    "ru": "От"
  },
  {
    "tr": "Ürünü incele",
    "en": "View Product",
    "de": "Produkt ansehen",
    "ru": "Подробнее о продукте"
  },
  {
    "tr": "KATEGORİLER",
    "en": "CATEGORIES",
    "de": "KATEGORIEN",
    "ru": "КАТЕГОРИИ"
  },
  {
    "tr": "Valorant & Counter-Strike 2",
    "en": "Valorant & Counter-Strike 2",
    "de": "Valorant & Counter-Strike 2",
    "ru": "Valorant & Counter-Strike 2"
  },
  {
    "tr": "Hile & Yazılımları",
    "en": "Cheats & Software",
    "de": "Cheats & Software",
    "ru": "Читы и Программы"
  },
  {
    "tr": "Sadece Valorant ve Counter-Strike 2 için optimize edilmiş özel performans araçları, bypass sistemleri ve düzenli güncellemeler. Haftalık ve aylık abonelikler.",
    "en": "Specialized performance tools, bypass systems, and regular updates optimized exclusively for Valorant and Counter-Strike 2. Weekly and monthly subscriptions.",
    "de": "Spezielle Performance-Tools, Bypass-Systeme und regelmäßige Updates, optimiert für Valorant und Counter-Strike 2. Wöchentliche und monatliche Abos.",
    "ru": "Специальные утилиты, системы обхода и регулярные апдейты для Valorant и CS2. Недельные и месячные подписки."
  },
  {
    "tr": "GÖZ AT",
    "en": "BROWSE",
    "de": "DURCHSUCHEN",
    "ru": "СМОТРЕТЬ"
  },
  {
    "tr": "Counter-Strike 2",
    "en": "Counter-Strike 2",
    "de": "Counter-Strike 2",
    "ru": "Counter-Strike 2"
  },
  {
    "tr": "HAKKIMIZDA",
    "en": "ABOUT US",
    "de": "ÜBER UNS",
    "ru": "О НАС"
  },
  {
    "tr": "Dünya çapında destek, tutarlı teslimat",
    "en": "Worldwide support, consistent delivery",
    "de": "Weltweiter Support, konsistente Lieferung",
    "ru": "Поддержка по всему миру, стабильная выдача"
  },
  {
    "tr": "2024’te kurulduk; güven, şeffaflık ve istikrarlı sonuçlar üzerine uzun vadeli bir ürün ekosistemi oluşturduk. Ekibimiz açık standartlar ve yapılandırılmış destek süreçleriyle çalışır; müşteriler gereksiz gürültü olmadan güvenilir güncellemeler ve hızlı yanıtlar alır.",
    "en": "Founded in 2024, we built a long-term product ecosystem founded on trust, transparency, and stable results. Our team works with open standards and structured support workflows; clients get reliable updates and swift responses without clutter.",
    "de": "Gegründet im Jahr 2024 haben wir ein langfristiges Produkt-Ökosystem aufgebaut, das auf Vertrauen, Transparenz und stabilen Ergebnissen basiert. Unser Team arbeitet nach offenen Standards und strukturierten Support-Prozessen.",
    "ru": "Основанная в 2024 году, наша команда создала долгосрочную экосистему продуктов на принципах доверия, прозрачности и стабильности. Клиенты получают своевременные обновления и быструю поддержку без лишнего шума."
  },
  {
    "tr": "Dünya çapında destek",
    "en": "Worldwide support",
    "de": "Weltweiter Support",
    "ru": "Поддержка по всему миру"
  },
  {
    "tr": "Destek ekibimiz farklı bölgelerde aktif; kararlı yanıt süreleri ve net iletişim sunar.",
    "en": "Our support team is active across multiple timezones, providing stable response times and crystal-clear communication.",
    "de": "Unser Support-Team ist weltweit aktiv und bietet zuverlässige Antwortzeiten und klare Kommunikation.",
    "ru": "Наша команда поддержки активна в разных регионах, обеспечивая быстрое время ответа и понятное общение."
  },
  {
    "tr": "Güvenilir teslimat",
    "en": "Reliable delivery",
    "de": "Zuverlässige Lieferung",
    "ru": "Надежная доставка"
  },
  {
    "tr": "Lisanslar ve erişim bilgileri güvenli, tekrarlanabilir akışlarla anında iletilir.",
    "en": "Licenses and access credentials are delivered instantly through secure, automated workflows.",
    "de": "Lizenzen und Zugangsdaten werden sofort über sichere, automatisierte Abläufe bereitgestellt.",
    "ru": "Лицензии и данные доступа выдаются мгновенно через безопасные автоматические алгоритмы."
  },
  {
    "tr": "Net standartlar",
    "en": "Clear standards",
    "de": "Klare Standards",
    "ru": "Четкие стандарты"
  },
  {
    "tr": "Yapılandırılmış süreçler ve şeffaf kararlar, ürün kalitesini zamanla tutarlı tutar.",
    "en": "Structured processes and transparent decisions keep product quality consistent over time.",
    "de": "Strukturierte Prozesse und transparente Entscheidungen halten die Produktqualität dauerhaft hoch.",
    "ru": "Структурированные процессы и прозрачные решения сохраняют стабильное качество продуктов на дистанции."
  },
  {
    "tr": "Valorant hile topluluğu ve destek",
    "en": "Valorant cheat community and support",
    "de": "Valorant Cheat-Community & Support",
    "ru": "Сообщество читов Valorant и поддержка"
  },
  {
    "tr": "Üst düzey oyunculardan oluşan özel bir ağa katılın. Geliştiricilere doğrudan erişim, hızlı destek ve gerçek zamanlı güncellemeler.",
    "en": "Join a private network of top-tier players. Direct developer access, expedited support, and real-time updates.",
    "de": "Werden Sie Teil eines privaten Netzwerks von Spitzenspielern. Direkter Entwicklerkontakt, schneller Support und Echtzeit-Updates.",
    "ru": "Присоединяйтесь к закрытой сети сильных игроков. Прямой контакт с разработчиками, оперативная помощь и обновления в реальном времени."
  },
  {
    "tr": "ÖN İZLEME! CANLI VALORANT & CS2 YAYINLARI",
    "en": "PREVIEW! LIVE VALORANT & CS2 STREAMS",
    "de": "VORSCHAU! LIVE VALORANT & CS2 STREAMS",
    "ru": "ПРЕВЬЮ! СТРИМЫ VALORANT И CS2"
  },
  {
    "tr": "CANLI DURUM — GERÇEK ZAMANLI SERVİS İZLEME",
    "en": "LIVE STATUS — REAL-TIME SERVICE MONITORING",
    "de": "LIVE-STATUS — ECHTZEIT-SYSTEMÜBERWACHUNG",
    "ru": "ОНЛАЙН СТАТУС — МОНИТОРИНГ СЕРВИСОВ"
  },
  {
    "tr": "GÜVENLİ DESTEK — ÖZEL 7/24 BİLET SİSTEMİ",
    "en": "SECURE SUPPORT — PRIVATE 24/7 TICKET SYSTEM",
    "de": "SICHERER SUPPORT — PRIVATES 24/7 TICKET-SYSTEM",
    "ru": "БЕЗОПАСНАЯ ПОДДЕРЖКА — ПРИВАТНЫЕ ТИКЕТЫ 24/7"
  },
  {
    "tr": "TEMEL ÖZELLİKLER",
    "en": "CORE FEATURES",
    "de": "KERNMERKMALE",
    "ru": "ОСНОВНЫЕ ПРЕИМУЩЕСТВА"
  },
  {
    "tr": "Her üründe elde ettikleriniz",
    "en": "What you get with every product",
    "de": "Was Sie mit jedem Produkt erhalten",
    "ru": "Что вы получаете с каждым продуктом"
  },
  {
    "tr": "Tüm Syntax Software ürünlerinde güvenli teslimat, düzenli güncellemeler, gerçek destek ve anında erişim.",
    "en": "Secure delivery, regular updates, genuine support, and instant access across all Syntax Software products.",
    "de": "Sichere Lieferung, regelmäßige Updates, echter Support und sofortiger Zugriff auf alle Syntax Software Produkte.",
    "ru": "Безопасная выдача, регулярные обновления, реальная помощь и моментальный доступ во всех продуктах Syntax Software."
  },
  {
    "tr": "Güvenli ve Undetected",
    "en": "Secure & Undetected",
    "de": "Sicher & Undetected",
    "ru": "Безопасно и Undetected"
  },
  {
    "tr": "Sistemlerimiz maksimum güvenlik ve düşük tespit riski için kurgulanır.",
    "en": "Our systems are engineered for maximum security and minimal detection risk.",
    "de": "Unsere Systeme sind auf maximale Sicherheit und geringstes Erkennungsrisiko ausgelegt.",
    "ru": "Наши системы спроектированы для максимальной защиты и минимального риска обнаружения."
  },
  {
    "tr": "Sahada test edilmiş kalite",
    "en": "Battle-tested quality",
    "de": "Praxiserprobte Qualität",
    "ru": "Проверенное качество в бою"
  },
  {
    "tr": "Her sürüm, yayın öncesi gerçek maç ve oturumlarda detaylıca denenir.",
    "en": "Every release is thoroughly tested in live competitive matches before public rollout.",
    "de": "Jeder Release wird vor der Veröffentlichung in echten Matches ausgiebig getestet.",
    "ru": "Каждая версия детально тестируется в реальных матчах перед публикацией."
  },
  {
    "tr": "Config kaydet ve paylaş",
    "en": "Save & share configs",
    "de": "Configs speichern & teilen",
    "ru": "Сохраняйте и делитесь конфигами"
  },
  {
    "tr": "Ayarlarını saniyeler içinde kaydet, özel preset’leri tek tıkla içe aktar.",
    "en": "Save your settings in seconds, import custom presets with a single click.",
    "de": "Speichern Sie Einstellungen sekundenschnell, importieren Sie Presets mit einem Klick.",
    "ru": "Сохраняйте настройки за секунды, импортируйте пресеты в один клик."
  },
  {
    "tr": "Tüm işlemler güvenilir ödeme altyapıları ve şifreleme üzerinden korunur.",
    "en": "All transactions are safeguarded with reputable payment gateways and encryption.",
    "de": "Alle Transaktionen sind durch seriöse Zahlungsgateways und Verschlüsselung geschützt.",
    "ru": "Все транзакции защищены проверенными платежными шлюзами и шифрованием."
  },
  {
    "tr": "Başarılı ödeme sonrası erişim lisans anahtarı ve kılavuz anında iletilir.",
    "en": "Upon successful payment, your license key and setup guide are delivered instantly.",
    "de": "Nach erfolgreicher Zahlung werden Lizenzschlüssel und Anleitung sofort übermittelt.",
    "ru": "После успешной оплаты лицензионный ключ и инструкция приходят мгновенно."
  },
  {
    "tr": "BAYİ PROGRAMI",
    "en": "RESELLER PROGRAM",
    "de": "RESELLER-PROGRAMM",
    "ru": "ПАРТНЕРСКАЯ ПРОГРАММА"
  },
  {
    "tr": "Kendi markanız,",
    "en": "Your own brand,",
    "de": "Ihre eigene Marke,",
    "ru": "Ваш собственный бренд,"
  },
  {
    "tr": "kendi kontrolünüz",
    "en": "your own control",
    "de": "Ihre eigene Kontrolle",
    "ru": "ваш полный контроль"
  },
  {
    "tr": "Kendi tam markalı bayi panelinizi başlatın: anında otomatik teslim, sınırsız lisans üretimi ve tam görsel özelleştirme — altyapımızla desteklenir.",
    "en": "Launch your fully branded reseller panel: instant automatic delivery, unlimited license generation and complete visual customization — powered by our infrastructure.",
    "de": "Starten Sie Ihr voll gebrandetes Reseller-Panel: sofortige automatische Lieferung, unbegrenzte Lizenzgenerierung und vollständige visuelle Anpassung — unterstützt durch unsere Infrastruktur.",
    "ru": "Запустите собственную брендированную панель реселлера: мгновенная авто-выдача, неограниченная генерация ключей и полная кастомизация — на нашей инфраструктуре."
  },
  {
    "tr": "Otomatik teslim",
    "en": "Instant delivery",
    "de": "Automatische Lieferung",
    "ru": "Авто-выдача"
  },
  {
    "tr": "Sınırsız anahtar",
    "en": "Unlimited keys",
    "de": "Unbegrenzte Keys",
    "ru": "Безлимит ключей"
  },
  {
    "tr": "White label",
    "en": "White label",
    "de": "White Label",
    "ru": "White label"
  },
  {
    "tr": "ÖZET",
    "en": "SUMMARY",
    "de": "ÜBERSICHT",
    "ru": "ОБЗОР"
  },
  {
    "tr": "MARKALAMA",
    "en": "BRANDING",
    "de": "BRANDING",
    "ru": "БРЕНДИНГ"
  },
  {
    "tr": "TESLİMAT",
    "en": "DELIVERY",
    "de": "LIEFERUNG",
    "ru": "ДОСТАВКА"
  },
  {
    "tr": "Anında",
    "en": "Instant",
    "de": "Sofort",
    "ru": "Мгновенно"
  },
  {
    "tr": "Logonuz, renkleriniz ve alan adınızla yönetilen bir bayi yığını. Lisanslama, teslim ve destek araçlarını biz hallediyoruz; siz büyümeye odaklanın.",
    "en": "A reseller stack managed with your logo, colors, and domain. We handle licensing, delivery, and support tools; you focus on growth.",
    "de": "Ein Reseller-Stack, der mit Ihrem Logo, Farben und Domain verwaltet wird. Wir kümmern uns um Lizenzierung, Lieferung und Support-Tools; Sie konzentrieren sich auf Wachstum.",
    "ru": "Панель реселлера под вашим логотипом, цветами и доменом. Мы берем на себя лицензирование, доставку и инструменты; вы фокусируетесь на масштабировании."
  },
  {
    "tr": "Bayi ol",
    "en": "Become a Reseller",
    "de": "Reseller werden",
    "ru": "Стать партнером"
  },
  {
    "tr": "Tamamen Size Özel Arayüz",
    "en": "Fully Custom Interface",
    "de": "Vollständig individuelle Benutzeroberfläche",
    "ru": "Полностью индивидуальный интерфейс"
  },
  {
    "tr": "Kendi logonuz ve alan adınız",
    "en": "Your own logo and domain",
    "de": "Ihr eigenes Logo und Domain",
    "ru": "Ваш собственный логотип и домен"
  },
  {
    "tr": "Otomatik API & Lisanslama",
    "en": "Automated API & Licensing",
    "de": "Automatische API & Lizenzierung",
    "ru": "Автоматический API и лицензирование"
  },
  {
    "tr": "Anında teslimat altyapısı",
    "en": "Instant delivery infrastructure",
    "de": "Sofortige Lieferinfrastruktur",
    "ru": "Инфраструктура мгновенной выдачи"
  },
  {
    "tr": "Unbranded Panel",
    "en": "Unbranded Panel",
    "de": "Unbranded Panel",
    "ru": "Панель без бренда"
  },
  {
    "tr": "Rebrand Ready",
    "en": "Rebrand Ready",
    "de": "Rebrand Ready",
    "ru": "Готово к ребрендингу"
  },
  {
    "tr": "DİJİTAL MAĞAZA",
    "en": "DIGITAL STORE",
    "de": "DIGITALER STORE",
    "ru": "ЦИФРОВОЙ МАГАЗИН"
  },
  {
    "tr": "Tüm ürünler tek vitrinde",
    "en": "All products in one storefront",
    "de": "Alle Produkte in einem Schaufenster",
    "ru": "Все продукты на одной витрине"
  },
  {
    "tr": "Geliştirdiğimiz tüm abonelik, script ve yardımcı araçları tek yerde inceleyin — her zaman güncel, anında teslim ve canlı destek ile.",
    "en": "Explore all our subscriptions, scripts and tools in one place — always up-to-date, instant delivery and 24/7 live support.",
    "de": "Entdecken Sie alle unsere Abonnements, Skripte und Tools an einem Ort — immer auf dem neuesten Stand, sofortige Lieferung und Live-Support.",
    "ru": "Ознакомьтесь со всеми нашими подписками, скриптами и инструментами в одном месте — всегда актуально, мгновенная выдача и живая поддержка."
  },
  {
    "tr": "Anında teslimat",
    "en": "Instant delivery",
    "de": "Sofortige Lieferung",
    "ru": "Мгновенная выдача"
  },
  {
    "tr": "Güvenli ödeme",
    "en": "Secure payment",
    "de": "Sichere Zahlung",
    "ru": "Безопасная оплата"
  },
  {
    "tr": "Düzenli güncelleme",
    "en": "Regular updates",
    "de": "Regelmäßige Updates",
    "ru": "Регулярные обновления"
  },
  {
    "tr": "Ara...",
    "en": "Search...",
    "de": "Suchen...",
    "ru": "Поиск..."
  },
  {
    "tr": "Önerilenler önce",
    "en": "Recommended first",
    "de": "Empfohlen zuerst",
    "ru": "Сначала рекомендуемые"
  },
  {
    "tr": "Fiyata göre (Artan)",
    "en": "Price: Low to High",
    "de": "Preis: Aufsteigend",
    "ru": "Цена: по возрастанию"
  },
  {
    "tr": "Fiyata göre (Azalan)",
    "en": "Price: High to Low",
    "de": "Preis: Absteigend",
    "ru": "Цена: по убыванию"
  },
  {
    "tr": "En çok satanlar",
    "en": "Best sellers",
    "de": "Bestseller",
    "ru": "Хиты продаж"
  },
  {
    "tr": "Hepsi",
    "en": "All",
    "de": "Alle",
    "ru": "Все"
  },
  {
    "tr": "Satın Al",
    "en": "Purchase",
    "de": "Kaufen",
    "ru": "Купить"
  },
  {
    "tr": "EKİP ÖNERİSİ",
    "en": "STAFF PICK",
    "de": "TEAM-EMPFEHLUNG",
    "ru": "ВЫБОР КОМАНДЫ"
  },
  {
    "tr": "KALICI SPOOFER",
    "en": "PERMANENT SPOOFER",
    "de": "PERMANENTER SPOOFER",
    "ru": "ПОСТОЯННЫЙ СПУФЕР"
  },
  {
    "tr": "ÖN SİPARİŞ",
    "en": "PRE-ORDER",
    "de": "VORBESTELLUNG",
    "ru": "ПРЕДЗАКАЗ"
  },
  {
    "tr": "YAKINDA",
    "en": "COMING SOON",
    "de": "DEMNÄCHST",
    "ru": "СКОРО"
  },
  {
    "tr": "BAKIMDA",
    "en": "MAINTENANCE",
    "de": "WARTUNG",
    "ru": "НА ОБСЛУЖИВАНИИ"
  },
  {
    "tr": "ÇEVRİMDIŞI",
    "en": "OFFLINE",
    "de": "OFFLINE",
    "ru": "ОФФЛАЙН"
  },
  {
    "tr": "ONLINE",
    "en": "ONLINE",
    "de": "ONLINE",
    "ru": "ОНЛАЙН"
  },
  {
    "tr": "UNDETECTED",
    "en": "UNDETECTED",
    "de": "UNDETECTED",
    "ru": "UNDETECTED"
  },
  {
    "tr": "MAINTENANCE",
    "en": "MAINTENANCE",
    "de": "WARTUNG",
    "ru": "ОБСЛУЖИВАНИЕ"
  },
  {
    "tr": "OFFLINE",
    "en": "OFFLINE",
    "de": "OFFLINE",
    "ru": "ОФФЛАЙН"
  },
  {
    "tr": "SAFE LEGIT",
    "en": "SAFE LEGIT",
    "de": "SAFE LEGIT",
    "ru": "БЕЗОПАСНЫЙ ЛЕДЖИТ"
  },
  {
    "tr": "LOL VANGUARD",
    "en": "LOL VANGUARD",
    "de": "LOL VANGUARD",
    "ru": "LOL VANGUARD"
  },
  {
    "tr": "CLEANER",
    "en": "CLEANER",
    "de": "CLEANER",
    "ru": "ОЧИСТИТЕЛЬ"
  },
  {
    "tr": "SLOTTED",
    "en": "SLOTTED",
    "de": "SLOTTED",
    "ru": "СЛОТЫ"
  },
  {
    "tr": "SLOTTED (10/10)",
    "en": "SLOTTED (10/10)",
    "de": "SLOTTED (10/10)",
    "ru": "СЛОТЫ (10/10)"
  },
  {
    "tr": "VIP ELİT",
    "en": "VIP ELITE",
    "de": "VIP ELITE",
    "ru": "VIP ЭЛИТ"
  },
  {
    "tr": "EMULATOR",
    "en": "EMULATOR",
    "de": "EMULATOR",
    "ru": "ЭМУЛЯТОР"
  },
  {
    "tr": "BYPASS",
    "en": "BYPASS",
    "de": "BYPASS",
    "ru": "БАЙПАС"
  },
  {
    "tr": "Başka bir ödeme yöntemi mi gerekli? Discord'dan sorun",
    "en": "Need an alternative payment method? Ask on Discord",
    "de": "Benötigen Sie eine andere Zahlungsmethode? Fragen Sie auf Discord",
    "ru": "Нужен другой способ оплаты? Спросите в Discord"
  },
  {
    "tr": "8 ürün",
    "en": "8 products",
    "de": "8 Produkte",
    "ru": "8 товаров"
  },
  {
    "tr": "12 ürün",
    "en": "12 products",
    "de": "12 Produkte",
    "ru": "12 товаров"
  },
  {
    "tr": "ürün",
    "en": "products",
    "de": "Produkte",
    "ru": "товаров"
  },
  {
    "tr": "Ürün sepete eklendi!",
    "en": "Product added to cart!",
    "de": "Produkt zum Warenkorb hinzugefügt!",
    "ru": "Товар добавлен в корзину!"
  },
  {
    "tr": "Spoofer & Emulator",
    "en": "Spoofer & Emulator",
    "de": "Spoofer & Emulator",
    "ru": "Спуфер и Эмулятор"
  },
  {
    "tr": "Spoofer & Bypass",
    "en": "Spoofer & Bypass",
    "de": "Spoofer & Bypass",
    "ru": "Спуфер и Байпас"
  },
  {
    "tr": "Valorant & LoL",
    "en": "Valorant & LoL",
    "de": "Valorant & LoL",
    "ru": "Valorant & LoL"
  },
  {
    "tr": "SPOOFER & BYPASS",
    "en": "SPOOFER & BYPASS",
    "de": "SPOOFER & BYPASS",
    "ru": "СПУФЕР И БАЙПАС"
  },
  {
    "tr": "VALORANT & BYPASS",
    "en": "VALORANT & BYPASS",
    "de": "VALORANT & BYPASS",
    "ru": "VALORANT И БАЙПАС"
  },
  {
    "tr": "COUNTER-STRIKE 2",
    "en": "COUNTER-STRIKE 2",
    "de": "COUNTER-STRIKE 2",
    "ru": "COUNTER-STRIKE 2"
  },
  {
    "tr": "EMULATOR & BYPASS",
    "en": "EMULATOR & BYPASS",
    "de": "EMULATOR & BYPASS",
    "ru": "ЭМУЛЯТОР И БАЙПАС"
  },
  {
    "tr": "SPOOFER & TEMİZLİK",
    "en": "SPOOFER & CLEANING",
    "de": "SPOOFER & BEREINIGUNG",
    "ru": "СПУФЕР И ОЧИСТКА"
  },
  {
    "tr": "VALORANT & LOL",
    "en": "VALORANT & LOL",
    "de": "VALORANT & LOL",
    "ru": "VALORANT И LOL"
  },
  {
    "tr": "VAN 152 & VAL 5 Kalıcı Bypass",
    "en": "VAN 152 & VAL 5 Permanent Bypass",
    "de": "VAN 152 & VAL 5 Permanenter Bypass",
    "ru": "Постоянный байпас VAN 152 и VAL 5"
  },
  {
    "tr": "Format Gerekmez · No Reinstall",
    "en": "No Format Required · No Reinstall",
    "de": "Kein Format nötig · Keine Neuinstallation",
    "ru": "Без переустановки Windows и формата"
  },
  {
    "tr": "Vanguard Popup & Van Hata Önleyici",
    "en": "Vanguard Popup & Van Error Blocker",
    "de": "Vanguard Popup & Van Fehlerblocker",
    "ru": "Предотвращение ошибок и попапов Vanguard"
  },
  {
    "tr": "Kernel Driver · Internal Aimbot & ESP",
    "en": "Kernel Driver · Internal Aimbot & ESP",
    "de": "Kernel-Treiber · Interner Aimbot & ESP",
    "ru": "Кернел драйвер · Внутренний аимбот и ESP"
  },
  {
    "tr": "Yeni Yama İçin Güncellemede",
    "en": "Updating for New Patch",
    "de": "Wird für neuen Patch aktualisiert",
    "ru": "Обновление под новый патч"
  },
  {
    "tr": "VAL 5 / VAN 102 / VAN 152 Bypass",
    "en": "VAL 5 / VAN 102 / VAN 152 Bypass",
    "de": "VAL 5 / VAN 102 / VAN 152 Bypass",
    "ru": "Байпас VAL 5 / VAN 102 / VAN 152"
  },
  {
    "tr": "Sınırlı Slot (10/10) · Unique Build",
    "en": "Limited Slots (10/10) · Unique Build",
    "de": "Begrenzte Slots (10/10) · Unique Build",
    "ru": "Ограниченные слоты (10/10) · Уникальный билд"
  },
  {
    "tr": "OneClick Spoofer",
    "en": "OneClick Spoofer",
    "de": "OneClick Spoofer",
    "ru": "OneClick Spoofer"
  },
  {
    "tr": "Ön Sipariş · Format & BIOS Gerektirmez",
    "en": "Pre-Order · No Format & BIOS Required",
    "de": "Vorbestellung · Kein Format & BIOS nötig",
    "ru": "Предзаказ · Без формата и настройки BIOS"
  },
  {
    "tr": "Syntax HWID Cleaner",
    "en": "Syntax HWID Cleaner",
    "de": "Syntax HWID Cleaner",
    "ru": "Syntax HWID Cleaner"
  },
  {
    "tr": "Riot Log & Deep Registry Temizleyici",
    "en": "Riot Log & Deep Registry Cleaner",
    "de": "Riot Log & Deep Registry Bereiniger",
    "ru": "Очистка логов Riot и глубокого реестра"
  },
  {
    "tr": "CS2 Private Slotted",
    "en": "CS2 Private Slotted",
    "de": "CS2 Private Slotted",
    "ru": "CS2 Private Slotted"
  },
  {
    "tr": "VAC & VACNet 3.0 Safe Kernel Hook",
    "en": "VAC & VACNet 3.0 Safe Kernel Hook",
    "de": "VAC & VACNet 3.0 Sicherer Kernel Hook",
    "ru": "Безопасный кернел хук под VAC & VACNet 3.0"
  },
  {
    "tr": "Valorant VIP Legit",
    "en": "Valorant VIP Legit",
    "de": "Valorant VIP Legit",
    "ru": "Valorant VIP Legit"
  },
  {
    "tr": "Safe Legit · Humanizer · 2D Radar",
    "en": "Safe Legit · Humanizer · 2D Radar",
    "de": "Safe Legit · Humanizer · 2D Radar",
    "ru": "Безопасный леджит · Хуманизатор · 2D Радар"
  },
  {
    "tr": "LoL Vanguard Script",
    "en": "LoL Vanguard Script",
    "de": "LoL Vanguard Script",
    "ru": "LoL Vanguard Script"
  },
  {
    "tr": "Emulator Uyumlu · Evade & Prediction",
    "en": "Emulator Compatible · Evade & Prediction",
    "de": "Emulator-kompatibel · Evade & Prediction",
    "ru": "Совместимо с эмулятором · Evade и Prediction"
  },
  {
    "tr": "t3mp / p3rm Spoofer",
    "en": "t3mp / p3rm Spoofer",
    "de": "t3mp / p3rm Spoofer",
    "ru": "t3mp / p3rm Spoofer"
  },
  {
    "tr": "Vanguard Emulator",
    "en": "Vanguard Emulator",
    "de": "Vanguard Emulator",
    "ru": "Vanguard Emulator"
  },
  {
    "tr": "Syntax Elit Valorant",
    "en": "Syntax Elit Valorant",
    "de": "Syntax Elit Valorant",
    "ru": "Syntax Elit Valorant"
  },
  {
    "tr": "Valorant Slotted VIP",
    "en": "Valorant Slotted VIP",
    "de": "Valorant Slotted VIP",
    "ru": "Valorant Slotted VIP"
  },
  {
    "tr": "CS External",
    "en": "CS External",
    "de": "CS External",
    "ru": "CS External"
  },
  {
    "tr": "t3mp spoofer",
    "en": "t3mp spoofer",
    "de": "t3mp spoofer",
    "ru": "t3mp spoofer"
  },
  {
    "tr": "p3rm spoofer",
    "en": "p3rm spoofer",
    "de": "p3rm spoofer",
    "ru": "p3rm spoofer"
  },
  {
    "tr": "Popup Bypass",
    "en": "Popup Bypass",
    "de": "Popup Bypass",
    "ru": "Popup Bypass"
  },
  {
    "tr": "Syntax Elit",
    "en": "Syntax Elit",
    "de": "Syntax Elit",
    "ru": "Syntax Elit"
  },
  {
    "tr": "Valorant Slotted",
    "en": "Valorant Slotted",
    "de": "Valorant Slotted",
    "ru": "Valorant Slotted"
  },
  {
    "tr": "/ 1 Günlük",
    "en": "/ 1 Day",
    "de": "/ 1 Tag",
    "ru": "/ 1 День"
  },
  {
    "tr": "/ 3 Günlük",
    "en": "/ 3 Days",
    "de": "/ 3 Tage",
    "ru": "/ 3 Дня"
  },
  {
    "tr": "/ Aylık",
    "en": "/ Monthly",
    "de": "/ Monatlich",
    "ru": "/ Месяц"
  },
  {
    "tr": "/ Günlük",
    "en": "/ Daily",
    "de": "/ Täglich",
    "ru": "/ День"
  },
  {
    "tr": "/ Haftalık",
    "en": "/ Weekly",
    "de": "/ Wöchentlich",
    "ru": "/ Неделя"
  },
  {
    "tr": "/ Onetime",
    "en": "/ One-time",
    "de": "/ Einmalig",
    "ru": "/ Разово"
  },
  {
    "tr": "/ Tek Seferlik",
    "en": "/ One-time",
    "de": "/ Einmalig",
    "ru": "/ Разово"
  },
  {
    "tr": "/ Ön Sipariş",
    "en": "/ Pre-Order",
    "de": "/ Vorbestellung",
    "ru": "/ Предзаказ"
  },
  {
    "tr": "VAN 152 Bypass (Format Gerekmez)",
    "en": "VAN 152 Bypass (No Format Required)",
    "de": "VAN 152 Bypass (Kein Format nötig)",
    "ru": "Байпас VAN 152 (Без переустановки)"
  },
  {
    "tr": "Windows 10 & 11, Hvci/TPM On/Off Support",
    "en": "Windows 10 & 11, Hvci/TPM On/Off Support",
    "de": "Windows 10 & 11, Hvci/TPM An/Aus Support",
    "ru": "Windows 10 & 11, поддержка Hvci/TPM On/Off"
  },
  {
    "tr": "Tek Seferlik Hızlı Çalıştırma İstemcisi",
    "en": "One-Time Quick Launch Client",
    "de": "Einmaliger Schnellstart-Client",
    "ru": "Разовый клиент быстрого запуска"
  },
  {
    "tr": "Kalıcı Seri Numarası Değiştirme (Reinstall Required)",
    "en": "Permanent Serial Change (Reinstall Required)",
    "de": "Permanente Seriennummernänderung (Neuinstallation nötig)",
    "ru": "Смена серийных номеров навсегда (Нужна переустановка)"
  },
  {
    "tr": "All CPU & GPU, Motherboard Support",
    "en": "All CPU & GPU, Motherboard Support",
    "de": "Alle CPUs, GPUs & Mainboards unterstützt",
    "ru": "Поддержка любых CPU, GPU и материнских плат"
  },
  {
    "tr": "All CPU, GPU & Motherboard Support",
    "en": "All CPU, GPU & Motherboard Support",
    "de": "Alle CPUs, GPUs & Mainboards unterstützt",
    "ru": "Поддержка любых CPU, GPU и материнских плат"
  },
  {
    "tr": "BIOS Update Required & Anti-Van 152",
    "en": "BIOS Update Required & Anti-Van 152",
    "de": "BIOS-Update erforderlich & Anti-Van 152",
    "ru": "Требуется обновление BIOS и Anti-Van 152"
  },
  {
    "tr": "BIOS Update Required & Anti-Val 5",
    "en": "BIOS Update Required & Anti-Val 5",
    "de": "BIOS-Update erforderlich & Anti-Val 5",
    "ru": "Требуется обновление BIOS и Anti-Val 5"
  },
  {
    "tr": "Vanguard Popup Uyarı & Hata Önleyici",
    "en": "Vanguard Popup Warning & Error Blocker",
    "de": "Vanguard Popup-Warnung & Fehlerblocker",
    "ru": "Блокировка предупреждений и ошибок Vanguard"
  },
  {
    "tr": "Van 102, Van 1067, Van 84 Hata Çözümü",
    "en": "Van 102, Van 1067, Van 84 Error Fix",
    "de": "Van 102, Van 1067, Van 84 Fehlerbehebung",
    "ru": "Решение ошибок Van 102, Van 1067, Van 84"
  },
  {
    "tr": "Vanguard Emulator ile %100 Uyumlu",
    "en": "100% Compatible with Vanguard Emulator",
    "de": "100% kompatibel mit Vanguard Emulator",
    "ru": "100% совместимость с Vanguard Emulator"
  },
  {
    "tr": "Kernel-Level Driver Bypass",
    "en": "Kernel-Level Driver Bypass",
    "de": "Kernel-Level-Treiber-Bypass",
    "ru": "Кернел-драйвер обхода"
  },
  {
    "tr": "Visible 3D ESP & Stream Proof",
    "en": "Visible 3D ESP & Stream Proof",
    "de": "Sichtbares 3D-ESP & Stream-Proof",
    "ru": "Видимый 3D ESP и скрытие на стриме"
  },
  {
    "tr": "Smooth Legit Aimbot & Recoil Control",
    "en": "Smooth Legit Aimbot & Recoil Control",
    "de": "Smooth Legit Aimbot & Recoil Control",
    "ru": "Плавный леджит аимбот и контроль отдачи"
  },
  {
    "tr": "Aimbot, ESP & Visible Radar",
    "en": "Aimbot, ESP & Visible Radar",
    "de": "Aimbot, ESP & Sichtbares Radar",
    "ru": "Аимбот, ESP и радар видимости"
  },
  {
    "tr": "Stream Proof (Ekran Kayıtlarında Gizli)",
    "en": "Stream Proof (Hidden from Screen Capture)",
    "de": "Stream-Proof (Unsichtbar bei Aufnahmen)",
    "ru": "Скрытие на стриме (Не видно на записях)"
  },
  {
    "tr": "Premier & Competitive Uyumlu",
    "en": "Premier & Competitive Ready",
    "de": "Premier & Competitive kompatibel",
    "ru": "Готово для Premier и соревновательного режима"
  },
  {
    "tr": "Bypasses: VAN 102, VAL 5, VAN 79, VAN 152, VAN 1067",
    "en": "Bypasses: VAN 102, VAL 5, VAN 79, VAN 152, VAN 1067",
    "de": "Bypasst: VAN 102, VAL 5, VAN 79, VAN 152, VAN 1067",
    "ru": "Обход: VAN 102, VAL 5, VAN 79, VAN 152, VAN 1067"
  },
  {
    "tr": "No Restart & No Permanent System Changes",
    "en": "No Restart & No Permanent System Changes",
    "de": "Kein Neustart & keine dauerhaften Systemänderungen",
    "ru": "Без перезагрузки и системных изменений"
  },
  {
    "tr": "Hvci On/Off, Tpm On/Off, Secure Boot On/Off",
    "en": "Hvci On/Off, Tpm On/Off, Secure Boot On/Off",
    "de": "Hvci An/Aus, TPM An/Aus, Secure Boot An/Aus",
    "ru": "Hvci On/Off, Tpm On/Off, Secure Boot On/Off"
  },
  {
    "tr": "Sınırlı Kontenjan (Maks. 10 Kişi)",
    "en": "Limited Capacity (Max 10 Persons)",
    "de": "Begrenztes Kontingent (Max. 10 Personen)",
    "ru": "Ограниченная квота (Макс. 10 человек)"
  },
  {
    "tr": "Her Üyeye Özel Unique Derleme (Build)",
    "en": "Unique Build Generated per Member",
    "de": "Individueller Build für jedes Mitglied",
    "ru": "Уникальный билд под каждого участника"
  },
  {
    "tr": "7/24 Özel VIP Destek",
    "en": "24/7 Dedicated VIP Support",
    "de": "24/7 Dedizierter VIP-Support",
    "ru": "Выделенная VIP-поддержка 24/7"
  },
  {
    "tr": "Tek Tıkla Otomatik Donanım Sıfırlama",
    "en": "One-Click Automated Hardware Reset",
    "de": "1-Klick automatische Hardware-Rücksetzung",
    "ru": "Сброс оборудования в один клик"
  },
  {
    "tr": "Format & BIOS Update Gerekmez",
    "en": "No Format & BIOS Update Needed",
    "de": "Kein Format & BIOS-Update nötig",
    "ru": "Без формата и обновления BIOS"
  },
  {
    "tr": "No Reinstall or BIOS Flash Needed",
    "en": "No Reinstall or BIOS Flash Needed",
    "de": "Keine Neuinstallation oder BIOS-Flash nötig",
    "ru": "Без переустановки и прошивки BIOS"
  },
  {
    "tr": "Riot Games & Vanguard Loglarını Kazıma",
    "en": "Deep Clean Riot Games & Vanguard Logs",
    "de": "Riot Games & Vanguard Logs tiefenreinigen",
    "ru": "Глубокая очистка логов Riot Games и Vanguard"
  },
  {
    "tr": "Deep Registry & Shadowban Kalıntı Temizliği",
    "en": "Deep Registry & Shadowban Trace Clean",
    "de": "Deep-Registry & Shadowban-Spurenbereinigung",
    "ru": "Очистка реестра и следов теневого бана"
  },
  {
    "tr": "Spoofer Öncesi Hazırlık ve Sıfırlama",
    "en": "Pre-Spoofer Prep & Deep Reset",
    "de": "Vorbereitung & Reset vor Spoofer-Einsatz",
    "ru": "Подготовка и сброс перед спуфером"
  },
  {
    "tr": "Kişiye Özel Driver & Signature",
    "en": "Custom Driver & Private Signature",
    "de": "Individueller Treiber & Private Signatur",
    "ru": "Индивидуальный драйвер и приватная подпись"
  },
  {
    "tr": "Internal Aimbot & Otomatik RCS",
    "en": "Internal Aimbot & Automated RCS",
    "de": "Interner Aimbot & Automatisches RCS",
    "ru": "Внутренний аимбот и автоматический RCS"
  },
  {
    "tr": "Visible Glow Chams & Bone Skeleton ESP",
    "en": "Visible Glow Chams & Bone Skeleton ESP",
    "de": "Visible Glow Chams & Knochenskelett-ESP",
    "ru": "Подсветка Chams и скелеты игроков ESP"
  },
  {
    "tr": "Humanizer Smooth Hedefleme",
    "en": "Humanizer Smooth Targeting",
    "de": "Humanizer Smooth-Zielerfassung",
    "ru": "Хуманизированное плавное наведение"
  },
  {
    "tr": "2D Radar & Düşman Sağlık Barları",
    "en": "2D Radar & Enemy Health Bars",
    "de": "2D-Radar & Gegner-Lebensbalken",
    "ru": "2D Радар и полоски здоровья противников"
  },
  {
    "tr": "Triggerbot & Otomatik Ateşleme",
    "en": "Triggerbot & Auto Fire",
    "de": "Triggerbot & Automatisches Feuern",
    "ru": "Триггербот и авто-выстрел"
  },
  {
    "tr": "Auto Evade & Skillshot Prediction",
    "en": "Auto Evade & Skillshot Prediction",
    "de": "Auto-Evade & Skillshot-Vorhersage",
    "ru": "Авто-уклонение и предикшн скиллов"
  },
  {
    "tr": "Target Selector & Combo Engine",
    "en": "Target Selector & Combo Engine",
    "de": "Zielauswahl & Combo-Engine",
    "ru": "Выбор цели и комбо-движок"
  },
  {
    "tr": "Düşük Ban Riski ile Rank Kasma",
    "en": "Rank Up with Minimal Ban Risk",
    "de": "Rangklettern mit minimalem Ban-Risiko",
    "ru": "Поднятие ранга с минимальным риском бана"
  },
  {
    "tr": "Anında VAN 152 & Val 5 Temizliği",
    "en": "Instant VAN 152 & Val 5 Removal",
    "de": "Sofortige Bereinigung von VAN 152 & Val 5",
    "ru": "Мгновенное устранение VAN 152 и Val 5"
  },
  {
    "tr": "TPM / Secure Boot / HVCI Bypass (Valorant & LoL)",
    "en": "TPM / Secure Boot / HVCI Bypass (Valorant & LoL)",
    "de": "TPM / Secure Boot / HVCI Bypass (Valorant & LoL)",
    "ru": "Обход TPM / Secure Boot / HVCI (Valorant & LoL)"
  },
  {
    "tr": "Yeniden Başlatma Gerektirmez",
    "en": "No System Restart Required",
    "de": "Kein Neustart erforderlich",
    "ru": "Не требует перезагрузки"
  },
  {
    "tr": "Sistem Bildirimlerini Temizleme",
    "en": "System Notification Cleaner",
    "de": "Systembenachrichtigungen bereinigen",
    "ru": "Очистка системных уведомлений"
  },
  {
    "tr": "Güvenli Arka Plan İstemcisi",
    "en": "Secure Background Client",
    "de": "Sicherer Hintergrund-Client",
    "ru": "Безопасный фоновый клиент"
  },
  {
    "tr": "Otomatik Güncelleme & Koruma",
    "en": "Automatic Updates & Security",
    "de": "Automatische Updates & Schutz",
    "ru": "Авто-обновление и защита"
  },
  {
    "tr": "VAN 152 & Val 5 Bypass",
    "en": "VAN 152 & Val 5 Bypass",
    "de": "VAN 152 & Val 5 Bypass",
    "ru": "Байпас VAN 152 и Val 5"
  },
  {
    "tr": "ERİŞİLEBİLİRLİK",
    "en": "ACCESSIBILITY & STATUS",
    "de": "VERFÜGBARKEIT",
    "ru": "ДОСТУПНОСТЬ"
  },
  {
    "tr": "Ürün durumu",
    "en": "Product Status",
    "de": "Produktstatus",
    "ru": "Статус продуктов"
  },
  {
    "tr": "Yazılımlarımızın güncel tespit ve servis durumu — Discord botumuz ile anlık senkronize edilir.",
    "en": "Current detection and service status of our software — synced live with our Discord bot.",
    "de": "Aktueller Erkennungs- und Servicestatus unserer Software — live mit unserem Discord-Bot synchronisiert.",
    "ru": "Актуальный статус детекта и работы наших программ — синхронизируется в реальном времени с нашим Discord-ботом."
  },
  {
    "tr": "// status",
    "en": "// status",
    "de": "// status",
    "ru": " // статус"
  },
  {
    "tr": "# // status",
    "en": "# // status",
    "de": "# // status",
    "ru": "#  // статус"
  },
  {
    "tr": "#  status",
    "en": "#  status",
    "de": "#  status",
    "ru": "#  статус"
  },
  {
    "tr": "Bu, resmi",
    "en": "This is the official",
    "de": "Dies ist die offizielle",
    "ru": "Это официальная"
  },
  {
    "tr": "kanalının canlı web entegrasyonudur.",
    "en": "channel live web integration.",
    "de": "Kanal-Live-Webintegration.",
    "ru": "веб-интеграция канала в реальном времени."
  },
  {
    "tr": "Bu, resmi # // status kanalının canlı web entegrasyonudur.",
    "en": "This is the official live web integration of the # // status channel.",
    "de": "Dies ist die offizielle Live-Web-Integration des Kanals # // status.",
    "ru": "Это официальная веб-интеграция канала # // status в реальном времени."
  },
  {
    "tr": "Syntax Software BOT",
    "en": "Syntax Software BOT",
    "de": "Syntax Software BOT",
    "ru": "Syntax Software BOT"
  },
  {
    "tr": "UYG",
    "en": "APP",
    "de": "APP",
    "ru": "БОТ"
  },
  {
    "tr": "Bugün 14:16",
    "en": "Today at 14:16",
    "de": "Heute um 14:16",
    "ru": "Сегодня в 14:16"
  },
  {
    "tr": "Syntax Software | Product Status",
    "en": "Syntax Software | Product Status",
    "de": "Syntax Software | Produktstatus",
    "ru": "Syntax Software | Статус продуктов"
  },
  {
    "tr": "Current status of all our products",
    "en": "Current status of all our products",
    "de": "Aktueller Status all unserer Produkte",
    "ru": "Текущий статус всех наших продуктов"
  },
  {
    "tr": "Status Legend",
    "en": "Status Legend",
    "de": "Statuslegende",
    "ru": "Обозначения статусов"
  },
  {
    "tr": "Online",
    "en": "Online",
    "de": "Online",
    "ru": "Онлайн"
  },
  {
    "tr": "Maintenance",
    "en": "Maintenance",
    "de": "Wartung",
    "ru": "Обслуживание"
  },
  {
    "tr": "Offline",
    "en": "Offline",
    "de": "Offline",
    "ru": "Оффлайн"
  },
  {
    "tr": "Use at Own Risk",
    "en": "Use at Own Risk",
    "de": "Auf eigene Gefahr",
    "ru": "На свой страх и риск"
  },
  {
    "tr": "Çalışıyor",
    "en": "Operational",
    "de": "Funktioniert",
    "ru": "Работает"
  },
  {
    "tr": "Güncelleniyor",
    "en": "Updating",
    "de": "Wird aktualisiert",
    "ru": "Обновляется"
  },
  {
    "tr": "Bakımda",
    "en": "Maintenance",
    "de": "In Wartung",
    "ru": "На техобслуживании"
  },
  {
    "tr": "Hazırlanıyor",
    "en": "In Preparation",
    "de": "In Vorbereitung",
    "ru": "Подготавливается"
  },
  {
    "tr": "Online ",
    "en": "Online ",
    "de": "Online ",
    "ru": "Онлайн "
  },
  {
    "tr": "Maintenance ",
    "en": "Maintenance ",
    "de": "Wartung ",
    "ru": "Обслуживание "
  },
  {
    "tr": "Offline ",
    "en": "Offline ",
    "de": "Offline ",
    "ru": "Оффлайн "
  },
  {
    "tr": "Hazırlanıyor ",
    "en": "In Prep ",
    "de": "In Vorb. ",
    "ru": "В процессе "
  },
  {
    "tr": "Discord ile senkron · periyodik güncellenir",
    "en": "Synced with Discord · periodically updated",
    "de": "Mit Discord synchronisiert · regelmäßig aktualisiert",
    "ru": "Синхронизировано с Discord · обновляется регулярно"
  },
  {
    "tr": "Syntax Software | Last update • Otomatik Canlı Senkronizasyon",
    "en": "Syntax Software | Last update • Automatic Live Sync",
    "de": "Syntax Software | Letztes Update • Automatische Live-Synchronisierung",
    "ru": "Syntax Software | Последнее обновление • Автоматическая синхронизация"
  },
  {
    "tr": "p3rm sp00f",
    "en": "p3rm sp00f",
    "de": "p3rm sp00f",
    "ru": "p3rm sp00f"
  },
  {
    "tr": "t3mp sp00f",
    "en": "t3mp sp00f",
    "de": "t3mp sp00f",
    "ru": "t3mp sp00f"
  },
  {
    "tr": "popup bypass",
    "en": "popup bypass",
    "de": "popup bypass",
    "ru": "popup bypass"
  },
  {
    "tr": "syntax elit",
    "en": "syntax elit",
    "de": "syntax elit",
    "ru": "syntax elit"
  },
  {
    "tr": "external",
    "en": "external",
    "de": "external",
    "ru": "external"
  },
  {
    "tr": "Emuletor",
    "en": "Emuletor",
    "de": "Emuletor",
    "ru": "Emuletor"
  },
  {
    "tr": "slotted",
    "en": "slotted",
    "de": "slotted",
    "ru": "slotted"
  },
  {
    "tr": "Ana sayfaya dön",
    "en": "Back to home",
    "de": "Zur Startseite",
    "ru": "Вернуться на главную"
  },
  {
    "tr": "",
    "en": "",
    "de": "",
    "ru": ""
  },
  {
    "tr": "MÜŞTERİ KURALLARI VE SATIŞ SÖZLEŞMESİ",
    "en": "CUSTOMER RULES AND SALES AGREEMENT",
    "de": "KUNDENREGELN UND KAUFVERTRAG",
    "ru": "ПРАВИЛА ДЛЯ КЛИЕНТОВ И ДОГОВОР ОФЕРТЫ"
  },
  {
    "tr": "Müşteri Kuralları & Satış Sözleşmesi",
    "en": "Customer Rules & Sales Agreement",
    "de": "Kundenregeln & Kaufvertrag",
    "ru": "Правила для клиентов и договор оферты"
  },
  {
    "tr": "Sunucumuzdan ürün satın alan her kullanıcı, aşağıdaki maddeleri okumuş ve kabul etmiş sayılır.",
    "en": "Every user purchasing from our server is deemed to have read and agreed to the following terms.",
    "de": "Jeder Nutzer, der Produkte über unseren Server kauft, erklärt sich mit den folgenden Bedingungen einverstanden.",
    "ru": "Каждый пользователь, приобретающий продукты на нашем сервере, считается ознакомленным и согласным со следующими условиями."
  },
  {
    "tr": "Sunucumuzdan ve web sitemizden ürün satın alan her kullanıcı, aşağıdaki maddeleri okumuş ve kabul etmiş sayılır.",
    "en": "Every user purchasing from our server or website is deemed to have read and agreed to the following terms.",
    "de": "Jeder Nutzer, der über unseren Server oder unsere Website einkauft, bestätigt, die folgenden Bedingungen gelesen zu haben.",
    "ru": "Каждый пользователь, приобретающий продукты на нашем сервере или сайте, считается ознакомленным и согласным со следующими условиями."
  },
  {
    "tr": "Kendi Sorumluluğunuz",
    "en": "Your Own Responsibility",
    "de": "Eigene Verantwortung",
    "ru": "Ваша личная ответственность"
  },
  {
    "tr": "Tüm yazılımlarımız \"risk\" içerir. Yazılımların kullanımı sonucu oluşabilecek oyun yasaklamalarından (ban) tamamen kullanıcı sorumludur. \"Ban yememe garantisi\" hiçbir yazılım için %100 verilmez.",
    "en": "All our software involves \"risk\". The user is solely responsible for any game bans resulting from the use of the software. A 100% \"no-ban guarantee\" is never provided for any software.",
    "de": "Alle unsere Softwareprogramme bergen ein \"Risiko\". Der Nutzer ist für Spielsperren (Bans) allein verantwortlich. Eine 100%ige \"Kein-Ban-Garantie\" wird für keine Software gegeben.",
    "ru": "Любое наше программное обеспечение связано с риском. За любые игровые блокировки ответственность несет исключительно пользователь. 100% гарантия отсутствия бана не предоставляется ни для одного софта."
  },
  {
    "tr": "Hesap Güvenliği",
    "en": "Account Security",
    "de": "Kontosicherheit",
    "ru": "Безопасность аккаунта"
  },
  {
    "tr": "Üçüncü parti yazılım kullanımı sebebiyle ana hesaplarınızın zarar görmesi durumunda",
    "en": "In case your main accounts are affected due to using third-party software",
    "de": "Falls Ihre Hauptkonten durch die Nutzung von Drittanbieter-Software beschädigt werden",
    "ru": "В случае блокировки ваших основных аккаунтов из-за использования стороннего ПО"
  },
  {
    "tr": "[Syntax Software]",
    "en": "[Syntax Software]",
    "de": "[Syntax Software]",
    "ru": "[Syntax Software]"
  },
  {
    "tr": "sorumlu tutulamaz. \"Yan hesap\" (Smurf) kullanımı her zaman tavsiye edilir.",
    "en": "cannot be held responsible. Using a secondary account (Smurf) is always strongly recommended.",
    "de": "kann nicht haftbar gemacht werden. Die Verwendung eines Zweitkontos (Smurf) wird stets empfohlen.",
    "ru": "ответственности не несет. Использование твинк-аккаунтов (Smurf) всегда рекомендуется."
  },
  {
    "tr": "Cihaz Sorumluluğu",
    "en": "Device Responsibility",
    "de": "Geräteverantwortung",
    "ru": "Ответственность за устройство"
  },
  {
    "tr": "Cihazınızın sorumluluğu tamamen size aittir. Syntax Software hiçbir sorumluluk almaz.",
    "en": "Responsibility for your device rests entirely with you. Syntax Software assumes no liability.",
    "de": "Die Verantwortung für Ihr Gerät liegt vollständig bei Ihnen. Syntax Software übernimmt keine Haftung.",
    "ru": "Ответственность за ваше устройство целиком лежит на вас. Syntax Software ответственности не несет."
  },
  {
    "tr": "Dijital Ürün Kapsamı",
    "en": "Digital Product Scope",
    "de": "Digitale Produktbedingungen",
    "ru": "Специфика цифровых товаров"
  },
  {
    "tr": "Satın alınan ürünler \"tek kullanımlık dijital lisans\" kapsamında olduğu için, ürün teslim edildikten sonra iade yapılması mümkün değildir.",
    "en": "Since purchased items are \"single-use digital licenses\", no refunds can be issued once the product is delivered.",
    "de": "Da es sich bei den gekauften Artikeln um \"digitale Einmallizenzen\" handelt, ist eine Rückerstattung nach Lieferung ausgeschlossen.",
    "ru": "Поскольку приобретаемые товары являются одноразовыми цифровыми лицензиями, возврат средств после выдачи невозможен."
  },
  {
    "tr": "Teknik Sorunlar",
    "en": "Technical Issues",
    "de": "Technische Probleme",
    "ru": "Технические неполадки"
  },
  {
    "tr": "Eğer yazılım bilgisayarınızda çalışmıyorsa ve sorun bilgisayarınızla alakalıysa bu kullanıcı hatasıdır; iade sağlanmaz. Teknik ekibimiz sorunu çözmek için elinden geleni yapacaktır. Çözülemeyen, bizden kaynaklı sistemsel sorunlarda (yazılımın tamamen fixlenmesi gibi) telafi süresi eklenir.",
    "en": "If the software does not run on your PC and the issue is related to your system, it is considered user fault; no refund is provided. Our team will do their utmost to help. For unresolved server-side issues (such as permanent software fix), compensation time is credited.",
    "de": "Wenn die Software auf Ihrem PC nicht läuft und das Problem an Ihrem System liegt, handelt es sich um einen Nutzerfehler; keine Rückerstattung. Bei ungelösten serverbedingten Ausfällen wird Ausgleichszeit gutgeschrieben.",
    "ru": "Если софт не работает на вашем ПК по вине настроек вашей системы, это ошибка пользователя — возврат не производится. При неразрешимых сбоях с нашей стороны (например, глобальный фикс) начисляется компенсационное время."
  },
  {
    "tr": "Hatalı Alım",
    "en": "Accidental Purchase",
    "de": "Fehlkauf",
    "ru": "Ошибочная покупка"
  },
  {
    "tr": "Yanlış ürün alımı veya \"beğenmedim\" gibi keyfi sebeplerle iade talep edilemez.",
    "en": "Refunds cannot be requested for mistaken purchases or arbitrary reasons like \"I didn't like it\".",
    "de": "Rückerstattungen wegen versehentlicher Käufe oder Gründen wie \"gefällt mir nicht\" sind ausgeschlossen.",
    "ru": "Возврат средств по причине ошибки выбора товара или \"мне не понравилось\" не предусмотрен."
  },
  {
    "tr": "Tersine Mühendislik",
    "en": "Reverse Engineering",
    "de": "Reverse Engineering",
    "ru": "Реверс-инжиниринг"
  },
  {
    "tr": "Yazılımı cracklemeye çalışmak, tersine mühendislik (reverse engineering) yapmak veya dosyaları paylaşmak kesinlikle yasaktır. Bu durumun tespiti halinde lisansınız kalıcı olarak iptal edilir ve sunucudan süresiz uzaklaştırılırsınız.",
    "en": "Attempting to crack, reverse-engineer or share software files is strictly prohibited. If detected, your license will be permanently revoked and you will be banned from our services indefinitely.",
    "de": "Der Versuch, die Software zu cracken, zurückzuentwickeln oder weiterzugeben, ist strengstens untersagt und führt zum sofortigen Lizenzentzug und permanenten Bann.",
    "ru": "Попытки взлома, декомпиляции или распространения файлов строго запрещены. При обнаружении ваша лицензия аннулируется навсегда с пожизненным баном на сервере."
  },
  {
    "tr": "HWID Kilidi",
    "en": "HWID Lock",
    "de": "HWID-Sperre",
    "ru": "Привязка по HWID"
  },
  {
    "tr": "Lisans anahtarları (key) tek bir bilgisayara tanımlanır. İzinsiz HWID sıfırlama talepleri veya lisansın başkasına devredilmesi yasaktır.",
    "en": "License keys are bound to a single PC. Unauthorized HWID reset requests or transferring the key to another person is prohibited.",
    "de": "Lizenzschlüssel sind an einen einzigen PC gebunden. Unberechtigte HWID-Reset-Anfragen oder die Weitergabe der Lizenz sind untersagt.",
    "ru": "Ключи лицензии привязываются к одному компьютеру. Несанкционированный сброс HWID или передача ключа третьим лицам запрещены."
  },
  {
    "tr": "Davranış Kuralları",
    "en": "Code of Conduct",
    "de": "Verhaltensregeln",
    "ru": "Правила поведения"
  },
  {
    "tr": "Destek Talebi (Ticket)",
    "en": "Support Ticket",
    "de": "Support-Ticket",
    "ru": "Тикет поддержки"
  },
  {
    "tr": "Destek ekibine karşı küfür, hakaret veya aşağılayıcı üslup kullanmak; çözüm sürecini durdurur ve kalıcı olarak hizmet almanızı engeller.",
    "en": "Using profanity, insults, or derogatory language towards support staff immediately halts assistance and results in permanent denial of service.",
    "de": "Beleidigungen oder herablassender Ton gegenüber dem Support-Team führen zum sofortigen Abbruch der Hilfe und dauerhaftem Ausschluss.",
    "ru": "Оскорбления или нецензурная лексика в адрес службы поддержки приведут к прекращению диалога и перманентной блокировке обслуживания."
  },
  {
    "tr": "Spam",
    "en": "Spam",
    "de": "Spam",
    "ru": "Спам"
  },
  {
    "tr": "Destek kanallarında veya yetkililere özelden sürekli mesaj (spam) atmak yasaktır. Sıranızı sabırla beklemelisiniz.",
    "en": "Spamming in support channels or direct messaging staff repeatedly is prohibited. Please wait your turn patiently.",
    "de": "Spammen in Support-Kanälen oder wiederholtes Anschreiben von Teammitgliedern ist verboten. Bitte warten Sie geduldig.",
    "ru": "Флуд в каналах поддержки и спам в личные сообщения администрации запрещены. Пожалуйста, ожидайте своей очереди."
  },
  {
    "tr": "Güncellemeler ve Fix Durumu",
    "en": "Updates & Fix Status",
    "de": "Updates & Wartungsstatus",
    "ru": "Обновления и статус фиксов"
  },
  {
    "tr": "Oyun güncellemeleri geldiğinde yazılımlar güvenliğiniz için bakıma alınabilir. Bakım süreleri boyunca sabırlı olmanız beklenir. Uzun süreli bakımlarda (24 saat üzeri) genellikle süre telafisi yapılmaktadır, müşterilerimiz bu süre boyunca beklemek zorundadır.",
    "en": "When game updates occur, software may enter maintenance for your security. Patience is expected during maintenance. For prolonged maintenance (>24 hours), time compensation is generally provided.",
    "de": "Bei Spielupdates kann die Software zu Ihrer Sicherheit in Wartung gehen. Geduld wird vorausgesetzt. Bei Wartungen über 24 Stunden wird in der Regel Ausgleichszeit gewährt.",
    "ru": "При выходе игровых патчей софт может уходить на техработы ради вашей безопасности. Просьба проявлять терпение. При длительных работах (>24 часов) обычно начисляется компенсация."
  },
  {
    "tr": "Önemli Hatırlatma",
    "en": "Important Notice",
    "de": "Wichtiger Hinweis",
    "ru": "Важное напоминание"
  },
  {
    "tr": "HWİD reset ücreti vardır.",
    "en": "HWID reset fee applies.",
    "de": "HWID-Reset ist kostenpflichtig.",
    "ru": "Сброс HWID является платным."
  },
  {
    "tr": "Kurallara uymayan kullanıcıların lisansları, ücret iadesi yapılmaksızın askıya alınma hakkına sahiptir.",
    "en": "Licenses of users violating terms may be revoked without refund.",
    "de": "Lizenzen von Nutzern, die gegen Regeln verstoßen, können ohne Rückerstattung entzogen werden.",
    "ru": "Лицензии нарушителей правил могут быть аннулированы без права возврата средств."
  },
  {
    "tr": "Kullanım ve Sorumluluk",
    "en": "Usage & Responsibility",
    "de": "Nutzung & Verantwortung",
    "ru": "Использование и ответственность"
  },
  {
    "tr": "İade ve Değişim Politikası",
    "en": "Refund & Exchange Policy",
    "de": "Rückgabe- & Umtauschrichtlinie",
    "ru": "Политика возврата и обмена"
  },
  {
    "tr": "Yazılım Etiketi ve Güvenlik",
    "en": "Software Integrity & Security",
    "de": "Software-Integrität & Sicherheit",
    "ru": "Безопасность и целостность ПО"
  },
  {
    "tr": "Keşfet",
    "en": "Explore",
    "de": "Entdecken",
    "ru": "Навигация"
  },
  {
    "tr": "Oyunlar",
    "en": "Games",
    "de": "Spiele",
    "ru": "Игры"
  },
  {
    "tr": "Tüm ürünler",
    "en": "All products",
    "de": "Alle Produkte",
    "ru": "Все товары"
  },
  {
    "tr": "Servis durumu",
    "en": "Service status",
    "de": "Servicestatus",
    "ru": "Статус сервиса"
  },
  {
    "tr": "Bayi programı",
    "en": "Reseller program",
    "de": "Reseller-Programm",
    "ru": "Партнерская программа"
  },
  {
    "tr": "Kullanım Şartları",
    "en": "Terms of Service",
    "de": "Nutzungsbedingungen",
    "ru": "Условия использования"
  },
  {
    "tr": "Satış Sözleşmesi",
    "en": "Sales Agreement",
    "de": "Kaufvertrag",
    "ru": "Договор оферты"
  },
  {
    "tr": "Tüm sistemler çalışıyor (100% Online)",
    "en": "All systems operational (100% Online)",
    "de": "Alle Systeme betriebsbereit (100% Online)",
    "ru": "Все системы работают (100% Онлайн)"
  },
  {
    "tr": "© 2026 Syntax Software. All Rights Reserved.",
    "en": "© 2026 Syntax Software. All Rights Reserved.",
    "de": "© 2026 Syntax Software. Alle Rechte vorbehalten.",
    "ru": "© 2026 Syntax Software. Все права защищены."
  },
  {
    "tr": "Premium dijital performans için nihai adres. En iyisinde uzlaşmayanlar için tasarlandı. Seçkin ekosistemimize bugün katılın.",
    "en": "The ultimate destination for premium digital performance. Engineered for those who never compromise. Join our elite ecosystem today.",
    "de": "Die ultimative Adresse für erstklassige digitale Leistung. Entwickelt für diejenigen, die keine Kompromisse eingehen. Treten Sie noch heute unserem Elite-Ökosystem bei.",
    "ru": "Главное место для премиальной цифровой производительности. Создано для тех, кто не идет на компромиссы. Присоединяйтесь к нашей элитной экосистеме уже сегодня."
  },
  {
    "tr": "Syntax Software; rekabetçi FPS oyuncularına yönelik güvenilir yazılım abonelikleri sunan profesyonel bir ekosistemdir. Vanguard destekli Valorant araçları ve VAC / VACNet 3.0 güvenli Counter-Strike 2 altyapımızla en üst düzey stabilite, anında teslimat ve 7/24 destek sağlanmaktadır.",
    "en": "Syntax Software is a professional ecosystem providing reliable software subscriptions for competitive FPS players. With Vanguard-supported Valorant tools and VAC / VACNet 3.0 safe Counter-Strike 2 infrastructure, we deliver top-tier stability, instant delivery, and 24/7 support.",
    "de": "Syntax Software ist ein professionelles Ökosystem, das zuverlässige Software-Abonnements für wettbewerbsorientierte FPS-Spieler anbietet. Mit Vanguard-unterstützten Valorant-Tools und VAC / VACNet 3.0-sicherer Counter-Strike 2-Infrastruktur bieten wir höchste Stabilität, sofortige Lieferung und 24/7-Support.",
    "ru": "Syntax Software — профессиональная экосистема надежных софт-подписок для соревновательных игроков в шутеры. С инструментами для Valorant под Vanguard и безопасной инфраструктурой для CS2 под VAC / VACNet 3.0 мы обеспечиваем максимальную стабильность, мгновенную выдачу и поддержку 24/7."
  },
  {
    "tr": "Giriş Yap",
    "en": "Sign In",
    "de": "Anmelden",
    "ru": "Войти"
  },
  {
    "tr": "Kayıt Ol",
    "en": "Sign Up",
    "de": "Registrieren",
    "ru": "Регистрация"
  },
  {
    "tr": "Kullanıcı Adı veya E-posta",
    "en": "Username or Email",
    "de": "Benutzername oder E-Mail",
    "ru": "Логин или Email"
  },
  {
    "tr": "Şifre",
    "en": "Password",
    "de": "Passwort",
    "ru": "Пароль"
  },
  {
    "tr": "Beni Hatırla",
    "en": "Remember Me",
    "de": "Angemeldet bleiben",
    "ru": "Запомнить меня"
  },
  {
    "tr": "Şifremi Unuttum",
    "en": "Forgot Password?",
    "de": "Passwort vergessen?",
    "ru": "Забыли пароль?"
  },
  {
    "tr": "Hesabınız yok mu? Kayıt Ol",
    "en": "Don't have an account? Sign Up",
    "de": "Noch kein Konto? Registrieren",
    "ru": "Нет аккаунта? Регистрация"
  },
  {
    "tr": "Zaten hesabınız var mı? Giriş Yap",
    "en": "Already have an account? Sign In",
    "de": "Bereits registriert? Anmelden",
    "ru": "Уже есть аккаунт? Войти"
  },
  {
    "tr": "Kullanıcı Adı",
    "en": "Username",
    "de": "Benutzername",
    "ru": "Имя пользователя"
  },
  {
    "tr": "E-posta Adresi",
    "en": "Email Address",
    "de": "E-Mail-Adresse",
    "ru": "Электронная почта"
  },
  {
    "tr": "Şifre Tekrar",
    "en": "Confirm Password",
    "de": "Passwort bestätigen",
    "ru": "Подтвердите пароль"
  },
  {
    "tr": "Şartları okudum ve kabul ediyorum",
    "en": "I have read and accept the terms",
    "de": "Ich habe die Bedingungen gelesen und akzeptiere sie",
    "ru": "Я прочитал и принимаю условия"
  },
  {
    "tr": "Discord ile Hızlı Giriş Yap",
    "en": "Quick Login with Discord",
    "de": "Schnellanmeldung mit Discord",
    "ru": "Быстрый вход через Discord"
  },
  {
    "tr": "Müşteri Paneli",
    "en": "Customer Dashboard",
    "de": "Kunden-Dashboard",
    "ru": "Панель клиента"
  },
  {
    "tr": "Aktif Lisans",
    "en": "Active Licenses",
    "de": "Aktive Lizenzen",
    "ru": "Активные лицензии"
  },
  {
    "tr": "HWID Eşleşti",
    "en": "HWID Matched",
    "de": "HWID abgeglichen",
    "ru": "HWID совпадает"
  },
  {
    "tr": "Anında Teslimat",
    "en": "Instant Delivery",
    "de": "Sofortige Lieferung",
    "ru": "Мгновенная выдача"
  },
  {
    "tr": "Anahtarı Kopyala",
    "en": "Copy Key",
    "de": "Schlüssel kopieren",
    "ru": "Скопировать ключ"
  },
  {
    "tr": "Loader İndir",
    "en": "Download Loader",
    "de": "Loader herunterladen",
    "ru": "Скачать лоадер"
  },
  {
    "tr": "Oturumu Kapat",
    "en": "Sign Out",
    "de": "Abmelden",
    "ru": "Выйти"
  },
  {
    "tr": "Giriş Başarılı!",
    "en": "Login Successful!",
    "de": "Anmeldung erfolgreich!",
    "ru": "Успешный вход!"
  },
  {
    "tr": "Kayıt Başarılı!",
    "en": "Registration Successful!",
    "de": "Registrierung erfolgreich!",
    "ru": "Регистрация успешна!"
  },
  {
    "tr": "Çıkış Yapıldı",
    "en": "Signed Out",
    "de": "Abgemeldet",
    "ru": "Вы вышли из системы"
  },
  {
    "tr": "Ürün, sayfa veya özellik ara... (örn: Valorant, Emulator)",
    "en": "Search products, pages or features... (e.g. Valorant, Emulator)",
    "de": "Produkte, Seiten oder Features suchen... (z. B. Valorant, Emulator)",
    "ru": "Поиск товаров, страниц или функций... (напр. Valorant, Emulator)"
  },
  {
    "tr": "ile eşleşen sonuç bulunamadı.",
    "en": "No matching results found.",
    "de": "Keine passenden Ergebnisse gefunden.",
    "ru": "Совпадений не найдено."
  },
  {
    "tr": "Yönetici Modu (Yetkili Yanıtı)",
    "en": "Admin Mode (Staff Reply)",
    "de": "Admin-Modus (Mitarbeiterantwort)",
    "ru": "Режим администратора"
  },
  {
    "tr": "Yönetici",
    "en": "Admin",
    "de": "Admin",
    "ru": "Админ"
  }
];

/* Bidirectional Phrase Indexing with Case & Accent Normalization */
const PHRASE_MAP_EXACT = {};
const PHRASE_MAP_LOWER = {};
const PHRASE_MAP_NORM = {};

function normalizeKey(str) {
  if (!str) return '';
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/["'“”„«»]/g, '')
    .trim();
}

I18N_PHRASES.forEach(p => {
  ['tr', 'en', 'de', 'ru'].forEach(lang => {
    const val = p[lang];
    if (val) {
      const trimmed = val.trim();
      PHRASE_MAP_EXACT[trimmed] = p;
      PHRASE_MAP_LOWER[trimmed.toLowerCase()] = p;
      PHRASE_MAP_NORM[normalizeKey(trimmed)] = p;
    }
  });
});

function translateTextString(str, targetLang) {
  if (!str) return str;
  const trimmed = str.trim();
  if (!trimmed) return str;

  // 1. Direct exact match
  let match = PHRASE_MAP_EXACT[trimmed];

  // 2. Lowercase match
  if (!match) {
    match = PHRASE_MAP_LOWER[trimmed.toLowerCase()];
  }

  // 3. Normalized key match (strips diacritics, Turkish I/İ variances, quotes)
  if (!match) {
    match = PHRASE_MAP_NORM[normalizeKey(trimmed)];
  }

  // 4. Dynamic Counter matching (e.g. "8 ürün", "12 products", "5 Produkte", "2 товаров")
  if (!match) {
    const countMatch = trimmed.match(/^(\d+)\s+(ürün|products|produkte|товаров)$/i);
    if (countMatch) {
      const num = countMatch[1];
      const wordMap = {
        tr: 'ürün',
        en: 'products',
        de: 'Produkte',
        ru: 'товаров'
      };
      const lead = str.match(/^\s*/)[0];
      const trail = str.match(/\s*$/)[0];
      return lead + `${num} ${wordMap[targetLang] || 'products'}` + trail;
    }
  }

  if (match && match[targetLang]) {
    const lead = str.match(/^\s*/)[0];
    const trail = str.match(/\s*$/)[0];
    return lead + match[targetLang] + trail;
  }

  return str;
}

function translateDOM(targetLang) {
  // 1. Translate document title
  if (document.title) {
    document.title = translateTextString(document.title, targetLang);
  }

  // 2. Walk all text nodes across the body
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (tag === 'script' || tag === 'style' || tag === 'svg' || tag === 'path' || parent.closest('.lang-dropdown-menu')) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach(node => {
    const current = node.nodeValue;
    const translated = translateTextString(current, targetLang);
    if (translated !== current) {
      node.nodeValue = translated;
    }
  });

  // 3. Translate input & textarea placeholders
  document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(input => {
    const ph = input.getAttribute('placeholder');
    if (ph) {
      input.setAttribute('placeholder', translateTextString(ph, targetLang));
    }
  });

  // 4. Translate select options
  document.querySelectorAll('select option').forEach(opt => {
    const txt = opt.textContent;
    if (txt) {
      opt.textContent = translateTextString(txt, targetLang);
    }
  });

  // 5. Translate title and tooltip attributes
  document.querySelectorAll('[title]').forEach(el => {
    const title = el.getAttribute('title');
    if (title && !el.closest('.lang-dropdown-menu')) {
      el.setAttribute('title', translateTextString(title, targetLang));
    }
  });

  // 6. Update data-i18n elements if specified
  const langObj = LANG_DATA[targetLang];
  if (langObj && langObj.labels) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (langObj.labels[key]) {
        el.textContent = langObj.labels[key];
      } else {
        const cur = el.textContent;
        const trn = translateTextString(cur, targetLang);
        if (trn !== cur) el.textContent = trn;
      }
    });
  }

  // 7. Update store visible counter if element exists
  const storeCountEl = document.getElementById('storeVisibleCount');
  if (storeCountEl) {
    const curCountTxt = storeCountEl.textContent;
    storeCountEl.textContent = translateTextString(curCountTxt, targetLang);
  }

  // 8. Update Discord live timestamp if present
  const discordTimeEl = document.getElementById('discordStatusTime');
  if (discordTimeEl) {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const wordMap = { tr: 'Bugün', en: 'Today at', de: 'Heute um', ru: 'Сегодня в' };
    const todayWord = wordMap[targetLang] || 'Today at';
    discordTimeEl.textContent = `${todayWord} ${h}:${m}`;
  }

  // 9. Set html lang attribute
  document.documentElement.lang = targetLang;
}

function applyLanguage(langKey, showNotification = true) {
  const data = LANG_DATA[langKey] || LANG_DATA['tr'];
  localStorage.setItem('syntax_software_lang', langKey);

  // Update current flag
  const currentFlagEl = document.getElementById('currentLangFlag');
  if (currentFlagEl) {
    currentFlagEl.innerHTML = data.flagSvg;
  }

  // Update current code
  const currentCodeEl = document.getElementById('currentLangCode');
  if (currentCodeEl) {
    currentCodeEl.textContent = data.code;
  }

  // Update dropdown active class
  document.querySelectorAll('.lang-option-item').forEach(item => {
    if (item.getAttribute('data-lang') === langKey) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Translate the entire page DOM
  translateDOM(langKey);

  if (showNotification) {
    showToast(data.toast, 'globe');
  }
}
window.applyLanguage = applyLanguage;

function initLanguageDropdown() {
  const wrapper = document.getElementById('langDropdownWrapper') || document.querySelector('.lang-dropdown-wrapper');
  const pillBtn = document.getElementById('langPillBtn') || (wrapper ? wrapper.querySelector('.lang-pill') : null);
  const menu = document.getElementById('langDropdownMenu') || (wrapper ? wrapper.querySelector('.lang-dropdown-menu') : null);

  if (!wrapper || !pillBtn) return;

  // Toggle dropdown on button click
  pillBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = wrapper.classList.toggle('open');
    pillBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Option selection
  if (menu) {
    menu.querySelectorAll('.lang-option-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedLang = btn.getAttribute('data-lang');
        applyLanguage(selectedLang, true);
        wrapper.classList.remove('open');
        pillBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      wrapper.classList.remove('open');
      pillBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && wrapper.classList.contains('open')) {
      wrapper.classList.remove('open');
      pillBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // Apply saved language from URL parameter or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const paramLang = urlParams.get('lang');
  const savedLang = paramLang || localStorage.getItem('syntax_software_lang') || 'tr';
  applyLanguage(savedLang, false);
}

/* ==========================================================================
   QUICK SEARCH MODAL (Ctrl + K)
   ========================================================================== */
function initQuickSearchModal() {
  // Ensure modal container exists
  let backdrop = document.getElementById('searchModalBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'searchModalBackdrop';
    backdrop.className = 'search-modal-backdrop';
    backdrop.innerHTML = `
      <div class="search-modal-box">
        <div class="search-modal-input-row">
          <i data-lucide="search" style="width:18px;height:18px;color:#a855f7;"></i>
          <input type="text" class="search-modal-input" id="searchModalInput" placeholder="Ürün, sayfa veya özellik ara... (örn: Valorant, Emulator)" autocomplete="off">
          <span class="search-modal-esc-badge">ESC</span>
        </div>
        <div class="search-modal-results" id="searchModalResults"></div>
      </div>
    `;
    document.body.appendChild(backdrop);
    if (window.lucide) window.lucide.createIcons();
  }

  const searchInput = document.getElementById('searchModalInput');
  const resultsContainer = document.getElementById('searchModalResults');

  const catalog = [
    { title: 'CS Kernel', category: 'Counter-Strike 2', url: 'magaza.html?cat=cs2', desc: 'Ring 0 level stealth, ESP/Wallhack, aimbot, günlük 340 TL' },
    { title: 'Temp spoofer', category: 'Spoofer & HWID', url: 'magaza.html?cat=spoofer', desc: 'VAN 152 bypass, format gerekmez, onetime 1.200 TL' },
    { title: 'Perm spoofer', category: 'Spoofer & HWID', url: 'magaza.html?cat=spoofer', desc: 'VAN 152 & VAL 5 kalıcı bypass, onetime 1.500 TL' },
    { title: 'OneClick Spoofer', category: 'Spoofer & HWID', url: 'magaza.html?cat=spoofer', desc: 'VAN 152 & Val 5 bypass, format & BIOS gerekmez, 7 gün ₺3.999' },
    { title: 'Valorant External', category: 'Valorant', url: 'magaza.html?cat=valorant', desc: 'Safe Aimbot, ESP, config sistemi, günlük 340 TL' },
    { title: 'Valorant Internal', category: 'Valorant', url: 'magaza.html?cat=valorant', desc: 'Full Aimbot, ESP, Chams, CS2 Skins, Skybox, günlük 300 TL' },
    { title: 'Cheat Emu', category: 'Spoofer & Emulator', url: 'magaza.html?cat=spoofer', desc: 'Val 5 bypass, Vanguard off, no temp bans, günlük $35' },
    { title: 'Vanguard Emulator', category: 'Spoofer & Emulator', url: 'magaza.html?cat=spoofer', desc: 'No restart, format gerekmez, VAN 102/VAL 5 bypass, $39.99' },
    { title: 'Ürün Durumu (Status Page)', category: 'Canlı Durum', url: 'durum.html', desc: 'Tüm ürünlerin anlık tespit ve bakım durumu' },
    { title: 'Bayi & Reseller Programı', category: 'İş Ortaklığı', url: 'bayi.html', desc: 'Kendi panelinizi kurun, toptan lisanslama yapın' },
    { title: 'Kullanım Şartları & Sözleşme', category: 'Yasal', url: 'sartlar.html', desc: 'İade politikası, kurallar ve sorumluluklar' },
    { title: 'Discord Topluluğu', category: 'Resmi Destek', url: 'https://discord.gg/wFaNxzyMU', desc: 'Canlı bilet açın, duyuruları takip edin' },
    { title: 'WhatsApp Canlı Destek (+90 534 646 08 21)', category: 'WhatsApp', url: 'https://wa.me/905346460821', desc: 'Anında sipariş ve hızlı soru hattı' }
  ];

  function renderResults(query = '') {
    const q = query.trim().toLowerCase();
    const filtered = catalog.filter(item => 
      !q || item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      resultsContainer.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: #9ca3af; font-size: 0.9rem;">
          "${escapeHtml(query)}" ile eşleşen sonuç bulunamadı.
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = filtered.map(item => `
      <a href="${item.url}" class="search-result-item" ${item.url.startsWith('http') ? 'target="_blank"' : ''}>
        <div>
          <div style="font-size: 0.92rem; font-weight: 700; color: #fff;">${escapeHtml(item.title)}</div>
          <div style="font-size: 0.76rem; color: #9ca3af; margin-top: 2px;">${escapeHtml(item.desc)}</div>
        </div>
        <span class="search-result-category">${escapeHtml(item.category)} ↗</span>
      </a>
    `).join('');
  }

  function openSearch() {
    backdrop.classList.add('open');
    renderResults('');
    setTimeout(() => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
    }, 50);
  }

  function closeSearch() {
    backdrop.classList.remove('open');
  }

  // Bind trigger buttons (like #navSearchBtn)
  document.querySelectorAll('#navSearchBtn, .icon-btn[title*="Arama"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openSearch();
    });
  });

  // Filter input typing
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderResults(e.target.value);
    });
  }

  // Backdrop click to close
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeSearch();
    }
  });

  // Keyboard shortcut Ctrl+K or Cmd+K or Esc
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (backdrop.classList.contains('open')) {
        closeSearch();
      } else {
        openSearch();
      }
    } else if (e.key === 'Escape' && backdrop.classList.contains('open')) {
      closeSearch();
    }
  });
}

/* ==========================================================================
   DYNAMIC GAME THEME ENGINE (Wallpaper + Cheat Control Panel Reactive Switch)
   ========================================================================== */
function renderThemeCheatPanel(theme) {
  const panel = document.getElementById('cheatControlPanel');
  if (!panel) return;

  if (theme === 'cs2') {
    panel.innerHTML = `
      <div class="panel-game-header-tag">
        <div style="display:flex; align-items:center;">
          <span class="pulse-dot-cs2"></span>
          <span style="font-weight:800; color:#fbbf24; font-size:0.75rem; letter-spacing:0.05em;">COUNTER-STRIKE 2 KERNEL</span>
        </div>
        <span style="color:#10b981; font-size:0.7rem; font-weight:700;">● VAC-LIVE BYPASSED</span>
      </div>

      <!-- Tab Row 1 -->
      <div class="panel-tab-row">
        <button class="panel-tab-btn active" data-panel-tab="aimbot">Aimbot</button>
        <button class="panel-tab-btn" data-panel-tab="esp">ESP</button>
        <button class="panel-tab-btn" data-panel-tab="visuals">Visuals</button>
        <button class="panel-tab-btn" data-panel-tab="misc">Misc</button>
      </div>

      <!-- Tab Row 2 -->
      <div class="panel-subtab-row">
        <button class="panel-subtab-btn" data-panel-tab="skin">Skin</button>
        <button class="panel-subtab-btn" data-panel-tab="thirdperson">Thirdperson</button>
        <button class="panel-subtab-btn" data-panel-tab="effects">Effects</button>
        <button class="panel-subtab-btn" data-panel-tab="setup">Setup</button>
      </div>

      <!-- TAB 1: CS2 AIMBOT -->
      <div class="panel-tab-content active" data-panel-content="aimbot">
        <div class="control-slider-group">
          <div class="slider-header">
            <span class="slider-label">aimfov</span>
            <span class="slider-val-badge" id="valAimFov">360.0</span>
          </div>
          <input type="range" class="cyber-slider" min="0" max="360" step="0.5" value="360" data-val-target="valAimFov">
        </div>

        <div class="checkbox-grid">
          <div class="cyber-checkbox-item">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>auto wallbang</span>
            <span class="cb-subtext">(key: =)</span>
          </div>

          <div class="cyber-checkbox-item">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>thru smoke</span>
          </div>

          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>headbox aiming</span>
          </div>

          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>prediction</span>
          </div>

          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>smooth</span>
          </div>

          <div class="cyber-checkbox-item">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>nospread</span>
          </div>
        </div>

        <div class="panel-divider"></div>

        <div class="keybind-row">
          <button class="keybind-trigger-btn">Thumb Mouse Button</button>
          <span class="keybind-arrow">→</span>
          <span class="keybind-target">aimkey</span>
        </div>

        <div class="checkbox-inline-row">
          <div class="cyber-checkbox-item">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>psilent</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>trigger</span>
          </div>
        </div>

        <div class="keybind-row">
          <button class="keybind-trigger-btn">Thumb Mouse Button 2</button>
          <span class="keybind-arrow">→</span>
          <span class="keybind-target">aimkey 2</span>
        </div>

        <div class="keybind-row">
          <button class="keybind-trigger-btn">Head</button>
          <span class="keybind-arrow">→</span>
          <span class="keybind-target">bone</span>
        </div>
      </div>

      <!-- CS2 TAB 2: ESP -->
      <div class="panel-tab-content" data-panel-content="esp">
        <div class="checkbox-grid">
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>skeleton esp</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>2D box (corners)</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>C4 bomb timer (40s)</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>dropped weapons esp</span>
          </div>
          <div class="cyber-checkbox-item">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>grenade trajectory</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>radar hack bypass</span>
          </div>
        </div>
      </div>

      <!-- CS2 TAB 3: VISUALS -->
      <div class="panel-tab-content" data-panel-content="visuals">
        <div class="checkbox-grid">
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>chams (gold metallic)</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>enemy glow esp</span>
          </div>
          <div class="cyber-checkbox-item">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>bullet tracers</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>flashbang removal</span>
          </div>
        </div>
      </div>

      <!-- CS2 TAB 4: MISC -->
      <div class="panel-tab-content" data-panel-content="misc">
        <div class="checkbox-grid">
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>auto bunnyhop</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>fast stop (counter-strafe)</span>
          </div>
          <div class="cyber-checkbox-item">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>rank revealer</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>backtrack (200ms)</span>
          </div>
        </div>
      </div>

      <!-- CS2 SUBTABS -->
      <div class="panel-tab-content" data-panel-content="skin">
        <div style="font-size:0.8rem; color:#9ca3af; margin-bottom:0.6rem;">CS2 Skinchanger Entegrasyonu</div>
        <div class="keybind-row">
          <button class="keybind-trigger-btn">Knife: Karambit Doppler</button>
          <span class="keybind-arrow">→</span>
          <span class="keybind-target">Phase 2</span>
        </div>
        <div class="keybind-row">
          <button class="keybind-trigger-btn">Gloves: Sport Vice</button>
          <span class="keybind-arrow">→</span>
          <span class="keybind-target">Factory New</span>
        </div>
      </div>

      <div class="panel-tab-content" data-panel-content="thirdperson">
        <div class="control-slider-group">
          <div class="slider-header">
            <span class="slider-label">thirdperson distance</span>
            <span class="slider-val-badge" id="valTpDist">120.0</span>
          </div>
          <input type="range" class="cyber-slider" min="50" max="250" step="1" value="120" data-val-target="valTpDist">
        </div>
      </div>

      <div class="panel-tab-content" data-panel-content="effects">
        <div class="checkbox-grid">
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>custom hit sound</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>kill sparkles</span>
          </div>
        </div>
      </div>

      <div class="panel-tab-content" data-panel-content="setup">
        <div style="font-size:0.78rem; line-height:1.7; color:#9ca3af;">
          <div>Kernel Driver: <strong style="color:#10b981;">Ring-0 Active</strong></div>
          <div>HWID Protection: <strong style="color:#10b981;">Spoofed & Verified</strong></div>
          <div>VAC-Live Bypass: <strong style="color:#10b981;">Undetected 2026</strong></div>
        </div>
      </div>
    `;
  } else if (theme === 'bw') {
    // Siyah Beyaz (Monochrome) template
    panel.innerHTML = `
      <div class="panel-game-header-tag bw-tag">
        <div style="display:flex; align-items:center;">
          <span class="pulse-dot-bw"></span>
          <span style="font-weight:800; color:#ffffff; font-size:0.75rem; letter-spacing:0.05em;">SYNTAX MONOCHROME EDITION</span>
        </div>
        <span style="color:#e4e4e7; font-size:0.7rem; font-weight:700;">● ZERO-TRACE STEALTH</span>
      </div>

      <!-- Tab Row 1 -->
      <div class="panel-tab-row">
        <button class="panel-tab-btn active" data-panel-tab="aimbot">Aimbot</button>
        <button class="panel-tab-btn" data-panel-tab="esp">ESP</button>
        <button class="panel-tab-btn" data-panel-tab="visuals">Visuals</button>
        <button class="panel-tab-btn" data-panel-tab="misc">Misc</button>
      </div>

      <!-- Tab Row 2 -->
      <div class="panel-subtab-row">
        <button class="panel-subtab-btn" data-panel-tab="skin">Monochrome</button>
        <button class="panel-subtab-btn" data-panel-tab="radar">Radar</button>
        <button class="panel-subtab-btn" data-panel-tab="trigger">Trigger</button>
        <button class="panel-subtab-btn" data-panel-tab="setup">Bypass</button>
      </div>

      <!-- MONOCHROME TAB 1: AIMBOT -->
      <div class="panel-tab-content active" data-panel-content="aimbot">
        <div class="control-slider-group">
          <div class="slider-header">
            <span class="slider-label">aimfov (monochrome)</span>
            <span class="slider-val-badge" id="valAimFovBw">360.0</span>
          </div>
          <input type="range" class="cyber-slider" min="0" max="360" step="0.5" value="360" data-val-target="valAimFovBw">
        </div>

        <div class="control-slider-group" style="margin-top:0.7rem;">
          <div class="slider-header">
            <span class="slider-label">smoothness factor</span>
            <span class="slider-val-badge" id="valSmoothBw">8.0</span>
          </div>
          <input type="range" class="cyber-slider" min="1" max="25" step="0.5" value="8" data-val-target="valSmoothBw">
        </div>

        <div class="checkbox-grid">
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>rcs recoil control</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>target bone: head</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>psilent vector</span>
          </div>
          <div class="cyber-checkbox-item">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>auto fire</span>
          </div>
        </div>

        <div class="panel-divider"></div>

        <div class="keybind-row">
          <button class="keybind-trigger-btn">Mouse 5</button>
          <span class="keybind-arrow">→</span>
          <span class="keybind-target">stealth aimkey</span>
        </div>
      </div>

      <!-- MONOCHROME TAB 2: ESP -->
      <div class="panel-tab-content" data-panel-content="esp">
        <div class="checkbox-grid">
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>skeleton esp</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>2D box silver</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>health bar</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>snaplines</span>
          </div>
        </div>
      </div>

      <!-- MONOCHROME TAB 3: VISUALS -->
      <div class="panel-tab-content" data-panel-content="visuals">
        <div class="checkbox-grid">
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>chams (obsidian glow)</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>visible check</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>smoke removal</span>
          </div>
        </div>
      </div>

      <!-- MONOCHROME TAB 4: MISC -->
      <div class="panel-tab-content" data-panel-content="misc">
        <div class="checkbox-grid">
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>bunnyhop</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>anti-screenshot</span>
          </div>
        </div>
      </div>

      <!-- MONOCHROME SUBTABS -->
      <div class="panel-tab-content" data-panel-content="skin">
        <div style="font-size:0.8rem; color:#9ca3af; margin-bottom:0.6rem;">Monochrome Skinchanger</div>
        <div class="keybind-row">
          <button class="keybind-trigger-btn">Skin Profile: Pure Monochrome</button>
          <span class="keybind-arrow">→</span>
          <span class="keybind-target">Active</span>
        </div>
      </div>

      <div class="panel-tab-content" data-panel-content="radar">
        <div class="checkbox-grid">
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>2D mini-radar</span>
          </div>
        </div>
      </div>

      <div class="panel-tab-content" data-panel-content="trigger">
        <div class="control-slider-group">
          <div class="slider-header">
            <span class="slider-label">trigger delay (ms)</span>
            <span class="slider-val-badge" id="valTrigDelayBw">10.0</span>
          </div>
          <input type="range" class="cyber-slider" min="0" max="150" step="1" value="10" data-val-target="valTrigDelayBw">
        </div>
      </div>

      <div class="panel-tab-content" data-panel-content="setup">
        <div style="font-size:0.78rem; line-height:1.7; color:#9ca3af;">
          <div>System Engine: <strong style="color:#ffffff;">Monochrome Stealth</strong></div>
          <div>Hardware Guard: <strong style="color:#ffffff;">Hardware Ring-0</strong></div>
          <div>OBS Screen Proof: <strong style="color:#ffffff;">Fully Invisible</strong></div>
        </div>
      </div>
    `;
  } else {
    // Valorant template
    panel.innerHTML = `
      <div class="panel-game-header-tag val-tag">
        <div style="display:flex; align-items:center;">
          <span class="pulse-dot-val"></span>
          <span style="font-weight:800; color:#d8b4fe; font-size:0.75rem; letter-spacing:0.05em;">VANGUARD EMU</span>
        </div>
        <span style="color:#10b981; font-size:0.7rem; font-weight:700;">● 5 SLOT</span>
      </div>

      <!-- Tab Row 1 -->
      <div class="panel-tab-row">
        <button class="panel-tab-btn active" data-panel-tab="aimbot">Aimbot</button>
        <button class="panel-tab-btn" data-panel-tab="esp">ESP</button>
        <button class="panel-tab-btn" data-panel-tab="visuals">Visuals</button>
        <button class="panel-tab-btn" data-panel-tab="misc">Misc</button>
      </div>

      <!-- Tab Row 2 -->
      <div class="panel-subtab-row">
        <button class="panel-subtab-btn" data-panel-tab="skin">Skins</button>
        <button class="panel-subtab-btn" data-panel-tab="radar">Radar</button>
        <button class="panel-subtab-btn" data-panel-tab="trigger">Trigger</button>
        <button class="panel-subtab-btn" data-panel-tab="setup">Bypass</button>
      </div>

      <!-- VALORANT TAB 1: AIMBOT -->
      <div class="panel-tab-content active" data-panel-content="aimbot">
        <div class="control-slider-group">
          <div class="slider-header">
            <span class="slider-label">aimfov (pixel radius)</span>
            <span class="slider-val-badge" id="valAimFovVal">45.0</span>
          </div>
          <input type="range" class="cyber-slider" min="0" max="180" step="0.5" value="45" data-val-target="valAimFovVal">
        </div>

        <div class="control-slider-group" style="margin-top:0.7rem;">
          <div class="slider-header">
            <span class="slider-label">smoothness</span>
            <span class="slider-val-badge" id="valSmoothVal">6.5</span>
          </div>
          <input type="range" class="cyber-slider" min="1" max="25" step="0.5" value="6.5" data-val-target="valSmoothVal">
        </div>

        <div class="checkbox-grid" style="margin-top:0.75rem;">
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>visible check</span>
            <span class="cb-subtext">(raycast)</span>
          </div>

          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>rcs recoil control</span>
          </div>

          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>humanized curve</span>
          </div>

          <div class="cyber-checkbox-item">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>smoke check</span>
          </div>

          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>silent aim</span>
          </div>

          <div class="cyber-checkbox-item">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>auto fire</span>
          </div>
        </div>

        <div class="panel-divider"></div>

        <div class="keybind-row">
          <button class="keybind-trigger-btn">Left Alt</button>
          <span class="keybind-arrow">→</span>
          <span class="keybind-target">aimkey</span>
        </div>

        <div class="checkbox-inline-row">
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>draw fov</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>triggerbot</span>
          </div>
        </div>

        <div class="keybind-row">
          <button class="keybind-trigger-btn">Thumb Mouse Button</button>
          <span class="keybind-arrow">→</span>
          <span class="keybind-target">aimkey 2</span>
        </div>

        <div class="keybind-row">
          <button class="keybind-trigger-btn">Head / Neck</button>
          <span class="keybind-arrow">→</span>
          <span class="keybind-target">bone</span>
        </div>
      </div>

      <!-- VALORANT TAB 2: ESP -->
      <div class="panel-tab-content" data-panel-content="esp">
        <div class="checkbox-grid">
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>3D skeleton</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>2D corner box</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>spike timer (45s countdown)</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>agent name (Jett, Reyna)</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>health & shield bar</span>
          </div>
          <div class="cyber-checkbox-item">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>weapon & abilities</span>
          </div>
        </div>
      </div>

      <!-- VALORANT TAB 3: VISUALS -->
      <div class="panel-tab-content" data-panel-content="visuals">
        <div class="checkbox-grid">
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>glow chams (cyan visible)</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>occluded chams (pink)</span>
          </div>
          <div class="cyber-checkbox-item">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>snaplines to head</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>offscreen enemy arrows</span>
          </div>
        </div>
      </div>

      <!-- VALORANT TAB 4: MISC -->
      <div class="panel-tab-content" data-panel-content="misc">
        <div class="checkbox-grid">
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>unlock all gun skins</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>stream proof (OBS bypass)</span>
          </div>
          <div class="cyber-checkbox-item">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>bunnyhop auto-jump</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>anti-flash / no blind</span>
          </div>
        </div>
      </div>

      <!-- VALORANT SUBTABS -->
      <div class="panel-tab-content" data-panel-content="skin">
        <div style="font-size:0.8rem; color:#9ca3af; margin-bottom:0.6rem;">Valorant Skinchanger (Client-Side)</div>
        <div class="keybind-row">
          <button class="keybind-trigger-btn">Vandal: Kuronami</button>
          <span class="keybind-arrow">→</span>
          <span class="keybind-target">Level 4 Finisher</span>
        </div>
        <div class="keybind-row">
          <button class="keybind-trigger-btn">Phantom: Reaver</button>
          <span class="keybind-arrow">→</span>
          <span class="keybind-target">White Variant</span>
        </div>
      </div>

      <div class="panel-tab-content" data-panel-content="radar">
        <div class="checkbox-grid">
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>2D mini-radar hack</span>
          </div>
          <div class="cyber-checkbox-item checked">
            <div class="custom-cb-square"><svg viewBox="0 0 14 14" fill="none"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <span>sound footsteps range</span>
          </div>
        </div>
      </div>

      <div class="panel-tab-content" data-panel-content="trigger">
        <div class="control-slider-group">
          <div class="slider-header">
            <span class="slider-label">trigger delay (ms)</span>
            <span class="slider-val-badge" id="valTrigDelay">18.0</span>
          </div>
          <input type="range" class="cyber-slider" min="0" max="150" step="1" value="18" data-val-target="valTrigDelay">
        </div>
      </div>

      <div class="panel-tab-content" data-panel-content="setup">
        <div style="font-size:0.78rem; line-height:1.7; color:#9ca3af;">
          <div>Vanguard Bypass: <strong style="color:#10b981;">Protected & Active</strong></div>
          <div>Vanguard Hook: <strong style="color:#10b981;">Bypassed (Clean)</strong></div>
          <div>Stream Proof: <strong style="color:#10b981;">OBS Invisible</strong></div>
        </div>
      </div>
    `;
  }

  // Always append the watermark to the bottom right of the panel
  if (panel && !panel.querySelector('.cheat-panel-watermark')) {
    const wm = document.createElement('div');
    wm.className = 'cheat-panel-watermark';
    wm.textContent = 'Bu menülere örnektir';
    panel.appendChild(wm);
  }

  // Re-initialize interactive listeners on the newly rendered panel
  initCheatPanel();
}

function initDynamicGameBackground() {
  const THEME_KEY = 'syntax_active_theme';
  const saved = localStorage.getItem(THEME_KEY);
  
  let currentTheme = saved || (Math.random() > 0.5 ? 'cs2' : 'valorant');
  if (currentTheme !== 'cs2' && currentTheme !== 'valorant' && currentTheme !== 'bw') {
    currentTheme = 'valorant';
  }
  
  // Ensure game background layers exist in DOM
  if (!document.querySelector('.game-bg-val') || !document.querySelector('.game-bg-cs2')) {
    const bgContainer = document.createElement('div');
    bgContainer.id = 'dynamicGameBackgroundLayers';
    bgContainer.innerHTML = `
      <div class="game-bg-layer game-bg-val" style="background-image: url('images/valorant-bg.webp');">
        <div class="game-bg-overlay val-overlay"></div>
      </div>
      <div class="game-bg-layer game-bg-cs2" style="background-image: url('images/cs2-bg.webp');">
        <div class="game-bg-overlay cs2-overlay"></div>
      </div>
    `;
    document.body.prepend(bgContainer);
  }

  function applyTheme(theme) {
    document.body.classList.remove('theme-valorant', 'theme-cs2', 'theme-bw');
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem(THEME_KEY, theme);
    
    const pill = document.getElementById('themeSwitcherBtn');
    if (pill) {
      const textEl = document.getElementById('themeSwitcherText');
      if (textEl) {
        if (theme === 'cs2') {
          textEl.textContent = 'Mod: CS2';
        } else if (theme === 'bw') {
          textEl.textContent = 'Mod: Siyah Beyaz';
        } else {
          textEl.textContent = 'Mod: Valorant';
        }
      }
    }

    // Dynamic update for Featured Banner (#1 Numaralı Önerimiz) based on active mode
    const bTitle = document.getElementById('featuredBannerTitle');
    const bDesc = document.getElementById('featuredBannerDesc');
    const bPrice = document.getElementById('featuredBannerPrice');
    const bLink = document.getElementById('featuredBannerLink');
    if (bTitle) {
      if (theme === 'cs2') {
        bTitle.textContent = 'Counter-Strike 2 Premier Kernel Private';
        if (bDesc) bDesc.textContent = 'Counter-Strike 2 için VAC & VACnet bypass destekli, akıcı Glow ESP, aimbot ve anında envanter özelleştirici.';
        if (bPrice) bPrice.innerHTML = 'Başlangıç <span>₺650 / $55</span>';
        if (bLink) bLink.href = 'magaza.html?cat=cs2';
      } else if (theme === 'bw') {
        bTitle.textContent = 'Syntax Stealth Universal Suite';
        if (bDesc) bDesc.textContent = 'Minimalist, ultra düşük gecikmeli ve arka planda sıfır iz bırakan evrensel hile koruma ve performans mimarisi.';
        if (bPrice) bPrice.innerHTML = 'Başlangıç <span>₺750 / $65</span>';
        if (bLink) bLink.href = 'magaza.html';
      } else {
        bTitle.textContent = 'Vanguard Emulator Private Slotted';
        if (bDesc) bDesc.textContent = 'Her müşteriye ilk önerdiğimiz ürün — arkasında durduğumuz en üst düzey güvenlik mimarisi ve sıfır gecikmeli emülasyon kurulumu.';
        if (bPrice) bPrice.innerHTML = 'Başlangıç <span>₺850 / $75</span>';
        if (bLink) bLink.href = 'magaza.html?cat=valorant';
      }
    }

    // Update bottom-left floating theme switcher tooltip
    const btmPillTooltip = document.getElementById('themeSwitcherBottomTooltip');
    if (btmPillTooltip) {
      if (theme === 'cs2') {
        btmPillTooltip.textContent = 'Mod: CS2';
      } else if (theme === 'bw') {
        btmPillTooltip.textContent = 'Mod: Siyah Beyaz';
      } else {
        btmPillTooltip.textContent = 'Mod: Valorant';
      }
    }

    // Update cheat panel for the active theme
    renderThemeCheatPanel(theme);
  }

  // Theme cycle handler for both bottom-left switcher and banner switcher
  const cycleTheme = (e) => {
    if (e) e.preventDefault();
    let next = 'valorant';
    if (document.body.classList.contains('theme-valorant')) next = 'cs2';
    else if (document.body.classList.contains('theme-cs2')) next = 'bw';
    else if (document.body.classList.contains('theme-bw')) next = 'valorant';
    applyTheme(next);
    if (typeof window.showToast === 'function') {
      const names = {
        'cs2': '🎮 Counter-Strike 2 moduna geçildi.',
        'valorant': '⚡ Valorant moduna geçildi.',
        'bw': '⬛ Siyah Beyaz moduna geçildi.'
      };
      window.showToast(names[next] || 'Mod değiştirildi.', 'sparkles');
    }
  };

  // Attach click handler to both switchers
  const pill = document.getElementById('themeSwitcherBtn');
  if (pill) pill.onclick = cycleTheme;

  const btmBtn = document.getElementById('themeSwitcherBottomBtn');
  if (btmBtn) btmBtn.onclick = cycleTheme;

  applyTheme(currentTheme);
}
window.initDynamicGameBackground = initDynamicGameBackground;
window.renderThemeCheatPanel = renderThemeCheatPanel;


/* ==========================================================================
   10. ROLE-BASED AUTH & CONTROL DASHBOARDS (Yönetici, Reseller, Ayrı Kayıt)
   ========================================================================== */
function initAuthAndUserPanel() {
  const STORAGE_USERS_KEY = 'syntax_registered_users_v3';
  const STORAGE_CURRENT_USER = 'syntax_current_user_v3';
  const STORAGE_ORDERS_KEY = 'syntax_orders_log';
  const STORAGE_RESELLER_KEYS = 'syntax_reseller_keys';

  // Seed default owner account (demo accounts deleted)
  function getUsers() {
    try {
      const raw = localStorage.getItem(STORAGE_USERS_KEY);
      if (raw) {
        let users = JSON.parse(raw);
        // Completely remove demo accounts
        users = users.filter(u => !['admin', 'reseller', 'demo'].includes((u.username || '').toLowerCase()));
        let noxy = users.find(u => u.username.toLowerCase() === 'noxy');
        if (!noxy) {
          users.unshift({
            username: 'NOXY',
            email: 'noxy@syntaxsoftware.com',
            password: '80Ozan84',
            rank: 'Kurucu & Sistem Sahibi (Owner)',
            role: 'owner',
            createdAt: '2026-09-01'
          });
        } else {
          noxy.role = 'owner';
          noxy.password = '80Ozan84';
          noxy.rank = 'Kurucu & Sistem Sahibi (Owner)';
        }
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));

        // If current user is a deleted demo account, log them out
        try {
          const curUser = JSON.parse(localStorage.getItem(STORAGE_CURRENT_USER) || 'null');
          if (curUser && ['admin', 'reseller', 'demo'].includes((curUser.username || '').toLowerCase())) {
            localStorage.removeItem(STORAGE_CURRENT_USER);
          }
        } catch (e) {}

        return users;
      }
    } catch (e) {}
    const defaults = [
      {
        username: 'NOXY',
        email: 'noxy@syntaxsoftware.com',
        password: '80Ozan84',
        rank: 'Kurucu & Sistem Sahibi (Owner)',
        role: 'owner',
        createdAt: '2026-09-01'
      }
    ];
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(defaults));
    return defaults;
  }

  // Seed default orders if empty
  function getOrders() {
    try {
      const raw = localStorage.getItem(STORAGE_ORDERS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    const defaultOrders = [
      {
        orderId: 'SYN-86799',
        customer: 'Ahmet Yılmaz',
        email: 'ahmet@gmail.com',
        amount: '₺1.200',
        method: 'Banka Havalesi (FAST)',
        date: 'Bugün 09:15',
        status: 'KEY BEKLİYOR',
        licenseKey: '',
        items: 't3mp spoofer'
      },
      {
        orderId: 'SYN-48573',
        customer: 'Burak Kaya',
        email: 'burak@hotmail.com',
        amount: '$39.99',
        method: 'Shopier (3D Secure)',
        date: 'Bugün 08:42',
        status: 'KEY BEKLİYOR',
        licenseKey: '',
        items: 'Vanguard Emulator'
      },
      {
        orderId: 'SYN-31902',
        customer: 'Emre Demir',
        email: 'emre@crypto.net',
        amount: '₺1.800',
        method: 'Kripto (USDT TRC-20)',
        date: 'Bugün 07:20',
        status: 'KEY BEKLİYOR',
        licenseKey: '',
        items: 'CS2 Private Slotted'
      }
    ];
    localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(defaultOrders));
    return defaultOrders;
  }

  // Seed default reseller keys if empty
  function getResellerKeys() {
    try {
      const raw = localStorage.getItem(STORAGE_RESELLER_KEYS);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    const defaultKeys = [
      {
        product: 'Valorant Private Slotted',
        key: 'SYNTAX-RES-7782-AA10-2026',
        duration: '30 Günlük',
        note: 'Müşteri #104 - Caner',
        date: 'Bugün 08:30',
        status: 'AKTİF'
      },
      {
        product: 'Vanguard Emulator',
        key: 'SYNTAX-RES-9934-KL45-2026',
        duration: '7 Günlük',
        note: 'Müşteri #088 - Mert',
        date: 'Dün 21:10',
        status: 'AKTİF'
      }
    ];
    localStorage.setItem(STORAGE_RESELLER_KEYS, JSON.stringify(defaultKeys));
    return defaultKeys;
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(STORAGE_CURRENT_USER);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function setCurrentUser(user) {
    if (user) {
      localStorage.setItem(STORAGE_CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_CURRENT_USER);
    }
    updateNavbarState();
  }

  // Inject or update modal HTML in DOM
  let modalBackdrop = document.getElementById('syntaxAuthModalBackdrop');
  if (modalBackdrop) modalBackdrop.remove(); // Clean replace for new architecture

  modalBackdrop = document.createElement('div');
  modalBackdrop.id = 'syntaxAuthModalBackdrop';
  modalBackdrop.className = 'syntax-auth-backdrop';
  modalBackdrop.innerHTML = `
    <div class="syntax-auth-card" id="syntaxAuthCard">
      <button class="syntax-auth-close" id="syntaxAuthCloseBtn" type="button" title="Kapat">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>

      <!-- Brand Header -->
      <div class="auth-brand-header">
        <div class="auth-brand-logo">
          <div class="auth-logo-badge" id="authLogoBadge">S</div>
          <div style="text-align: left;">
            <div class="auth-brand-title" id="authBrandTitle">Syntax Software</div>
            <div class="auth-brand-sub" id="authBrandSub">ERİŞİM PORTALI</div>
          </div>
        </div>
      </div>

      <!-- AUTH FORMS VIEW (When Not Logged In) -->
      <div id="authFormsContainer">
        <!-- 4 Role Tabs -->
        <div class="auth-role-tabs">
          <button class="auth-role-tab-btn user-tab active" id="tabRoleUser" type="button">
            <span>Giriş Yap</span>
          </button>
          <button class="auth-role-tab-btn admin-tab" id="tabRoleAdmin" type="button">
            <span>Yönetici</span>
          </button>
          <button class="auth-role-tab-btn reseller-tab" id="tabRoleReseller" type="button">
            <span>Reseller</span>
          </button>
          <button class="auth-role-tab-btn" id="tabRoleRegister" type="button">
            <span>Kayıt Ol</span>
          </button>
        </div>

        <!-- 0. USER / GENERAL LOGIN FORM -->
        <form id="formUserLogin" onsubmit="return false;">
          <div class="auth-form-group">
            <label class="auth-label">Kullanıcı Adı veya E-posta</label>
            <div class="auth-input-wrapper">
              <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <input type="text" class="auth-input" id="userLoginUser" placeholder="kullanıcı adı veya e-posta" required autocomplete="username">
            </div>
          </div>

          <div class="auth-form-group">
            <label class="auth-label">Şifre</label>
            <div class="auth-input-wrapper">
              <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <input type="password" class="auth-input" id="userLoginPass" placeholder="••••••••" required autocomplete="current-password">
            </div>
          </div>

          <button type="submit" class="btn-auth-submit" id="btnUserLoginSubmit" style="background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);">
            <span>Panele Giriş Yap</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>

          <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 0.85rem; font-size: 0.78rem; color: #9ca3af;">
            <a href="#" id="linkSwitchToRegister" style="color:#c084fc; font-weight:700; text-decoration:underline;">Hesabın yok mu? Kayıt Ol</a>
          </div>
        </form>

        <!-- 1. ADMIN LOGIN FORM -->
        <form id="formAdminLogin" style="display: none;" onsubmit="return false;">
          <div class="auth-form-group">
            <label class="auth-label">Yönetici Kullanıcı Adı veya E-posta</label>
            <div class="auth-input-wrapper">
              <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <input type="text" class="auth-input" id="adminLoginUser" placeholder="Kullanıcı Adı veya E-posta" required autocomplete="username">
            </div>
          </div>

          <div class="auth-form-group">
            <label class="auth-label">Yönetici Şifresi</label>
            <div class="auth-input-wrapper">
              <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <input type="password" class="auth-input" id="adminLoginPass" placeholder="••••••••" required autocomplete="current-password">
            </div>
          </div>

          <button type="submit" class="btn-auth-submit" id="btnAdminLoginSubmit" style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);">
            <span>Yönetici Olarak Giriş Yap</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </form>

        <!-- 2. RESELLER LOGIN FORM -->
        <form id="formResellerLogin" style="display: none;" onsubmit="return false;">
          <div class="reseller-header-logo-card">
            <img src="images/bayi-logo.webp" alt="Bayi Logo" class="reseller-logo-img">
            <div>
              <div style="font-size: 0.95rem; font-weight: 800; color: #fff;">Syntax Bayi / Reseller Portalı</div>
              <div style="font-size: 0.76rem; color: #93c5fd; margin-top: 2px;">Key çıkarma talebi, kota ve müşteri lisans yönetimi</div>
            </div>
          </div>

          <div class="auth-form-group">
            <label class="auth-label">Bayi Kullanıcı Adı veya E-posta</label>
            <div class="auth-input-wrapper">
              <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <input type="text" class="auth-input" id="resellerLoginUser" placeholder="Bayi Kullanıcı Adı veya E-posta" required autocomplete="username">
            </div>
          </div>

          <div class="auth-form-group">
            <label class="auth-label">Bayi Şifresi</label>
            <div class="auth-input-wrapper">
              <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <input type="password" class="auth-input" id="resellerLoginPass" placeholder="••••••••" required autocomplete="current-password">
            </div>
          </div>

          <button type="submit" class="btn-auth-submit" id="btnResellerLoginSubmit" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);">
            <span>Bayi Portalına Giriş Yap</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </form>

        <!-- 3. SEPARATE REGISTER FORM (MÜŞTERİ KAYIT) -->
        <form id="formSeparateRegister" onsubmit="return false;">
          <div class="auth-reseller-notice-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <div>
              <strong>Bayi (Reseller) Hesabı Almak İsteyenler:</strong> Bayi hesapları ücretli ve yönetici onaylıdır. Buradan serbest bayi kaydı yapılamaz. Bayilik paketi ve toptan lisanslama hesabı almak için <a href="https://wa.me/905346460821" target="_blank" style="color:#93c5fd; font-weight:700; text-decoration:underline;">WhatsApp</a> veya <a href="https://discord.gg/wFaNxzyMU" target="_blank" style="color:#93c5fd; font-weight:700; text-decoration:underline;">Discord</a> üzerinden yöneticimizle iletişime geçiniz.
            </div>
          </div>

          <div class="auth-form-group">
            <label class="auth-label">Ad ve Soyad <span style="color:#ef4444;">*</span></label>
            <div class="auth-input-wrapper">
              <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <input type="text" class="auth-input" id="regFullName" placeholder="Adınız ve Soyadınız (Örn: Ahmet Yılmaz)" required autocomplete="name">
            </div>
          </div>

          <div class="auth-form-group">
            <label class="auth-label">Kullanıcı Adı <span style="color:#ef4444;">*</span></label>
            <div class="auth-input-wrapper">
              <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"></circle><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"></path></svg>
              <input type="text" class="auth-input" id="regUsername" placeholder="en az 3 karakter" required autocomplete="username">
            </div>
          </div>

          <div class="auth-form-group">
            <label class="auth-label">E-posta Adresi <span style="color:#ef4444;">*</span></label>
            <div class="auth-input-wrapper">
              <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              <input type="email" class="auth-input" id="regEmail" placeholder="ornek@domain.com" required autocomplete="email">
            </div>
          </div>

          <div class="auth-form-group">
            <label class="auth-label">Telefon Numarası <span style="color:#ef4444;">*</span></label>
            <div class="auth-input-wrapper">
              <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              <input type="tel" class="auth-input" id="regPhone" placeholder="05XXXXXXXXX" required autocomplete="tel">
            </div>
          </div>

          <div class="auth-form-group">
            <label class="auth-label">Şifre <span style="color:#ef4444;">*</span></label>
            <div class="auth-input-wrapper">
              <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <input type="password" class="auth-input" id="regPass" placeholder="en az 6 karakter" required autocomplete="new-password">
            </div>
          </div>

          <div class="auth-form-group">
            <label class="auth-label">Şifre Tekrarı <span style="color:#ef4444;">*</span></label>
            <div class="auth-input-wrapper">
              <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <input type="password" class="auth-input" id="regPassConfirm" placeholder="şifrenizi tekrar girin" required autocomplete="new-password">
            </div>
          </div>

          <div class="auth-sub-row" style="margin-bottom: 1.25rem;">
            <label class="auth-checkbox-label">
              <input type="checkbox" id="regTerms" required checked>
              <span><a href="sartlar.html" target="_blank" class="auth-link">Kullanım Şartları</a> ve Satış Sözleşmesi'ni okudum, onaylıyorum.</span>
            </label>
          </div>

          <button type="submit" class="btn-auth-submit" id="btnSeparateRegisterSubmit">
            <span>Hesap Oluştur ve Başvur</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>

          <div style="text-align: center; margin-top: 0.85rem; font-size: 0.78rem; color: #9ca3af;">
            <span>Zaten hesabınız var mı? </span>
            <a href="#" id="linkSwitchToLogin" style="color:#c084fc; font-weight:700; text-decoration:underline;">Giriş Yap</a>
          </div>
        </form>
      </div>

      <!-- DASHBOARD VIEWS (When Logged In) -->
      <div id="authDashboardContainer" style="display: none;"></div>
    </div>
  `;
  document.body.appendChild(modalBackdrop);

  // Tabs logic (4 Tabs: User / Admin / Reseller / Register)
  const tabUser = document.getElementById('tabRoleUser');
  const tabAdmin = document.getElementById('tabRoleAdmin');
  const tabReseller = document.getElementById('tabRoleReseller');
  const tabRegister = document.getElementById('tabRoleRegister');
  const formUser = document.getElementById('formUserLogin');
  const formAdmin = document.getElementById('formAdminLogin');
  const formReseller = document.getElementById('formResellerLogin');
  const formRegister = document.getElementById('formSeparateRegister');
  const regRoleSelect = document.getElementById('regAccountTypeSelect');
  const regCompanyGroup = document.getElementById('regCompanyGroup');

  function switchRoleTab(tab) {
    [tabUser, tabAdmin, tabReseller, tabRegister].forEach(b => { if (b) b.classList.remove('active'); });
    [formUser, formAdmin, formReseller, formRegister].forEach(f => { if (f) f.style.display = 'none'; });

    if (tab === 'admin') {
      if (tabAdmin) tabAdmin.classList.add('active');
      if (formAdmin) formAdmin.style.display = 'block';
    } else if (tab === 'reseller') {
      if (tabReseller) tabReseller.classList.add('active');
      if (formReseller) formReseller.style.display = 'block';
    } else if (tab === 'register') {
      if (tabRegister) tabRegister.classList.add('active');
      if (formRegister) formRegister.style.display = 'block';
    } else {
      // Default: user / general login
      if (tabUser) tabUser.classList.add('active');
      if (formUser) formUser.style.display = 'block';
    }
  }

  tabUser?.addEventListener('click', () => switchRoleTab('user'));
  tabAdmin?.addEventListener('click', () => switchRoleTab('admin'));
  tabReseller?.addEventListener('click', () => switchRoleTab('reseller'));
  tabRegister?.addEventListener('click', () => switchRoleTab('register'));

  document.getElementById('linkSwitchToRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchRoleTab('register');
  });

  document.getElementById('linkSwitchToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchRoleTab('user');
  });

  if (regRoleSelect) {
    regRoleSelect.addEventListener('change', () => {
      regCompanyGroup.style.display = regRoleSelect.value === 'reseller' ? 'block' : 'none';
    });
  }

  // Close handlers
  const closeBtn = document.getElementById('syntaxAuthCloseBtn');
  function closeModal() {
    modalBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }
  closeBtn.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalBackdrop.classList.contains('open')) closeModal();
  });

  // Open modal helper
  function openAuthModal(defaultRole = 'user') {
    const user = getCurrentUser();
    const forms = document.getElementById('authFormsContainer');
    const dash = document.getElementById('authDashboardContainer');
    const card = document.getElementById('syntaxAuthCard');

    if (user) {
      forms.style.display = 'none';
      dash.style.display = 'block';
      card.classList.add('dashboard-mode');
      renderDashboard(user);
    } else {
      forms.style.display = 'block';
      dash.style.display = 'none';
      card.classList.remove('dashboard-mode');
      const brandTitle = document.getElementById('authBrandTitle');
      const brandSub = document.getElementById('authBrandSub');
      if (brandTitle) brandTitle.textContent = 'Syntax Software';
      if (brandSub) brandSub.textContent = 'ERİŞİM PORTALI';
      switchRoleTab(defaultRole);
    }

    modalBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  // --- 0. USER / GENERAL LOGIN ---
  document.getElementById('btnUserLoginSubmit')?.addEventListener('click', () => {
    const u = document.getElementById('userLoginUser')?.value.trim();
    const p = document.getElementById('userLoginPass')?.value;
    if (!u || !p) {
      showToast('Lütfen kullanıcı adı ve şifrenizi giriniz.', 'alert-circle');
      return;
    }
    const users = getUsers();
    const matched = users.find(x => (x.username.toLowerCase() === u.toLowerCase() || (x.email && x.email.toLowerCase() === u.toLowerCase())) && x.password === p);

    if (matched) {
      setCurrentUser(matched);
      if (matched.role === 'owner') {
        showToast('Hoş geldiniz Sayın Kurucu NOXY! Tam yetkili Owner Paneli açılıyor.', 'sparkles');
      } else if (matched.role === 'admin') {
        showToast('Yönetici girişi başarılı! Kontrol paneli açılıyor.', 'shield-check');
      } else if (matched.role === 'reseller') {
        showToast('Bayi girişi başarılı! Reseller portalına hoş geldiniz.', 'check-circle');
      } else {
        showToast(`Hoş geldiniz ${matched.username}! Lisans paneliniz açılıyor.`, 'sparkles');
      }
      openAuthModal();
    } else {
      showToast('Kullanıcı adı veya şifre hatalı. Lütfen tekrar deneyiniz.', 'alert-circle');
    }
  });

  // Allow pressing Enter on user login inputs
  ['userLoginUser', 'userLoginPass'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('btnUserLoginSubmit')?.click();
      }
    });
  });

  // --- 1. ADMIN LOGIN ---
  document.getElementById('btnAdminLoginSubmit').addEventListener('click', () => {
    const u = document.getElementById('adminLoginUser')?.value.trim().toLowerCase();
    const p = document.getElementById('adminLoginPass')?.value;
    const users = getUsers();
    const matched = users.find(x => (x.username.toLowerCase() === u || x.email.toLowerCase() === u) && x.password === p && (x.role === 'admin' || x.role === 'owner'));

    if (matched) {
      setCurrentUser(matched);
      if (matched.role === 'owner') {
        showToast('Hoş geldiniz Sayın Kurucu NOXY! Tam yetkili Owner Paneli açılıyor.', 'sparkles');
      } else {
        showToast('Yönetici girişi başarılı! Kontrol paneli açılıyor.', 'shield-check');
      }
      openAuthModal();
    } else {
      showToast('Hatalı yönetici bilgisi. Lütfen kullanıcı adı ve şifrenizi kontrol ediniz.', 'alert-circle');
    }
  });

  // --- 2. RESELLER LOGIN ---
  document.getElementById('btnResellerLoginSubmit').addEventListener('click', () => {
    const u = document.getElementById('resellerLoginUser')?.value.trim().toLowerCase();
    const p = document.getElementById('resellerLoginPass')?.value;
    const users = getUsers();
    const matched = users.find(x => (x.username.toLowerCase() === u || x.email.toLowerCase() === u) && x.password === p && (x.role === 'reseller' || x.role === 'admin'));

    if (matched) {
      setCurrentUser(matched);
      showToast('Bayi girişi başarılı! Reseller portalına hoş geldiniz.', 'check-circle');
      openAuthModal();
    } else {
      showToast('Hatalı bayi hesabı. Lütfen bilgilerinizi kontrol ediniz.', 'alert-circle');
    }
  });

  // --- 3. SEPARATE REGISTER ---
  document.getElementById('btnSeparateRegisterSubmit')?.addEventListener('click', () => {
    const fullName = document.getElementById('regFullName')?.value.trim();
    const u = document.getElementById('regUsername')?.value.trim();
    const e = document.getElementById('regEmail')?.value.trim().toLowerCase();
    const phone = document.getElementById('regPhone')?.value.trim();
    const p = document.getElementById('regPass')?.value;
    const pc = document.getElementById('regPassConfirm')?.value;
    const role = 'user'; // Resellers are provisioned exclusively by Admin
    const comp = '';

    if (!fullName || fullName.length < 4 || fullName.split(/\s+/).filter(w => w.length >= 2).length < 2) {
      showToast('Lütfen geçerli Ad ve Soyad giriniz (En az 2 kelime, örn: Ahmet Yılmaz).', 'alert-circle');
      document.getElementById('regFullName')?.focus();
      return;
    }
    if (!u || u.length < 3) {
      showToast('Kullanıcı adı en az 3 karakter olmalıdır.', 'alert-circle');
      document.getElementById('regUsername')?.focus();
      return;
    }
    if (!e || !e.includes('@') || !e.includes('.')) {
      showToast('Geçerli bir e-posta adresi giriniz (Örn: ornek@domain.com).', 'alert-circle');
      document.getElementById('regEmail')?.focus();
      return;
    }
    const cleanPhone = phone ? phone.replace(/[\s\-\(\)\+]/g, '') : '';
    if (!cleanPhone || !/^(90)?0?5[0-9]{9}$/.test(cleanPhone)) {
      showToast('Lütfen geçerli bir cep telefonu numarası giriniz (Örn: 05XXXXXXXXX).', 'alert-circle');
      document.getElementById('regPhone')?.focus();
      return;
    }
    if (!p || p.length < 6) {
      showToast('Şifre en az 6 karakter olmalıdır.', 'alert-circle');
      document.getElementById('regPass')?.focus();
      return;
    }
    if (p !== pc) {
      showToast('Şifreler birbiriyle eşleşmiyor.', 'alert-circle');
      document.getElementById('regPassConfirm')?.focus();
      return;
    }

    const users = getUsers();
    if (users.find(x => x.username.toLowerCase() === u.toLowerCase() || x.email === e || (x.phone && x.phone.replace(/[\s\-\(\)\+]/g, '') === cleanPhone))) {
      showToast('Bu kullanıcı adı, e-posta veya telefon numarası zaten kullanımda!', 'alert-circle');
      return;
    }

    const now = new Date();
    const regDateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + 
                       now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const newUser = {
      username: u,
      fullName: fullName,
      email: e,
      phone: phone,
      password: p,
      role: role,
      rank: role === 'reseller' ? 'Bayi (Reseller)' : 'VIP Müşteri',
      quota: role === 'reseller' ? 25 : 0,
      maxQuota: role === 'reseller' ? 50 : 0,
      balance: role === 'reseller' ? '₺2.000' : '₺0',
      company: comp || '',
      registeredAt: regDateStr,
      createdAt: now.toISOString().split('T')[0],
      source: 'Web Kayıt Formu',
      termsAccepted: true,
      licenses: role === 'user' ? [
        {
          product: 'Valorant VIP Legit (Hoş Geldin)',
          key: 'SYNTAX-VAL-' + Math.random().toString(36).substring(2,6).toUpperCase() + '-2026',
          daysLeft: 7,
          status: 'UNDETECTED & AKTİF'
        }
      ] : []
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    setCurrentUser(newUser);

    // Real-time synchronization: notify Owner hub
    window.dispatchEvent(new CustomEvent('syntax_users_updated', { detail: { newUser } }));

    showToast(`Aramıza hoş geldiniz, ${fullName || u}! Hesabınız oluşturuldu.`, 'sparkles');
    openAuthModal();
  });

  // --- TICKET & LICENSE HELPERS (SCOPE WIDE) ---
  
  function getTicketMeta(chatKey) {
    try {
      const raw = localStorage.getItem('syntax_ticket_meta_' + chatKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    const num = Math.abs(chatKey.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0) % 9000) + 1000;
    const defaultMeta = {
      status: 'open',
      ticketNum: num,
      createdAt: 'Bugün'
    };
    localStorage.setItem('syntax_ticket_meta_' + chatKey, JSON.stringify(defaultMeta));
    return defaultMeta;
  }

  function saveTicketMeta(chatKey, meta) {
    localStorage.setItem('syntax_ticket_meta_' + chatKey, JSON.stringify(meta));
  }

  function generateSyntaxLicenseKey(prodName = 'VAL') {
    let prefix = 'SYN';
    if (prodName.toLowerCase().includes('cs')) prefix = 'SYN-CS';
    else if (prodName.toLowerCase().includes('spoofer')) prefix = 'SYN-SPF';
    else if (prodName.toLowerCase().includes('emu')) prefix = 'SYN-EMU';
    else prefix = 'SYN-VAL';
    const p1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const p2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${p1}-${p2}-2026`;
  }

  function getDiscordTicketsList() {
    const allUsers = (typeof getUsers === 'function' ? getUsers() : []);
    const tickets = [];
    const seenKeys = new Set();

    // 1. Scan any tickets by syntax_ticket_meta_ key in localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const sk = localStorage.key(i);
        if (sk && sk.startsWith('syntax_ticket_meta_')) {
          const chatKey = sk.replace('syntax_ticket_meta_', '');
          if (seenKeys.has(chatKey)) continue;
          const meta = getTicketMeta(chatKey);
          const raw = localStorage.getItem(chatKey);
          const hist = raw ? JSON.parse(raw) : [];
          if (hist.length > 0) {
            const lastMsg = hist[hist.length - 1];
            let uName = meta.user || (chatKey.startsWith('syntax_chat_user_') ? chatKey.replace('syntax_chat_user_', '') : 'Müşteri');
            if (chatKey === 'syntax_chat_anonymous') uName = 'anonim_web';
            const matchedUser = allUsers.find(x => x.username && x.username.toLowerCase() === uName.toLowerCase());
            tickets.push({
              key: chatKey,
              label: `${uName} (${matchedUser ? (matchedUser.role === 'owner' ? 'Kurucu' : (matchedUser.role === 'admin' ? 'Admin' : 'Müşteri')) : 'Müşteri'})`,
              username: uName,
              role: matchedUser ? matchedUser.role : (chatKey === 'syntax_chat_anonymous' ? 'Ziyaretçi' : 'Müşteri'),
              email: (matchedUser && matchedUser.email) || `${uName}@syntax.software`,
              phone: (matchedUser && matchedUser.phone) || '-',
              meta: meta,
              history: hist,
              lastMsg: lastMsg,
              unreadCount: (lastMsg?.sender === 'user') ? 1 : 0
            });
            seenKeys.add(chatKey);
          }
        }
      }
    } catch(e) {}

    // 2. Anonymous visitor ticket fallback if not already captured
    if (!seenKeys.has('syntax_chat_anonymous')) {
      const anonRaw = localStorage.getItem('syntax_chat_anonymous');
      const anonHistory = anonRaw ? JSON.parse(anonRaw) : [];
      if (anonHistory.length > 0) {
        const meta = getTicketMeta('syntax_chat_anonymous');
        const lastMsg = anonHistory[anonHistory.length - 1];
        tickets.push({
          key: 'syntax_chat_anonymous',
          label: 'Web Ziyaretçisi (Canlı Destek)',
          username: 'anonim_web',
          role: 'Ziyaretçi',
          email: 'web-destek@syntax.local',
          phone: 'Web Chat',
          meta: meta,
          history: anonHistory,
          lastMsg: lastMsg,
          unreadCount: (lastMsg?.sender === 'user') ? 1 : 0
        });
        seenKeys.add('syntax_chat_anonymous');
      }
    }

    // 3. Registered users tickets fallback
    allUsers.forEach(u => {
      const candidateKeys = ['syntax_chat_user_' + u.username.toLowerCase(), 'syntax_chat_' + u.username];
      candidateKeys.forEach(k => {
        if (!seenKeys.has(k)) {
          const raw = localStorage.getItem(k);
          const hist = raw ? JSON.parse(raw) : [];
          if (hist.length > 0) {
            const meta = getTicketMeta(k);
            const lastMsg = hist[hist.length - 1];
            tickets.push({
              key: k,
              label: `${u.username} (${u.role === 'owner' ? 'Kurucu' : (u.role === 'admin' ? 'Admin' : (u.role === 'reseller' ? 'Bayi' : 'VIP'))})`,
              username: u.username,
              role: u.role,
              email: u.email || `${u.username}@syntax.software`,
              phone: u.phone || '-',
              meta: meta,
              history: hist,
              lastMsg: lastMsg,
              unreadCount: (lastMsg?.sender === 'user') ? 1 : 0
            });
            seenKeys.add(k);
          }
        }
      });
    });

    // 3. Fallback demo tickets if empty
    if (tickets.length === 0) {
      const defaultHist = [
        { sender: 'user', text: 'Merhaba, Vanguard Emulator satın aldım ancak kurulumda hata alıyorum, yardımcı olabilir misiniz?', time: 'Bugün 10:24' }
      ];
      const meta = getTicketMeta('syntax_chat_caner_dc');
      tickets.push({
        key: 'syntax_chat_caner_dc',
        label: 'caner_val#4412 (Discord #web-ticket)',
        username: 'caner_val',
        role: 'Müşteri',
        email: 'caner@val.gg',
        phone: '0555 123 45 67',
        meta: meta,
        history: defaultHist,
        lastMsg: defaultHist[0],
        unreadCount: 1
      });
    }

    return tickets;
  }

  // --- 4. RENDER DASHBOARDS (ADMIN / RESELLER / USER) ---
  function renderDashboard(user, targetContainer = null) {
    const dash = targetContainer || document.getElementById('authDashboardContainer');
    const brandTitle = document.getElementById('authBrandTitle');
    const brandSub = document.getElementById('authBrandSub');
    if (!dash) return;

    if (user.role === 'admin' || user.role === 'owner') {
      const isOwner = user.role === 'owner' || (user.username && user.username.toUpperCase() === 'NOXY');
      if (brandTitle) brandTitle.textContent = isOwner ? 'Syntax Software Kurucu Paneli (Owner)' : 'Yönetici Kontrol Merkezi';
      if (brandSub) brandSub.textContent = isOwner ? 'TAM YETKİLİ KURUCU PANELİ - WEB/DC KEY BEKLEYENLER, TÜM HESAPLAR VE DESTEK' : 'SİPARİŞ NUMARASI & WEB CANLI DESTEK PANELİ';

      const orders = getOrders();
      const allRegisteredUsers = getUsers();

      // Reusable Discord Ticket Hub HTML (used in Owner tab and Regular Admin dashboard)
      function getDiscordTicketHubHtml() {
        return `
            <div class="dc-ticket-hub" id="adminDiscordTicketHub">
              <div class="dc-ticket-hub-header">
                <div class="dc-ticket-hub-title">
                  <div class="dc-blurple-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                  </div>
                  <span>Discord Destek Masası · Ticket Yönetimi & Yanıt Gönder</span>
                </div>
                <div class="dc-ticket-hub-badges">
                  <span class="dc-status-pill open" id="dcOpenTicketBadge">0 Açık Talep</span>
                  <span class="dc-status-pill closed" id="dcClosedTicketBadge">0 Arşiv</span>
                  <button class="btn-copy-chip" id="btnOpenLiveChatFromAdmin" style="font-size:0.72rem; background:#35373c; color:#dbdee1;">Web Chat Kutusu</button>
                </div>
              </div>

              <div class="dc-ticket-body-grid">
                <!-- Sidebar: Discord Channels list -->
                <div class="dc-ticket-sidebar">
                  <div class="dc-sidebar-search">
                    <input type="text" class="dc-search-input" id="dcTicketSearchInput" placeholder="Ticket veya kullanıcı ara...">
                  </div>
                  <div class="dc-ticket-channels-list" id="dcTicketChannelsList"></div>
                </div>

                <!-- Main Discord Ticket Window -->
                <div class="dc-ticket-main" id="dcTicketMain">
                  <div class="dc-channel-topbar">
                    <div class="dc-channel-info-row">
                      <div class="dc-channel-current-name">
                        <span style="color:#80848e; font-size:1.1rem;">#</span>
                        <span id="dcCurrentChannelTitle">ticket-seciniz</span>
                      </div>
                      <div class="dc-channel-topic" id="dcCurrentChannelTopic">Destek ve Ticket Kanalı</div>
                    </div>
                    <div class="dc-channel-actions" id="dcChannelActions" style="display:none;">
                      <button class="btn-dc-action btn-dc-close" id="btnDcCloseTicket">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        <span>Talebi Kapat</span>
                      </button>
                      <button class="btn-dc-action btn-dc-reopen" id="btnDcReopenTicket" style="display:none;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 4v6h6"></path><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                        <span>Yeniden Aç</span>
                      </button>
                      <button class="btn-dc-action btn-dc-transcript" id="btnDcDownloadTranscript" title="HTML Transkript Dosyasını İndir">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <span>Transkript İndir</span>
                      </button>
                      <button class="btn-dc-action btn-dc-transcript" id="btnDcCopyTranscript" title="Metin Olarak Kopyala">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        <span>Kopyala</span>
                      </button>
                      <button class="btn-dc-action btn-dc-delete" id="btnDcDeleteTicket">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        <span>Sil</span>
                      </button>
                    </div>
                  </div>

                  <!-- Message Stream -->
                  <div class="dc-ticket-messages-area" id="dcTicketMessagesArea">
                    <div style="color:#949ba4; font-size:0.84rem; text-align:center; padding:3.5rem 1rem;">
                      <div style="font-size:2.2rem; margin-bottom:0.5rem;"></div>
                      <div style="font-weight:700; color:#fff; font-size:0.95rem; margin-bottom:0.25rem;">Destek Kanalı Seçilmedi</div>
                      <div style="font-size:0.78rem;">Sohbet geçmişini görüntülemek ve yanıt yazmak için bir ticket seçin.</div>
                    </div>
                  </div>

                  <!-- Input Area -->
                  <div class="dc-chat-footer" id="dcChatFooter" style="display:none;">
                    <div class="dc-slash-commands-bar">
                      <button type="button" class="dc-slash-chip" data-cmd="👋 Merhaba, Syntax Software Destek ekibine hoş geldiniz! Size nasıl yardımcı olabilirim?">/merhaba</button>
                      <button type="button" class="dc-slash-chip" data-cmd="🔑 Lisans teslimatı: Ödemeniz sistemde onaylandı, lisans anahtarınız ve indirme bağlantınız hesabınıza tanımlanmıştır.">/teslimat</button>
                      <button type="button" class="dc-slash-chip" data-cmd="💻 HWID Sıfırlama: Talebiniz üzerine HWID kaydınız sıfırlanmıştır. Lütfen loader'ı yönetici olarak yeniden başlatınız.">/hwid</button>
                      <button type="button" class="dc-slash-chip" data-cmd="⏳ İnceleme: Bildirdiğiniz teknik durum yetkili ekibimizce test edilmektedir. Lütfen bekleyiniz.">/inceleme</button>
                      <button type="button" class="dc-slash-chip" data-cmd="🧾 Ödeme Bildirimi: Havale/EFT dekontunuzu lütfen buraya veya WhatsApp (+90 534 646 08 21) hattımıza iletiniz.">/dekont</button>
                      <button type="button" class="dc-slash-chip" data-cmd="✅ Çözüldü: Talebiniz başarıyla çözülmüştür. Başka bir sorunuz olursa dilediğiniz zaman ulaşabilirsiniz. İyi oyunlar!">/cozuldu</button>
                    </div>
                    <div class="dc-chat-input-wrapper">
                      <input type="text" class="dc-chat-input-field" id="dcChatReplyText" placeholder="Bu Discord ticket'ına yanıt yaz ve Enter'a bas...">
                      <button type="button" class="btn-dc-send" id="btnDcChatSend">
                        <span>Gönder</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        `;
      }

      // Calculate initial waiting queues
      const initialWaitingOrders = orders.filter(o => o.status === 'KEY BEKLİYOR' || o.status === 'BEKLEMEDE' || !o.licenseKey);
      const initialTickets = getDiscordTicketsList();
      const initialOpenTickets = initialTickets.filter(t => t.meta.status !== 'closed');

      // Main Owner Dashboard Layout
      dash.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:0.75rem;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <div style="width:44px; height:44px; border-radius:10px; background:${isOwner ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' : 'linear-gradient(135deg, #ef4444, #991b1b)'}; display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.05rem; font-weight:800; box-shadow:${isOwner ? '0 0 16px rgba(245, 158, 11, 0.4)' : 'none'};">${isOwner ? 'OWN' : 'ADM'}</div>
            <div>
              <div style="font-weight:800; color:#fff; font-size:1.08rem; display:flex; align-items:center; gap:0.4rem;">
                <span>${escapeHtml(user.username)}</span>
                <span style="font-size:0.7rem; ${isOwner ? 'background:linear-gradient(135deg, #f59e0b, #d97706); color:#000; font-weight:800; box-shadow:0 0 10px rgba(245, 158, 11, 0.4);' : 'background:#ef4444; color:#fff; font-weight:700;'} padding:0.18rem 0.6rem; border-radius:999px;">${isOwner ? 'KURUCU / OWNER' : 'SÜPER ADMIN'}</span>
              </div>
              <div style="font-size:0.78rem; color:${isOwner ? '#fef08a' : '#9ca3af'};">${escapeHtml(user.email)} · ${isOwner ? 'Tam Sistem Hakimiyeti (NOXY)' : 'Yönetici Hesabı'}</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:0.6rem;">
            ${isOwner && !targetContainer && !window.location.pathname.endsWith('kurucu.html') ? `
              <a href="kurucu.html" class="btn-copy-chip" style="background:linear-gradient(135deg, #f59e0b, #d97706); color:#000; font-weight:800; border:none; padding:0.4rem 0.85rem; font-size:0.78rem; text-decoration:none; display:inline-flex; align-items:center; gap:0.4rem; box-shadow:0 0 14px rgba(245, 158, 11, 0.35);" title="Yönetim Merkezini Tam Sekmede / Sayfada Aç">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                <span>🖥️ Tam Sekmede Aç</span>
              </a>
            ` : (isOwner ? `
              <span style="background:rgba(245, 158, 11, 0.15); color:#fbbf24; border:1px solid rgba(245, 158, 11, 0.35); border-radius:6px; padding:0.35rem 0.75rem; font-size:0.75rem; font-weight:700;">🟢 Tam Sekme Modu Aktif</span>
            ` : '')}
            <button type="button" class="btn-panel-logout" id="btnLogoutInside" style="padding:0.4rem 0.8rem; font-size:0.8rem;">Çıkış Yap</button>
          </div>
        </div>

        ${isOwner ? `
        <!-- OWNER STATS COUNTERS -->
        <div class="user-panel-stats" style="margin-bottom:1.25rem;">
          <div class="panel-stat-tile" style="border-color:rgba(234,88,12,0.35);">
            <div class="panel-stat-val" style="color:#ea580c;" id="statWebWaitingCount">${initialWaitingOrders.length}</div>
            <div class="panel-stat-label">Web Key Bekleyen</div>
          </div>
          <div class="panel-stat-tile" style="border-color:rgba(88,101,242,0.35);">
            <div class="panel-stat-val" style="color:#5865f2;" id="statDcWaitingCount">${initialOpenTickets.length}</div>
            <div class="panel-stat-label">DC Key Bekleyen</div>
          </div>
          <div class="panel-stat-tile">
            <div class="panel-stat-val" style="color:#10b981;" id="statUsersCount">${allRegisteredUsers.length}</div>
            <div class="panel-stat-label">Toplam Hesap</div>
          </div>
          <div class="panel-stat-tile">
            <div class="panel-stat-val" style="color:#a855f7;" id="statOrdersCount">${orders.length}</div>
            <div class="panel-stat-label">Toplam Sipariş</div>
          </div>
        </div>

        <!-- OWNER COMMAND HUB TABS -->
        <div class="owner-command-hub">
          <div class="owner-hub-tabs" id="ownerHubTabsBar">
            <button type="button" class="owner-hub-tab-btn active" data-tab="web-waiting">
              <span> Web Key Waiting</span>
              <span class="owner-badge-count orange" id="badgeWebWaiting">${initialWaitingOrders.length}</span>
            </button>
            <button type="button" class="owner-hub-tab-btn" data-tab="dc-waiting">
              <span> DC Key Waiting</span>
              <span class="owner-badge-count blue" id="badgeDcWaiting">${initialOpenTickets.length}</span>
            </button>
            <button type="button" class="owner-hub-tab-btn" data-tab="all-users">
              <span> Tüm Hesaplar & Bilgileri</span>
              <span class="owner-badge-count green" id="badgeAllUsers">${allRegisteredUsers.length}</span>
            </button>
            <button type="button" class="owner-hub-tab-btn" data-tab="all-orders">
              <span> Tüm Satın Alımlar</span>
              <span class="owner-badge-count" id="badgeAllOrders">${orders.length}</span>
            </button>
            <button type="button" class="owner-hub-tab-btn" data-tab="dc-tickets">
              <span> Discord Ticket Masası & Yanıtla</span>
            </button>
            <button type="button" class="owner-hub-tab-btn" data-tab="owner-discord-bot">
              <span>🤖 Discord Bot & Web Köprüsü</span>
              <span class="owner-badge-count blue" id="badgeDiscordBotStatus">Aktif</span>
            </button>
            <button type="button" class="owner-hub-tab-btn" data-tab="owner-admins">
              <span>Admin Tanımla</span>
            </button>
            <button type="button" class="owner-hub-tab-btn" data-tab="owner-resellers">
              <span> Bayi Tanımla</span>
            </button>
          </div>

          <!-- TAB 1: WEB KEY WAITING -->
          <div class="owner-tab-pane" id="tabOwnerWebWaiting">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
              <div>
                <div style="font-size:0.95rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:0.4rem;">
                  <span style="color:#ea580c;"></span>
                  <span>Web Key Waiting (Onay & Key Bekleyen Siparişler)</span>
                </div>
                <div style="font-size:0.75rem; color:#9ca3af;">Otomatik key teslimatı kapalıdır. Kurucu onay verip anahtar üretir.</div>
              </div>
              <input type="text" class="checkout-input-field" id="ownerWebSearchInp" placeholder="Sipariş / Müşteri / Tel Ara..." style="padding:0.35rem 0.65rem; font-size:0.78rem; width:220px;">
            </div>
            <div id="ownerWebWaitingContainer"></div>
          </div>

          <!-- TAB 2: DC KEY WAITING -->
          <div class="owner-tab-pane" id="tabOwnerDcWaiting" style="display:none;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
              <div>
                <div style="font-size:0.95rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:0.4rem;">
                  <span style="color:#5865f2;"></span>
                  <span>DC Key Waiting (Discord / Web Ticket Bekleyen Talepler)</span>
                </div>
                <div style="font-size:0.75rem; color:#9ca3af;">Destek talebinde bulunan müşterilere tek tıkla doğrudan Discord kanalına key üretip iletebilirsiniz.</div>
              </div>
            </div>
            <div id="ownerDcWaitingContainer"></div>
          </div>

          <!-- TAB 3: TÜM HESAPLAR & BİLGİLERİ -->
          <div class="owner-tab-pane" id="tabOwnerAllUsers" style="display:none;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
              <div>
                <div style="font-size:0.95rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:0.4rem;">
                  <span style="color:#10b981;">👥</span>
                  <span>Tüm Kayıtlı Kullanıcılar & Detaylı Kayıt Bilgileri</span>
                </div>
                <div style="font-size:0.75rem; color:#9ca3af;">Kayıt olan tüm kişilerin girdiği tüm bilgiler (Ad Soyad, Kullanıcı Adı, E-posta, Telefon, Şifre, Kayıt Tarihi ve Lisanslar).</div>
              </div>
              <input type="text" class="checkout-input-field" id="ownerUsersSearchInp" placeholder="Ad, Kullanıcı, Tel, E-posta veya Şifre Ara..." style="padding:0.35rem 0.65rem; font-size:0.78rem; width:260px;">
            </div>
            <div id="ownerUsersSummaryBadges" style="display:flex; gap:0.5rem; margin-bottom:0.75rem; flex-wrap:wrap;"></div>
            <div id="ownerAllUsersContainer"></div>
          </div>

          <!-- TAB 4: TÜM SATIN ALIMLAR -->
          <div class="owner-tab-pane" id="tabOwnerAllOrders" style="display:none;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
              <div>
                <div style="font-size:0.95rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:0.4rem;">
                  <span style="color:#a855f7;"></span>
                  <span>Tüm Satın Alımlar ve Ödeme Kayıtları</span>
                </div>
                <div style="font-size:0.75rem; color:#9ca3af;">Shopier ve Banka Havalesi ile gerçekleşen tüm sipariş geçmişi ve lisans anahtarları.</div>
              </div>
              <input type="text" class="checkout-input-field" id="ownerOrdersSearchInp" placeholder="Sipariş No, Müşteri veya Tutar Ara..." style="padding:0.35rem 0.65rem; font-size:0.78rem; width:220px;">
            </div>
            <div id="ownerAllOrdersContainer"></div>
          </div>

          <!-- TAB 5: DISCORD TICKET MASASI & YANITLA -->
          <div class="owner-tab-pane" id="tabOwnerDcTickets" style="display:none;">
            ${getDiscordTicketHubHtml()}
          </div>

          <!-- TAB: DISCORD BOT & WEB TICKET KÖPRÜSÜ -->
          <div class="owner-tab-pane" id="tabOwnerDiscordBot" style="display:none;">
            <div class="owner-admin-provision-box" style="background: rgba(88, 101, 242, 0.08); border: 1.5px solid rgba(88, 101, 242, 0.35); border-radius: 14px; padding: 1.25rem; margin-bottom: 1.5rem; box-shadow: 0 0 25px rgba(88, 101, 242, 0.1);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem; flex-wrap:wrap; gap:0.5rem;">
                <div style="font-size:0.98rem; font-weight:800; color:#c7d2fe; display:flex; align-items:center; gap:0.5rem;">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                  <span>Discord Bot & Web Ticket Entegrasyonu</span>
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <span id="ownerDcBridgeStatusBadge" style="font-size:0.72rem; background:#10b981; color:#fff; font-weight:800; padding:0.25rem 0.75rem; border-radius:999px;">KÖPRÜ AKTİF (Port 5055)</span>
                  <span style="font-size:0.7rem; background:#f59e0b; color:#000; font-weight:800; padding:0.25rem 0.6rem; border-radius:999px;">SADECE NOXY</span>
                </div>
              </div>
              
              <div style="font-size:0.78rem; color:#e0e7ff; margin-bottom:1rem; line-height:1.5;">
                Web sitesinden canlı destek talebi açıldığında, müşterinin <strong>tüm kayıt bilgileri, telefon, email, hesap rolü, kayıt tarihi, lisansları ve son siparişleri</strong> Discord <strong>#web-ticket</strong> kanalına otomatik embed ile iletilir. Discord'da yetkililerin yazdığı tüm mesajlar müşterinin web sayfasına anında gider, müşterinin yazdıkları da Discord'a yansır.
                <br><strong style="color:#34d399;">🔒 Gizlilik Güvencesi:</strong> Müşterinin kayıt dosyası kullanıcının kendi ekranında <u>asla görünmez</u>, sadece Discord kanalında yetkililere gösterilir.
              </div>

              <!-- Integration Form -->
              <div style="display:grid; grid-template-columns:1fr; gap:0.75rem; margin-bottom:1rem;">
                <div>
                  <label style="font-size:0.74rem; font-weight:700; color:#cbd5e1; display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span>Discord Bot Token</span>
                    <span style="color:#94a3b8; font-weight:normal; font-size:0.7rem;">(Discord Developer Portal &gt; Applications &gt; Bot &gt; Reset Token)</span>
                  </label>
                  <input type="password" id="ownerDcBotToken" class="checkout-input-field" placeholder="Örn: MTE4ODc5... (Bot tokeninizi buraya yapıştırın)" style="padding:0.55rem 0.75rem; font-size:0.82rem; width:100%;">
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:0.75rem;">
                  <div>
                    <label style="font-size:0.74rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:4px;">Discord Hedef Kanal Adı veya Kanal ID</label>
                    <input type="text" id="ownerDcChannelId" class="checkout-input-field" placeholder="web-ticket veya 123456789012345678" value="web-ticket" style="padding:0.55rem 0.75rem; font-size:0.82rem; width:100%;">
                  </div>
                  <div>
                    <label style="font-size:0.74rem; font-weight:700; color:#cbd5e1; display:flex; justify-content:space-between; margin-bottom:4px;">
                      <span>Discord Webhook URL (Anında Bildirim & Hızlı Mod)</span>
                      <span style="color:#34d399; font-size:0.7rem;">Kanal Ayarları &gt; Entegrasyonlar</span>
                    </label>
                    <input type="text" id="ownerDcWebhookUrl" class="checkout-input-field" placeholder="https://discord.com/api/webhooks/..." style="padding:0.55rem 0.75rem; font-size:0.82rem; width:100%;">
                  </div>
                </div>
              </div>

              <div style="display:flex; gap:0.75rem; flex-wrap:wrap; margin-bottom:1.25rem;">
                <button type="button" class="btn-cart-checkout-proceed" id="btnSaveDcBotConfig" style="background:linear-gradient(135deg, #5865F2, #4752c4); color:#fff; font-weight:800; flex:1; min-width:200px; padding:0.6rem 1rem;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  <span> Discord Ayarlarını Kaydet</span>
                </button>
                <button type="button" class="btn-cart-checkout-proceed" id="btnTestDcEmbed" style="background:linear-gradient(135deg, #10b981, #059669); color:#fff; font-weight:800; flex:1; min-width:200px; padding:0.6rem 1rem;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
                  <span> Test Bilet Embed'i Gönder (Doğrula)</span>
                </button>
              </div>

              <!-- Quick Launch Info -->
              <div style="background:rgba(0,0,0,0.3); border-radius:10px; padding:0.85rem; border:1px solid rgba(255,255,255,0.06);">
                <div style="font-size:0.82rem; font-weight:700; color:#fff; margin-bottom:0.4rem; display:flex; align-items:center; gap:0.4rem;">
                  <span>⚡ Tek Tıkla Bot & Köprü Başlatıcı</span>
                </div>
                <div style="font-size:0.75rem; color:#9ca3af; line-height:1.45;">
                  Proje dizinindeki <code style="color:#5865f2; background:rgba(88,101,242,0.15); padding:2px 6px; border-radius:4px;">start_discord_bot.bat</code> dosyasını çalıştırarak botu ve arka plan web köprüsünü tek tıkla 7/24 çalışır vaziyette tutabilirsiniz.
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 6: ADMIN TANIMLA -->
          <div class="owner-tab-pane" id="tabOwnerAdmins" style="display:none;">
            <div class="owner-admin-provision-box" style="background: rgba(245, 158, 11, 0.08); border: 1.5px solid rgba(245, 158, 11, 0.35); border-radius: 14px; padding: 1.25rem; margin-bottom: 1.5rem; box-shadow: 0 0 25px rgba(245, 158, 11, 0.1);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
                <div style="font-size:0.98rem; font-weight:800; color:#fef08a; display:flex; align-items:center; gap:0.5rem;">
                  <span style="font-size:1.2rem;"></span>
                  <span>Yönetici (Admin) Hesap Yönetimi & Yeni Admin Tanımla</span>
                </div>
                <span style="font-size:0.7rem; background:#f59e0b; color:#000; font-weight:800; padding:0.2rem 0.6rem; border-radius:999px;">SADECE OWNER</span>
              </div>
              <div style="font-size:0.78rem; color:#fde68a; margin-bottom:1rem; line-height:1.45;">
                Buradan panelinizde siparişleri ve canlı desteği yönetecek <strong>yeni yetkili admin hesapları tanımlayabilir</strong> veya yetkileri silebilirsiniz.
              </div>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:0.6rem; margin-bottom:0.75rem;">
                <div>
                  <label style="font-size:0.72rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:3px;">Admin Kullanıcı Adı</label>
                  <input type="text" id="ownerNewAdminUser" class="checkout-input-field" placeholder="Örn: admin_destek" style="padding:0.5rem 0.75rem; font-size:0.82rem;">
                </div>
                <div>
                  <label style="font-size:0.72rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:3px;">Admin Şifresi</label>
                  <input type="text" id="ownerNewAdminPass" class="checkout-input-field" placeholder="Örn: Pass2026!" style="padding:0.5rem 0.75rem; font-size:0.82rem;">
                </div>
                <div>
                  <label style="font-size:0.72rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:3px;">Admin E-postası</label>
                  <input type="email" id="ownerNewAdminEmail" class="checkout-input-field" placeholder="admin@syntaxsoftware.com" style="padding:0.5rem 0.75rem; font-size:0.82rem;">
                </div>
                <div>
                  <label style="font-size:0.72rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:3px;">Admin Rütbesi</label>
                  <input type="text" id="ownerNewAdminRank" class="checkout-input-field" value="Destek ve Sipariş Yöneticisi" style="padding:0.5rem 0.75rem; font-size:0.82rem;">
                </div>
              </div>
              <button class="btn-cart-checkout-proceed" id="btnOwnerCreateAdmin" style="background:linear-gradient(135deg, #f59e0b, #d97706); color:#000; font-weight:800; margin-bottom:1rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span> Yeni Admin Hesabı Oluştur ve Yetkilendir</span>
              </button>
              <div style="font-size:0.85rem; font-weight:800; color:#fff; margin-bottom:0.5rem;">Sistemde Yetkili Olan Adminler</div>
              <div id="ownerAdminsListContainer" style="display:flex; flex-direction:column; gap:0.5rem;"></div>
            </div>
          </div>

          <!-- TAB 7: BAYİ TANIMLA -->
          <div class="owner-tab-pane" id="tabOwnerResellers" style="display:none;">
            <div class="admin-reseller-provision-box">
              <div style="font-size:0.95rem; font-weight:800; color:#fff; margin-bottom:0.4rem; display:flex; align-items:center; gap:0.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                <span>Bayi Hesap Yönetimi & Yeni Bayi Tanımla</span>
              </div>
              <div style="font-size:0.78rem; color:#93c5fd; margin-bottom:1rem; line-height:1.4;">
                Yetkili bayiler için hesap tanımlayabilir, başlangıç kotası ve bakiyesi belirleyebilirsiniz.
              </div>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:0.6rem; margin-bottom:0.75rem;">
                <div>
                  <label style="font-size:0.72rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:3px;">Bayi Kullanıcı Adı</label>
                  <input type="text" id="adminNewResellerUser" class="checkout-input-field" placeholder="Örn: titan_gaming" style="padding:0.5rem 0.75rem; font-size:0.82rem;">
                </div>
                <div>
                  <label style="font-size:0.72rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:3px;">Bayi Şifresi</label>
                  <input type="text" id="adminNewResellerPass" class="checkout-input-field" placeholder="Örn: Pass2026!" style="padding:0.5rem 0.75rem; font-size:0.82rem;">
                </div>
                <div>
                  <label style="font-size:0.72rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:3px;">Şirket / Marka</label>
                  <input type="text" id="adminNewResellerCompany" class="checkout-input-field" placeholder="Örn: Titan Store" style="padding:0.5rem 0.75rem; font-size:0.82rem;">
                </div>
                <div>
                  <label style="font-size:0.72rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:3px;">Key Kotası</label>
                  <input type="number" id="adminNewResellerQuota" class="checkout-input-field" value="50" style="padding:0.5rem 0.75rem; font-size:0.82rem;">
                </div>
                <div>
                  <label style="font-size:0.72rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:3px;">Bayi Bakiyesi (TL)</label>
                  <input type="text" id="adminNewResellerBalance" class="checkout-input-field" value="₺5.000" style="padding:0.5rem 0.75rem; font-size:0.82rem;">
                </div>
                <div>
                  <label style="font-size:0.72rem; font-weight:700; color:#cbd5e1; display:block; margin-bottom:3px;">E-posta</label>
                  <input type="email" id="adminNewResellerEmail" class="checkout-input-field" placeholder="bayi@domain.com" style="padding:0.5rem 0.75rem; font-size:0.82rem;">
                </div>
              </div>
              <button class="btn-cart-checkout-proceed" id="btnAdminCreateReseller" style="background:linear-gradient(135deg, #2563eb, #1d4ed8); margin-bottom:1rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span> Bayi Hesabını Tanımla & Yetkilendir</span>
              </button>
              <div style="font-size:0.85rem; font-weight:800; color:#fff; margin-bottom:0.5rem;">Sistemde Kayıtlı Yetkili Bayiler</div>
              <div id="adminResellersListContainer" style="display:flex; flex-direction:column; gap:0.5rem;"></div>
            </div>
          </div>
        </div>
        ` : `
        <!-- REGULAR ADMIN DASHBOARD -->
        <div class="user-panel-stats" style="margin-bottom:1.25rem;">
          <div class="panel-stat-tile">
            <div class="panel-stat-val" style="color:#ef4444;" id="statOrderCount">${orders.length}</div>
            <div class="panel-stat-label">Toplam Sipariş</div>
          </div>
          <div class="panel-stat-tile">
            <div class="panel-stat-val" style="color:#10b981;">100%</div>
            <div class="panel-stat-label">Sistem Onayı</div>
          </div>
          <div class="panel-stat-tile">
            <div class="panel-stat-val" style="color:#a855f7;">Canlı</div>
            <div class="panel-stat-label">Web Destek</div>
          </div>
        </div>

        <div style="margin-bottom:1.5rem;">
          <div style="font-size:0.92rem; font-weight:800; color:#fff; margin-bottom:0.6rem; display:flex; align-items:center; gap:0.5rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <span>Sipariş Numarası Kontrolü & Dekont Doğrulama</span>
          </div>
          <div class="admin-order-search-box">
            <input type="text" class="admin-order-search-input" id="adminOrderSearchInp" placeholder="Sipariş Kodu veya Müşteri Ara...">
          </div>
          <div class="admin-orders-list" id="adminOrdersContainer"></div>
        </div>

        ${getDiscordTicketHubHtml()}

        <div class="admin-reseller-provision-box" style="margin-top:1.5rem;">
          <div id="adminResellersListContainer"></div>
        </div>
        `}
      `;

      // --- LOGIC: RENDER WEB KEY WAITING QUEUE ---
      function renderWebWaitingList(filter = '') {
        const c = document.getElementById('ownerWebWaitingContainer');
        if (!c) return;
        const allOrders = getOrders();
        const f = filter.trim().toLowerCase();
        const waiting = allOrders.filter(o => {
          const isPending = (o.status === 'KEY BEKLİYOR' || o.status === 'BEKLEMEDE' || !o.licenseKey);
          if (!isPending) return false;
          if (!f) return true;
          return (o.orderId && o.orderId.toLowerCase().includes(f)) ||
                 (o.customer && o.customer.toLowerCase().includes(f)) ||
                 (o.phone && o.phone.toLowerCase().includes(f)) ||
                 (o.email && o.email.toLowerCase().includes(f)) ||
                 (o.method && o.method.toLowerCase().includes(f));
        });

        // Update badge counters
        const badge = document.getElementById('badgeWebWaiting');
        const stat = document.getElementById('statWebWaitingCount');
        if (badge) badge.textContent = waiting.length;
        if (stat) stat.textContent = waiting.length;

        if (waiting.length === 0) {
          c.innerHTML = `
            <div style="text-align:center; padding:2rem 1rem; background:rgba(16,185,129,0.04); border:1px dashed rgba(16,185,129,0.25); border-radius:10px;">
              <div style="font-size:2rem; margin-bottom:0.4rem;"></div>
              <div style="font-weight:700; color:#34d399; font-size:0.9rem;">Bekleyen Web Siparişi Yok!</div>
              <div style="font-size:0.75rem; color:#9ca3af; margin-top:2px;">Tüm siparişlerin lisans anahtarları kurucu tarafından onaylanıp teslim edilmiştir.</div>
            </div>
          `;
          return;
        }

        c.innerHTML = waiting.map(ord => {
          const cleanPhone = (ord.phone || '').replace(/[^0-9]/g, '');
          const waMsg = encodeURIComponent(`Merhaba ${ord.customer}! Syntax Software siparişiniz onaylanmıştır. Sipariş Kodu: ${ord.orderId}. Lisans anahtarınız hesabınıza tanımlanmıştır.`);
          return `
            <div class="owner-waiting-card" data-order-id="${escapeHtml(ord.orderId)}">
              <div class="owner-waiting-header">
                <div style="display:flex; align-items:center; gap:0.55rem;">
                  <span style="font-family:monospace; font-weight:800; color:#ea580c; font-size:0.92rem;">${escapeHtml(ord.orderId)}</span>
                  <span class="order-status-pill status-pending" style="font-size:0.68rem;">${escapeHtml(ord.status || 'KEY BEKLİYOR')}</span>
                  <span style="font-size:0.72rem; color:#64748b;">${escapeHtml(ord.date || 'Yeni Sipariş')}</span>
                </div>
                <div style="font-weight:800; color:#2dd4bf; font-size:0.95rem;">${escapeHtml(ord.amount || '₺0')}</div>
              </div>

              <div class="owner-waiting-details-grid">
                <div>
                  <div style="color:#94a3b8; font-size:0.7rem; text-transform:uppercase;">Müşteri Bilgisi</div>
                  <div style="font-weight:700; color:#fff;">${escapeHtml(ord.customer || 'İsimsiz')}</div>
                  <div style="color:#94a3b8; font-size:0.74rem;">️ ${escapeHtml(ord.email || '-')}</div>
                </div>
                <div>
                  <div style="color:#94a3b8; font-size:0.7rem; text-transform:uppercase;">Telefon / WhatsApp</div>
                  <div style="font-weight:700; color:#38bdf8;"> ${escapeHtml(ord.phone || 'Girilmedi')}</div>
                </div>
                <div>
                  <div style="color:#94a3b8; font-size:0.7rem; text-transform:uppercase;">Satın Alınan Ürün</div>
                  <div style="font-weight:700; color:#c084fc;"> ${escapeHtml(ord.items || 'Syntax Yazılım')}</div>
                  <div style="color:#94a3b8; font-size:0.74rem;">Ödeme: ${escapeHtml(ord.method || 'Shopier / IBAN')}</div>
                </div>
              </div>

              <div class="owner-waiting-actions">
                <button type="button" class="btn-owner-issue-key btn-issue-web-key" data-id="${escapeHtml(ord.orderId)}" data-product="${escapeHtml(ord.items || 'Valorant Private')}">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                  <span> Key Çıkar & Teslim Et</span>
                </button>
                ${cleanPhone ? `
                  <a href="https://wa.me/${cleanPhone}?text=${waMsg}" target="_blank" class="btn-owner-wa">
                    <span> WhatsApp'tan Yaz</span>
                  </a>
                ` : ''}
                <button type="button" class="btn-copy-chip btn-cancel-web-order" data-id="${escapeHtml(ord.orderId)}" style="background:rgba(239,68,68,0.15); color:#f87171; border-color:rgba(239,68,68,0.3); font-size:0.72rem;">
                  <span>İptal Et</span>
                </button>
              </div>
            </div>
          `;
        }).join('');

        // Wire Web Issue Key Button
        c.querySelectorAll('.btn-issue-web-key').forEach(btn => {
          btn.addEventListener('click', () => {
            const orderId = btn.dataset.id;
            const prod = btn.dataset.product || 'Valorant Private Slotted';
            const newKey = generateSyntaxLicenseKey(prod);

            // Update order
            let ords = getOrders();
            const target = ords.find(o => o.orderId === orderId);
            if (target) {
              target.status = 'ONAYLANDI';
              target.licenseKey = newKey;
              localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(ords));

              // Assign license to user profile in STORAGE_USERS_KEY
              try {
                let usersList = getUsers();
                let matchedUser = usersList.find(u => 
                  (target.email && u.email && u.email.toLowerCase() === target.email.toLowerCase()) ||
                  (target.phone && u.phone && u.phone.replace(/[^0-9]/g,'') === target.phone.replace(/[^0-9]/g,'')) ||
                  (target.customer && u.username && u.username.toLowerCase() === target.customer.toLowerCase())
                );
                if (matchedUser) {
                  if (!matchedUser.licenses) matchedUser.licenses = [];
                  matchedUser.licenses.unshift({
                    product: prod,
                    key: newKey,
                    daysLeft: 30,
                    status: 'UNDETECTED & AKTİF'
                  });
                  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(usersList));
                }
              } catch (e) {}

              showToast(`${orderId} için lisans anahtarı üretildi ve teslim edildi: ${newKey}`, 'sparkles');
              renderWebWaitingList(document.getElementById('ownerWebSearchInp')?.value || '');
              renderAllOrdersList(document.getElementById('ownerOrdersSearchInp')?.value || '');
              renderAllUsersList(document.getElementById('ownerUsersSearchInp')?.value || '');
            }
          });
        });

        // Wire Cancel Button
        c.querySelectorAll('.btn-cancel-web-order').forEach(btn => {
          btn.addEventListener('click', () => {
            const orderId = btn.dataset.id;
            if (confirm(`${orderId} numaralı bekleyen siparişi iptal etmek istediğinize emin misiniz?`)) {
              let ords = getOrders();
              ords = ords.filter(o => o.orderId !== orderId);
              localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(ords));
              showToast(`${orderId} numaralı sipariş silindi.`, 'alert-circle');
              renderWebWaitingList(document.getElementById('ownerWebSearchInp')?.value || '');
              renderAllOrdersList('');
            }
          });
        });
      }

      document.getElementById('ownerWebSearchInp')?.addEventListener('input', (e) => {
        renderWebWaitingList(e.target.value);
      });

      // Real-time synchronization for web orders
      window.addEventListener('syntax_orders_updated', () => {
        renderWebWaitingList(document.getElementById('ownerWebSearchInp')?.value || '');
        renderAllOrdersList(document.getElementById('ownerOrdersSearchInp')?.value || '');
      });
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_ORDERS_KEY) {
          renderWebWaitingList(document.getElementById('ownerWebSearchInp')?.value || '');
          renderAllOrdersList(document.getElementById('ownerOrdersSearchInp')?.value || '');
        }
      });

      // --- LOGIC: RENDER DC KEY WAITING QUEUE ---
      function renderDcWaitingList() {
        const c = document.getElementById('ownerDcWaitingContainer');
        if (!c) return;
        const tickets = getDiscordTicketsList();
        const openTickets = tickets.filter(t => t.meta.status !== 'closed');

        const badge = document.getElementById('badgeDcWaiting');
        const stat = document.getElementById('statDcWaitingCount');
        if (badge) badge.textContent = openTickets.length;
        if (stat) stat.textContent = openTickets.length;

        if (openTickets.length === 0) {
          c.innerHTML = `
            <div style="text-align:center; padding:2rem 1rem; background:rgba(88,101,242,0.04); border:1px dashed rgba(88,101,242,0.25); border-radius:10px;">
              <div style="font-size:2rem; margin-bottom:0.4rem;"></div>
              <div style="font-weight:700; color:#818cf8; font-size:0.9rem;">Bekleyen Discord / Canlı Destek Ticket'ı Yok!</div>
              <div style="font-size:0.75rem; color:#9ca3af; margin-top:2px;">Tüm destek talepleri çözülmüş veya yanıtlanmıştır.</div>
            </div>
          `;
          return;
        }

        c.innerHTML = openTickets.map(t => {
          const lastMsgText = t.lastMsg ? t.lastMsg.text : 'Mesaj yok';
          return `
            <div class="owner-waiting-card" style="border-left:3px solid #5865f2;">
              <div class="owner-waiting-header">
                <div style="display:flex; align-items:center; gap:0.55rem;">
                  <span style="font-family:monospace; font-weight:800; color:#5865f2; font-size:0.92rem;">#ticket-${t.meta.ticketNum}-${escapeHtml(t.username)}</span>
                  <span class="order-status-pill" style="background:rgba(16,185,129,0.15); color:#34d399; font-size:0.68rem;">● AÇIK TALEP</span>
                  <span style="font-size:0.72rem; color:#64748b;">${escapeHtml(t.meta.createdAt || 'Bugün')}</span>
                </div>
                <span style="font-size:0.74rem; background:rgba(88,101,242,0.15); color:#c7d2fe; padding:0.2rem 0.55rem; border-radius:6px; font-weight:700;">${escapeHtml(t.role)}</span>
              </div>

              <div class="owner-waiting-details-grid">
                <div>
                  <div style="color:#94a3b8; font-size:0.7rem; text-transform:uppercase;">Kullanıcı</div>
                  <div style="font-weight:700; color:#fff;">${escapeHtml(t.label)}</div>
                  <div style="color:#94a3b8; font-size:0.74rem;">️ ${escapeHtml(t.email)}</div>
                </div>
                <div style="grid-column: span 2;">
                  <div style="color:#94a3b8; font-size:0.7rem; text-transform:uppercase;">Son Mesaj / Talep Özeti</div>
                  <div style="font-weight:600; color:#e2e8f0; font-size:0.8rem; background:rgba(0,0,0,0.35); padding:0.4rem 0.6rem; border-radius:6px; margin-top:2px;">
                    "${escapeHtml(lastMsgText.length > 110 ? lastMsgText.substring(0, 110) + '...' : lastMsgText)}"
                  </div>
                </div>
              </div>

              <div class="owner-waiting-actions">
                <button type="button" class="btn-owner-issue-key btn-issue-dc-key" data-key="${t.key}" data-username="${escapeHtml(t.username)}">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                  <span> DC Key Çıkar & Kanala İlet</span>
                </button>
                <button type="button" class="btn-copy-chip btn-goto-dc-ticket" data-key="${t.key}" style="background:#5865f2; color:#fff; font-size:0.76rem; padding:0.45rem 0.75rem;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  <span> Kanala Git & Buradan Mesaj Yaz</span>
                </button>
              </div>
            </div>
          `;
        }).join('');

        // Wire DC Key Issue Button
        c.querySelectorAll('.btn-issue-dc-key').forEach(btn => {
          btn.addEventListener('click', () => {
            const chatKey = btn.dataset.key;
            const targetUsername = btn.dataset.username;
            const newKey = generateSyntaxLicenseKey('VAL');

            // Append staff message to ticket
            let history = [];
            try {
              const raw = localStorage.getItem(chatKey);
              if (raw) history = JSON.parse(raw);
            } catch (e) {}

            const now = new Date();
            const time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

            history.push({
              sender: 'staff',
              text: `[KURUCU / OWNER KEY TESLİMATI]
Sayın @${targetUsername}, ödemeniz ve talebiniz kurucu tarafından onaylanmıştır:
 LİSANS ANAHTARINIZ: ${newKey}
 ÜRÜN: Valorant Private Slotted (Undetected)
Kurulum ve loader dosyanızı sitemizdeki müşteri panelinizden anında indirebilirsiniz.`,
              time: time
            });
            localStorage.setItem(chatKey, JSON.stringify(history));

            // Also add license to user's registered account if exists
            let usersList = getUsers();
            let u = usersList.find(x => x.username.toLowerCase() === targetUsername.toLowerCase());
            if (u) {
              if (!u.licenses) u.licenses = [];
              u.licenses.unshift({
                product: 'Valorant Private Slotted',
                key: newKey,
                daysLeft: 30,
                status: 'UNDETECTED & AKTİF'
              });
              localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(usersList));
            }

            showToast(`${targetUsername} kullanıcısına ait Discord ticket kanalına lisans anahtarı iletildi: ${newKey}`, 'sparkles');
            renderDcWaitingList();
            renderAllUsersList(document.getElementById('ownerUsersSearchInp')?.value || '');
          });
        });

        // Wire Go to Ticket button
        c.querySelectorAll('.btn-goto-dc-ticket').forEach(btn => {
          btn.addEventListener('click', () => {
            const chatKey = btn.dataset.key;
            // Switch tab to dc-tickets
            switchOwnerTab('dc-tickets');
            // Select channel
            _dcSelectedKey = chatKey;
            const t = openTickets.find(x => x.key === chatKey);
            if (t) _dcSelectedUser = t;
            renderDiscordTicketList();
            renderDiscordTicketMessages();
            setTimeout(() => {
              document.getElementById('dcChatReplyText')?.focus();
            }, 100);
          });
        });
      }

      // --- LOGIC: RENDER ALL REGISTERED USERS & COMPLETE REGISTRATION DOSSIERS ---
      function renderAllUsersList(filter = '') {
        const c = document.getElementById('ownerAllUsersContainer');
        if (!c) return;
        const allUsers = getUsers();
        const f = filter.trim().toLowerCase();
        const filtered = allUsers.filter(u => {
          if (!f) return true;
          return (u.username && u.username.toLowerCase().includes(f)) ||
                 (u.fullName && u.fullName.toLowerCase().includes(f)) ||
                 (u.email && u.email.toLowerCase().includes(f)) ||
                 (u.phone && u.phone.toLowerCase().includes(f)) ||
                 (u.password && u.password.toLowerCase().includes(f)) ||
                 (u.role && u.role.toLowerCase().includes(f)) ||
                 (u.registeredAt && u.registeredAt.toLowerCase().includes(f));
        });

        const badge = document.getElementById('badgeAllUsers');
        const stat = document.getElementById('statUsersCount');
        if (badge) badge.textContent = allUsers.length;
        if (stat) stat.textContent = allUsers.length;

        // Top summary chips
        const badgesContainer = document.getElementById('ownerUsersSummaryBadges');
        if (badgesContainer) {
          const customersCount = allUsers.filter(u => u.role !== 'admin' && u.role !== 'owner' && u.role !== 'reseller').length;
          const resellersCount = allUsers.filter(u => u.role === 'reseller').length;
          const adminsCount = allUsers.filter(u => u.role === 'admin' || u.role === 'owner').length;
          badgesContainer.innerHTML = `
            <div class="owner-user-stat-chip">👥 Toplam Kayıtlı: <strong>${allUsers.length} Kişi</strong></div>
            <div class="owner-user-stat-chip" style="border-color:rgba(168,85,247,0.35);">💎 Müşteri: <strong style="color:#c084fc;">${customersCount}</strong></div>
            <div class="owner-user-stat-chip" style="border-color:rgba(59,130,246,0.35);">💼 Bayi (Reseller): <strong style="color:#60a5fa;">${resellersCount}</strong></div>
            <div class="owner-user-stat-chip" style="border-color:rgba(245,158,11,0.35);">👑 Admin / Kurucu: <strong style="color:#f59e0b;">${adminsCount}</strong></div>
          `;
        }

        if (filtered.length === 0) {
          c.innerHTML = '<div style="text-align:center; padding:2rem; color:#9ca3af; font-size:0.84rem; background:rgba(255,255,255,0.02); border-radius:10px; border:1px dashed rgba(255,255,255,0.1);">Eşleşen kayıtlı kullanıcı hesabı bulunamadı.</div>';
          return;
        }

        c.innerHTML = filtered.map(u => {
          const isUserOwner = u.role === 'owner' || (u.username && u.username.toLowerCase() === 'noxy');
          const licCount = (u.licenses || []).length;
          const cleanPhone = (u.phone || '').replace(/[^0-9]/g, '');
          const waMsg = encodeURIComponent(`Merhaba ${u.fullName || u.username}, Syntax Software hesabınız hakkında iletişime geçiyoruz.`);

          return `
            <div class="owner-user-row" data-username="${escapeHtml(u.username)}">
              <!-- TOP HEADER ROW -->
              <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%; gap:0.75rem; flex-wrap:wrap;">
                <div class="owner-user-info-group">
                  <div class="owner-user-avatar" style="${isUserOwner ? 'background:linear-gradient(135deg, #f59e0b, #ef4444); font-size:1.1rem;' : ''}">
                    ${isUserOwner ? '👑' : escapeHtml((u.fullName || u.username).slice(0, 2).toUpperCase())}
                  </div>
                  <div class="owner-user-details">
                    <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                      <span style="font-weight:800; color:#fff; font-size:0.96rem;">${escapeHtml(u.fullName || u.username)}</span>
                      <span style="font-size:0.78rem; color:#94a3b8; font-family:monospace;">@${escapeHtml(u.username)}</span>
                      <span class="user-badge-tag" style="${isUserOwner ? 'background:#f59e0b; color:#000; font-weight:800;' : (u.role === 'reseller' ? 'background:#2563eb; color:#fff;' : '')}">
                        ${escapeHtml(u.role === 'owner' ? 'KURUCU (OWNER)' : (u.role === 'admin' ? 'YÖNETİCİ' : (u.role === 'reseller' ? 'YETKİLİ BAYİ' : 'VIP MÜŞTERİ')))}
                      </span>
                      <span style="font-size:0.7rem; background:rgba(255,255,255,0.06); color:#cbd5e1; padding:0.18rem 0.55rem; border-radius:999px;">
                        🕒 Kayıt: ${escapeHtml(u.registeredAt || u.createdAt || '2026')}
                      </span>
                    </div>
                    <div style="font-size:0.74rem; color:#6ee7b7; margin-top:2px;">
                      ${escapeHtml(u.rank || (isUserOwner ? 'Kurucu & Sistem Sahibi' : 'Kayıtlı Müşteri Hesabı'))}
                    </div>
                  </div>
                </div>

                <div class="owner-user-actions">
                  ${cleanPhone ? `
                    <a href="https://wa.me/${cleanPhone}?text=${waMsg}" target="_blank" class="btn-copy-chip" style="background:rgba(37,211,102,0.18); color:#4ade80; border-color:rgba(37,211,102,0.35); font-size:0.72rem; text-decoration:none;">
                      <span>📲 WhatsApp</span>
                    </a>
                  ` : ''}
                  <button type="button" class="btn-copy-chip btn-copy-full-dossier" data-username="${escapeHtml(u.username)}" style="font-size:0.72rem; background:#334155; color:#f1f5f9; border-color:#475569;">
                    <span>📋 Tüm Bilgileri Kopyala</span>
                  </button>
                  <button type="button" class="btn-copy-chip btn-owner-add-user-key" data-username="${escapeHtml(u.username)}" style="background:rgba(16,185,129,0.15); color:#6ee7b7; border-color:rgba(16,185,129,0.3); font-size:0.72rem;">
                    <span>+ Key Tanımla</span>
                  </button>
                  ${!isUserOwner ? `
                    <button type="button" class="btn-copy-chip btn-owner-del-user" data-username="${escapeHtml(u.username)}" style="background:rgba(239,68,68,0.15); color:#f87171; border-color:rgba(239,68,68,0.3); font-size:0.72rem;">
                      <span>🗑️ Hesabı Sil</span>
                    </button>
                  ` : ''}
                </div>
              </div>

              <!-- COMPLETE REGISTRATION DOSSIER GRID -->
              <div class="owner-user-dossier-grid">
                <div class="owner-user-field-cell">
                  <div class="owner-user-field-label">👤 Ad ve Soyad:</div>
                  <div class="owner-user-field-val" style="color:#fff;">${escapeHtml(u.fullName || '-')}</div>
                </div>
                <div class="owner-user-field-cell">
                  <div class="owner-user-field-label">🏷️ Kullanıcı Adı:</div>
                  <div class="owner-user-field-val" style="color:#38bdf8; font-family:monospace;">${escapeHtml(u.username)}</div>
                </div>
                <div class="owner-user-field-cell">
                  <div class="owner-user-field-label">✉️ E-posta Adresi:</div>
                  <div class="owner-user-field-val">
                    <a href="mailto:${escapeHtml(u.email)}" style="color:#c084fc; text-decoration:none;">${escapeHtml(u.email)}</a>
                  </div>
                </div>
                <div class="owner-user-field-cell">
                  <div class="owner-user-field-label">📞 Telefon Numarası:</div>
                  <div class="owner-user-field-val" style="color:#34d399;">${escapeHtml(u.phone || 'Girilmedi')}</div>
                </div>
                <div class="owner-user-field-cell">
                  <div class="owner-user-field-label">🔑 Hesap Şifresi:</div>
                  <div style="display:flex; align-items:center; gap:0.4rem; margin-top:2px;">
                    <code class="owner-user-pass-code">${escapeHtml(u.password || '80Ozan84')}</code>
                    <button type="button" class="btn-copy-chip btn-copy-user-pass" data-pass="${escapeHtml(u.password || '80Ozan84')}" style="padding:1px 5px; font-size:0.65rem;">Kopyala</button>
                  </div>
                </div>
                <div class="owner-user-field-cell">
                  <div class="owner-user-field-label">📅 Kayıt Tarihi & Saati:</div>
                  <div class="owner-user-field-val" style="color:#cbd5e1;">${escapeHtml(u.registeredAt || u.createdAt || '2026')}</div>
                </div>
                <div class="owner-user-field-cell">
                  <div class="owner-user-field-label">📜 Sözleşme Onayı:</div>
                  <div class="owner-user-field-val" style="color:#4ade80; font-size:0.78rem;">✅ Kullanım Şartları Onaylandı</div>
                </div>
                ${u.role === 'reseller' ? `
                <div class="owner-user-field-cell">
                  <div class="owner-user-field-label">💼 Bayi Durumu:</div>
                  <div class="owner-user-field-val" style="color:#60a5fa;">Kota: ${u.quota || 0} · Bakiye: ${u.balance || '₺0'}</div>
                </div>
                ` : `
                <div class="owner-user-field-cell">
                  <div class="owner-user-field-label">🎫 Aktif Lisans:</div>
                  <div class="owner-user-field-val" style="color:#cbd5e1;">${licCount} Adet Lisans Tanımlı</div>
                </div>
                `}
              </div>

              <!-- LİSANSLAR VARSA LİSTELE -->
              ${licCount > 0 ? `
                <div class="owner-user-license-box">
                  <div style="font-size:0.72rem; font-weight:700; color:#cbd5e1; margin-bottom:0.35rem; text-transform:uppercase;">Kullanıcıya Tanımlı Lisanslar:</div>
                  ${u.licenses.map((lic, licIdx) => `
                    <div class="owner-license-item-row">
                      <div>
                        <strong style="color:#c084fc;">${escapeHtml(lic.product || 'Lisans')}</strong> · 
                        <code style="font-family:monospace; color:#2dd4bf; background:rgba(0,0,0,0.5); padding:1px 4px; border-radius:4px;">${escapeHtml(lic.key)}</code>
                        <span style="color:#94a3b8; font-size:0.7rem; margin-left:4px;">(${lic.status || 'AKTİF'} · ${lic.daysLeft || 30} gün)</span>
                      </div>
                      <div style="display:flex; gap:4px;">
                        <button type="button" class="btn-copy-chip btn-copy-raw-key" data-key="${escapeHtml(lic.key)}" style="padding:0.15rem 0.45rem; font-size:0.68rem;">Kopyala</button>
                        <button type="button" class="btn-copy-chip btn-owner-del-lic" data-username="${escapeHtml(u.username)}" data-idx="${licIdx}" style="background:rgba(239,68,68,0.2); color:#f87171; border-color:rgba(239,68,68,0.35); padding:0.15rem 0.45rem; font-size:0.68rem;">Key Sil</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `;
        }).join('');

        // Wire Copy User Password Button
        c.querySelectorAll('.btn-copy-user-pass').forEach(btn => {
          btn.addEventListener('click', () => {
            const pass = btn.dataset.pass;
            if (navigator.clipboard && window.isSecureContext) {
              navigator.clipboard.writeText(pass);
            } else {
              const ta = document.createElement('textarea');
              ta.value = pass;
              ta.style.position = 'fixed';
              ta.style.left = '-999999px';
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              document.body.removeChild(ta);
            }
            showToast('Hesap şifresi panoya kopyalandı!', 'check-circle');
          });
        });

        // Wire Copy Full Dossier
        c.querySelectorAll('.btn-copy-full-dossier').forEach(btn => {
          btn.addEventListener('click', () => {
            const uname = btn.dataset.username;
            const target = allUsers.find(x => x.username.toLowerCase() === uname.toLowerCase());
            if (!target) return;
            let dossier = `==================================================\n`;
            dossier += `SYNTAX SOFTWARE · MÜŞTERİ KAYIT DOSYASI\n`;
            dossier += `==================================================\n`;
            dossier += `👤 Ad ve Soyad: ${target.fullName || '-'}\n`;
            dossier += `🏷️ Kullanıcı Adı: @${target.username}\n`;
            dossier += `✉️ E-posta: ${target.email}\n`;
            dossier += `📞 Telefon: ${target.phone || '-'}\n`;
            dossier += `🔑 Şifre: ${target.password || '-'}\n`;
            dossier += `🛡️ Rol: ${target.role} (${target.rank || 'Üye'})\n`;
            dossier += `📅 Kayıt Tarihi: ${target.registeredAt || target.createdAt || '-'}\n`;
            dossier += `📜 Sözleşme: Kullanım Şartları ve Satış Sözleşmesi Onaylandı\n`;
            dossier += `🎫 Tanımlı Lisans: ${(target.licenses || []).length} Adet\n`;
            if (target.licenses && target.licenses.length > 0) {
              target.licenses.forEach((l, idx) => {
                dossier += `  ${idx + 1}. ${l.product}: ${l.key} (${l.status || 'AKTİF'})\n`;
              });
            }
            dossier += `==================================================\n`;

            if (navigator.clipboard && window.isSecureContext) {
              navigator.clipboard.writeText(dossier);
            } else {
              const ta = document.createElement('textarea');
              ta.value = dossier;
              ta.style.position = 'fixed';
              ta.style.left = '-999999px';
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              document.body.removeChild(ta);
            }
            showToast(`${target.fullName || target.username} kullanıcısının tüm kayıt bilgileri panoya kopyalandı!`, 'check-circle');
          });
        });

        // Wire Add Key to User
        c.querySelectorAll('.btn-owner-add-user-key').forEach(btn => {
          btn.addEventListener('click', () => {
            const targetU = btn.dataset.username;
            const prod = prompt(`@${targetU} kullanıcısına hangi ürün için lisans tanımlansın?
(Örn: Valorant VIP, CS Kernel, Vanguard Emulator, Spoofer HWID):`, 'Valorant VIP');
            if (!prod) return;
            const key = generateSyntaxLicenseKey(prod);

            let usersList = getUsers();
            const target = usersList.find(x => x.username.toLowerCase() === targetU.toLowerCase());
            if (target) {
              if (!target.licenses) target.licenses = [];
              target.licenses.unshift({
                product: prod,
                key: key,
                daysLeft: 30,
                status: 'UNDETECTED & AKTİF'
              });
              localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(usersList));
              showToast(`@${targetU} kullanıcısına ${prod} lisansı atandı: ${key}`, 'sparkles');
              renderAllUsersList(document.getElementById('ownerUsersSearchInp')?.value || '');
            }
          });
        });

        // Wire Delete License from User
        c.querySelectorAll('.btn-owner-del-lic').forEach(btn => {
          btn.addEventListener('click', () => {
            const targetU = btn.dataset.username;
            const idx = parseInt(btn.dataset.idx);
            if (confirm(`@${targetU} kullanıcısının bu lisans anahtarını iptal edip silmek istediğinize emin misiniz?`)) {
              let usersList = getUsers();
              const target = usersList.find(x => x.username.toLowerCase() === targetU.toLowerCase());
              if (target && target.licenses) {
                target.licenses.splice(idx, 1);
                localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(usersList));
                showToast(`Lisans başarıyla iptal edildi.`, 'alert-circle');
                renderAllUsersList(document.getElementById('ownerUsersSearchInp')?.value || '');
              }
            }
          });
        });

        // Wire Copy Raw Key
        c.querySelectorAll('.btn-copy-raw-key').forEach(btn => {
          btn.addEventListener('click', () => {
            navigator.clipboard.writeText(btn.dataset.key);
            showToast('Lisans anahtarı kopyalandı!');
          });
        });

        // Wire Delete User Account
        c.querySelectorAll('.btn-owner-del-user').forEach(btn => {
          btn.addEventListener('click', () => {
            const targetU = btn.dataset.username;
            if (confirm(`@${targetU} hesabını ve tüm lisans geçmişini sistemden tamamen silmek istediğinize emin misiniz?`)) {
              let usersList = getUsers();
              usersList = usersList.filter(x => x.username.toLowerCase() !== targetU.toLowerCase());
              localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(usersList));
              showToast(`@${targetU} hesabı sistemden silindi.`, 'alert-circle');
              renderAllUsersList(document.getElementById('ownerUsersSearchInp')?.value || '');
            }
          });
        });
      }

      document.getElementById('ownerUsersSearchInp')?.addEventListener('input', (e) => {
        renderAllUsersList(e.target.value);
      });

      // Real-time synchronization for registered users
      const syncUsersHandler = () => {
        if (isOwner) {
          renderAllUsersList(document.getElementById('ownerUsersSearchInp')?.value || '');
          const badge = document.getElementById('badgeAllUsers');
          const stat = document.getElementById('statUsersCount');
          const uCount = getUsers().length;
          if (badge) badge.textContent = uCount;
          if (stat) stat.textContent = uCount;
        }
      };
      window.addEventListener('syntax_users_updated', syncUsersHandler);
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_USERS_KEY) {
          syncUsersHandler();
        }
      });

      // --- LOGIC: RENDER ALL ORDERS ---
      function renderAllOrdersList(filter = '') {
        const c = document.getElementById(isOwner ? 'ownerAllOrdersContainer' : 'adminOrdersContainer');
        if (!c) return;
        const allOrders = getOrders();
        const f = filter.trim().toLowerCase();
        const filtered = allOrders.filter(o => {
          if (!f) return true;
          return (o.orderId && o.orderId.toLowerCase().includes(f)) ||
                 (o.customer && o.customer.toLowerCase().includes(f)) ||
                 (o.method && o.method.toLowerCase().includes(f)) ||
                 (o.amount && o.amount.toLowerCase().includes(f)) ||
                 (o.items && o.items.toLowerCase().includes(f));
        });

        const badge = document.getElementById('badgeAllOrders');
        const stat = document.getElementById('statOrdersCount') || document.getElementById('statOrderCount');
        if (badge) badge.textContent = allOrders.length;
        if (stat) stat.textContent = allOrders.length;

        if (filtered.length === 0) {
          c.innerHTML = '<div style="text-align:center; padding:1.5rem; color:#9ca3af; font-size:0.84rem;">Eşleşen sipariş kaydı bulunamadı.</div>';
          return;
        }

        c.innerHTML = filtered.map((ord, idx) => {
          const isApproved = ord.status === 'ONAYLANDI';
          return `
            <div class="admin-order-item-card" data-idx="${idx}">
              <div class="admin-order-top-row">
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <span class="admin-order-code-badge">${escapeHtml(ord.orderId)}</span>
                  <span style="font-weight:700; color:#fff; font-size:0.88rem;">${escapeHtml(ord.customer)}</span>
                </div>
                <span class="admin-order-status-badge ${isApproved ? 'approved' : 'pending'}">${escapeHtml(ord.status || 'KEY BEKLİYOR')}</span>
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; color:#9ca3af;">
                <div>Ürün: <strong style="color:#d8b4fe;">${escapeHtml(ord.items || 'Yazılım')}</strong> · ${escapeHtml(ord.method)}</div>
                <div style="font-weight:800; color:#2dd4bf; font-size:0.95rem;">${escapeHtml(ord.amount)}</div>
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); border-radius:6px; padding:0.4rem 0.6rem; font-size:0.78rem;">
                <span style="font-family:monospace; color:${isApproved ? '#a855f7' : '#fbbf24'};">${escapeHtml(ord.licenseKey || '[Owner Key Bekliyor]')}</span>
                <div style="display:flex; gap:0.4rem;">
                  ${ord.licenseKey ? `<button type="button" class="btn-copy-chip btn-copy-order-key" data-key="${escapeHtml(ord.licenseKey)}" style="padding:0.2rem 0.5rem; font-size:0.72rem;">Kopyala</button>` : ''}
                  ${!isApproved ? `<button type="button" class="btn-copy-chip btn-approve-order" data-id="${ord.orderId}" style="background:#10b981; color:#fff; padding:0.2rem 0.5rem; font-size:0.72rem;"> Onayla & Key Ver</button>` : ''}
                  ${isOwner ? `<button type="button" class="btn-copy-chip btn-delete-order" data-id="${ord.orderId}" style="background:rgba(239,68,68,0.2); color:#f87171; border-color:rgba(239,68,68,0.35); padding:0.2rem 0.5rem; font-size:0.72rem;">Sil</button>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('');

        c.querySelectorAll('.btn-copy-order-key').forEach(b => {
          b.addEventListener('click', () => {
            navigator.clipboard.writeText(b.dataset.key);
            showToast('Lisans anahtarı panoya kopyalandı!');
          });
        });

        c.querySelectorAll('.btn-approve-order').forEach(b => {
          b.addEventListener('click', () => {
            const id = b.dataset.id;
            let ords = getOrders();
            const target = ords.find(o => o.orderId === id);
            if (target) {
              const newKey = generateSyntaxLicenseKey(target.items || 'VAL');
              target.status = 'ONAYLANDI';
              target.licenseKey = newKey;
              localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(ords));

              // Assign to user profile
              try {
                let usersList = getUsers();
                let matchedUser = usersList.find(u => 
                  (target.email && u.email && u.email.toLowerCase() === target.email.toLowerCase()) ||
                  (target.customer && u.username && u.username.toLowerCase() === target.customer.toLowerCase())
                );
                if (matchedUser) {
                  if (!matchedUser.licenses) matchedUser.licenses = [];
                  matchedUser.licenses.unshift({
                    product: target.items || 'Valorant Private Slotted',
                    key: newKey,
                    daysLeft: 30,
                    status: 'UNDETECTED & AKTİF'
                  });
                  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(usersList));
                }
              } catch (e) {}

              showToast(`${id} numaralı sipariş onaylandı ve lisans anahtarı üretildi: ${newKey}`, 'check-circle');
              renderAllOrdersList(document.getElementById('ownerOrdersSearchInp')?.value || '');
              renderWebWaitingList(document.getElementById('ownerWebSearchInp')?.value || '');
              renderAllUsersList('');
            }
          });
        });

        c.querySelectorAll('.btn-delete-order').forEach(b => {
          b.addEventListener('click', () => {
            const id = b.dataset.id;
            if (confirm(`${id} sipariş kaydını silmek istediğinize emin misiniz?`)) {
              let ords = getOrders();
              ords = ords.filter(o => o.orderId !== id);
              localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(ords));
              showToast(`${id} siparişi silindi.`, 'alert-circle');
              renderAllOrdersList('');
              renderWebWaitingList('');
            }
          });
        });
      }

      document.getElementById('ownerOrdersSearchInp')?.addEventListener('input', (e) => {
        renderAllOrdersList(e.target.value);
      });
      document.getElementById('adminOrderSearchInp')?.addEventListener('input', (e) => {
        renderAllOrdersList(e.target.value);
      });

      // --- TAB SWITCHER ENGINE FOR OWNER COMMAND HUB ---
      function switchOwnerTab(tabId) {
        const tabsBar = document.getElementById('ownerHubTabsBar');
        if (!tabsBar) return;
        tabsBar.querySelectorAll('.owner-hub-tab-btn').forEach(btn => {
          if (btn.dataset.tab === tabId) btn.classList.add('active');
          else btn.classList.remove('active');
        });

        const tabPanes = {
          'web-waiting': document.getElementById('tabOwnerWebWaiting'),
          'dc-waiting': document.getElementById('tabOwnerDcWaiting'),
          'all-users': document.getElementById('tabOwnerAllUsers'),
          'all-orders': document.getElementById('tabOwnerAllOrders'),
          'dc-tickets': document.getElementById('tabOwnerDcTickets'),
          'owner-discord-bot': document.getElementById('tabOwnerDiscordBot'),
          'owner-admins': document.getElementById('tabOwnerAdmins'),
          'owner-resellers': document.getElementById('tabOwnerResellers')
        };

        Object.keys(tabPanes).forEach(k => {
          if (tabPanes[k]) {
            tabPanes[k].style.display = (k === tabId) ? 'block' : 'none';
          }
        });

        if (tabId === 'web-waiting') renderWebWaitingList();
        else if (tabId === 'dc-waiting') renderDcWaitingList();
        else if (tabId === 'all-users') renderAllUsersList();
        else if (tabId === 'all-orders') renderAllOrdersList();
        else if (tabId === 'owner-discord-bot') {
          loadDiscordBotConfigUI();
        }
        else if (tabId === 'dc-tickets') {
          renderDiscordTicketList();
          renderDiscordTicketMessages();
          // Auto select first ticket if none selected
          if (!_dcSelectedKey) {
            const tList = getDiscordTicketsList();
            if (tList.length > 0) {
              _dcSelectedKey = tList[0].key;
              _dcSelectedUser = tList[0];
              renderDiscordTicketList();
              renderDiscordTicketMessages();
            }
          }
        }
      }

      // --- DISCORD BOT CONFIGURATION & CONTROLLER ---
      async function loadDiscordBotConfigUI() {
        const badge = document.getElementById('ownerDcBridgeStatusBadge');
        const tokenInput = document.getElementById('ownerDcBotToken');
        const channelInput = document.getElementById('ownerDcChannelId');
        const webhookInput = document.getElementById('ownerDcWebhookUrl');
        const tabBadge = document.getElementById('badgeDiscordBotStatus');

        try {
          const res = await fetch('http://127.0.0.1:5055/api/status');
          if (res.ok) {
            const st = await res.json();
            if (badge) {
              if (st.discord_bot_connected) {
                badge.textContent = `🟢 BOT BAĞLI: ${st.bot_user}`;
                badge.style.background = '#10b981';
              } else if (st.webhook_configured) {
                badge.textContent = '🟢 WEBHOOK MODU AKTİF';
                badge.style.background = '#3b82f6';
              } else {
                badge.textContent = '🟡 KÖPRÜ ÇALIŞIYOR (Port 5055)';
                badge.style.background = '#f59e0b';
              }
            }
            if (tabBadge) tabBadge.textContent = st.discord_bot_connected ? 'Bot Aktif' : 'Aktif';
          }
        } catch (e) {
          if (badge) {
            badge.textContent = '🔴 KÖPRÜ BAŞLATILMADI';
            badge.style.background = '#ef4444';
          }
          if (tabBadge) tabBadge.textContent = 'Çevrimdışı';
        }

        try {
          const cfgRes = await fetch('http://127.0.0.1:5055/api/config');
          if (cfgRes.ok) {
            const cfg = await cfgRes.json();
            if (tokenInput && cfg.bot_token_masked && !tokenInput.value) {
              tokenInput.placeholder = `Mevcut: ${cfg.bot_token_masked}`;
            }
            if (channelInput && cfg.web_ticket_channel_id) {
              channelInput.value = cfg.web_ticket_channel_id;
            }
            if (webhookInput && cfg.webhook_url) {
              webhookInput.value = cfg.webhook_url;
            }
          }
        } catch (e) {}
      }

      // Initial check of bot status for badge
      setTimeout(loadDiscordBotConfigUI, 1200);

      document.getElementById('btnSaveDcBotConfig')?.addEventListener('click', async () => {
        const token = document.getElementById('ownerDcBotToken')?.value.trim() || '';
        const chan = document.getElementById('ownerDcChannelId')?.value.trim() || 'web-ticket';
        const webhook = document.getElementById('ownerDcWebhookUrl')?.value.trim() || '';

        try {
          const res = await fetch('http://127.0.0.1:5055/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bot_token: token,
              web_ticket_channel_id: chan,
              webhook_url: webhook
            })
          });
          if (res.ok) {
            showToast('✅ Discord Bot & Webhook konfigürasyonu kaydedildi!', 'check-circle');
            loadDiscordBotConfigUI();
          } else {
            showToast('Ayar kaydedilirken bir hata oluştu.', 'alert-circle');
          }
        } catch (err) {
          showToast('Köprü sunucusuna (port 5055) erişilemedi. Lütfen start_discord_bot.bat çalıştırın.', 'alert-circle');
        }
      });

      document.getElementById('btnTestDcEmbed')?.addEventListener('click', async () => {
        showToast('Discord test embed gönderiliyor...', 'sparkles');
        try {
          const res = await fetch('http://127.0.0.1:5055/api/ticket/test', { method: 'POST' });
          if (res.ok) {
            showToast(' Test bildirimi Discord #web-ticket kanalına başarıyla iletildi!', 'check-circle');
          } else {
            showToast('Test iletimi başarısız oldu. Webhook veya Token kontrol edin.', 'alert-circle');
          }
        } catch (e) {
          showToast('Köprü sunucusuna erişilemedi.', 'alert-circle');
        }
      });

      document.querySelectorAll('.owner-hub-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          switchOwnerTab(btn.dataset.tab);
        });
      });

      // --- DISCORD TICKET SYSTEM CONTROLLER & LIVE CHAT REPLY ENGINE ---
      let _dcSelectedKey = null;
      let _dcSelectedUser = null;
      let _dcTicketFilter = '';

      function renderDiscordTicketList() {
        const channelsContainer = document.getElementById('dcTicketChannelsList');
        if (!channelsContainer) return;
        const tickets = getDiscordTicketsList();

        // Filter
        const q = _dcTicketFilter.trim().toLowerCase();
        const filtered = tickets.filter(t => {
          if (!q) return true;
          return t.label.toLowerCase().includes(q) || 
                 t.email.toLowerCase().includes(q) || 
                 ('ticket-' + t.meta.ticketNum).includes(q);
        });

        const openTickets = filtered.filter(t => t.meta.status !== 'closed');
        const closedTickets = filtered.filter(t => t.meta.status === 'closed');

        const openBadge = document.getElementById('dcOpenTicketBadge');
        const closedBadge = document.getElementById('dcClosedTicketBadge');
        if (openBadge) openBadge.textContent = `${openTickets.length} Açık Talep`;
        if (closedBadge) closedBadge.textContent = `${closedTickets.length} Arşiv`;

        if (filtered.length === 0) {
          channelsContainer.innerHTML = '<div style="color:#80848e; font-size:0.75rem; text-align:center; padding:1.5rem 0.5rem;">Eşleşen destek talebi bulunamadı.</div>';
          return;
        }

        let html = '';

        if (openTickets.length > 0) {
          html += `<div class="dc-category-header">▼  AÇIK TALEPLER (${openTickets.length})</div>`;
          openTickets.forEach(t => {
            const isActive = _dcSelectedKey === t.key;
            const chName = t.meta.channelName || generateTicketChannelName(t.meta.category, t.username);
            const claimTag = t.meta.claimedBy ? `<span style="font-size:0.65rem; background:rgba(34,197,94,0.15); color:#4ade80; padding:0.1rem 0.35rem; border-radius:4px; font-weight:700;">📌 ${escapeHtml(t.meta.claimedBy.username)}</span>` : '';
            html += `
              <div class="dc-channel-item ${isActive ? 'active' : ''}" data-key="${t.key}" data-user="${escapeHtml(JSON.stringify(t))}">
                <div class="dc-channel-left">
                  <span class="dc-channel-hash">#</span>
                  <span class="dc-channel-name" title="${escapeHtml(chName)}">${escapeHtml(chName)}</span>
                </div>
                <div style="display:flex; align-items:center; gap:0.35rem;">
                  ${claimTag}
                  ${t.unreadCount > 0 ? `<span class="dc-channel-ping">${t.unreadCount}</span>` : ''}
                </div>
              </div>
            `;
          });
        }

        if (closedTickets.length > 0) {
          html += `<div class="dc-category-header" style="margin-top:0.6rem;">▼ KAPATILANLAR (${closedTickets.length})</div>`;
          closedTickets.forEach(t => {
            const isActive = _dcSelectedKey === t.key;
            const chName = t.meta.channelName || generateTicketChannelName(t.meta.category, t.username);
            html += `
              <div class="dc-channel-item ${isActive ? 'active' : ''}" data-key="${t.key}" data-user="${escapeHtml(JSON.stringify(t))}" style="opacity:0.75;">
                <div class="dc-channel-left">
                  <span class="dc-channel-hash" style="color:#da373c;">#</span>
                  <span class="dc-channel-name" style="text-decoration:line-through;" title="${escapeHtml(chName)}">${escapeHtml(chName)}</span>
                </div>
                <span style="font-size:0.65rem; color:#f87171; background:rgba(239,68,68,0.15); padding:0.1rem 0.35rem; border-radius:4px;">KAPALI</span>
              </div>
            `;
          });
        }

        if (!_dcSelectedKey && filtered.length > 0) {
          const autoPick = openTickets.length > 0 ? openTickets[0] : filtered[0];
          _dcSelectedKey = autoPick.key;
          _dcSelectedUser = autoPick;
        } else if (_dcSelectedKey) {
          const currentPick = filtered.find(t => t.key === _dcSelectedKey) || tickets.find(t => t.key === _dcSelectedKey);
          if (currentPick) _dcSelectedUser = currentPick;
        }

        channelsContainer.innerHTML = html;

        channelsContainer.querySelectorAll('.dc-channel-item').forEach(el => {
          el.addEventListener('click', () => {
            _dcSelectedKey = el.dataset.key;
            try {
              _dcSelectedUser = JSON.parse(el.dataset.user);
            } catch (e) {}
            renderDiscordTicketList();
            renderDiscordTicketMessages();
          });
        });
      }

      function renderDiscordTicketMessages() {
        const msgContainer = document.getElementById('dcTicketMessagesArea');
        const actionsRow = document.getElementById('dcChannelActions');
        const footerRow = document.getElementById('dcChatFooter');
        const titleEl = document.getElementById('dcCurrentChannelTitle');
        const topicEl = document.getElementById('dcCurrentChannelTopic');
        const btnClose = document.getElementById('btnDcCloseTicket');
        const btnReopen = document.getElementById('btnDcReopenTicket');

        if (!_dcSelectedKey || !_dcSelectedUser) {
          if (actionsRow) actionsRow.style.display = 'none';
          if (footerRow) footerRow.style.display = 'none';
          if (titleEl) titleEl.textContent = 'ticket-seciniz';
          if (topicEl) topicEl.textContent = 'Destek ve Ticket Kanalı';
          return;
        }

        const meta = getTicketMeta(_dcSelectedKey);
        const isClosed = meta.status === 'closed';

        if (actionsRow) actionsRow.style.display = 'flex';
        if (footerRow) footerRow.style.display = isClosed ? 'none' : 'flex';
        if (btnClose) btnClose.style.display = isClosed ? 'none' : 'inline-flex';
        if (btnReopen) btnReopen.style.display = isClosed ? 'inline-flex' : 'none';

        const chName = meta.channelName || generateTicketChannelName(meta.category, _dcSelectedUser.username);
        if (titleEl) titleEl.textContent = chName;
        if (topicEl) topicEl.textContent = `Talep Sahibi: ${_dcSelectedUser.label} · Kategori: ${meta.category || 'Destek'} · Durum: ${isClosed ? 'Kapalı' : 'Açık'}`;

        let history = [];
        try {
          const raw = localStorage.getItem(_dcSelectedKey);
          if (raw) history = JSON.parse(raw);
        } catch (e) {}

        let streamHtml = '';

        // 0. Claim Indicator Bar
        if (!isClosed) {
          if (meta.claimedBy) {
            const canUnclaim = isOwner || (user && user.username === meta.claimedBy.username);
            streamHtml += `
              <div class="dc-claim-indicator claimed">
                <div style="display:flex; align-items:center; gap:0.45rem;">
                  <span>📌 Bu destek talebi <strong>@${escapeHtml(meta.claimedBy.username)}</strong> (${escapeHtml(meta.claimedBy.role)}) tarafından üstlenildi.</span>
                  <span style="font-size:0.7rem; color:#94a3b8;">(${meta.claimedBy.time || ''})</span>
                </div>
                ${canUnclaim ? '<button type="button" class="btn-dc-action btn-dc-unclaim" id="btnDcUnclaimTicket">🔄 Talebi Bırak (Unclaim)</button>' : ''}
              </div>
            `;
          } else {
            streamHtml += `
              <div class="dc-claim-indicator unclaimed">
                <span>🟡 Bu destek talebi henüz hiçbir yetkili tarafından üstlenilmedi (Boşta).</span>
                <button type="button" class="btn-dc-action btn-dc-claim" id="btnDcClaimTicket">🙋‍♂️ Talebi Üstlen (Claim)</button>
              </div>
            `;
          }
        }

        // 1. Discord Bot Welcome Embed
        streamHtml += `
          <div class="dc-embed-box">
            <div class="dc-embed-header-row">
              <span class="dc-embed-bot-name">Syntax Ticket Bot</span>
              <span class="dc-bot-tag">BOT</span>
              <span class="dc-msg-time">Destek Sistemi</span>
            </div>
            <div class="dc-embed-title"> Destek Talebi #ticket-${meta.ticketNum}</div>
            <div class="dc-embed-desc">
              Syntax Software yetkili destek kanalına hoş geldiniz. Mesajınızı buraya yazabilir, anında yetkili yanıtı alabilirsiniz.
            </div>
            <div class="dc-embed-fields-grid">
              <div class="dc-embed-field">
                <div class="dc-field-label">Talep Sahibi</div>
                <div class="dc-field-val">@${escapeHtml(_dcSelectedUser.username)}</div>
              </div>
              <div class="dc-embed-field">
                <div class="dc-field-label">Hesap Rolü</div>
                <div class="dc-field-val">${escapeHtml(_dcSelectedUser.role || 'Müşteri')}</div>
              </div>
              <div class="dc-embed-field">
                <div class="dc-field-label">Talep Durumu</div>
                <div class="dc-field-val" style="color:${isClosed ? '#ed4245' : '#57f287'};">${isClosed ? 'Çözüldü & Kapalı' : 'Aktif & Beklemede'}</div>
              </div>
              <div class="dc-embed-field">
                <div class="dc-field-label">Kanal</div>
                <div class="dc-field-val">#ticket-${meta.ticketNum}</div>
              </div>
            </div>
          </div>
        `;

        // 2. Chat messages
        history.forEach(m => {
          if (m.sender === 'user') {
            streamHtml += `
              <div class="dc-msg-item">
                <div class="dc-msg-avatar user">${escapeHtml((_dcSelectedUser.username || 'U').slice(0, 2).toUpperCase())}</div>
                <div class="dc-msg-content">
                  <div class="dc-msg-author-row">
                    <span class="dc-author-name user">${escapeHtml(_dcSelectedUser.username)}</span>
                    <span class="dc-role-badge user">${escapeHtml(_dcSelectedUser.role || 'Müşteri')}</span>
                    <span class="dc-msg-time">${m.time || 'Bugün'}</span>
                  </div>
                  <div class="dc-msg-text">${escapeHtml(m.text)}</div>
                </div>
              </div>
            `;
          } else if (m.sender === 'staff' || m.sender === 'admin') {
            streamHtml += `
              <div class="dc-msg-item" style="background:rgba(88, 101, 242, 0.05); border-left:2px solid #5865f2;">
                <div class="dc-msg-avatar staff">STF</div>
                <div class="dc-msg-content">
                  <div class="dc-msg-author-row">
                    <span class="dc-author-name staff">${escapeHtml(user.username || 'Yetkili')}</span>
                    <span class="dc-role-badge staff">${isOwner ? 'KURUCU (OWNER)' : 'SYNTAX DESTEK'}</span>
                    <span class="dc-msg-time">${m.time || 'Bugün'}</span>
                  </div>
                  <div class="dc-msg-text">${escapeHtml(m.text)}</div>
                </div>
              </div>
            `;
          } else if (m.sender === 'system') {
            streamHtml += `
              <div class="dc-sys-msg">
                <span>${escapeHtml(m.text)}</span>
                <span class="dc-msg-time" style="margin-left:auto;">${m.time || ''}</span>
              </div>
            `;
          }
        });

        if (isClosed) {
          streamHtml += `
            <div class="dc-sys-msg" style="border-left-color:#da373c; color:#f23f43; justify-content:center; font-weight:700;">
              Bu destek talebi kapatılmıştır. Yanıt göndermek için yukarıdaki "Yeniden Aç" butonunu kullanabilirsiniz.
            </div>
          `;
        }

        msgContainer.innerHTML = streamHtml;
        msgContainer.scrollTop = msgContainer.scrollHeight;
      }

      document.getElementById('dcTicketSearchInput')?.addEventListener('input', (e) => {
        _dcTicketFilter = e.target.value;
        renderDiscordTicketList();
      });

      document.querySelectorAll('.dc-slash-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const inp = document.getElementById('dcChatReplyText');
          if (inp) {
            inp.value = chip.dataset.cmd;
            inp.focus();
          }
        });
      });

      function sendDiscordTicketMessage() {
        if (!_dcSelectedKey) {
          showToast('Lütfen önce bir destek talebi seçin.');
          return;
        }
        const inp = document.getElementById('dcChatReplyText');
        const text = inp?.value.trim();
        if (!text) {
          showToast('Lütfen gönderilecek mesajı yazın.');
          return;
        }

        let history = [];
        try {
          const raw = localStorage.getItem(_dcSelectedKey);
          if (raw) history = JSON.parse(raw);
        } catch (e) {}

        const now = new Date();
        const time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

        history.push({
          sender: 'staff',
          text: text,
          time: time
        });

        localStorage.setItem(_dcSelectedKey, JSON.stringify(history));
        localStorage.setItem('syntax_chat_admin_mode', 'true');

        if (inp) inp.value = '';
        showToast('Mesaj Discord ticket kanalına iletildi!', 'check-circle');

        // Forward staff message to Discord via Bridge
        fetch('http://127.0.0.1:5055/api/ticket/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatKey: _dcSelectedKey,
            username: isOwner ? 'Kurucu (NOXY)' : (user.username || 'Admin'),
            sender: 'staff',
            text: text
          })
        }).catch(() => {});

        // Real-time synchronization dispatch
        window.dispatchEvent(new CustomEvent('syntax_chat_updated', { detail: { key: _dcSelectedKey } }));
        window.dispatchEvent(new CustomEvent('syntax_chat_staff_replied', { detail: { key: _dcSelectedKey, text, time } }));

        renderDiscordTicketMessages();
        renderDiscordTicketList();
        if (isOwner && typeof renderDcWaitingList === 'function') renderDcWaitingList();
      }

      document.getElementById('btnDcChatSend')?.addEventListener('click', sendDiscordTicketMessage);
      document.getElementById('dcChatReplyText')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          sendDiscordTicketMessage();
        }
      });

      // WIRE CLAIM BUTTON
      msgContainer.querySelectorAll('#btnDcClaimTicket').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!_dcSelectedKey) return;
          const meta = getTicketMeta(_dcSelectedKey);
          const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          meta.claimedBy = {
            username: user.username || 'Yetkili',
            role: isOwner ? 'Kurucu' : 'Yönetici',
            time: timeStr
          };
          saveTicketMeta(_dcSelectedKey, meta);

          let history = [];
          try {
            const raw = localStorage.getItem(_dcSelectedKey);
            if (raw) history = JSON.parse(raw);
          } catch (e) {}

          history.push({
            sender: 'system',
            text: `📌 Bu destek talebi @${user.username} (${meta.claimedBy.role}) tarafından üstlenildi (Claimed).`,
            time: timeStr
          });
          localStorage.setItem(_dcSelectedKey, JSON.stringify(history));

          fetch('http://127.0.0.1:5055/api/ticket/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatKey: _dcSelectedKey,
              claimedBy: meta.claimedBy,
              isClaimed: true
            })
          }).catch(() => {});

          showToast(`Destek talebi @${user.username} tarafından üstlenildi!`, 'check-circle');
          renderDiscordTicketList();
          renderDiscordTicketMessages();
        });
      });

      // WIRE UNCLAIM BUTTON
      msgContainer.querySelectorAll('#btnDcUnclaimTicket').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!_dcSelectedKey) return;
          const meta = getTicketMeta(_dcSelectedKey);
          const prevUser = meta.claimedBy ? meta.claimedBy.username : 'Yetkili';
          meta.claimedBy = null;
          saveTicketMeta(_dcSelectedKey, meta);

          let history = [];
          try {
            const raw = localStorage.getItem(_dcSelectedKey);
            if (raw) history = JSON.parse(raw);
          } catch (e) {}

          const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          history.push({
            sender: 'system',
            text: `🔄 @${prevUser} destek talebini serbest bıraktı (Unclaimed).`,
            time: timeStr
          });
          localStorage.setItem(_dcSelectedKey, JSON.stringify(history));

          fetch('http://127.0.0.1:5055/api/ticket/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatKey: _dcSelectedKey,
              claimedBy: null,
              isClaimed: false
            })
          }).catch(() => {});

          showToast('Destek talebi serbest bırakıldı.', 'info');
          renderDiscordTicketList();
          renderDiscordTicketMessages();
        });
      });

      // WIRE DOWNLOAD TRANSCRIPT (.HTML)
      document.getElementById('btnDcDownloadTranscript')?.addEventListener('click', () => {
        if (!_dcSelectedKey || !_dcSelectedUser) return;
        const meta = getTicketMeta(_dcSelectedKey);
        let history = [];
        try {
          const raw = localStorage.getItem(_dcSelectedKey);
          if (raw) history = JSON.parse(raw);
        } catch (e) {}

        const htmlDoc = generateTicketTranscriptHtml(_dcSelectedKey, _dcSelectedUser, meta, history);
        const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ch = meta.channelName || generateTicketChannelName(meta.category, _dcSelectedUser.username);
        a.download = `transcript-${ch}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Transkript HTML formatında indirildi!', 'download');
      });

      document.getElementById('btnDcCloseTicket')?.addEventListener('click', () => {
        if (!_dcSelectedKey) return;
        const meta = getTicketMeta(_dcSelectedKey);
        meta.status = 'closed';
        meta.closedAt = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        saveTicketMeta(_dcSelectedKey, meta);

        let history = [];
        try {
          const raw = localStorage.getItem(_dcSelectedKey);
          if (raw) history = JSON.parse(raw);
        } catch (e) {}

        const now = new Date();
        const time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        history.push({
          sender: 'system',
          text: `Destek talebi yetkili (${user.username || 'Admin'}) tarafından kapatıldı ve arşivlendi.`,
          time: time
        });
        localStorage.setItem(_dcSelectedKey, JSON.stringify(history));

        // Generate and archive transcript
        const transcriptHtml = generateTicketTranscriptHtml(_dcSelectedKey, _dcSelectedUser || { username: 'musteri' }, meta, history);
        localStorage.setItem('syntax_transcript_archive_' + _dcSelectedKey, transcriptHtml);

        // Notify Discord Bridge
        fetch('http://127.0.0.1:5055/api/ticket/close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatKey: _dcSelectedKey,
            closedBy: user.username || 'Admin',
            transcriptText: `Ticket #${meta.ticketNum} kapatıldı.`
          })
        }).catch(() => {});

        window.dispatchEvent(new CustomEvent('syntax_chat_updated', { detail: { key: _dcSelectedKey } }));

        showToast('Destek talebi kapatıldı ve transkript arşivlendi.', 'alert-circle');
        renderDiscordTicketList();
        renderDiscordTicketMessages();
        if (isOwner && typeof renderDcWaitingList === 'function') renderDcWaitingList();
      });

      document.getElementById('btnDcReopenTicket')?.addEventListener('click', () => {
        if (!_dcSelectedKey) return;
        const meta = getTicketMeta(_dcSelectedKey);
        meta.status = 'open';
        saveTicketMeta(_dcSelectedKey, meta);

        let history = [];
        try {
          const raw = localStorage.getItem(_dcSelectedKey);
          if (raw) history = JSON.parse(raw);
        } catch (e) {}

        const now = new Date();
        const time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        history.push({
          sender: 'system',
          text: `Destek talebi yetkili (${user.username || 'Admin'}) tarafından yeniden açıldı.`,
          time: time
        });
        localStorage.setItem(_dcSelectedKey, JSON.stringify(history));

        window.dispatchEvent(new CustomEvent('syntax_chat_updated', { detail: { key: _dcSelectedKey } }));

        showToast('Destek talebi yeniden açıldı.', 'check-circle');
        renderDiscordTicketList();
        renderDiscordTicketMessages();
        if (isOwner && typeof renderDcWaitingList === 'function') renderDcWaitingList();
      });

      document.getElementById('btnDcCopyTranscript')?.addEventListener('click', () => {
        if (!_dcSelectedKey || !_dcSelectedUser) return;
        let history = [];
        try {
          const raw = localStorage.getItem(_dcSelectedKey);
          if (raw) history = JSON.parse(raw);
        } catch (e) {}

        const meta = getTicketMeta(_dcSelectedKey);
        let transcript = `=========================================\n`;
        transcript += `SYNTAX SOFTWARE DISCORD TİCKET LOGLARI\n`;
        transcript += `Kanal: #ticket-${meta.ticketNum}-${_dcSelectedUser.username}\n`;
        transcript += `Kullanıcı: ${_dcSelectedUser.label} (${_dcSelectedUser.email})\n`;
        transcript += `Tarih: ${new Date().toLocaleString('tr-TR')}\n`;
        transcript += `Durum: ${meta.status === 'closed' ? 'KAPALI' : 'AÇIK'}\n`;
        transcript += `=========================================\n\n`;

        history.forEach(m => {
          transcript += `[${m.time || '--:--'}] ${(m.sender || 'USER').toUpperCase()}: ${m.text}\n`;
        });

        // Clipboard copy with non-HTTPS execCommand fallback
        const copyToClipboardFallback = (str) => {
          try {
            const ta = document.createElement('textarea');
            ta.value = str;
            ta.style.position = 'fixed';
            ta.style.left = '-999999px';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            return true;
          } catch (e) {
            return false;
          }
        };

        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(transcript).catch(() => copyToClipboardFallback(transcript));
        } else {
          copyToClipboardFallback(transcript);
        }

        // Automatic .txt file download
        try {
          const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ticket-${meta.ticketNum}-${_dcSelectedUser.username}-transkript.txt`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (e) {}

        showToast('Ticket transkripti panoya kopyalandı ve .txt dosyası indirildi!', 'check-circle');
      });

      document.getElementById('btnDcDeleteTicket')?.addEventListener('click', () => {
        if (!_dcSelectedKey || !_dcSelectedUser) return;
        if (confirm(`${_dcSelectedUser.label} kullanıcısına ait bu destek ticket'ını ve geçmişini tamamen silmek istediğinize emin misiniz?`)) {
          localStorage.removeItem(_dcSelectedKey);
          localStorage.removeItem('syntax_ticket_meta_' + _dcSelectedKey);
          showToast('Ticket ve sohbet geçmişi silindi.', 'alert-circle');

          window.dispatchEvent(new CustomEvent('syntax_chat_updated', { detail: { key: _dcSelectedKey, deleted: true } }));

          const remaining = getDiscordTicketsList();
          if (remaining.length > 0) {
            _dcSelectedKey = remaining[0].key;
            _dcSelectedUser = remaining[0];
          } else {
            _dcSelectedKey = null;
            _dcSelectedUser = null;
          }
          renderDiscordTicketList();
          renderDiscordTicketMessages();
          if (isOwner && typeof renderDcWaitingList === 'function') renderDcWaitingList();
        }
      });

      document.getElementById('btnOpenLiveChatFromAdmin')?.addEventListener('click', () => {
        if (typeof closeModal === 'function') closeModal();
        const chatBtn = document.querySelector('.float-btn-chat') || document.getElementById('crispChatTrigger');
        if (chatBtn) {
          chatBtn.click();
        } else {
          const widget = document.getElementById('crispChatWidget');
          if (widget) widget.classList.add('active');
        }
      });

      // Real-time synchronization listeners for Discord Ticket Desk
      const syncDiscordDeskHandler = () => {
        renderDiscordTicketList();
        if (_dcSelectedKey) renderDiscordTicketMessages();
        if (isOwner && typeof renderDcWaitingList === 'function') renderDcWaitingList();
      };
      window.addEventListener('syntax_chat_updated', syncDiscordDeskHandler);
      window.addEventListener('storage', (e) => {
        if (e.key && (e.key.startsWith('syntax_chat_') || e.key.startsWith('syntax_ticket_meta_'))) {
          syncDiscordDeskHandler();
        }
      });

      // --- ADMIN RESELLER PROVISIONING SYSTEM ---
      function renderAdminResellers() {
        const c = document.getElementById('adminResellersListContainer');
        if (!c) return;
        const allUsers = getUsers();
        const resellers = allUsers.filter(u => u.role === 'reseller');

        if (resellers.length === 0) {
          c.innerHTML = '<div style="font-size:0.8rem; color:#9ca3af; padding:0.5rem;">Sistemde kayıtlı yetkili bayi bulunmamaktadır.</div>';
          return;
        }

        c.innerHTML = resellers.map(r => `
          <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:0.7rem 0.8rem; display:flex; flex-direction:column; gap:0.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
              <div>
                <div style="font-weight:700; color:#fff; font-size:0.85rem;">${escapeHtml(r.username)} <span style="color:#93c5fd; font-size:0.75rem;">(${escapeHtml(r.company || 'Yetkili Bayi')})</span></div>
                <div style="font-size:0.74rem; color:#9ca3af; margin-top:2px;">Şifre: <code style="color:#a855f7;">${escapeHtml(r.password)}</code> · Kota: <strong style="color:#3b82f6;">${r.quota || 50}</strong> · Bakiye: <strong style="color:#10b981;" class="bayi-balance-display-${escapeHtml(r.username)}">${r.balance || '₺5.000'}</strong></div>
              </div>
              <div style="display:flex; gap:0.4rem; flex-shrink:0;">
                <button class="btn-copy-chip btn-copy-reseller-creds" data-creds="SYNTAX SOFTWARE YETKİLİ BAYİ HESABINIZ HAZIR!%0AKullanıcı Adı: ${r.username}%0AŞifre: ${r.password}%0AFirma / Marka: ${r.company}%0ABakiye: ${r.balance || '₺5.000'}%0AGiriş: https://syntaxsoftware.com (Bayi Girişi sekmesinden)" style="font-size:0.72rem;">Kopyala</button>
                ${isOwner ? `<button class="btn-copy-chip btn-delete-reseller" data-username="${escapeHtml(r.username)}" style="background:rgba(239,68,68,0.2); color:#f87171; border-color:rgba(239,68,68,0.35); font-size:0.72rem;">Sil</button>` : ''}
              </div>
            </div>
            ${isOwner ? `
            <div style="display:flex; align-items:center; gap:0.5rem; padding-top:0.3rem; border-top:1px solid rgba(255,255,255,0.06);">
              <label style="font-size:0.72rem; color:#9ca3af; white-space:nowrap;">Bakiye Güncelle (TL):</label>
              <input type="text" class="checkout-input-field bayi-balance-input" data-username="${escapeHtml(r.username)}" value="${escapeHtml(r.balance || '₺5.000')}" style="padding:0.3rem 0.5rem; font-size:0.78rem; flex:1; min-width:0;">
              <button class="btn-copy-chip btn-save-bayi-balance" data-username="${escapeHtml(r.username)}" style="font-size:0.72rem; background:rgba(16,185,129,0.2); color:#6ee7b7; border-color:rgba(16,185,129,0.35); white-space:nowrap;">Kaydet</button>
            </div>
            ` : ''}
          </div>
        `).join('');

        c.querySelectorAll('.btn-copy-reseller-creds').forEach(btn => {
          btn.addEventListener('click', () => {
            const raw = decodeURIComponent(btn.dataset.creds);
            navigator.clipboard.writeText(raw).then(() => {
              showToast('Bayi bilgileri kopyalandı! WhatsApp / Discord üzerinden gönderebilirsiniz.', 'check-circle');
            });
          });
        });

        if (isOwner) {
          c.querySelectorAll('.btn-delete-reseller').forEach(btn => {
            btn.addEventListener('click', () => {
              const targetU = btn.dataset.username;
              if (confirm(`${targetU} adlı bayiyi sistemden silmek istediğinize emin misiniz?`)) {
                let usersList = getUsers();
                usersList = usersList.filter(u => u.username.toLowerCase() !== targetU.toLowerCase());
                localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(usersList));
                showToast(`${targetU} adlı bayi silindi.`, 'alert-circle');
                renderAdminResellers();
                renderAllUsersList('');
              }
            });
          });

          c.querySelectorAll('.btn-save-bayi-balance').forEach(btn => {
            btn.addEventListener('click', () => {
              const targetU = btn.dataset.username;
              const inp = c.querySelector(`.bayi-balance-input[data-username="${targetU}"]`);
              if (!inp) return;
              const newBalance = inp.value.trim();
              if (!newBalance) { showToast('Bakiye boş olamaz.'); return; }
              let usersList = getUsers();
              const target = usersList.find(u => u.username.toLowerCase() === targetU.toLowerCase());
              if (target) {
                target.balance = newBalance;
                localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(usersList));
                const displayEl = c.querySelector('.bayi-balance-display-' + targetU);
                if (displayEl) displayEl.textContent = newBalance;
                showToast(`${targetU} bakiyesi ${newBalance} olarak güncellendi!`, 'check-circle');
                renderAllUsersList('');
              }
            });
          });
        }
      }

      // --- OWNER EXCLUSIVE ADMIN MANAGEMENT LOGIC ---
      function renderOwnerAdmins() {
        const c = document.getElementById('ownerAdminsListContainer');
        if (!c) return;
        const allUsers = getUsers();
        const admins = allUsers.filter(u => u.role === 'admin' && u.username.toLowerCase() !== 'noxy');

        if (admins.length === 0) {
          c.innerHTML = '<div style="font-size:0.8rem; color:#9ca3af; padding:0.5rem;">Tanımlı admin bulunmamaktadır. (Sadece Kurucu aktif)</div>';
          return;
        }

        c.innerHTML = admins.map(a => `
          <div style="background:rgba(0,0,0,0.35); border:1px solid rgba(245,158,11,0.25); border-radius:8px; padding:0.6rem 0.8rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
            <div>
              <div style="font-weight:700; color:#fff; font-size:0.85rem;">${escapeHtml(a.username)} <span style="color:#fde68a; font-size:0.75rem;">(${escapeHtml(a.rank || 'Admin')})</span></div>
              <div style="font-size:0.74rem; color:#9ca3af; margin-top:2px;">Şifre: <code style="color:#f59e0b;">${escapeHtml(a.password)}</code> · E-posta: ${escapeHtml(a.email)}</div>
            </div>
            <div style="display:flex; gap:0.4rem; flex-shrink:0;">
              <button class="btn-copy-chip btn-copy-admin-creds" data-creds="SYNTAX ADMIN GİRİŞ BİLGİLERİNİZ%0AKullanıcı Adı: ${a.username}%0AŞifre: ${a.password}%0AGiriş: https://syntaxsoftware.com (Yönetici Girişi)" style="font-size:0.72rem;">Bilgileri Kopyala</button>
              <button class="btn-copy-chip btn-delete-admin" data-username="${escapeHtml(a.username)}" style="background:rgba(239,68,68,0.2); color:#f87171; border-color:rgba(239,68,68,0.35); font-size:0.72rem;">Yetkiyi Sil</button>
            </div>
          </div>
        `).join('');

        c.querySelectorAll('.btn-copy-admin-creds').forEach(btn => {
          btn.addEventListener('click', () => {
            const raw = decodeURIComponent(btn.dataset.creds);
            navigator.clipboard.writeText(raw).then(() => {
              showToast('Admin bilgileri kopyalandı!', 'check-circle');
            });
          });
        });

        c.querySelectorAll('.btn-delete-admin').forEach(btn => {
          btn.addEventListener('click', () => {
            const targetU = btn.dataset.username;
            if (confirm(`${targetU} kullanıcısının adminlik yetkisini silmek istediğinize emin misiniz?`)) {
              let usersList = getUsers();
              usersList = usersList.filter(u => u.username.toLowerCase() !== targetU.toLowerCase());
              localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(usersList));
              showToast(`${targetU} adminlikten çıkarıldı.`, 'alert-circle');
              renderOwnerAdmins();
              renderAllUsersList('');
            }
          });
        });
      }

      // Initial execution
      if (isOwner) {
        renderWebWaitingList();
        renderDcWaitingList();
        renderAllUsersList();
        renderAllOrdersList();
        renderOwnerAdmins();
        renderAdminResellers();

        document.getElementById('btnOwnerCreateAdmin')?.addEventListener('click', () => {
          const u = document.getElementById('ownerNewAdminUser')?.value.trim();
          const p = document.getElementById('ownerNewAdminPass')?.value.trim();
          const rank = document.getElementById('ownerNewAdminRank')?.value.trim() || 'Destek ve Sipariş Yöneticisi';
          const email = document.getElementById('ownerNewAdminEmail')?.value.trim() || `${u}@admin.syntax`;

          if (!u || !p) {
            showToast('Lütfen Admin Kullanıcı Adı ve Şifresini giriniz.');
            return;
          }

          let allUsers = getUsers();
          if (allUsers.find(x => x.username.toLowerCase() === u.toLowerCase())) {
            showToast('Bu kullanıcı adı zaten kullanımda!');
            return;
          }

          const newAdmin = {
            username: u,
            email: email,
            password: p,
            role: 'admin',
            rank: rank,
            createdAt: new Date().toISOString().split('T')[0]
          };

          allUsers.push(newAdmin);
          localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(allUsers));
          showToast(`${u} kullanıcısı başarıyla Admin olarak yetkilendirildi!`, 'sparkles');

          const uInp = document.getElementById('ownerNewAdminUser');
          const pInp = document.getElementById('ownerNewAdminPass');
          if (uInp) uInp.value = '';
          if (pInp) pInp.value = '';
          renderOwnerAdmins();
          renderAllUsersList('');
        });
      } else {
        renderAllOrdersList();
        renderDiscordTicketList();
        renderAdminResellers();
      }

      document.getElementById('btnAdminCreateReseller')?.addEventListener('click', () => {
        const u = document.getElementById('adminNewResellerUser')?.value.trim();
        const p = document.getElementById('adminNewResellerPass')?.value.trim();
        const comp = document.getElementById('adminNewResellerCompany')?.value.trim() || 'Syntax Yetkili Bayi';
        const q = parseInt(document.getElementById('adminNewResellerQuota')?.value) || 50;
        const b = document.getElementById('adminNewResellerBalance')?.value.trim() || '₺5.000';
        const email = document.getElementById('adminNewResellerEmail')?.value.trim() || `${u}@reseller.syntax`;

        if (!u || !p) {
          showToast('Lütfen Bayi Kullanıcı Adı ve Şifre alanlarını doldurunuz.');
          return;
        }

        let allUsers = getUsers();
        if (allUsers.find(x => x.username.toLowerCase() === u.toLowerCase())) {
          showToast('Bu kullanıcı adı zaten sistemde kayıtlı!');
          return;
        }

        const newReseller = {
          username: u,
          email: email,
          password: p,
          role: 'reseller',
          rank: 'Yetkili Bayi (Reseller)',
          quota: q,
          maxQuota: q,
          balance: b,
          company: comp,
          createdAt: new Date().toISOString().split('T')[0],
          licenses: []
        };

        allUsers.push(newReseller);
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(allUsers));
        showToast(`${u} adına yetkili bayi hesabı başarıyla tanımlandı!`, 'check-circle');

        const userInp = document.getElementById('adminNewResellerUser');
        const passInp = document.getElementById('adminNewResellerPass');
        if (userInp) userInp.value = '';
        if (passInp) passInp.value = '';
        renderAdminResellers();
        if (isOwner) renderAllUsersList('');
      });

    } else if (user.role === 'reseller') {
      brandTitle.textContent = 'Syntax Reseller Portalı';
      brandSub.textContent = 'KEY ÇIKARMA TALEBİ & BAYİ LİSANS BANKASI';

      const keys = getResellerKeys();
      dash.innerHTML = `
        <div class="reseller-header-logo-card">
          <img src="images/bayi-logo.webp" alt="Bayi Logo" class="reseller-logo-img">
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="font-size:1.1rem; font-weight:800; color:#fff;">${escapeHtml(user.username)}</div>
              <button type="button" class="btn-panel-logout" id="btnLogoutInside" style="padding:0.35rem 0.75rem; font-size:0.75rem;">Çıkış Yap</button>
            </div>
            <div style="font-size:0.78rem; color:#93c5fd;">Şirket / Marka: <strong>${escapeHtml(user.company || 'Syntax Bayisi')}</strong></div>
          </div>
        </div>

        <div class="user-panel-stats" style="margin-bottom:1.25rem;">
          <div class="panel-stat-tile">
            <div class="panel-stat-val" style="color:#3b82f6;" id="resellerQuotaDisplay">${user.quota || 42} / ${user.maxQuota || 50}</div>
            <div class="panel-stat-label">Kalan Key Kotası</div>
          </div>
          <div class="panel-stat-tile">
            <div class="panel-stat-val" style="color:#10b981;">${user.balance || '₺4.500'}</div>
            <div class="panel-stat-label">Bayi Bakiyesi</div>
          </div>
          <div class="panel-stat-tile">
            <div class="panel-stat-val" style="color:#a855f7;" id="resellerKeysCount">${keys.length}</div>
            <div class="panel-stat-label">Üretilen Lisans</div>
          </div>
        </div>

        <!-- KEY ÇIKARMA TALEBİ FORMU -->
        <div class="reseller-key-request-box">
          <div style="font-size:0.9rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:0.4rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            <span>Yeni Key Çıkarma Talebi Oluştur</span>
          </div>

          <div class="reseller-key-form-grid">
            <div class="checkout-input-group">
              <label class="checkout-input-label">Ürün Seçimi</label>
              <select class="reseller-select-field" id="resellerProductSelect">
                <option value="CS Kernel">CS Kernel</option>
                <option value="Temp spoofer">Temp spoofer</option>
                <option value="Perm spoofer">Perm spoofer</option>
                <option value="Valorant External">Valorant External</option>
                <option value="Valorant Internal">Valorant Internal</option>
                <option value="Cheat Emu">Cheat Emu</option>
                <option value="Vanguard Emulator">Vanguard Emulator</option>
              </select>
            </div>

            <div class="checkout-input-group">
              <label class="checkout-input-label">Lisans Süresi</label>
              <select class="reseller-select-field" id="resellerDurationSelect">
                <option value="1 Günlük">1 Günlük</option>
                <option value="7 Günlük">7 Günlük</option>
                <option value="30 Günlük" selected>30 Günlük</option>
                <option value="Sınırsız (Lifetime)">Sınırsız (Lifetime)</option>
              </select>
            </div>
          </div>

          <div class="checkout-input-group">
            <label class="checkout-input-label">Müşteri Notu / Referans</label>
            <input type="text" class="checkout-input-field" id="resellerCustomerNote" placeholder="Örn: Müşteri #152 - Discord: Ahmet">
          </div>

          <button class="btn-cart-checkout-proceed" id="btnResellerGenerateKey" style="margin-top:0.4rem; background:linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Key Çıkarma Talebi Oluştur ve Lisansı Al</span>
          </button>
        </div>

        <!-- ÜRETİLEN LİSANSLARIM LİSTESİ -->
        <div>
          <div style="font-size:0.88rem; font-weight:800; color:#fff; margin-bottom:0.6rem;">Üretilen Lisanslarım & Anahtar Bankası</div>
          <div class="reseller-keys-history-list" id="resellerKeysContainer"></div>
        </div>
      `;

      function renderResellerKeys() {
        const list = document.getElementById('resellerKeysContainer');
        if (!list) return;
        const currentKeys = getResellerKeys();

        if (currentKeys.length === 0) {
          list.innerHTML = `<div style="text-align:center; padding:1.5rem; color:#9ca3af; font-size:0.82rem;">Henüz üretilen bir lisansınız bulunmuyor.</div>`;
          return;
        }

        list.innerHTML = currentKeys.map(k => `
          <div class="reseller-key-item">
            <div>
              <div style="font-size:0.85rem; font-weight:700; color:#fff;">${escapeHtml(k.product)} <span style="font-size:0.72rem; color:#a855f7;">(${escapeHtml(k.duration)})</span></div>
              <div style="font-size:0.75rem; color:#9ca3af;">${escapeHtml(k.note || 'Bayi Lisansı')} · ${escapeHtml(k.date)}</div>
              <div class="reseller-key-code-val">${escapeHtml(k.key)}</div>
            </div>
            <button class="btn-copy-chip btn-copy-reseller-key" data-key="${escapeHtml(k.key)}">Kopyala</button>
          </div>
        `).join('');

        list.querySelectorAll('.btn-copy-reseller-key').forEach(b => {
          b.addEventListener('click', () => {
            navigator.clipboard.writeText(b.dataset.key);
            showToast('Bayi lisans anahtarı panoya kopyalandı!');
          });
        });
      }

      renderResellerKeys();

      // Handle Key Generation
      document.getElementById('btnResellerGenerateKey')?.addEventListener('click', () => {
        const prod = document.getElementById('resellerProductSelect')?.value;
        const dur = document.getElementById('resellerDurationSelect')?.value;
        const note = document.getElementById('resellerCustomerNote')?.value.trim();

        if ((user.quota || 0) <= 0) {
          showToast('Lisans kotanız tükenmiştir. Lütfen bakiye yükleyin.');
          return;
        }

        // Deduct quota
        user.quota = (user.quota || 42) - 1;
        setCurrentUser(user);

        // Generate key
        const newKey = 'SYNTAX-RES-' + Math.random().toString(36).substring(2,6).toUpperCase() + '-' + Math.random().toString(36).substring(2,6).toUpperCase() + '-2026';
        let currentKeys = getResellerKeys();
        currentKeys.unshift({
          product: prod,
          key: newKey,
          duration: dur,
          note: note || 'Müşteri #' + Math.floor(100 + Math.random() * 900),
          date: 'Bugün ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          status: 'AKTİF'
        });
        localStorage.setItem(STORAGE_RESELLER_KEYS, JSON.stringify(currentKeys));

        document.getElementById('resellerQuotaDisplay').textContent = `${user.quota} / ${user.maxQuota || 50}`;
        document.getElementById('resellerKeysCount').textContent = currentKeys.length;
        document.getElementById('resellerCustomerNote').value = '';

        showToast(`${prod} için lisans anahtarı üretildi: ${newKey}`, 'sparkles');
        renderResellerKeys();
      });

    } else {
      // Regular customer dashboard
      brandTitle.textContent = 'Syntax Müşteri Paneli';
      brandSub.textContent = 'LİSANS MERKEZİ';

      dash.innerHTML = `
        <div class="user-panel-card">
          <div class="user-panel-header">
            <div class="user-panel-avatar">${user.username.slice(0, 2).toUpperCase()}</div>
            <div class="user-panel-info">
              <div class="user-panel-name">
                <span>${escapeHtml(user.fullName || user.username)}</span>
                <span class="user-badge-tag">${escapeHtml(user.rank || 'VIP')}</span>
              </div>
              <div class="user-panel-email">${user.fullName ? ('@' + escapeHtml(user.username) + ' · ') : ''}${escapeHtml(user.email)}${user.phone ? (' ·  ' + escapeHtml(user.phone)) : ''}</div>
            </div>
            <button type="button" class="btn-panel-logout" id="btnLogoutInside" style="padding:0.35rem 0.75rem; font-size:0.75rem;">Çıkış Yap</button>
          </div>

          <div class="user-panel-stats">
            <div class="panel-stat-tile">
              <div class="panel-stat-val">${(user.licenses || []).length}</div>
              <div class="panel-stat-label">Aktif Lisans</div>
            </div>
            <div class="panel-stat-tile">
              <div class="panel-stat-val" style="color:#10b981;">Eşleşti</div>
              <div class="panel-stat-label">HWID Durumu</div>
            </div>
            <div class="panel-stat-tile">
              <div class="panel-stat-val" style="color:#a855f7;">Anında</div>
              <div class="panel-stat-label">Teslimat</div>
            </div>
          </div>

          <div class="panel-section-title">
            <span>Aktif Lisanslarım</span>
            <span style="font-size: 0.72rem; color: #10b981; font-weight: 600;">● Sistem Aktif</span>
          </div>

          <div class="panel-licenses-list">
            ${(user.licenses || []).map(lic => `
              <div class="panel-license-card">
                <div class="license-card-top">
                  <span class="license-product-title">${escapeHtml(lic.product)}</span>
                  <span class="license-status-badge">● ${escapeHtml(lic.status)}</span>
                </div>
                <div class="license-key-box">
                  <span>${escapeHtml(lic.key)}</span>
                  <button type="button" class="btn-copy-key" onclick="navigator.clipboard.writeText('${lic.key}');showToast('Anahtar kopyalandı!');">
                    <span>Kopyala</span>
                  </button>
                </div>
                <div class="license-meta-row">
                  <span>Kalan Süre: <strong>${lic.daysLeft || 30} Gün</strong></span>
                  <a href="#" class="btn-download-loader" onclick="showToast(' Syntax Loader indiriliyor...','download');return false;">
                    <span>Loader İndir</span>
                  </a>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Bind logout button
    document.getElementById('btnLogoutInside')?.addEventListener('click', () => {
      setCurrentUser(null);
      if (typeof closeModal === 'function') closeModal();
      showToast('Kurucu oturumu başarıyla kapatıldı.');
      if (window.location.pathname.endsWith('kurucu.html')) {
        setTimeout(() => { window.location.href = 'index.html'; }, 300);
      } else {
        updateNavbarState();
      }
    });
  }

  // --- 5. NAVBAR STATE UPDATE ---
  function updateNavbarState() {
    const user = getCurrentUser();
    const panelBtns = document.querySelectorAll('.btn-panel-nav, .btn-user-pill-nav');

    panelBtns.forEach(btn => {
      if (user) {
        btn.className = 'btn-user-pill-nav';
        btn.setAttribute('title', 'Kontrol Panelini Aç');
        btn.innerHTML = `
          <div class="user-avatar-sm">${user.username.slice(0, 2).toUpperCase()}</div>
          <span>${escapeHtml(user.username)}</span>
          <span class="user-badge-tag">${escapeHtml(user.role === 'owner' ? 'OWNER' : (user.role === 'admin' ? 'YÖNETİCİ' : (user.role === 'reseller' ? 'BAYİ' : 'VIP')))}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
        `;
        btn.onclick = (e) => {
          e.preventDefault();
          openAuthModal();
        };
      } else {
        btn.className = 'btn-panel-nav';
        btn.setAttribute('title', 'Panel / Giriş Yap');
        btn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
          <span data-i18n="panel_login">Panel / Giriş</span>
        `;
        btn.onclick = (e) => {
          e.preventDefault();
          openAuthModal('user');
        };
      }
    });

    // Secret Owner Channel Visibility Toggle (ONLY VISIBLE TO OWNER NOXY AFTER LOGIN)
    const isOwner = !!(user && (user.role === 'owner' || (user.username && user.username.toUpperCase() === 'NOXY')));
    const navActions = document.querySelector('.nav-actions');
    const navPanelBtn = document.getElementById('navPanelBtn') || document.querySelector('.btn-user-pill-nav');
    let secretNavBtn = document.getElementById('navOwnerSecretLink');
    const navLinks = document.querySelector('.nav-links');
    let ownerNavTab = document.getElementById('navLinkOwnerTab');
    const isKurucuPage = window.location.pathname.endsWith('kurucu.html');

    if (isOwner) {
      // 1. Primary Navbar Tab (SEKME)
      if (!ownerNavTab && navLinks) {
        ownerNavTab = document.createElement('a');
        ownerNavTab.href = 'kurucu.html';
        ownerNavTab.id = 'navLinkOwnerTab';
        ownerNavTab.className = 'nav-link nav-link-owner-tab' + (isKurucuPage ? ' active' : '');
        ownerNavTab.title = 'Kurucu Yönetim Merkezi (Tam Sekme)';
        ownerNavTab.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <span style="color:#fbbf24; font-weight:800;">Kurucu Paneli</span>
        `;
        navLinks.appendChild(ownerNavTab);
      } else if (ownerNavTab) {
        ownerNavTab.style.display = 'inline-flex';
        if (isKurucuPage) ownerNavTab.classList.add('active');
      }

      // 2. Mobile Drawer Tab
      const mobDrawer = document.querySelector('.mobile-drawer');
      let mobOwnerTab = document.getElementById('mobOwnerNavTab');
      if (!mobOwnerTab && mobDrawer) {
        mobOwnerTab = document.createElement('a');
        mobOwnerTab.href = 'kurucu.html';
        mobOwnerTab.id = 'mobOwnerNavTab';
        mobOwnerTab.className = 'nav-link nav-link-owner-tab' + (isKurucuPage ? ' active' : '');
        mobOwnerTab.style.margin = '0.5rem 0';
        mobOwnerTab.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <span style="color:#fbbf24; font-weight:800;">Kurucu Paneli (Sekme)</span>
        `;
        mobDrawer.appendChild(mobOwnerTab);
      } else if (mobOwnerTab) {
        mobOwnerTab.style.display = 'inline-flex';
      }

      // 3. Quick Action Button in nav-actions
      if (!secretNavBtn) {
        secretNavBtn = document.createElement('a');
        secretNavBtn.href = 'kurucu.html';
        secretNavBtn.id = 'navOwnerSecretLink';
        secretNavBtn.className = 'nav-link-owner-secret owner-only-secret owner-active';
        secretNavBtn.title = 'Kurucu Yönetim Merkezi (Tam Sekme)';
        secretNavBtn.innerHTML = `
          <span class="owner-secret-glow-dot"></span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <span>Owner Sekmesi</span>
        `;
        if (navPanelBtn && navPanelBtn.parentNode) {
          navPanelBtn.parentNode.insertBefore(secretNavBtn, navPanelBtn);
        } else if (navActions) {
          navActions.appendChild(secretNavBtn);
        }
      } else {
        secretNavBtn.style.display = 'inline-flex';
        secretNavBtn.classList.add('owner-active');
        secretNavBtn.href = 'kurucu.html';
      }

      document.querySelectorAll('.owner-only-secret').forEach(el => {
        el.classList.add('owner-active');
        el.style.display = 'inline-flex';
      });
      const crispOwnerBtn = document.getElementById('crispOwnerSecretBtn');
      if (crispOwnerBtn) crispOwnerBtn.style.display = 'inline-flex';

      // Initialize kurucu direct page if on kurucu.html
      if (typeof initKurucuDirectPage === 'function') {
        initKurucuDirectPage();
      }
    } else {
      if (ownerNavTab && !isKurucuPage) {
        ownerNavTab.remove();
      } else if (ownerNavTab && isKurucuPage) {
        ownerNavTab.style.display = 'none';
      }
      const mobOwnerTab = document.getElementById('mobOwnerNavTab');
      if (mobOwnerTab) mobOwnerTab.remove();
      if (secretNavBtn) secretNavBtn.remove();
      const mobSecretBtn = document.getElementById('mobOwnerSecretLink');
      if (mobSecretBtn) mobSecretBtn.remove();
      document.querySelectorAll('.owner-only-secret').forEach(el => {
        el.classList.remove('owner-active');
        el.style.display = 'none';
      });
      const crispOwnerBtn = document.getElementById('crispOwnerSecretBtn');
      if (crispOwnerBtn) crispOwnerBtn.style.display = 'none';
      const openModal = document.getElementById('syntaxOwnerSecretModal');
      if (openModal) openModal.remove();

      // If on kurucu page but not owner, trigger guard
      if (typeof initKurucuDirectPage === 'function') {
        initKurucuDirectPage();
      }
    }
  }

  // --- SECRET OWNER CHANNEL MODAL (TAM KURUCU YÖNETİM MERKEZİ) ---
  let _secActiveTab = 'orders';
  let _secSelectedTicketKey = null;

  function openOwnerSecretModal() {
    const user = getCurrentUser();
    if (!user || (user.role !== 'owner' && (!user.username || user.username.toUpperCase() !== 'NOXY'))) {
      if (typeof showToast === 'function') {
        showToast('YETKİSİZ ERİŞİM: Bu kanal yalnızca Kurucu (NOXY) içindir!', 'alert-triangle');
      }
      return;
    }

    let modal = document.getElementById('syntaxOwnerSecretModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'syntaxOwnerSecretModal';
      modal.className = 'owner-secret-backdrop';
      document.body.appendChild(modal);
    }

    const allOrders = getOrders();
    const pendingOrders = allOrders.filter(o => o.status === 'KEY BEKLİYOR' || o.status === 'BEKLEMEDE' || !o.licenseKey);
    const allUsers = getUsers();
    const tickets = typeof getDiscordTicketsList === 'function' ? getDiscordTicketsList() : [];
    const openTickets = tickets.filter(t => t.meta && t.meta.status !== 'closed');
    const resellerKeys = typeof getResellerKeys === 'function' ? getResellerKeys() : [];

    modal.innerHTML = `
      <div class="owner-secret-dialog">
        <!-- Header -->
        <div class="owner-secret-header">
          <div class="owner-secret-title-box">
            <span class="owner-secret-glow-dot"></span>
            <div>
              <div style="font-size:1.1rem; font-weight:900; color:#fbbf24; display:flex; align-items:center; gap:0.5rem; letter-spacing:0.02em;">
                <span>👑 KURUCU YÖNETİM MERKEZİ (NOXY ALL-IN-ONE HQ)</span>
              </div>
              <div style="font-size:0.75rem; color:#9ca3af; margin-top:2px;">
                Tüm Sunucu, Web, Bot, Bilet, Kullanıcı & Lisans Yönetimi — Yalnızca Kurucu NOXY Hesabına Açıktır
              </div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <button type="button" class="btn-copy-chip" id="btnRefreshOwnerModal" style="background:rgba(59,130,246,0.15); color:#60a5fa; border-color:rgba(59,130,246,0.3); padding:0.35rem 0.65rem; font-size:0.75rem; cursor:pointer;" title="Verileri Yenile">
              🔄 Yenile
            </button>
            <button type="button" class="btn-copy-chip" id="btnLogoutOwnerSecretModal" style="background:rgba(239,68,68,0.2); color:#f87171; border-color:rgba(239,68,68,0.35); padding:0.35rem 0.75rem; font-size:0.75rem; cursor:pointer;" title="Kurucu Oturumunu Kapat">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="vertical-align:middle; margin-right:3px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              <span>Çıkış Yap</span>
            </button>
            <button type="button" class="modal-close-btn" id="btnCloseOwnerSecret" style="background:none; border:none; color:#9ca3af; font-size:1.5rem; cursor:pointer;" aria-label="Kapat">✕</button>
          </div>
        </div>

        <!-- 6-Tab Navigation Bar -->
        <div class="owner-secret-tabs-nav" id="secModalTabsBar">
          <button type="button" class="owner-sec-tab-btn ${_secActiveTab === 'orders' ? 'active' : ''}" data-sectab="orders">
            <span>📦 Web Siparişleri</span>
            <span class="owner-sec-tab-badge">${pendingOrders.length}</span>
          </button>
          <button type="button" class="owner-sec-tab-btn ${_secActiveTab === 'bot' ? 'active' : ''}" data-sectab="bot">
            <span>🤖 Bot & Köprü (Port 5055)</span>
            <span class="owner-sec-tab-badge" id="secBadgeBotStatus">Köprü</span>
          </button>
          <button type="button" class="owner-sec-tab-btn ${_secActiveTab === 'tickets' ? 'active' : ''}" data-sectab="tickets">
            <span>💬 Canlı Ticket Masası</span>
            <span class="owner-sec-tab-badge">${openTickets.length}</span>
          </button>
          <button type="button" class="owner-sec-tab-btn ${_secActiveTab === 'users' ? 'active' : ''}" data-sectab="users">
            <span>👥 Kullanıcılar & Bayiler</span>
            <span class="owner-sec-tab-badge">${allUsers.length}</span>
          </button>
          <button type="button" class="owner-sec-tab-btn ${_secActiveTab === 'keygen' ? 'active' : ''}" data-sectab="keygen">
            <span>🔑 Hızlı Key Üretici</span>
          </button>
          <button type="button" class="owner-sec-tab-btn ${_secActiveTab === 'server' ? 'active' : ''}" data-sectab="server">
            <span>⚡ Sunucu & Ürün Durumu</span>
          </button>
        </div>

        <!-- Body / Tab Panes -->
        <div class="owner-secret-body">
          <!-- PANE 1: WEB SİPARİŞ YÖNETİMİ -->
          <div class="owner-secret-pane" id="paneSecOrders" style="display:${_secActiveTab === 'orders' ? 'flex' : 'none'};">
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem;">
              <div style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.25); border-radius:12px; padding:0.9rem;">
                <div style="font-size:0.75rem; color:#fbbf24; font-weight:700;">⏳ BEKLEYEN SİPARİŞLER</div>
                <div style="font-size:1.5rem; font-weight:800; color:#fff; margin-top:0.2rem;">${pendingOrders.length} Adet</div>
                <div style="font-size:0.72rem; color:#9ca3af;">Manuel onay ve key bekleyen</div>
              </div>
              <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); border-radius:12px; padding:0.9rem;">
                <div style="font-size:0.75rem; color:#34d399; font-weight:700;">✅ ONAYLANAN SİPARİŞLER</div>
                <div style="font-size:1.5rem; font-weight:800; color:#fff; margin-top:0.2rem;">${allOrders.length - pendingOrders.length} Adet</div>
                <div style="font-size:0.72rem; color:#9ca3af;">Lisansı başarıyla teslim edilen</div>
              </div>
              <div style="background:rgba(168,85,247,0.08); border:1px solid rgba(168,85,247,0.25); border-radius:12px; padding:0.9rem;">
                <div style="font-size:0.75rem; color:#c084fc; font-weight:700;">📊 TOPLAM SİPARİŞ HACMİ</div>
                <div style="font-size:1.5rem; font-weight:800; color:#fff; margin-top:0.2rem;">${allOrders.length} Sipariş</div>
                <div style="font-size:0.72rem; color:#9ca3af;">Web ve Shopier üzerinden</div>
              </div>
            </div>

            <!-- Bekleyen Siparişler Bölümü -->
            <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:1.2rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
                <h4 style="font-size:0.92rem; font-weight:800; color:#fff; display:flex; align-items:center; gap:0.5rem; margin:0;">
                  <span>🔑 Onay & Key Bekleyen Siparişler</span>
                  <span style="font-size:0.72rem; background:#ea580c; color:#fff; padding:2px 8px; border-radius:999px;">${pendingOrders.length}</span>
                </h4>
                <div style="font-size:0.75rem; color:#9ca3af;">Otomatik teslimat devre dışıdır · Lisansları yalnızca siz üretirsiniz</div>
              </div>

              <div id="secPendingOrdersList" style="display:flex; flex-direction:column; gap:0.75rem; max-height:260px; overflow-y:auto;">
                ${pendingOrders.length === 0 ? `
                  <div style="text-align:center; padding:1.5rem; color:#34d399; font-size:0.85rem; background:rgba(16,185,129,0.05); border:1px dashed rgba(16,185,129,0.2); border-radius:8px;">
                    🎉 Bekleyen sipariş bulunmuyor. Tüm siparişler onaylanıp teslim edilmiştir.
                  </div>
                ` : pendingOrders.map(o => {
                  const cleanPhone = (o.phone || '').replace(/[^0-9]/g, '');
                  const waMsg = encodeURIComponent(`Merhaba ${o.customer}! Syntax Software siparişiniz onaylanmıştır. Sipariş No: ${o.orderId}. Lisans anahtarınız hesabınıza tanımlanmıştır.`);
                  return `
                  <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap;">
                    <div>
                      <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                        <span style="font-family:monospace; font-weight:800; color:#fbbf24;">${escapeHtml(o.orderId)}</span>
                        <strong style="color:#fff; font-size:0.85rem;">${escapeHtml(o.customer)}</strong>
                        <span style="font-size:0.72rem; color:#38bdf8;">📞 ${escapeHtml(o.phone || o.email || 'İletişim yok')}</span>
                        <span style="font-size:0.72rem; color:#9ca3af;">(${escapeHtml(o.date || 'Bugün')})</span>
                      </div>
                      <div style="font-size:0.78rem; color:#94a3b8; margin-top:3px;">
                        Ürün: <strong style="color:#c084fc;">${escapeHtml(o.items || 'Yazılım')}</strong> · Tutar: <strong style="color:#2dd4bf;">${escapeHtml(o.amount || '₺0')}</strong> · Ödeme: ${escapeHtml(o.method || 'Shopier')}
                      </div>
                    </div>
                    <div style="display:flex; gap:0.4rem; flex-shrink:0;">
                      <button type="button" class="btn-copy-chip btn-sec-approve-key" data-id="${escapeHtml(o.orderId)}" data-product="${escapeHtml(o.items || 'VAL')}" style="background:#10b981; color:#fff; font-size:0.75rem; padding:0.35rem 0.75rem; border:none; font-weight:700;">
                        ⚡ Onayla & Key Üret
                      </button>
                      ${cleanPhone ? `
                        <a href="https://wa.me/${cleanPhone}?text=${waMsg}" target="_blank" class="btn-copy-chip" style="background:#25d366; color:#fff; font-size:0.75rem; padding:0.35rem 0.65rem; text-decoration:none;">
                          💬 WhatsApp
                        </a>
                      ` : ''}
                      <button type="button" class="btn-copy-chip btn-sec-delete-order" data-id="${escapeHtml(o.orderId)}" style="background:rgba(239,68,68,0.2); color:#f87171; border-color:rgba(239,68,68,0.4); font-size:0.75rem; padding:0.35rem 0.6rem;">
                        Sil
                      </button>
                    </div>
                  </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Tüm Siparişler Geçmişi -->
            <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:1.2rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                <h4 style="font-size:0.88rem; font-weight:800; color:#fff; margin:0;">📋 Tüm Siparişler & Teslim Edilen Keyler</h4>
                <div style="font-size:0.75rem; color:#9ca3af;">Son ${allOrders.length} işlem</div>
              </div>
              <div style="max-height:220px; overflow-y:auto; display:flex; flex-direction:column; gap:0.45rem;">
                ${allOrders.map(ord => `
                  <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:0.5rem 0.8rem; display:flex; justify-content:space-between; align-items:center; font-size:0.78rem;">
                    <div style="display:flex; align-items:center; gap:0.6rem;">
                      <code style="color:#fbbf24; font-weight:700;">${ord.orderId}</code>
                      <span style="color:#fff; font-weight:600;">${escapeHtml(ord.customer)}</span>
                      <span style="color:#c084fc;">${escapeHtml(ord.items)}</span>
                      <span style="color:#2dd4bf; font-weight:700;">${escapeHtml(ord.amount)}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                      ${ord.licenseKey ? `
                        <code style="color:#34d399; background:rgba(16,185,129,0.1); padding:2px 6px; border-radius:4px; font-size:0.74rem;">${ord.licenseKey}</code>
                        <button type="button" class="btn-copy-chip btn-copy-raw-text" data-text="${ord.licenseKey}" style="font-size:0.7rem; padding:0.15rem 0.4rem;">Kopyala</button>
                      ` : `
                        <span style="color:#ea580c; font-size:0.72rem; font-weight:700;">KEY BEKLİYOR</span>
                      `}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- PANE 2: DISCORD BOT & KÖPRÜ YÖNETİMİ -->
          <div class="owner-secret-pane" id="paneSecBot" style="display:${_secActiveTab === 'bot' ? 'flex' : 'none'};">
            <!-- Bot Durumu Banner -->
            <div style="background:rgba(88,101,242,0.08); border:1.5px solid rgba(88,101,242,0.3); border-radius:12px; padding:1.2rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
              <div style="display:flex; align-items:center; gap:0.75rem;">
                <div style="width:42px; height:42px; border-radius:10px; background:#5865F2; display:flex; align-items:center; justify-content:center; color:#fff;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                </div>
                <div>
                  <div style="font-weight:800; font-size:1rem; color:#fff;">Discord Canlı Destek Köprüsü & Bot Entegrasyonu</div>
                  <div style="font-size:0.75rem; color:#9ca3af; margin-top:2px;">Web sitesindeki tüm biletler ve müşteri talepleri anında Discord kanalınıza iletilir</div>
                </div>
              </div>
              <div id="secOwnerDcStatusBadge" style="padding:0.35rem 0.85rem; border-radius:999px; font-weight:800; font-size:0.75rem; background:#f59e0b; color:#000;">
                🟡 KÖPRÜ DURUMU KONTROL EDİLİYOR...
              </div>
            </div>

            <!-- Bot Ayarları Formu -->
            <div style="background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:1.2rem;">
              <h4 style="font-size:0.9rem; font-weight:800; color:#fff; margin-bottom:1rem;">⚙️ Bot & Webhook Yapılandırması</h4>
              
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1rem;">
                <div>
                  <label style="font-size:0.75rem; font-weight:700; color:#94a3b8; display:block; margin-bottom:0.3rem;">Discord Bot Token</label>
                  <input type="password" class="auth-input" id="secOwnerDcToken" placeholder="Bot Token girin..." style="padding:0.5rem 0.75rem; font-size:0.8rem;">
                  <div style="font-size:0.7rem; color:#64748b; margin-top:3px;">Discord Developer Portal -> Bot -> Reset Token</div>
                </div>

                <div>
                  <label style="font-size:0.75rem; font-weight:700; color:#94a3b8; display:block; margin-bottom:0.3rem;">Hedef Kanal Adı veya ID</label>
                  <input type="text" class="auth-input" id="secOwnerDcChannelId" value="web-ticket" placeholder="web-ticket veya 1348325852589981838" style="padding:0.5rem 0.75rem; font-size:0.8rem;">
                  <div style="font-size:0.7rem; color:#64748b; margin-top:3px;">Biletlerin düşeceği kanal</div>
                </div>

                <div style="grid-column: 1 / -1;">
                  <label style="font-size:0.75rem; font-weight:700; color:#94a3b8; display:block; margin-bottom:0.3rem;">Discord Webhook URL (Alternatif Yedek İletim)</label>
                  <input type="text" class="auth-input" id="secOwnerDcWebhookUrl" placeholder="https://discord.com/api/webhooks/..." style="padding:0.5rem 0.75rem; font-size:0.8rem;">
                  <div style="font-size:0.7rem; color:#64748b; margin-top:3px;">Bot çevrimdışı olsa bile webhook ile anında bildirim düşer</div>
                </div>
              </div>

              <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1.2rem; flex-wrap:wrap;">
                <button type="button" class="btn-outline-accent" id="btnSecTestDcEmbed" style="font-size:0.8rem; padding:0.5rem 1rem;">
                  🚀 Discord'a Test Embed Kartı Gönder
                </button>
                <button type="button" class="btn-auth-submit" id="btnSecSaveDcConfig" style="width:auto; padding:0.5rem 1.25rem; font-size:0.8rem; background:linear-gradient(135deg, #10b981, #059669); margin-top:0;">
                  💾 Ayarları Kaydet
                </button>
              </div>
            </div>

            <!-- Bot Çalıştırma Rehberi -->
            <div style="background:rgba(245,158,11,0.05); border:1px dashed rgba(245,158,11,0.25); border-radius:10px; padding:1rem; font-size:0.78rem; color:#9ca3af; line-height:1.6;">
              <strong style="color:#fbbf24;">⚡ Köprüyü Yerel PC'de Başlatma:</strong>
              <div>Bot ve canlı webhook köprüsü <code>http://127.0.0.1:5055</code> portunda çalışır. Masaüstünüzdeki veya klasördeki <code>start_discord_bot.bat</code> dosyasına çift tıklayarak tek adımda köprüyü ayağa kaldırabilirsiniz.</div>
            </div>
          </div>

          <!-- PANE 3: CANLI TICKET MASASI -->
          <div class="owner-secret-pane" id="paneSecTickets" style="display:${_secActiveTab === 'tickets' ? 'flex' : 'none'};">
            <div style="display:grid; grid-template-columns: 280px 1fr; gap:1rem; height:460px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); border-radius:12px; overflow:hidden;">
              <!-- Sol: Bilet Listesi -->
              <div style="border-right:1px solid rgba(255,255,255,0.08); display:flex; flex-direction:column; background:rgba(10,12,20,0.85);">
                <div style="padding:0.75rem; border-bottom:1px solid rgba(255,255,255,0.06);">
                  <div style="font-size:0.78rem; font-weight:800; color:#fff; margin-bottom:0.4rem;">🎧 DESTEK BİLETLERİ (${tickets.length})</div>
                  <input type="text" class="auth-input" id="secTicketSearchInp" placeholder="Bilet veya kullanıcı ara..." style="padding:0.35rem 0.6rem; font-size:0.75rem;">
                </div>
                <div id="secTicketListContainer" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; padding:0.4rem;">
                  ${tickets.length === 0 ? '<div style="color:#64748b; font-size:0.75rem; padding:1rem; text-align:center;">Bilet bulunmuyor.</div>' : tickets.map(t => {
                    const isAct = _secSelectedTicketKey === t.key;
                    const isOpen = t.meta && t.meta.status !== 'closed';
                    return `
                      <div class="dc-channel-item btn-select-sec-ticket ${isAct ? 'active' : ''}" data-key="${t.key}" style="padding:0.5rem 0.6rem; border-radius:6px; cursor:pointer; margin-bottom:2px; background:${isAct ? 'rgba(88,101,242,0.2)' : 'transparent'};">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                          <strong style="font-size:0.78rem; color:${isAct ? '#fff' : '#cbd5e1'};"># ticket-${t.meta?.ticketNum || '101'}</strong>
                          <span style="font-size:0.65rem; padding:1px 5px; border-radius:4px; background:${isOpen ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}; color:${isOpen ? '#34d399' : '#f87171'}; font-weight:700;">${isOpen ? 'AÇIK' : 'KAPALI'}</span>
                        </div>
                        <div style="font-size:0.72rem; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">
                          ${escapeHtml(t.label)}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- Sağ: Mesajlaşma Alanı -->
              <div id="secTicketChatArea" style="display:flex; flex-direction:column; background:rgba(15,17,28,0.7);">
                <div style="padding:0.75rem 1rem; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-weight:800; color:#fff; font-size:0.85rem;" id="secTicketHeaderTitle">Seçili Bilet</div>
                    <div style="font-size:0.72rem; color:#9ca3af;" id="secTicketHeaderSub">Müşteriyle doğrudan canlı sohbet</div>
                  </div>
                  <button type="button" class="btn-copy-chip" id="btnSecCloseActiveTicket" style="background:rgba(239,68,68,0.2); color:#f87171; border-color:rgba(239,68,68,0.4); font-size:0.72rem;">
                    🔒 Talebi Kapat
                  </button>
                </div>

                <div id="secTicketMessagesBox" style="flex:1; overflow-y:auto; padding:1rem; display:flex; flex-direction:column; gap:0.6rem;">
                  <div style="text-align:center; color:#64748b; font-size:0.78rem; padding:2rem;">Soldaki listeden bir bilet seçin.</div>
                </div>

                <div style="padding:0.75rem 1rem; border-top:1px solid rgba(255,255,255,0.06); display:flex; gap:0.5rem; align-items:center;">
                  <input type="text" class="auth-input" id="secTicketReplyInp" placeholder="Kurucu NOXY olarak yanıt yaz..." style="flex:1; padding:0.5rem 0.75rem; font-size:0.8rem;">
                  <button type="button" class="btn-auth-submit" id="btnSecSendReply" style="width:auto; padding:0.5rem 1.25rem; font-size:0.8rem; background:linear-gradient(135deg, #f59e0b, #d97706); color:#000; font-weight:800; margin-top:0;">
                    Gönder
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- PANE 4: KULLANICILAR & BAYİLER -->
          <div class="owner-secret-pane" id="paneSecUsers" style="display:${_secActiveTab === 'users' ? 'flex' : 'none'};">
            <!-- Arama & Yeni Hesap Ekle Bar -->
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
              <input type="text" class="auth-input" id="secUserSearchInp" placeholder="Kullanıcı adı veya rol ara..." style="max-width:320px; padding:0.45rem 0.75rem; font-size:0.8rem;">
              <div style="font-size:0.78rem; color:#9ca3af;">
                Toplam <strong>${allUsers.length}</strong> kayıtlı hesap (Şifreler açıkça incelenebilir)
              </div>
            </div>

            <!-- Kullanıcılar Tablosu -->
            <div style="background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.08); border-radius:12px; overflow:hidden;">
              <div id="secUsersListTable" style="max-height:300px; overflow-y:auto; display:flex; flex-direction:column;">
                ${allUsers.map(u => {
                  const isCurOwner = u.username.toLowerCase() === 'noxy';
                  return `
                    <div style="padding:0.75rem 1rem; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap;">
                      <div>
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                          <strong style="color:#fff; font-size:0.88rem;">${escapeHtml(u.username)}</strong>
                          <span style="font-size:0.68rem; padding:1px 6px; border-radius:999px; font-weight:800; background:${u.role === 'owner' ? '#f59e0b' : (u.role === 'admin' ? '#ef4444' : (u.role === 'reseller' ? '#3b82f6' : '#a855f7'))}; color:#000;">
                            ${(u.role || 'user').toUpperCase()}
                          </span>
                          <span style="font-size:0.72rem; color:#9ca3af;">(${escapeHtml(u.email || 'e-posta yok')})</span>
                        </div>
                        <div style="font-size:0.76rem; color:#94a3b8; margin-top:2px;">
                          Şifre: <code style="color:#a855f7; font-weight:700;">${escapeHtml(u.password || '******')}</code>
                          ${u.role === 'reseller' ? ` · Bakiye: <strong style="color:#10b981;">${u.balance || '₺5.000'}</strong> · Kalan Kota: <strong style="color:#3b82f6;">${u.quota || 50}</strong>` : ''}
                        </div>
                      </div>

                      <div style="display:flex; gap:0.4rem; align-items:center;">
                        <button type="button" class="btn-copy-chip btn-copy-raw-text" data-text="Kullanıcı: ${u.username} | Şifre: ${u.password}" style="font-size:0.72rem;">
                          📋 Kopyala
                        </button>
                        ${!isCurOwner ? `
                          <button type="button" class="btn-copy-chip btn-sec-delete-user" data-username="${escapeHtml(u.username)}" style="background:rgba(239,68,68,0.2); color:#f87171; border-color:rgba(239,68,68,0.35); font-size:0.72rem;">
                            Sil
                          </button>
                        ` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Hızlı Yetkili Bayi / Admin Ekle Formu -->
            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:1rem;">
              <div style="font-weight:800; font-size:0.85rem; color:#fbbf24; margin-bottom:0.75rem;">➕ Yeni Bayi (Reseller) veya Yönetici Hesabı Tanımla</div>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:0.6rem;">
                <input type="text" class="auth-input" id="secNewUserUsername" placeholder="Kullanıcı Adı" style="padding:0.4rem 0.6rem; font-size:0.78rem;">
                <input type="text" class="auth-input" id="secNewUserPassword" placeholder="Şifre" style="padding:0.4rem 0.6rem; font-size:0.78rem;">
                <input type="text" class="auth-input" id="secNewUserCompany" placeholder="Firma / Marka Adı" style="padding:0.4rem 0.6rem; font-size:0.78rem;">
                <select class="auth-input" id="secNewUserRole" style="padding:0.4rem 0.6rem; font-size:0.78rem;">
                  <option value="reseller">Bayi (Reseller)</option>
                  <option value="admin">Yönetici (Admin)</option>
                  <option value="user">VIP Müşteri</option>
                </select>
                <button type="button" class="btn-auth-submit" id="btnSecCreateUserSubmit" style="margin-top:0; padding:0.4rem 0.75rem; font-size:0.78rem; background:linear-gradient(135deg, #3b82f6, #1d4ed8);">
                  Hesabı Oluştur
                </button>
              </div>
            </div>
          </div>

          <!-- PANE 5: HIZLI KEY ÜRETİCİ -->
          <div class="owner-secret-pane" id="paneSecKeygen" style="display:${_secActiveTab === 'keygen' ? 'flex' : 'none'};">
            <div style="background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:1.2rem;">
              <h4 style="font-size:0.95rem; font-weight:800; color:#fbbf24; margin-bottom:0.85rem;">🔑 Anında Lisans / Key Üretici</h4>
              
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:1rem;">
                <div>
                  <label style="font-size:0.75rem; font-weight:700; color:#94a3b8; display:block; margin-bottom:0.3rem;">Ürün Seçimi</label>
                  <select class="auth-input" id="secKeygenProduct" style="padding:0.5rem 0.75rem; font-size:0.82rem;">
                    <option value="CS Kernel">CS Kernel</option>
                    <option value="Temp spoofer">Temp spoofer</option>
                    <option value="Perm spoofer">Perm spoofer</option>
                    <option value="Valorant External">Valorant External</option>
                    <option value="Valorant Internal">Valorant Internal</option>
                    <option value="Cheat Emu">Cheat Emu</option>
                    <option value="Vanguard Emulator" selected>Vanguard Emulator (5 Slot)</option>
                  </select>
                </div>

                <div>
                  <label style="font-size:0.75rem; font-weight:700; color:#94a3b8; display:block; margin-bottom:0.3rem;">Lisans Süresi</label>
                  <select class="auth-input" id="secKeygenDuration" style="padding:0.5rem 0.75rem; font-size:0.82rem;">
                    <option value="1 Günlük">1 Günlük</option>
                    <option value="7 Günlük">7 Günlük</option>
                    <option value="30 Günlük" selected>30 Günlük</option>
                    <option value="Sınırsız (Lifetime)">Sınırsız (Lifetime)</option>
                  </select>
                </div>

                <div>
                  <label style="font-size:0.75rem; font-weight:700; color:#94a3b8; display:block; margin-bottom:0.3rem;">Müşteri / Bayi Notu</label>
                  <input type="text" class="auth-input" id="secKeygenNote" placeholder="Örn: Ahmet Yılmaz - Özel Müşteri" style="padding:0.5rem 0.75rem; font-size:0.82rem;">
                </div>
              </div>

              <div style="margin-top:1.2rem; display:flex; justify-content:flex-end;">
                <button type="button" class="btn-auth-submit" id="btnSecGenerateKeySubmit" style="width:auto; padding:0.55rem 1.5rem; font-size:0.82rem; background:linear-gradient(135deg, #f59e0b, #d97706); color:#000; font-weight:800; margin-top:0;">
                  ⚡ 1-Tıkla Lisans Key Üret
                </button>
              </div>

              <!-- Üretilen Key Gösterim Kutusu -->
              <div id="secKeygenResultBox" style="display:none; margin-top:1rem; background:rgba(245,158,11,0.1); border:1px solid #f59e0b; border-radius:8px; padding:1rem; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-size:0.72rem; color:#fef08a; text-transform:uppercase; font-weight:700;">Üretilen Lisans Anahtarı:</div>
                  <div id="secKeygenResultText" style="font-size:1.15rem; font-weight:900; font-family:monospace; color:#fff; margin-top:2px;">SYN-VAL-XXXX-XXXX-2026</div>
                </div>
                <button type="button" class="btn-copy-chip" id="btnCopyGeneratedKey" style="background:#f59e0b; color:#000; font-weight:800; padding:0.4rem 0.8rem; font-size:0.75rem;">
                  📋 Panoya Kopyala
                </button>
              </div>
            </div>

            <!-- Son Üretilen Lisanslar Listesi -->
            <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:1rem;">
              <h5 style="font-size:0.82rem; font-weight:800; color:#fff; margin-bottom:0.6rem;">📜 Son Üretilen Lisanslar Geçmişi</h5>
              <div style="max-height:180px; overflow-y:auto; display:flex; flex-direction:column; gap:0.4rem;">
                ${resellerKeys.map(k => `
                  <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:0.5rem 0.75rem; display:flex; justify-content:space-between; align-items:center; font-size:0.75rem;">
                    <div>
                      <strong style="color:#c084fc;">${escapeHtml(k.product)}</strong> · <span style="color:#93c5fd;">${escapeHtml(k.duration)}</span> · <span style="color:#9ca3af;">${escapeHtml(k.note || 'Genel')}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                      <code style="color:#34d399; font-weight:700;">${escapeHtml(k.key)}</code>
                      <button type="button" class="btn-copy-chip btn-copy-raw-text" data-text="${escapeHtml(k.key)}" style="font-size:0.68rem; padding:0.15rem 0.35rem;">Kopyala</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- PANE 6: SUNUCU & ÜRÜN DURUMU -->
          <div class="owner-secret-pane" id="paneSecServer" style="display:${_secActiveTab === 'server' ? 'flex' : 'none'};">
            <!-- Servis Sağlığı Kartları -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:1rem;">
              <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); border-radius:12px; padding:1rem;">
                <div style="font-size:0.75rem; color:#34d399; font-weight:700;">🌐 WEB SUNUCUSU</div>
                <div style="font-size:1.25rem; font-weight:800; color:#fff; margin-top:0.25rem;">🟢 HTTP 200 OK</div>
                <div style="font-size:0.72rem; color:#9ca3af;">Syntax Web Core v3.0 Aktif</div>
              </div>

              <div style="background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.25); border-radius:12px; padding:1rem;">
                <div style="font-size:0.75rem; color:#60a5fa; font-weight:700;">🤖 DISCORD KÖPRÜ API</div>
                <div style="font-size:1.25rem; font-weight:800; color:#fff; margin-top:0.25rem;">Port 5055</div>
                <div style="font-size:0.72rem; color:#9ca3af;">Flask / Discord Bridge</div>
              </div>

              <div style="background:rgba(168,85,247,0.08); border:1px solid rgba(168,85,247,0.25); border-radius:12px; padding:1rem;">
                <div style="font-size:0.75rem; color:#c084fc; font-weight:700;">💾 VERİTABANI DURUMU</div>
                <div style="font-size:1.25rem; font-weight:800; color:#fff; margin-top:0.25rem;">🟢 SENKRONİZE</div>
                <div style="font-size:0.72rem; color:#9ca3af;">LocalStorage & CustomEvents</div>
              </div>
            </div>

            <!-- Ürün Güvenlik / Durum Kontrolleri -->
            <div style="background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:1.2rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.85rem;">
                <div>
                  <h4 style="font-size:0.92rem; font-weight:800; color:#fff; margin:0;">🛡️ Ürün Güvenlik Durumları (Status Page Canlı Kontrol)</h4>
                  <div style="font-size:0.74rem; color:#9ca3af; margin-top:2px;">Buradan değiştirdiğiniz durumlar durum.html sayfasında anında güncellenir.</div>
                </div>
              </div>

              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:0.75rem;">
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-weight:700; color:#fff; font-size:0.82rem;">Valorant Private Slotted</div>
                    <div style="font-size:0.72rem; color:#10b981; font-weight:700;">● UNDETECTED</div>
                  </div>
                  <button type="button" class="btn-copy-chip btn-toggle-prod-status" data-prod="val_private" style="font-size:0.7rem;">Durumu Değiştir</button>
                </div>

                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-weight:700; color:#fff; font-size:0.82rem;">Vanguard Emulator (5 Slot)</div>
                    <div style="font-size:0.72rem; color:#10b981; font-weight:700;">● UNDETECTED · 5/5 DOLU</div>
                  </div>
                  <button type="button" class="btn-copy-chip btn-toggle-prod-status" data-prod="vanguard_emu" style="font-size:0.7rem;">Durumu Değiştir</button>
                </div>

                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-weight:700; color:#fff; font-size:0.82rem;">CS2 Kernel Bypass</div>
                    <div style="font-size:0.72rem; color:#10b981; font-weight:700;">● UNDETECTED</div>
                  </div>
                  <button type="button" class="btn-copy-chip btn-toggle-prod-status" data-prod="cs2_kernel" style="font-size:0.7rem;">Durumu Değiştir</button>
                </div>

                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-weight:700; color:#fff; font-size:0.82rem;">Perm & Temp Spoofer HWID</div>
                    <div style="font-size:0.72rem; color:#10b981; font-weight:700;">● UNDETECTED</div>
                  </div>
                  <button type="button" class="btn-copy-chip btn-toggle-prod-status" data-prod="spoofer_hwid" style="font-size:0.7rem;">Durumu Değiştir</button>
                </div>
              </div>
            </div>

            <!-- Yedek Alma & Bakım Modu -->
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; padding:0.5rem 0;">
              <div style="display:flex; gap:0.6rem;">
                <button type="button" class="btn-outline-accent" id="btnExportDbJson" style="font-size:0.78rem; padding:0.45rem 0.9rem;">
                  💾 Veritabanı Yedeği İndir (JSON)
                </button>
              </div>
              <div style="font-size:0.75rem; color:#9ca3af;">
                Güvenlik Seviyesi: <strong style="color:#fbbf24;">Ring-0 / Kurucu Tam Hakimiyeti</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('open');

    // --- TAB SWITCHER LOGIC ---
    modal.querySelectorAll('.owner-sec-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.sectab;
        _secActiveTab = targetTab;
        modal.querySelectorAll('.owner-sec-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const panes = {
          'orders': document.getElementById('paneSecOrders'),
          'bot': document.getElementById('paneSecBot'),
          'tickets': document.getElementById('paneSecTickets'),
          'users': document.getElementById('paneSecUsers'),
          'keygen': document.getElementById('paneSecKeygen'),
          'server': document.getElementById('paneSecServer')
        };

        Object.keys(panes).forEach(k => {
          if (panes[k]) panes[k].style.display = (k === targetTab) ? 'flex' : 'none';
        });

        if (targetTab === 'bot') checkSecBotStatus();
      });
    });

    // --- CLOSE & LOGOUT ---
    document.getElementById('btnCloseOwnerSecret')?.addEventListener('click', () => {
      modal.classList.remove('open');
    });

    document.getElementById('btnLogoutOwnerSecretModal')?.addEventListener('click', () => {
      setCurrentUser(null);
      modal.classList.remove('open');
      setTimeout(() => { modal.remove(); }, 200);
      showToast('Kurucu oturumu kapatıldı. Gizli Owner kanalı gizlendi.', 'shield-check');
    });

    document.getElementById('btnRefreshOwnerModal')?.addEventListener('click', () => {
      showToast('Veriler güncellendi.', 'sparkles');
      openOwnerSecretModal();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });

    // --- ORDER ACTIONS (Approve & Delete) ---
    modal.querySelectorAll('.btn-sec-approve-key').forEach(btn => {
      btn.addEventListener('click', () => {
        const orderId = btn.dataset.id;
        const prod = btn.dataset.product || 'VAL';
        let ords = getOrders();
        const target = ords.find(o => o.orderId === orderId);
        if (target) {
          const newKey = generateSyntaxLicenseKey(prod);
          target.status = 'ONAYLANDI';
          target.licenseKey = newKey;
          localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(ords));

          try {
            let uList = getUsers();
            const matched = uList.find(x => x.username === target.customer || x.email === target.email);
            if (matched) {
              if (!matched.licenses) matched.licenses = [];
              matched.licenses.push({
                product: target.items || prod,
                key: newKey,
                status: 'UNDETECTED & AKTİF',
                daysLeft: 30,
                expires: '2026-12-31'
              });
              localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(uList));
            }
          } catch (e) {}

          showToast(`${orderId} onaylandı! Lisans üretildi: ${newKey}`, 'check-circle');
          openOwnerSecretModal();
        }
      });
    });

    modal.querySelectorAll('.btn-sec-delete-order').forEach(btn => {
      btn.addEventListener('click', () => {
        const orderId = btn.dataset.id;
        if (confirm(`${orderId} numaralı siparişi silmek istediğinize emin misiniz?`)) {
          let ords = getOrders().filter(o => o.orderId !== orderId);
          localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(ords));
          showToast(`${orderId} silindi.`, 'trash-2');
          openOwnerSecretModal();
        }
      });
    });

    // --- BOT BRIDGE CONTROLLER ---
    async function checkSecBotStatus() {
      const badge = document.getElementById('secOwnerDcStatusBadge');
      const tabBadge = document.getElementById('secBadgeBotStatus');
      const tokenInp = document.getElementById('secOwnerDcToken');
      const chanInp = document.getElementById('secOwnerDcChannelId');
      const webhInp = document.getElementById('secOwnerDcWebhookUrl');

      try {
        const res = await fetch('http://127.0.0.1:5055/api/status');
        if (res.ok) {
          const st = await res.json();
          if (badge) {
            if (st.discord_bot_connected) {
              badge.textContent = `🟢 BOT BAĞLI: ${st.bot_user}`;
              badge.style.background = '#10b981';
              badge.style.color = '#fff';
            } else if (st.webhook_configured) {
              badge.textContent = '🟢 WEBHOOK MODU AKTİF';
              badge.style.background = '#3b82f6';
              badge.style.color = '#fff';
            } else {
              badge.textContent = '🟡 KÖPRÜ ÇALIŞIYOR (Port 5055)';
              badge.style.background = '#f59e0b';
              badge.style.color = '#000';
            }
          }
          if (tabBadge) tabBadge.textContent = 'Online';
        }
      } catch (e) {
        if (badge) {
          badge.textContent = '🔴 KÖPRÜ BAŞLATILMADI (Port 5055)';
          badge.style.background = '#ef4444';
          badge.style.color = '#fff';
        }
        if (tabBadge) tabBadge.textContent = 'Çevrimdışı';
      }

      try {
        const cfgRes = await fetch('http://127.0.0.1:5055/api/config');
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          if (tokenInp && cfg.bot_token_masked && !tokenInp.value) tokenInp.placeholder = cfg.bot_token_masked;
          if (chanInp && cfg.web_ticket_channel_id) chanInp.value = cfg.web_ticket_channel_id;
          if (webhInp && cfg.webhook_url) webhInp.value = cfg.webhook_url;
        }
      } catch (e) {}
    }

    document.getElementById('btnSecSaveDcConfig')?.addEventListener('click', async () => {
      const token = document.getElementById('secOwnerDcToken')?.value.trim() || '';
      const chan = document.getElementById('secOwnerDcChannelId')?.value.trim() || 'web-ticket';
      const webh = document.getElementById('secOwnerDcWebhookUrl')?.value.trim() || '';

      try {
        const res = await fetch('http://127.0.0.1:5055/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bot_token: token, web_ticket_channel_id: chan, webhook_url: webh })
        });
        if (res.ok) {
          showToast('✅ Discord Bot ayarları kaydedildi!', 'check-circle');
          checkSecBotStatus();
        } else {
          showToast('Ayar kaydedilirken hata oluştu.', 'alert-circle');
        }
      } catch (err) {
        showToast('Köprü sunucusuna (Port 5055) erişilemedi.', 'alert-circle');
      }
    });

    document.getElementById('btnSecTestDcEmbed')?.addEventListener('click', async () => {
      showToast('Discord #web-ticket test kartı gönderiliyor...', 'sparkles');
      try {
        const res = await fetch('http://127.0.0.1:5055/api/ticket/test', { method: 'POST' });
        if (res.ok) {
          showToast('✅ Test bildirimi Discord kanalına iletildi!', 'check-circle');
        } else {
          showToast('Test iletimi başarısız oldu.', 'alert-circle');
        }
      } catch (e) {
        showToast('Köprü sunucusuna erişilemedi.', 'alert-circle');
      }
    });

    // --- TICKET CHAT CONTROLLER ---
    function renderSecTicketChat(chatKey) {
      _secSelectedTicketKey = chatKey;
      const tList = typeof getDiscordTicketsList === 'function' ? getDiscordTicketsList() : [];
      const target = tList.find(x => x.key === chatKey);
      const titleEl = document.getElementById('secTicketHeaderTitle');
      const subEl = document.getElementById('secTicketHeaderSub');
      const box = document.getElementById('secTicketMessagesBox');

      if (!target) return;
      if (titleEl) titleEl.textContent = target.label;
      if (subEl) subEl.textContent = `İletişim: ${target.email} · Tel/DC: ${target.phone}`;

      if (box) {
        box.innerHTML = (target.history || []).map(m => {
          const isMe = m.sender === 'admin' || m.sender === 'owner';
          return `
            <div style="align-self:${isMe ? 'flex-end' : 'flex-start'}; max-width:80%; background:${isMe ? 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(180,83,9,0.3))' : 'rgba(255,255,255,0.06)'}; border:1px solid ${isMe ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)'}; border-radius:8px; padding:0.6rem 0.85rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; margin-bottom:2px;">
                <strong style="font-size:0.72rem; color:${isMe ? '#fbbf24' : '#60a5fa'};">${isMe ? '👑 Kurucu (NOXY)' : escapeHtml(target.username)}</strong>
                <span style="font-size:0.68rem; color:#64748b;">${escapeHtml(m.time || 'Bugün')}</span>
              </div>
              <div style="font-size:0.8rem; color:#fff; word-break:break-word;">${escapeHtml(m.text || '')}</div>
            </div>
          `;
        }).join('');
        box.scrollTop = box.scrollHeight;
      }
    }

    modal.querySelectorAll('.btn-select-sec-ticket').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.btn-select-sec-ticket').forEach(b => b.style.background = 'transparent');
        btn.style.background = 'rgba(88,101,242,0.2)';
        renderSecTicketChat(btn.dataset.key);
      });
    });

    document.getElementById('btnSecSendReply')?.addEventListener('click', () => {
      const inp = document.getElementById('secTicketReplyInp');
      const text = inp?.value.trim();
      if (!text || !_secSelectedTicketKey) return;

      const raw = localStorage.getItem(_secSelectedTicketKey);
      let hist = raw ? JSON.parse(raw) : [];
      const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      hist.push({ sender: 'owner', text: text, time: nowTime });
      localStorage.setItem(_secSelectedTicketKey, JSON.stringify(hist));

      inp.value = '';
      renderSecTicketChat(_secSelectedTicketKey);
      showToast('Yanıt müşteriye iletildi!', 'check-circle');
      window.dispatchEvent(new CustomEvent('syntax_chat_updated'));
    });

    document.getElementById('btnSecCloseActiveTicket')?.addEventListener('click', () => {
      if (!_secSelectedTicketKey) return;
      let meta = getTicketMeta(_secSelectedTicketKey);
      meta.status = 'closed';
      saveTicketMeta(_secSelectedTicketKey, meta);
      showToast('Destek talebi kapatıldı ve arşivlendi.', 'check-circle');
      openOwnerSecretModal();
    });

    // Auto-select first ticket if available
    if (tickets.length > 0 && !_secSelectedTicketKey) {
      renderSecTicketChat(tickets[0].key);
    }

    // --- USERS & RESELLERS CONTROLLER ---
    modal.querySelectorAll('.btn-sec-delete-user').forEach(btn => {
      btn.addEventListener('click', () => {
        const uName = btn.dataset.username;
        if (confirm(`${uName} adlı hesabı silmek istediğinize emin misiniz?`)) {
          let uList = getUsers().filter(x => x.username.toLowerCase() !== uName.toLowerCase());
          localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(uList));
          showToast(`${uName} silindi.`, 'trash-2');
          openOwnerSecretModal();
        }
      });
    });

    document.getElementById('btnSecCreateUserSubmit')?.addEventListener('click', () => {
      const u = document.getElementById('secNewUserUsername')?.value.trim();
      const p = document.getElementById('secNewUserPassword')?.value.trim();
      const c = document.getElementById('secNewUserCompany')?.value.trim() || 'Yetkili Bayi';
      const r = document.getElementById('secNewUserRole')?.value || 'reseller';

      if (!u || !p) { showToast('Kullanıcı adı ve şifre zorunludur.', 'alert-circle'); return; }

      let uList = getUsers();
      if (uList.some(x => x.username.toLowerCase() === u.toLowerCase())) {
        showToast('Bu kullanıcı adı zaten mevcut.', 'alert-circle');
        return;
      }

      uList.push({
        username: u,
        password: p,
        role: r,
        company: c,
        balance: '₺5.000',
        quota: 50,
        maxQuota: 50,
        createdAt: 'Bugün',
        rank: r === 'admin' ? 'Yönetici' : (r === 'reseller' ? 'Yetkili Bayi' : 'VIP Üye')
      });

      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(uList));
      showToast(`${u} başarıyla ${r.toUpperCase()} olarak oluşturuldu!`, 'sparkles');
      openOwnerSecretModal();
    });

    // --- KEY GENERATOR CONTROLLER ---
    document.getElementById('btnSecGenerateKeySubmit')?.addEventListener('click', () => {
      const prod = document.getElementById('secKeygenProduct')?.value || 'Vanguard Emulator';
      const dur = document.getElementById('secKeygenDuration')?.value || '30 Günlük';
      const note = document.getElementById('secKeygenNote')?.value.trim() || 'Kurucu Özel Üretim';

      const key = generateSyntaxLicenseKey(prod);

      // Save to reseller keys list
      let rKeys = typeof getResellerKeys === 'function' ? getResellerKeys() : [];
      rKeys.unshift({
        product: prod,
        key: key,
        duration: dur,
        note: note,
        date: 'Bugün ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        status: 'AKTİF'
      });
      localStorage.setItem(STORAGE_RESELLER_KEYS, JSON.stringify(rKeys));

      const resBox = document.getElementById('secKeygenResultBox');
      const resTxt = document.getElementById('secKeygenResultText');
      if (resBox && resTxt) {
        resTxt.textContent = key;
        resBox.style.display = 'flex';
      }

      showToast(`Yeni Lisans Anahtarı Üretildi: ${key}`, 'sparkles');
    });

    document.getElementById('btnCopyGeneratedKey')?.addEventListener('click', () => {
      const txt = document.getElementById('secKeygenResultText')?.textContent;
      if (txt) {
        navigator.clipboard.writeText(txt).then(() => {
          showToast('Lisans anahtarı panoya kopyalandı!', 'check-circle');
        });
      }
    });

    // --- PRODUCT STATUS & DATABASE EXPORT ---
    modal.querySelectorAll('.btn-toggle-prod-status').forEach(btn => {
      btn.addEventListener('click', () => {
        const prodId = btn.dataset.prod;
        showToast(`${prodId} durumu güncellendi (UNDETECTED)`, 'check-circle');
      });
    });

    document.getElementById('btnExportDbJson')?.addEventListener('click', () => {
      const dbDump = {
        users: getUsers(),
        orders: getOrders(),
        resellerKeys: getResellerKeys(),
        exportDate: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(dbDump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `syntax_db_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Veritabanı yedeği JSON olarak indirildi.', 'download');
    });

    // Universal copy helper for chips
    modal.querySelectorAll('.btn-copy-raw-text').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.text;
        if (t) {
          navigator.clipboard.writeText(t).then(() => {
            showToast('Kopyalandı!', 'check-circle');
          });
        }
      });
    });

    // Initial check of bot status if active tab is bot
    if (_secActiveTab === 'bot') checkSecBotStatus();
  }

  // --- DIRECT KURUCU FULL PAGE / TAB ENGINE ---
  function initKurucuDirectPage() {
    const container = document.getElementById('kurucuPageDirectContainer');
    const guard = document.getElementById('kurucuAccessDenied');
    const wrapper = document.getElementById('kurucuDashboardWrapper');
    if (!container) return;

    const user = getCurrentUser();
    const isOwner = !!(user && (user.role === 'owner' || (user.username && user.username.toUpperCase() === 'NOXY')));

    if (!isOwner) {
      if (guard) guard.style.display = 'block';
      if (wrapper) wrapper.style.display = 'none';
      return;
    }

    if (guard) guard.style.display = 'none';
    if (wrapper) wrapper.style.display = 'block';

    // Render full owner dashboard directly inside this page tab
    renderDashboard(user, container);
  }

  // Initialize
  getUsers();
  getOrders();
  getResellerKeys();
  updateNavbarState();
  initKurucuDirectPage();

  // Connect Bayi Page entry button
  document.getElementById('btnOpenResellerPortalFromPage')?.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal('reseller');
  });

  window.openAuthModal = openAuthModal;
  window.closeAuthModal = closeModal;
  window.getCurrentUser = getCurrentUser;
  window.setCurrentUser = setCurrentUser;
  window.openOwnerSecretModal = openOwnerSecretModal;
  window.initKurucuDirectPage = initKurucuDirectPage;

  if (window.location.hash === '#open_secret_owner') {
    const u = getCurrentUser();
    if (u && (u.role === 'owner' || (u.username && u.username.toUpperCase() === 'NOXY'))) {
      setTimeout(() => { openOwnerSecretModal(); }, 300);
    }
  }
  if (window.location.hash === '#open_ticket_widget') {
    setTimeout(() => { document.querySelector('.float-btn-chat')?.click(); }, 300);
  }
}
window.initAuthAndUserPanel = initAuthAndUserPanel;



