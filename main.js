// Basic Telegram Mini App demo logic

const telegramWebApp = window.Telegram ? window.Telegram.WebApp : undefined;
// On Vercel, call the serverless function relatively
const BACKEND_URL = '';

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

async function assignTonWallet(telegramUserId, initData) {
  try {
    const storage = window.localStorage;
    const savedAddr = storage.getItem('tonAssignedAddress') || null;
    const savedUid = storage.getItem('tonAssignedUserId') || '';
    const uidStr = (() => {
      if (telegramUserId) return String(telegramUserId);
      try {
        const wa = window.Telegram?.WebApp;
        const fromWa = wa?.initDataUnsafe?.user?.id ? String(wa.initDataUnsafe.user.id) : '';
        if (fromWa) return fromWa;
      } catch (_) {}
      // Stable local fallback for non-Telegram testing
      let loc = storage.getItem('fallbackUserId');
      if (!loc) {
        loc = `anon-${Math.random().toString(36).slice(2)}-${Date.now()}`;
        storage.setItem('fallbackUserId', loc);
      }
      return loc;
    })();

    if (savedAddr && savedUid === uidStr) {
      window.assignedTonAddress = savedAddr;
      return savedAddr;
    }

    const res = await fetch(`${BACKEND_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData || '',
      },
      body: JSON.stringify({ user_id: uidStr || null }),
    });
    if (!res.ok) {
      let errText = '';
      try { const e = await res.json(); errText = e?.error || JSON.stringify(e); } catch(_) { errText = await res.text(); }
      console.warn('Register error', res.status, errText);
      throw new Error(`Register failed: ${res.status}`);
    }
    const data = await res.json();
    const address = data.address;
    if (!address) throw new Error('No address in response');
    storage.setItem('tonAssignedAddress', address);
    storage.setItem('tonAssignedUserId', uidStr);
    window.assignedTonAddress = address;
    return address;
  } catch (e) {
    console.warn('TON wallet assign failed', e);
    return null;
  }
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
  const banners = document.querySelector('.sheet-banners');
  const bannerSlides = banners ? Array.from(banners.querySelectorAll('.sheet-banner')) : [];
  const bannerDots = document.querySelectorAll('.sheet-dots .sheet-dot');
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

    // Pre-assign TON wallet for this Telegram user (idempotent)
    (async () => {
      try {
        await assignTonWallet(user?.id, telegramWebApp?.initData);
      } catch (_) {}
    })();

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
      // Swap home icon image when active/inactive
      const homeImg = btn.querySelector('img.tab-icon-home');
      if (homeImg) {
        homeImg.src = isActive ? 'home2-icon.png' : 'home1-icon.png';
      }
      const histImg = btn.querySelector('img.tab-icon-history');
      if (histImg) {
        histImg.src = isActive ? 'history2-icon.png' : 'history1-icon.png';
      }
      const brImg = btn.querySelector('img.tab-icon-browser');
      if (brImg) {
        brImg.src = isActive ? 'browser2-icon.png' : 'browser1-icon.png';
      }
      const profImg = btn.querySelector('img.tab-icon-profile');
      if (profImg) {
        profImg.src = isActive ? 'profile2-icon.png' : 'profile1-icon.png';
      }
    });
  }

  tabs.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Banner dots click -> scroll to slide
  if (banners && bannerSlides.length && bannerDots.length) {
    bannerDots.forEach((dot, idx) => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        const slide = bannerSlides[idx];
        if (slide) {
          const targetLeft = slide.offsetLeft - banners.offsetLeft;
          banners.scrollTo({ left: targetLeft, behavior: 'smooth' });
        }
      });
    });
    // Observe scroll position to update active dot
    let bannerIndex = 0;
    const updateDot = () => {
      const scrollLeft = banners.scrollLeft;
      const slideWidth = bannerSlides[0].getBoundingClientRect().width + parseFloat(getComputedStyle(banners).columnGap || getComputedStyle(banners).gap || 12);
      const newIndex = Math.round(scrollLeft / slideWidth);
      if (newIndex !== bannerIndex) {
        bannerIndex = newIndex;
        bannerDots.forEach((d, i) => d.classList.toggle('active', i === bannerIndex));
      }
    };
    banners.addEventListener('scroll', () => { window.requestAnimationFrame(updateDot); }, { passive: true });
    updateDot();
  }

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
    plusBtn.addEventListener('click', async () => {
      try { telegramWebApp?.HapticFeedback?.impactOccurred('light'); } catch (_) {}
      const addr = window.assignedTonAddress || await assignTonWallet(telegramWebApp?.initDataUnsafe?.user?.id, telegramWebApp?.initData);
      if (addr) {
        alert(`Ваш адрес для пополнения (TON):\n${addr}`);
      } else {
        alert('Не удалось получить адрес для пополнения. Повторите позже.');
      }
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
