(function () {
  'use strict';
  const session = window.CTRAuth && CTRAuth.readSession();
  const isStandalone = !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // Android 外場手機：整體縮小表格密度，讓五欄固定在手機畫面內完整呈現；不提供水平滑動。
  if (session && session.role === 'field' && isAndroid) {
    const style = document.createElement('style');
    style.id = 'android-table-spacing-fix';
    style.textContent = `
      .table-wrap { width:100% !important; max-width:100% !important; overflow-x:hidden !important; }
      .table-wrap table { table-layout:fixed !important; width:100% !important; max-width:100% !important; }
      /* 五欄寬度合計 100%，避免百分比加固定像素造成表格超出 */
      .table-wrap col.c-cno  { width:23% !important; }
      .table-wrap col.c-esn  { width:27% !important; }
      .table-wrap col.c-seal { width:17% !important; }
      .table-wrap col.c-loc  { width:21% !important; }
      .table-wrap col.c-size { width:12% !important; }
      .table-wrap thead th {
        padding:2px 0 !important;
        line-height:1.05 !important;
        font-size:.48rem !important;
        letter-spacing:-.35px !important;
        white-space:normal !important;
        overflow:hidden !important;
        text-overflow:clip !important;
        overflow-wrap:anywhere !important;
        word-break:break-all !important;
      }
      .table-wrap tbody td {
        padding:1px 0 !important;
        line-height:1.08 !important;
        vertical-align:middle !important;
        overflow:hidden !important;
      }
      .table-wrap tbody td > span {
        display:block !important;
        width:100% !important;
        max-width:100% !important;
        line-height:1.08 !important;
        white-space:normal !important;
        overflow:visible !important;
        text-overflow:clip !important;
        overflow-wrap:anywhere !important;
        word-break:break-all !important;
      }
      .table-wrap .c-cno-val { font-size:.53rem !important; letter-spacing:-.7px !important; line-height:1.05 !important; }
      .table-wrap .c-esn1 { font-size:.50rem !important; letter-spacing:-.65px !important; line-height:1.05 !important; }
      .table-wrap .c-esn2 { font-size:.47rem !important; letter-spacing:-.65px !important; line-height:1.05 !important; }
      .table-wrap .c-seal-val { font-size:.46rem !important; letter-spacing:-.65px !important; line-height:1.05 !important; }
      .table-wrap .c-seq-val { font-size:.46rem !important; letter-spacing:-.35px !important; line-height:1.05 !important; }
      .table-wrap .c-loc-val, .table-wrap .c-loc-rep { font-size:.44rem !important; letter-spacing:-.4px !important; line-height:1.05 !important; }
      .table-wrap .sizetag { font-size:.38rem !important; padding:0 !important; line-height:1 !important; }
    `;
    document.head.appendChild(style);
  }
  // 只有外場角色在手機/平板使用時才啟用 PWA；內場與電腦網站不註冊 Service Worker。
  if (!session || session.role !== 'field' || !isMobile) return;

  const addMeta = (name, content) => {
    if (!document.querySelector('meta[name="' + name + '"]')) {
      const el = document.createElement('meta'); el.name = name; el.content = content; document.head.appendChild(el);
    }
  };
  const manifest = document.createElement('link'); manifest.rel = 'manifest'; manifest.href = './pwa-manifest.webmanifest'; document.head.appendChild(manifest);
  const icon = document.createElement('link'); icon.rel = 'apple-touch-icon'; icon.href = './icons/pwa-192.png'; document.head.appendChild(icon);
  addMeta('apple-mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-status-bar-style', 'default');
  addMeta('theme-color', '#1a7bbf');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js', { scope: './' }).catch(err => console.warn('PWA service worker registration failed:', err)));
  }
  if (isStandalone || document.getElementById('field-pwa-install')) return;

  const button = document.createElement('button');
  button.id = 'field-pwa-install';
  button.type = 'button';
  button.textContent = '安裝外場 App';
  button.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:9999;border:0;border-radius:24px;padding:11px 16px;background:#1a7bbf;color:#fff;font-size:14px;font-weight:700;box-shadow:0 3px 12px #0003;';
  document.body.appendChild(button);

  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
  button.addEventListener('click', async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice.catch(() => null);
      installPrompt = null;
      button.remove();
      return;
    }
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      alert('請使用 Safari 開啟本系統，點選下方「分享」按鈕，再選擇「加入主畫面」，最後按「新增」。');
    } else {
      alert('若尚未出現安裝選項，請使用 Chrome 開啟本系統，點選右上角「⋮」，選擇「安裝應用程式」或「新增至主畫面」。');
    }
  });
})();
