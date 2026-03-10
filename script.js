/* ═══════════════════════════════════════════════
   PROSPEKTRAI — script.js
═══════════════════════════════════════════════ */

const WEBHOOK_URL = 'https://api.prospektrai.com/webhook/website-lead-intake';

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
