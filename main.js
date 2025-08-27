// Basic Telegram Mini App demo logic

const telegramWebApp = window.Telegram ? window.Telegram.WebApp : undefined;

function applyThemeFromTelegram(themeParams = {}, colorScheme) {
  const root = document.documentElement.style;
  const pick = (key, fallback) => (themeParams[key] || fallback);

  const isDark = colorScheme === 'dark';
  root.setProperty('--bg', pick('bg_color', isDark ? '#0f0f0f' : '#ffffff'));
  root.setProperty('--text', pick('text_color', isDark ? '#ffffff' : '#0f0f0f'));
  root.setProperty('--hint', pick('hint_color', isDark ? '#9aa0a6' : '#6b7280'));
  root.setProperty('--link', pick('link_color', '#2481cc'));
  root.setProperty('--button', pick('button_color', '#2aabee'));
  root.setProperty('--button-text', pick('button_text_color', '#ffffff'));
  root.setProperty('--card', pick('secondary_bg_color', isDark ? '#161616' : '#f3f4f6'));
  root.setProperty('--border', isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)');
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

  const isTelegram = Boolean(telegramWebApp);

  if (isTelegram) {
    telegramWebApp.ready();
    try { telegramWebApp.expand(); } catch (_) {}

    // Theme
    applyThemeFromTelegram(telegramWebApp.themeParams, telegramWebApp.colorScheme);
    telegramWebApp.onEvent('themeChanged', () => {
      applyThemeFromTelegram(telegramWebApp.themeParams, telegramWebApp.colorScheme);
    });

    // User greeting
    const user = telegramWebApp.initDataUnsafe?.user;
    if (user) {
      const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
      greeting.textContent = `Привет, ${name}!`;
    } else {
      greeting.textContent = 'Привет!';
    }

    // Back button closes app
    telegramWebApp.BackButton.show();
    telegramWebApp.BackButton.onClick(() => {
      telegramWebApp.close();
    });

    // Main button mirrors form state
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
    // Fallback for normal browser
    envNotice.hidden = false;
    greeting.textContent = 'Откройте это приложение внутри Telegram для полного функционала.';
  }

  function sendData() {
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

  sendBtn.addEventListener('click', sendData);
  hapticBtn.addEventListener('click', () => {
    try { telegramWebApp?.HapticFeedback?.impactOccurred('light'); } catch (_) {}
  });
}

// iOS 100vh fix
function setViewportUnit() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
window.addEventListener('resize', setViewportUnit);
setViewportUnit();

document.addEventListener('DOMContentLoaded', init);


