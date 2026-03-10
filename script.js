/* ═══════════════════════════════════════════════
   PROSPEKTRAI — script.js
═══════════════════════════════════════════════ */

const WEBHOOK_URL = 'https://api.prospektrai.com/webhook/lead-intake';

// ─── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  initNavbar();
  initReveal();
  initEngineAnimation();
  initForm();
});

// ─── Navbar scroll effect ──────────────────────
function initNavbar() {
  const navbar = document.getElementById('navbar');
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
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, i * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => observer.observe(el));
}

// ─── Engine diagram animation ─────────────────
function initEngineAnimation() {
  const nodeCall   = document.getElementById('node-call');
  const nodeAi     = document.getElementById('node-ai');
  const nodeAction = document.getElementById('node-action');

  if (!nodeAi) return;

  const sequence = [nodeCall, nodeAi, nodeAction];
  let step = 0;

  function runSequence() {
    sequence.forEach(n => n.classList.remove('active'));
    sequence[step].classList.add('active');
    step = (step + 1) % sequence.length;
  }

  // Only start when section is in view
  const diagram = document.getElementById('engine-diagram');
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      runSequence();
      setInterval(runSequence, 1200);
      observer.disconnect();
    }
  }, { threshold: 0.5 });

  if (diagram) observer.observe(diagram);
}

// ─── Form ─────────────────────────────────────
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
    const trade    = document.getElementById('f-trade');
    const revenue  = document.getElementById('f-revenue');

    // Validate
    let valid = true;
    [name, business, email, trade, revenue].forEach(field => {
      field.classList.remove('error');
      if (!field.value.trim()) {
        field.classList.add('error');
        valid = false;
      }
    });
    if (!valid) return;
    if (!isValidEmail(email.value)) {
      email.classList.add('error');
      return;
    }

    // Loading state
    submit.classList.add('btn-loading');
    submit.querySelector('span').textContent = 'Sending...';

    const payload = {
      name:        name.value.trim(),
      business:    business.value.trim(),
      email:       email.value.trim(),
      trade:       trade.value,
      revenue:     revenue.value,
      source:      'prospektrai.com',
      timestamp:   new Date().toISOString()
    };

    try {
      await fetch(WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      });
    } catch (err) {
      // Webhook unreachable — still show success (lead data can be recovered from logs)
      console.warn('Webhook unreachable:', err);
    }

    // Show success
    form.style.display = 'none';
    success.classList.remove('hidden');
    lucide.createIcons();
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ═══════════════════════════════════════════════
//   CHAT WIDGET
// ═══════════════════════════════════════════════

const CHAT_WEBHOOK_URL = 'https://api.prospektrai.com/webhook/chat';
const STORAGE_KEY      = 'prospektrai_chat';

let chatState = {
  open:         false,
  stage:        'idle',   // idle → greeting → ask_name → ask_contact → chat
  businessName: '',
  contact:      '',
  sessionId:    null,
  messages:     []
};

// ─── Boot ─────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();

  if (chatState.messages.length > 0) {
    hideTeaser();
    renderAllMessages();
    if (chatState.stage === 'chat') enableInput();
  } else {
    chatState.sessionId = crypto.randomUUID();
    setTimeout(showTeaser, 3500);
  }
});

// ─── Open / Close ─────────────────────────────────
function toggleChat() {
  chatState.open = !chatState.open;
  const panel  = document.getElementById('chat-panel');
  const icon   = document.getElementById('bubble-icon');
  const closeI = document.getElementById('bubble-close');

  panel.classList.toggle('open', chatState.open);
  icon.style.display   = chatState.open ? 'none'  : 'flex';
  closeI.style.display = chatState.open ? 'flex'  : 'none';
  hideTeaser();

  if (chatState.open && chatState.stage === 'idle') {
    chatState.stage = 'greeting';
    startConversation();
  }

  if (chatState.open) {
    setTimeout(() => scrollToBottom(), 100);
    setTimeout(() => document.getElementById('chat-input').focus(), 300);
  }
}

// ─── Teaser ───────────────────────────────────────
function showTeaser() {
  if (chatState.open || chatState.messages.length > 0) return;
  document.getElementById('chat-teaser').classList.remove('hidden');
  document.getElementById('notification-dot').classList.remove('hidden');
}

function hideTeaser() {
  document.getElementById('chat-teaser').classList.add('hidden');
  document.getElementById('notification-dot').classList.add('hidden');
}

function closeTeaser(e) {
  e.stopPropagation();
  hideTeaser();
}

// ─── Conversation flow ────────────────────────────
function startConversation() {
  typeMessage(
    "Hey! 👋 Did you know the average roofer loses <strong>$2,500 a week</strong> in missed calls?\n\nI'm Vicki — ProspektrAI's AI Ops Manager. Want to see exactly how we capture those leads for you?",
    () => {
      showChips(['Yes, show me!', 'How does it work?', 'Not right now']);
    }
  );
}

function handleChip(text) {
  removeChips();
  addUserMessage(text);

  if (text === 'Not right now') {
    typeMessage("No worries! If you ever want to stop losing leads, I'm right here. 💪");
    return;
  }

  chatState.stage = 'ask_name';
  typeMessage("Love the energy! 🔥 Let's get you set up.\n\nFirst — what's your <strong>business name</strong>?");
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
      typeMessage(`Great, <strong>${chatState.businessName}</strong>! 💼\n\nWhat's the best <strong>phone number or email</strong> to reach you?`);
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

// ─── Submit Lead ──────────────────────────────────
async function submitLead(contact) {
  disableInput();
  typeMessage("Perfect — let me lock in your spot... ⚡", async () => {
    try {
      await fetch(CHAT_WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event:        'lead_captured',
          sessionId:    chatState.sessionId,
          businessName: chatState.businessName,
          contact:      contact,
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
        `You're all set, <strong>${chatState.businessName}</strong>! 🎉 We'll reach out to <strong>${chatState.contact}</strong> within 24 hours.\n\nIn the meantime, ask me anything about how our AI works!`,
        () => enableInput()
      );
    }, 3200);
  });
}

// ─── Ask Vicki (AI relay) ─────────────────────────
async function askVicki(message) {
  disableInput();
  const typingId = showTyping();

  try {
    const res = await fetch(CHAT_WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event:        'chat_message',
        sessionId:    chatState.sessionId,
        businessName: chatState.businessName,
        contact:      chatState.contact,
        message:      message,
        timestamp:    new Date().toISOString()
      })
    });

    removeTyping(typingId);

    if (res.ok) {
      const data = await res.json();
      const reply = data.reply || data.message || data.output || "Got it! Let me get back to you shortly.";
      addBotMessage(reply);
    } else {
      throw new Error('bad response');
    }
  } catch {
    removeTyping(typingId);
    addBotMessage("I'm having a quick brain glitch — try that again? 😅");
  }

  enableInput();
  saveToStorage();
}

// ─── Message Rendering ────────────────────────────
function typeMessage(html, callback) {
  const typingId = showTyping();
  const delay    = Math.min(600 + html.length * 8, 2000);

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
  wrap.id        = id;
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
  wrap.id        = id;
  wrap.innerHTML = `<div class="msg-bubble">${escHtml(text)}</div>`;
  document.getElementById('chat-messages').appendChild(wrap);
  scrollToBottom();
}

function renderAllMessages() {
  const container = document.getElementById('chat-messages');
  container.innerHTML = '';
  chatState.messages.forEach(m => {
    if (m.role === 'bot') {
      const wrap = document.createElement('div');
      wrap.className = 'msg bot';
      wrap.innerHTML = `
        <div class="msg-avatar">V</div>
        <div class="msg-bubble">${m.html.replace(/\n/g, '<br>')}</div>
      `;
      container.appendChild(wrap);
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'msg user';
      wrap.innerHTML = `<div class="msg-bubble">${escHtml(m.html)}</div>`;
      container.appendChild(wrap);
    }
  });
  scrollToBottom();
}

// ─── Quick Reply Chips ────────────────────────────
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

// ─── Typing Indicator ─────────────────────────────
function showTyping() {
  const id   = `typing-${Date.now()}`;
  const wrap = document.createElement('div');
  wrap.className = 'msg bot';
  wrap.id        = id;
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

// ─── Success Animation ────────────────────────────
function showSuccess() {
  document.getElementById('success-overlay').classList.add('show');
}

function hideSuccess() {
  document.getElementById('success-overlay').classList.remove('show');
}

// ─── Input Control ────────────────────────────────
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

function sendMessage() {
  processInput(document.getElementById('chat-input').value);
}

function handleKey(e) {
  if (e.key === 'Enter') sendMessage();
}

// ─── Persistence ──────────────────────────────────
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

// ─── Utils ────────────────────────────────────────
function scrollToBottom() {
  const el = document.getElementById('chat-messages');
  el.scrollTop = el.scrollHeight;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
