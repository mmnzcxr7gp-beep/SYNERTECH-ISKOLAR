document.addEventListener('DOMContentLoaded', () => {
  const loginModal = document.getElementById('loginModal');
  const openBtns = [document.getElementById('loginBtnHeader'), document.getElementById('loginBtnHero'), document.getElementById('footerLogin')];
  openBtns.forEach((b) => { if (b) b.addEventListener('click', openLogin); });

  // close handlers
  document.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeLogin));
  document.querySelectorAll('.modal-close').forEach((el) => el.addEventListener('click', closeLogin));

  // smooth scroll for nav links
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
      }
    });
  });
});

function openLogin() {
  const modal = document.getElementById('loginModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeLogin() {
  const modal = document.getElementById('loginModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

async function siteLogin() {
  const email = document.getElementById('siteEmail').value.trim();
  const password = document.getElementById('sitePassword').value;
  const msg = document.getElementById('siteLoginMsg');
  msg.textContent = '';
  if (!email || !password) { msg.textContent = 'Provide email and password'; return; }

  try {
    const res = await fetch(window.location.origin + '/api/auth/login', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({email, password})
    });
    if (!res.ok) {
      const b = await res.json().catch(()=>({}));
      msg.textContent = b.message || 'Login failed';
      return;
    }
    const body = await res.json();
    // Store the same token key the admin dashboard expects
    localStorage.setItem('admin_token', body.token);
    // Redirect to admin dashboard
    window.location.href = '/admin';
  } catch (e) {
    console.error(e);
    msg.textContent = 'Network error';
  }
}
