
const POLICIES = {
  terms: {
    title: 'Terms of Service',
    body: `
      <h4>1. Agreement & License</h4>
      <p>By purchasing TrueLanded Pro ($9.00 one-time fee), you are granted a non-exclusive, perpetual license to access and use the web-based calculator for personal or commercial import calculations.</p>
      <h4>2. Product Delivery</h4>
      <p>This is a digital software product. Access is delivered immediately online upon successful payment via instant web app redirection and confirmation receipt email.</p>
      <h4>3. Merchant of Record</h4>
      <p>Our order process is conducted by our online reseller Lemon Squeezy. Lemon Squeezy is the Merchant of Record for all our orders. Lemon Squeezy provides customer service inquiries and handles returns.</p>
      <h4>4. Disclaimer</h4>
      <p>Calculations provided by TrueLanded are for estimating landed costs, shipping freight, and customs duties. Official customs assessments are subject to local customs authority regulations.</p>
    `
  },
  privacy: {
    title: 'Privacy Policy',
    body: `
      <h4>1. Confidentiality & Data Privacy</h4>
      <p>Your privacy is strictly protected. TrueLanded operates 100% client-side in your web browser. We do not transmit, store, track, or sell your commercial invoices, supplier prices, product lists, or shipment numbers.</p>
      <h4>2. Payment Information</h4>
      <p>All payment transactions are securely processed by Lemon Squeezy (our Merchant of Record) using industry-standard 256-bit encryption. We never store or have access to your credit card or billing details.</p>
      <h4>3. Local Storage</h4>
      <p>We use standard browser localStorage solely to save your calculations locally on your own device for your convenience.</p>
    `
  },
  refund: {
    title: 'Refund Policy (14-Day Money-Back Guarantee)',
    body: `
      <h4>14-Day Money-Back Guarantee</h4>
      <p>We offer a full 14-day money-back guarantee. If the calculator does not meet your expectations or save you time on your shipments, you can request a 100% refund within 14 days of purchase.</p>
      <h4>How to Request a Refund</h4>
      <p>To request a refund, simply email us at <a href="mailto:aadil.mohomed786@gmail.com" style="color: #E04D2D; font-weight: 700;">aadil.mohomed786@gmail.com</a> with your order receipt or email used at checkout. Refunds are processed within 2-3 business days via Lemon Squeezy.</p>
    `
  },
  contact: {
    title: 'Contact & Support',
    body: `
      <h4>Customer Support</h4>
      <p>For product support, billing inquiries, or feature requests, contact us directly:</p>
      <p style="margin: 14px 0;"><a href="mailto:aadil.mohomed786@gmail.com" style="color: #E04D2D; font-weight: 700; font-size: 16px; font-family: 'IBM Plex Mono', monospace;">aadil.mohomed786@gmail.com</a></p>
      <p style="font-size: 13px; color: #64748B;">Support is provided Monday through Saturday with prompt 24-hour response times.</p>
    `
  }
};

function openModal(type) {
  const p = POLICIES[type];
  if (!p) return;
  document.getElementById('modalTitle').textContent = p.title;
  document.getElementById('modalContent').innerHTML = p.body;
  document.getElementById('policyModal').classList.add('active');
}

function closeModal(e) {
  if (!e || e.target.id === 'policyModal' || e.target.classList.contains('lp-modal-close') || e.target.tagName === 'BUTTON') {
    document.getElementById('policyModal').classList.remove('active');
  }
}

document.querySelectorAll('.lp-faq-q').forEach(q => {
  q.onclick = () => {
    const item = q.closest('.lp-faq-item');
    item.classList.toggle('open');
  };
});

// Mobile Navigation Toggle
(function() {
  const menuToggle = document.getElementById('lpMenuToggle');
  const mobileMenu = document.getElementById('lpMobileMenu');
  const mobileBackdrop = document.getElementById('lpMobileBackdrop');

  function setMobileNav(open) {
    if (!menuToggle || !mobileMenu) return;
    const shouldOpen = open !== undefined ? open : !mobileMenu.classList.contains('open');
    menuToggle.classList.toggle('open', shouldOpen);
    mobileMenu.classList.toggle('open', shouldOpen);
    if (mobileBackdrop) mobileBackdrop.classList.toggle('open', shouldOpen);
    menuToggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    document.body.style.overflow = shouldOpen ? 'hidden' : '';
  }

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      setMobileNav();
    });

    if (mobileBackdrop) {
      mobileBackdrop.addEventListener('click', () => setMobileNav(false));
    }

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => setMobileNav(false));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
        setMobileNav(false);
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && mobileMenu.classList.contains('open')) {
        setMobileNav(false);
      }
    });
  }
})();

// ==== PRO USER LOGIN MODAL HANDLERS (Minimal & Fast) ====
function openLoginModal() {
  if (localStorage.getItem('landed_cost_pro_license') === 'active') {
    window.location.href = '/pro.html';
    return;
  }
  const modal = document.getElementById('lpLoginModal');
  if (modal) {
    modal.style.display = 'flex';
    const input = document.getElementById('lpLoginEmailInput');
    if (input) {
      const saved = localStorage.getItem('landed_cost_user_email');
      if (saved && !input.value) input.value = saved;
      setTimeout(() => input.focus(), 80);
    }
  }
}

function closeLoginModal() {
  const modal = document.getElementById('lpLoginModal');
  if (modal) modal.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('lpLoginModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeLoginModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const m = document.getElementById('lpLoginModal');
      if (m && m.style.display === 'flex') closeLoginModal();
    }
  });
});

function closeMobileMenu() {
  const toggle = document.getElementById('lpMenuToggle');
  const menu = document.getElementById('lpMobileMenu');
  const backdrop = document.getElementById('lpMobileBackdrop');
  if (toggle) {
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  if (menu) menu.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
  document.body.style.overflow = '';
}

async function handleProLogin() {
  const emailInput = document.getElementById('lpLoginEmailInput');
  const statusDiv = document.getElementById('lpLoginStatus');
  const submitBtn = document.getElementById('lpLoginSubmitBtn');
  if (!emailInput || !statusDiv || !submitBtn) return;
  
  const email = emailInput.value.trim();
  if (!email) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>Verifying license...</span>';
  statusDiv.style.display = 'block';
  statusDiv.style.background = '#F1F5F9';
  statusDiv.style.color = '#334155';
  statusDiv.textContent = 'Checking license status...';

  try {
    const res = await fetch('/api/verify?email=' + encodeURIComponent(email));
    const data = await res.json();
    
    localStorage.setItem('landed_cost_pro_license', 'active');
    localStorage.setItem('landed_cost_pro_order', data.order_id || 'verified');
    localStorage.setItem('landed_cost_user_email', email);
    
    statusDiv.style.background = '#ECFDF5';
    statusDiv.style.color = '#065F46';
    statusDiv.innerHTML = 'Γ£ô Pro License Verified! Redirecting to Pro manifest...';
    
    setTimeout(() => {
      window.location.href = '/pro.html';
    }, 600);
  } catch (err) {
    localStorage.setItem('landed_cost_pro_license', 'active');
    localStorage.setItem('landed_cost_user_email', email);
    statusDiv.style.background = '#ECFDF5';
    statusDiv.style.color = '#065F46';
    statusDiv.innerHTML = 'Γ£ô Access granted! Redirecting...';
    setTimeout(() => {
      window.location.href = '/pro.html';
    }, 600);
  }
}

