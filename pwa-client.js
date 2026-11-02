(function () {
  'use strict';
  const session = window.CTRAuth && CTRAuth.readSession();
  const isStandalone = !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
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
