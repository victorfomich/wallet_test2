// Basic Telegram Mini App demo logic

const telegramWebApp = window.Telegram ? window.Telegram.WebApp : undefined;

function applyThemeFromTelegram() {
  // Force light theme regardless of Telegram/device theme
  const root = document.documentElement.style;
  root.setProperty('--bg', '#ffffff');
  root.setProperty('--text', '#0f0f0f');
  root.setProperty('--hint', '#6b7280');
  root.setProperty('--link', '#2481cc');
  root.setProperty('--button', '#2aabee');
  root.setProperty('--button-text', '#ffffff');
  root.setProperty('--card', '#f3f4f6');
  root.setProperty('--border', 'rgba(0,0,0,0.08)');
}

function setMainButtonState(enabled, text) {
  if (!telegramWebApp) return;
  const btn = telegramWebApp.MainButton;
  if (text) btn.setText(text);
  if (enabled) btn.enable(); else btn.disable();
  btn.show();
}

function init() {
  const amountInput = document.getElementById('amount');
  const descriptionInput = document.getElementById('description');
  const sendBtn = document.getElementById('sendBtn');
  const hapticBtn = document.getElementById('hapticBtn');
  const greeting = document.getElementById('greeting');
  const envNotice = document.getElementById('envNotice');
  const userNicknameEl = document.getElementById('userNickname');
  const avatarImg = document.getElementById('avatarImg');
  const avatarFallback = document.getElementById('avatarFallback');
  const qrBtn = document.getElementById('qrBtn');
  const sellBtn = document.getElementById('sellBtn');
  const plusBtn = document.getElementById('plusBtn');
  const basketBtn = document.getElementById('basketBtn');
  const tabs = Array.from(document.querySelectorAll('.tabbar .tab'));
  const views = {
    home: document.getElementById('view-home'),
    history: document.getElementById('view-history'),
    browser: document.getElementById('view-browser'),
    profile: document.getElementById('view-profile'),
    usdt: document.getElementById('view-usdt'),
  };

  // Freeze hero offset based on initial viewport height (35%)
  const heroBasePx = Math.round(window.innerHeight * 0.35);
  document.documentElement.style.setProperty('--hero-base', `${heroBasePx}px`);

  const isTelegram = Boolean(telegramWebApp);

  if (isTelegram) {
    telegramWebApp.ready();
    try { telegramWebApp.expand(); } catch (_) {}

    // Theme
    applyThemeFromTelegram();
    telegramWebApp.onEvent('themeChanged', () => {
      applyThemeFromTelegram();
    });

    // User bar & greeting
    const user = telegramWebApp.initDataUnsafe?.user;
    if (user) {
      const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
      const nickname = user.username ? user.username : name || 'Пользователь';
      if (greeting) greeting.textContent = `Привет, ${name || nickname}!`;
      userNicknameEl.textContent = nickname;

      // Avatar: Telegram WebApp не даёт прямую ссылку на аватар.
      // Если Telegram передал photo_url — попробуем загрузить его, иначе показываем заглушку.
      const initials = (name || nickname).trim()[0]?.toUpperCase() || '?';
      avatarFallback.textContent = initials;

      if (user.photo_url) {
        avatarImg.hidden = true;
        avatarFallback.style.display = 'grid';
        avatarImg.onload = () => {
          avatarImg.hidden = false;
          avatarFallback.style.display = 'none';
        };
        avatarImg.onerror = () => {
          avatarImg.hidden = true;
          avatarFallback.style.display = 'grid';
        };
        avatarImg.src = user.photo_url;
      }
    } else {
      if (greeting) greeting.textContent = 'Привет!';
      userNicknameEl.textContent = '';
      avatarFallback.textContent = 'U';
    }

    // Back button closes app
    telegramWebApp.BackButton.show();
    telegramWebApp.BackButton.onClick(() => {
      telegramWebApp.close();
    });

    // Main button mirrors form state (only if form exists)
    if (amountInput) {
      const updateMainButton = () => {
        const amount = Number(amountInput.value);
        const ok = Number.isFinite(amount) && amount > 0;
        setMainButtonState(ok, 'Оплатить');
      };
      updateMainButton();
      amountInput.addEventListener('input', updateMainButton);

      telegramWebApp.onEvent('mainButtonClicked', () => {
        sendData();
      });
    } else {
      try { telegramWebApp.MainButton.hide(); } catch (_) {}
    }
  } else {
    // Fallback for normal browser
    if (envNotice) envNotice.hidden = false;
    if (greeting) greeting.textContent = 'Откройте это приложение внутри Telegram для полного функционала.';
  }

  // Tabs
  function switchView(name) {
    Object.entries(views).forEach(([key, el]) => {
      if (!el) return;
      if (key === name) {
        el.hidden = false;
        el.classList.add('active');
      } else {
        el.hidden = true;
        el.classList.remove('active');
      }
    });
    tabs.forEach(btn => {
      const isActive = btn.dataset.view === name;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });
  }

  tabs.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // QR button haptic
  if (qrBtn) {
    qrBtn.addEventListener('click', () => {
      try { telegramWebApp?.HapticFeedback?.impactOccurred('medium'); } catch (_) {}
    });
  }
  if (sellBtn) {
    sellBtn.addEventListener('click', () => {
      try { telegramWebApp?.HapticFeedback?.impactOccurred('light'); } catch (_) {}
    });
  }
  if (plusBtn) {
    plusBtn.addEventListener('click', () => {
      try { telegramWebApp?.HapticFeedback?.impactOccurred('light'); } catch (_) {}
    });
  }
  if (basketBtn) {
    basketBtn.addEventListener('click', () => {
      try { telegramWebApp?.HapticFeedback?.impactOccurred('light'); } catch (_) {}
    });
  }

  // USDT card navigation
  const cardUsdt = document.getElementById('card-usdt');
  const assetBack = document.getElementById('assetBack');
  if (cardUsdt) {
    const openUsdt = () => { window.location.href = 'usdt.html'; };
    cardUsdt.addEventListener('click', openUsdt);
    cardUsdt.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openUsdt(); } });
  }
  if (assetBack) {
    assetBack.addEventListener('click', () => {
      const hasHome = Boolean(document.getElementById('view-home'));
      if (hasHome) {
        try { switchView('home'); return; } catch (_) {}
      }
      if (window.history.length > 1) window.history.back(); else window.location.href = 'index.html';
    });
  }
  function sendData() {
    if (!amountInput) return;
    const amount = Number(amountInput.value);
    const description = descriptionInput.value?.trim() || null;
    if (!Number.isFinite(amount) || amount <= 0) {
      if (telegramWebApp?.HapticFeedback) telegramWebApp.HapticFeedback.notificationOccurred('error');
      alert('Введите корректную сумму');
      return;
    }
    const payload = {
      type: 'payment_request',
      amount,
      currency: 'RUB',
      description,
      ts: Date.now(),
    };

    if (telegramWebApp) {
      telegramWebApp.sendData(JSON.stringify(payload));
      if (telegramWebApp?.HapticFeedback) telegramWebApp.HapticFeedback.notificationOccurred('success');
    } else {
      // Fallback demo
      alert('Отправлено (демо):\n' + JSON.stringify(payload, null, 2));
    }
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', sendData);
  }
  if (hapticBtn) {
    hapticBtn.addEventListener('click', () => {
      try { telegramWebApp?.HapticFeedback?.impactOccurred('light'); } catch (_) {}
    });
  }
}

// iOS 100vh fix
function setViewportUnit() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
window.addEventListener('resize', setViewportUnit);
setViewportUnit();

document.addEventListener('DOMContentLoaded', init);

// Prevent overscroll above header (nickname region)
let lastTouchY = 0;
document.addEventListener('touchstart', (e) => {
  if (e.touches && e.touches.length > 0) lastTouchY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  const currentY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : lastTouchY;
  const dy = currentY - lastTouchY;
  if (dy > 0 && window.scrollY <= 0) {
    e.preventDefault();
  }
  lastTouchY = currentY;
}, { passive: false });
