/* ═══════════════════════════════════════════════
   PROSPEKTRAI — script.js  v2.0
═══════════════════════════════════════════════ */

const WEBHOOK_URL      = 'https://api.prospektrai.com/webhook/lead-intake';
const CHAT_WEBHOOK_URL = 'https://api.prospektrai.com/webhook/chat';
const STORAGE_KEY      = 'prospektrai_chat';

// ─── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  initNavbar();
  initReveal();
  initCountUp();
  initSpotsBar();
  initROICalc();
  initForm();
  loadFromStorage();

  if (chatState.messages.length > 0) {
    hideTeaser();
    renderAllMessages();
    if (['ask_name', 'ask_contact', 'chat'].includes(chatState.stage)) enableInput();
  } else {
    chatState.sessionId = crypto.randomUUID();
    setTimeout(showTeaser, 4000);
  }
});

// ─── Navbar ────────────────────────────────────
function initNavbar() {
  const navbar    = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navMobile = document.getElementById('nav-mobile');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  hamburger.addEventListener('click', () => {
    navMobile.classList.toggle('open');
  });
}

window.closeMobile = function () {
  document.getElementById('nav-mobile').classList.remove('open');
};

// ─── Reveal on scroll ─────────────────────────
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  els.forEach(el => observer.observe(el));
}

// ─── Count-Up Animation ───────────────────────
function initCountUp() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const els = document.querySelectorAll('[data-countup]');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      if (prefersReduced) return; // leave static text
      animateCountUp(entry.target);
    });
  }, { threshold: 0.6 });

  els.forEach(el => observer.observe(el));
}

function animateCountUp(el) {
  const target  = parseFloat(el.getAttribute('data-countup'));
  const prefix  = el.getAttribute('data-prefix') || '';
  const suffix  = el.getAttribute('data-suffix') || '';
  const isFloat = !Number.isInteger(target);
  const duration = 1400;
  const startTime = performance.now();

  function tick(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current  = target * eased;

    el.textContent = prefix + (isFloat ? current.toFixed(1) : Math.round(current).toLocaleString()) + suffix;

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = prefix + (isFloat ? target.toFixed(1) : target.toLocaleString()) + suffix;
    }
  }

  requestAnimationFrame(tick);
}

// ─── Spots Bar Animation ──────────────────────
function initSpotsBar() {
  const bar = document.querySelector('.spots-bar-fill');
  if (!bar) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      // Slight delay so the card finishes revealing first
      setTimeout(() => { bar.style.width = '30%'; }, 300);
    });
  }, { threshold: 0.5 });

  observer.observe(bar);
}

// ─── ROI Calculator ────────────────────────────
function initROICalc() {
  const jobSlider   = document.getElementById('calc-job');
  const callsSlider = document.getElementById('calc-calls');
  if (!jobSlider || !callsSlider) return;

  function update() {
    const jobVal   = parseInt(jobSlider.value);
    const callsVal = parseInt(callsSlider.value);

    document.getElementById('calc-job-display').textContent   = '$' + jobVal.toLocaleString();
    document.getElementById('calc-calls-display').textContent = callsVal + ' call' + (callsVal !== 1 ? 's' : '') + ' / week';

    // 25% close rate on missed leads, 4.33 weeks/month
    const monthly = Math.round(jobVal * callsVal * 0.25 * 4.33);
    const annual  = monthly * 12;

    document.getElementById('calc-monthly').textContent = '$' + monthly.toLocaleString();
    document.getElementById('calc-annual').textContent  = '$' + annual.toLocaleString();

    // Update slider fill
    updateSliderFill(jobSlider,   jobVal,   500, 10000);
    updateSliderFill(callsSlider, callsVal, 1,   25);
  }

  jobSlider.addEventListener('input',   update);
  callsSlider.addEventListener('input', update);
  update(); // init
}

function updateSliderFill(slider, val, min, max) {
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(to right, var(--amber) ${pct}%, var(--border) ${pct}%)`;
}

// ─── FAQ ───────────────────────────────────────
window.toggleFaq = function (el) {
  const item = el.closest('.faq-item');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
};

// ─── Audit Form ────────────────────────────────
function initForm() {
  const form    = document.getElementById('audit-form');
  const success = document.getElementById('form-success');
  const submit  = document.getElementById('form-submit');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name     = document.getElementById('f-name');
    const business = document.getElementById('f-business');
    const email    = document.getElementById('f-email');
    const phone    = document.getElementById('f-phone');
    const trade    = document.getElementById('f-trade');
    const revenue  = document.getElementById('f-revenue');

    let valid = true;
    [name, business, email, trade, revenue].forEach(field => {
      field.classList.remove('error');
      if (!field.value.trim()) { field.classList.add('error'); valid = false; }
    });
    if (!valid) return;
    if (!isValidEmail(email.value)) { email.classList.add('error'); return; }

    submit.classList.add('btn-loading');
    submit.querySelector('span').textContent = 'Sending...';

    const payload = {
      name:      name.value.trim(),
      business:  business.value.trim(),
      email:     email.value.trim(),
      phone:     phone ? phone.value.trim() : '',
      trade:     trade.value,
      revenue:   revenue.value,
      source:    'prospektrai.com',
      timestamp: new Date().toISOString()
    };

    try {
      await fetch(WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('Webhook unreachable:', err);
    }

    form.style.display = 'none';
    success.classList.remove('hidden');
    lucide.createIcons();
  });
}

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

// ═══════════════════════════════════════════════
//   CHAT WIDGET
// ═══════════════════════════════════════════════

let chatState = {
  open:         false,
  stage:        'idle',
  businessName: '',
  contact:      '',
  sessionId:    null,
  messages:     []
};

// ─── Open / Close ──────────────────────────────
window.toggleChat = function () {
  chatState.open = !chatState.open;
  const panel  = document.getElementById('chat-panel');
  const icon   = document.getElementById('bubble-icon');
  const closeI = document.getElementById('bubble-close');

  panel.classList.toggle('open', chatState.open);
  icon.style.display   = chatState.open ? 'none' : 'flex';
  closeI.style.display = chatState.open ? 'flex' : 'none';
  hideTeaser();

  if (chatState.open && (chatState.stage === 'idle' || chatState.stage === 'greeting')) {
    chatState.stage = 'greeting';
    startConversation();
  }
  if (chatState.open) {
    setTimeout(() => scrollToBottom(), 100);
    setTimeout(() => document.getElementById('chat-input').focus(), 300);
  }
};

// ─── Teaser ────────────────────────────────────
function showTeaser() {
  if (chatState.open || chatState.messages.length > 0) return;
  document.getElementById('chat-teaser').classList.remove('hidden');
  document.getElementById('notification-dot').classList.remove('hidden');
}

function hideTeaser() {
  document.getElementById('chat-teaser').classList.add('hidden');
  document.getElementById('notification-dot').classList.add('hidden');
}

window.closeTeaser = function (e) {
  e.stopPropagation();
  hideTeaser();
};

// ─── Conversation flow ─────────────────────────
function startConversation() {
  typeMessage(
    "Hey! 👋 I'm Vicki — ProspektrAI's AI Office Manager.\n\nI help contractors stop losing leads to voicemail. Want to see how many jobs you might be missing right now?",
    () => showChips(['Yes, show me!', 'How does this work?', 'Not right now'])
  );
}

function handleChip(text) {
  removeChips();
  addUserMessage(text);

  if (text === 'Not right now') {
    typeMessage("No problem! I'm here whenever you're ready. If leads start going cold, you know where to find me. 💪");
    return;
  }
  if (text === 'How does this work?') {
    typeMessage(
      "Great question! Here's the short version:\n\n1️⃣ A lead calls your number and you miss it\n2️⃣ I text them back within 60 seconds\n3️⃣ I qualify them (budget, timeline, job type)\n4️⃣ I book the estimate to your calendar\n\nYou just show up to close. Want to get set up?",
      () => showChips(["Yes, let's do it!", 'Tell me more'])
    );
    return;
  }

  chatState.stage = 'ask_name';
  typeMessage("Love it! 🔥 Let's start your free lead audit.\n\nFirst — what's your <strong>business name</strong>?");
  enableInput();
}

function processInput(text) {
  if (!text.trim()) return;
  addUserMessage(text);
  document.getElementById('chat-input').value = '';

  switch (chatState.stage) {
    case 'ask_name':
      chatState.businessName = text.trim();
      chatState.stage = 'ask_contact';
      typeMessage(`Great — <strong>${chatState.businessName}</strong>! 💼\n\nWhat's the best <strong>phone number or email</strong> to reach you at?`);
      break;
    case 'ask_contact':
      chatState.contact = text.trim();
      chatState.stage = 'chat';
      submitLead(text);
      break;
    case 'chat':
      askVicki(text);
      break;
  }
}

// ─── Submit Lead ───────────────────────────────
async function submitLead(contact) {
  disableInput();
  typeMessage("Perfect — locking in your spot... ⚡", async () => {
    try {
      await fetch(CHAT_WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event:        'lead_captured',
          sessionId:    chatState.sessionId,
          businessName: chatState.businessName,
          contact,
          timestamp:    new Date().toISOString()
        })
      });
    } catch (err) {
      console.warn('Webhook unreachable:', err);
    }

    showSuccess();
    setTimeout(() => {
      hideSuccess();
      typeMessage(
        `You're all set, <strong>${chatState.businessName}</strong>! 🎉\n\nWe'll reach out to <strong>${chatState.contact}</strong> within 24 hours with your custom audit.\n\nIn the meantime — any questions about how Vicki works?`,
        () => enableInput()
      );
    }, 3000);
  });
}

// ─── Ask Vicki (AI relay) ──────────────────────
async function askVicki(message) {
  disableInput();
  const typingId = showTyping();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(CHAT_WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal:  controller.signal,
      body: JSON.stringify({
        event:        'chat_message',
        sessionId:    chatState.sessionId,
        businessName: chatState.businessName,
        contact:      chatState.contact,
        message,
        timestamp:    new Date().toISOString()
      })
    });
    clearTimeout(timeout);

    removeTyping(typingId);
    if (res.ok) {
      const data = await res.json();
      const reply = data.reply || data.message || data.output || "Got it — let me follow up on that shortly!";
      addBotMessage(reply);
    } else {
      throw new Error('bad response');
    }
  } catch {
    removeTyping(typingId);
    addBotMessage("I'm thinking — give me one moment, or <a href='/#contact' style='color:var(--amber)'>book your free audit here</a>. 🗓️");
  }

  enableInput();
  saveToStorage();
}

// ─── Message Rendering ─────────────────────────
function typeMessage(html, callback) {
  const typingId = showTyping();
  const delay    = Math.min(500 + html.length * 7, 1800);
  setTimeout(() => {
    removeTyping(typingId);
    addBotMessage(html);
    saveToStorage();
    if (callback) setTimeout(callback, 300);
  }, delay);
}

function addBotMessage(html) {
  const id = `msg-${Date.now()}`;
  chatState.messages.push({ role: 'bot', html, id });
  const wrap = document.createElement('div');
  wrap.className = 'msg bot';
  wrap.id = id;
  wrap.innerHTML = `
    <div class="msg-avatar">V</div>
    <div class="msg-bubble">${html.replace(/\n/g, '<br>')}</div>
  `;
  document.getElementById('chat-messages').appendChild(wrap);
  scrollToBottom();
}

function addUserMessage(text) {
  const id = `msg-${Date.now()}`;
  chatState.messages.push({ role: 'user', html: text, id });
  const wrap = document.createElement('div');
  wrap.className = 'msg user';
  wrap.id = id;
  wrap.innerHTML = `<div class="msg-bubble">${escHtml(text)}</div>`;
  document.getElementById('chat-messages').appendChild(wrap);
  scrollToBottom();
}

function renderAllMessages() {
  const container = document.getElementById('chat-messages');
  container.innerHTML = '';
  chatState.messages.forEach(m => {
    const wrap = document.createElement('div');
    if (m.role === 'bot') {
      wrap.className = 'msg bot';
      wrap.innerHTML = `<div class="msg-avatar">V</div><div class="msg-bubble">${m.html.replace(/\n/g, '<br>')}</div>`;
    } else {
      wrap.className = 'msg user';
      wrap.innerHTML = `<div class="msg-bubble">${escHtml(m.html)}</div>`;
    }
    container.appendChild(wrap);
  });
  scrollToBottom();
}

// ─── Chips ─────────────────────────────────────
function showChips(options) {
  const container = document.getElementById('chat-messages');
  const chips = document.createElement('div');
  chips.className = 'quick-replies';
  chips.id = 'chip-row';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className   = 'chip';
    btn.textContent = opt;
    btn.onclick     = () => handleChip(opt);
    chips.appendChild(btn);
  });
  container.appendChild(chips);
  scrollToBottom();
}

function removeChips() {
  const chips = document.getElementById('chip-row');
  if (chips) chips.remove();
}

// ─── Typing Indicator ──────────────────────────
function showTyping() {
  const id   = `typing-${Date.now()}`;
  const wrap = document.createElement('div');
  wrap.className = 'msg bot';
  wrap.id = id;
  wrap.innerHTML = `
    <div class="msg-avatar">V</div>
    <div class="msg-bubble typing-bubble">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
  `;
  document.getElementById('chat-messages').appendChild(wrap);
  scrollToBottom();
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ─── Success ───────────────────────────────────
function showSuccess() { document.getElementById('success-overlay').classList.add('show'); }
function hideSuccess() { document.getElementById('success-overlay').classList.remove('show'); }

// ─── Input ─────────────────────────────────────
function enableInput() {
  const input = document.getElementById('chat-input');
  const btn   = document.getElementById('send-btn');
  input.disabled = false;
  btn.disabled   = false;
  input.focus();
}

function disableInput() {
  document.getElementById('chat-input').disabled = true;
  document.getElementById('send-btn').disabled   = true;
}

window.sendMessage = function () {
  processInput(document.getElementById('chat-input').value);
};

window.handleKey = function (e) {
  if (e.key === 'Enter') sendMessage();
};

// ─── Storage ───────────────────────────────────
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      stage:        chatState.stage,
      businessName: chatState.businessName,
      contact:      chatState.contact,
      sessionId:    chatState.sessionId,
      messages:     chatState.messages.slice(-60)
    }));
  } catch {}
}

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const data = JSON.parse(saved);
    chatState.stage        = data.stage        || 'idle';
    chatState.businessName = data.businessName || '';
    chatState.contact      = data.contact      || '';
    chatState.sessionId    = data.sessionId    || crypto.randomUUID();
    chatState.messages     = data.messages     || [];
  } catch {}
}

// ─── Utils ─────────────────────────────────────
function scrollToBottom() {
  const el = document.getElementById('chat-messages');
  if (el) el.scrollTop = el.scrollHeight;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
