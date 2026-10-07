(function () {
  'use strict';
  const intro = document.getElementById('brand-intro');
  const storageKey = 'pipizza-intro-last-shown';
  const interval = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  // If browser storage is unavailable, skip the intro instead of repeating it.
  let showIntro = false;
  try {
    const last = Number(localStorage.getItem(storageKey)) || 0;
    showIntro = now - last >= interval && !new URLSearchParams(location.search).has('pizza') && !location.hash && !reducedMotion.matches;
    if (showIntro) localStorage.setItem(storageKey, String(now));
  } catch (_) { /* The shop remains usable without storage. */ }
  if (intro && showIntro) {
    const previousFocus = document.activeElement;
    const background = [...document.body.children].filter(element => element !== intro && element.tagName !== 'SCRIPT');
    const inertStates = background.map(element => [element, element.inert]);
    inertStates.forEach(([element]) => { element.inert = true; });
    intro.hidden = false;
    intro.setAttribute('aria-hidden', 'false');
    document.body.classList.add('intro-playing');
    const logoWidth = intro.querySelector('.intro-brand').getBoundingClientRect().width;
    const zoom = Math.max(6, Math.ceil(Math.max(innerWidth / logoWidth, innerHeight / (logoWidth * 636 / 1400)) * 1.8));
    intro.style.setProperty('--intro-scale', String(zoom));
    let finished = false;
    let dismissTimer;
    const dismiss = () => {
      if (finished) return;
      finished = true;
      const restoreFocus = intro.contains(document.activeElement);
      clearTimeout(dismissTimer);
      intro.hidden = true;
      intro.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('intro-playing');
      inertStates.forEach(([element, inert]) => { element.inert = inert; });
      document.getElementById('skip-intro').removeEventListener('click', dismiss);
      document.removeEventListener('keydown', onIntroKeydown);
      intro.removeEventListener('animationend', onIntroAnimationEnd);
      reducedMotion.removeEventListener('change', onMotionChange);
      if (restoreFocus) {
        const target = previousFocus && previousFocus !== document.body && previousFocus.isConnected ? previousFocus : document.querySelector('.skip-link');
        target?.focus({preventScroll: true});
      }
      document.dispatchEvent(new Event('pipizza-intro-finished'));
    };
    const onIntroKeydown = event => { if (event.key === 'Escape') dismiss(); };
    const onIntroAnimationEnd = event => { if (event.target === intro && event.animationName === 'pi-intro-reveal') dismiss(); };
    const onMotionChange = event => { if (event.matches) dismiss(); };
    document.getElementById('skip-intro').addEventListener('click', dismiss);
    document.addEventListener('keydown', onIntroKeydown);
    intro.addEventListener('animationend', onIntroAnimationEnd);
    reducedMotion.addEventListener('change', onMotionChange);
    dismissTimer = setTimeout(dismiss, 2150);
  }

  document.querySelectorAll('[data-hero-carousel]').forEach(carousel => {
    const slides = [...carousel.querySelectorAll('[data-hero-slide]')];
    const dots = [...carousel.querySelectorAll('[data-hero-go]')];
    const pauseButton = carousel.querySelector('[data-hero-pause]');
    const status = carousel.querySelector('[data-hero-status]');
    if (slides.length < 2) return;
    let activeIndex = Math.max(0, slides.findIndex(slide => !slide.hidden));
    let timer;
    let paused = false;
    let hovered = false;
    let inViewport = true;

    function schedule() {
      clearTimeout(timer);
      if (pauseButton) {
        pauseButton.hidden = reducedMotion.matches;
        pauseButton.setAttribute('aria-pressed', String(paused));
        pauseButton.setAttribute('aria-label', paused ? 'Spustit střídání nabídek' : 'Pozastavit střídání nabídek');
        pauseButton.textContent = paused ? 'Spustit' : 'Pozastavit';
      }
      if (paused || hovered || reducedMotion.matches || document.hidden || !inViewport || carousel.contains(document.activeElement) || carousel.closest('[hidden]') || (intro && !intro.hidden) || document.querySelector('dialog[open]')) return;
      timer = setTimeout(() => selectSlide(activeIndex + 1, false), 6000);
    }

    function selectSlide(index, announce = true) {
      activeIndex = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === activeIndex;
        slide.hidden = !active;
        slide.inert = !active;
        slide.setAttribute('aria-hidden', String(!active));
      });
      dots.forEach(dot => dot.setAttribute('aria-pressed', String(Number(dot.dataset.heroGo) === activeIndex)));
      if (status) {
        status.setAttribute('aria-live', announce ? 'polite' : 'off');
        status.textContent = `Nabídka ${activeIndex + 1} ze ${slides.length}`;
      }
      schedule();
    }

    carousel.addEventListener('click', event => {
      if (event.target.closest('[data-hero-prev]')) selectSlide(activeIndex - 1);
      else if (event.target.closest('[data-hero-next]')) selectSlide(activeIndex + 1);
      else if (event.target.closest('[data-hero-go]')) selectSlide(Number(event.target.closest('[data-hero-go]').dataset.heroGo));
      else if (event.target.closest('[data-hero-pause]')) { paused = !paused; schedule(); }
    });
    carousel.addEventListener('keydown', event => {
      if (!event.target.closest('.hero-controls') || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      selectSlide(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
    });
    carousel.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovered = true; schedule(); } });
    carousel.addEventListener('pointerleave', () => { hovered = false; schedule(); });
    carousel.addEventListener('focusin', schedule);
    carousel.addEventListener('focusout', () => { setTimeout(schedule, 0); });
    document.addEventListener('visibilitychange', schedule);
    document.addEventListener('pipizza-intro-finished', schedule);
    reducedMotion.addEventListener('change', schedule);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        inViewport = entries[0].isIntersecting;
        schedule();
      }).observe(carousel);
    }
    const visibilityObserver = new MutationObserver(schedule);
    const home = document.getElementById('home-page');
    if (home) visibilityObserver.observe(home, {attributes: true, attributeFilter: ['hidden']});
    document.querySelectorAll('dialog').forEach(dialog => visibilityObserver.observe(dialog, {attributes: true, attributeFilter: ['open']}));
    selectSlide(activeIndex, false);
  });
  function renderDelivery() {
    const state = window.PiDelivery.state;
    document.getElementById('radar-estimate').textContent = state.label;
    const load = document.getElementById('radar-load');
    load.setAttribute('aria-label', `Vytížení: ${state.level} ${state.level === 1 ? 'čtvereček' : 'čtverečky'}`);
    load.querySelectorAll('i').forEach((square, index) => square.classList.toggle('filled', index < state.level));
    load.querySelector('span').textContent = state.level === 1 ? 'Pečeme průběžně' : 'Dnes máme více objednávek';
    document.querySelectorAll('[data-delivery-level]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.deliveryLevel) === state.level)));
  }
  if (window.PiDelivery) {
    document.querySelectorAll('[data-delivery-level]').forEach(button => button.addEventListener('click', () => window.PiDelivery.setLevel(Number(button.dataset.deliveryLevel))));
    window.addEventListener('pi-delivery-change', renderDelivery);
    renderDelivery();
  }
})();
