/* mj2y.com — portfolio interactions: reveal, active nav, mobile menu, EN/KO i18n */
(() => {
  'use strict';

  /* ---------- i18n (English primary, Korean via toggle) ---------- */
  const LANG_KEY = 'mj2y.lang';
  const nodes = [...document.querySelectorAll('[data-ko], [data-ko-h]')];
  nodes.forEach(el => { el._en = (el.dataset.koH != null) ? el.innerHTML : el.textContent; });

  function applyLang(lang) {
    const ko = lang === 'ko';
    nodes.forEach(el => {
      if (el.dataset.koH != null) el.innerHTML = ko ? el.dataset.koH : el._en;
      else el.textContent = ko ? el.dataset.ko : el._en;
    });
    document.documentElement.lang = ko ? 'ko' : 'en';
    document.body.classList.toggle('lang-ko', ko);
    const label = document.getElementById('langlabel');
    if (label) label.textContent = ko ? 'EN' : 'KO';   // shows the language you can switch TO
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
  }

  let lang = 'en';
  try { lang = localStorage.getItem(LANG_KEY) || 'en'; } catch (e) {}
  applyLang(lang);

  const toggle = document.getElementById('langtoggle');
  if (toggle) toggle.addEventListener('click', () => {
    lang = (document.documentElement.lang === 'ko') ? 'en' : 'ko';
    applyLang(lang);
  });

  /* ---------- reveal on scroll ---------- */
  const revs = document.querySelectorAll('.rev');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revs.forEach(el => io.observe(el));
  } else {
    revs.forEach(el => el.classList.add('in'));
  }

  /* ---------- active nav link ---------- */
  const links = [...document.querySelectorAll('.navlink')];
  const map = links.map(a => ({ a, sec: document.querySelector(a.getAttribute('href')) })).filter(x => x.sec);
  if ('IntersectionObserver' in window && map.length) {
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = '#' + e.target.id;
          links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === id));
        }
      });
    }, { threshold: 0.5, rootMargin: '-30% 0px -45% 0px' });
    map.forEach(x => io2.observe(x.sec));
  }

  /* ---------- mobile menu ---------- */
  const burger = document.getElementById('burger');
  const nav = document.querySelector('.pf-nav');
  const navlinks = document.getElementById('navlinks');
  if (burger && navlinks) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      Object.assign(navlinks.style, open
        ? { display: 'flex', position: 'absolute', top: '100%', right: '8px', marginTop: '8px', flexDirection: 'column',
            background: 'rgba(20,19,16,.97)', padding: '8px', borderRadius: '14px', gap: '2px' }
        : { display: '' });
    });
    navlinks.addEventListener('click', e => {
      if (e.target.tagName === 'A' && nav.classList.contains('open')) { nav.classList.remove('open'); navlinks.style.display = ''; }
    });
  }
})();
