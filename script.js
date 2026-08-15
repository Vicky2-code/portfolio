document.addEventListener('DOMContentLoaded', () => {
  /* ---------- Cursor trail (dots + lines) ---------- */
  const trailCanvas = document.getElementById('cursorTrail');
  if (trailCanvas) {
  const ctx = trailCanvas.getContext('2d');
  let trailW, trailH, dpr;
  function resizeTrail() {
    dpr = window.devicePixelRatio || 1;
    trailW = window.innerWidth;
    trailH = window.innerHeight;
    trailCanvas.width = trailW * dpr;
    trailCanvas.height = trailH * dpr;
    trailCanvas.style.width = trailW + 'px';
    trailCanvas.style.height = trailH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeTrail();
  window.addEventListener('resize', resizeTrail);

  const trailStyle = getComputedStyle(document.documentElement);
  const trailColor = () => trailStyle.getPropertyValue('--accent').trim() || '#8b5cf6';
  const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  };

  /* Recorded path of the cursor — the trail flows along this wavy line */
  const path = [];
  const PATH_MAX = 90;
  let mouseX = -100, mouseY = -100, mouseActive = false;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    mouseActive = true;
    lastMove = performance.now();
    const last = path[path.length - 1];
    if (!last || Math.hypot(e.clientX - last.x, e.clientY - last.y) > 4) {
      path.push({ x: e.clientX, y: e.clientY });
      if (path.length > PATH_MAX) path.shift();
    }
  });
  document.addEventListener('mouseleave', () => { mouseActive = false; });

  let lastMove = 0;
  let trailOpacity = 0;

  function drawTrail() {
    ctx.clearRect(0, 0, trailW, trailH);
    const color = hexToRgb(trailColor());

    if (mouseActive) {
      const last = path[path.length - 1];
      if (!last || Math.hypot(mouseX - last.x, mouseY - last.y) > 4) {
        path.push({ x: mouseX, y: mouseY });
        if (path.length > PATH_MAX) path.shift();
      }
    }

    /* fade out when idle ~0.1s, fade in when moving again */
    const idle = performance.now() - lastMove > 100;
    const target = mouseActive && !idle ? 1 : 0;
    trailOpacity += (target - trailOpacity) * 0.18;
    if (trailOpacity < 0.005) trailOpacity = 0;

    if (idle && path.length > 1) {
      path.splice(0, Math.max(1, Math.floor(path.length / 20)));
    }

    if (path.length > 1 && trailOpacity > 0.01) {
      /* total length of the path */
      let total = 0;
      for (let i = 1; i < path.length; i++) {
        total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
      }
      const NUM_DOTS = Math.min(40, Math.max(6, Math.floor(total / 9)));

      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < NUM_DOTS; i++) {
        const t = i / (NUM_DOTS - 1);
        const dist = t * total;
        let acc = 0, x, y;
        for (let j = 1; j < path.length; j++) {
          const segLen = Math.hypot(path[j].x - path[j - 1].x, path[j].y - path[j - 1].y);
          if (acc + segLen >= dist) {
            const frac = (dist - acc) / segLen;
            x = path[j - 1].x + (path[j].x - path[j - 1].x) * frac;
            y = path[j - 1].y + (path[j].y - path[j - 1].y) * frac;
            break;
          }
          acc += segLen;
        }
        if (x === undefined) { x = path[path.length - 1].x; y = path[path.length - 1].y; }

        const radius = 2 + 8 * t * t;
        const alpha = (0.12 + 0.88 * t) * trailOpacity;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    requestAnimationFrame(drawTrail);
  }
  drawTrail();
  }

  /* ---------- Theme toggle ---------- */
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  /* ---------- Typing effect ---------- */
  const typedEl = document.getElementById('typed');
  const roles = ['Software Engineer', 'DevOps Engineer', 'Full Stack Developer'];
  let roleIndex = 0, charIndex = 0, deleting = false;

  function type() {
    const current = roles[roleIndex];
    typedEl.textContent = current.slice(0, charIndex);
    if (!deleting) {
      charIndex++;
      if (charIndex > current.length) { deleting = true; return setTimeout(type, 1600); }
      return setTimeout(type, 90);
    }
    charIndex--;
    if (charIndex < 0) { deleting = false; roleIndex = (roleIndex + 1) % roles.length; return setTimeout(type, 400); }
    return setTimeout(type, 45);
  }
  if (typedEl) type();

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll('.reveal');
  const skillBars = document.querySelectorAll('.skill-bar i, .bar i');

  /* ---------- Skill level bars + count-up ---------- */
  const skillLevels = document.querySelectorAll('.skill-level');
  const levelObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const level = entry.target;
      const target = +level.dataset.level;
      const bar = level.querySelector('.skill-bar i');
      const pct = level.querySelector('.skill-pct');
      bar.style.width = target + '%';
      let value = 0;
      const duration = 1600;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        value = Math.round(progress * target);
        pct.textContent = value + '%';
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      levelObserver.unobserve(level);
    });
  }, { threshold: 0.35, rootMargin: '0px 0px -40px 0px' });
  skillLevels.forEach((level) => levelObserver.observe(level));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        const bars = entry.target.querySelectorAll('.skill-bar i, .bar i');
        bars.forEach((bar) => { bar.style.width = bar.style.getPropertyValue('--w'); });
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  reveals.forEach((el) => revealObserver.observe(el));

  const barsObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.width = entry.target.style.getPropertyValue('--w');
        barsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  skillBars.forEach((bar) => barsObserver.observe(bar));

  /* ---------- Counter animation ---------- */
  const counters = document.querySelectorAll('[data-count]');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = +el.getAttribute('data-count');
      let value = 0;
      const step = Math.max(1, Math.round(target / 40));
      const tick = () => {
        value += step;
        if (value >= target) { el.textContent = target; return; }
        el.textContent = value;
        requestAnimationFrame(tick);
      };
      tick();
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.6 });
  counters.forEach((el) => counterObserver.observe(el));

  /* ---------- Navbar scroll state + active link ---------- */
  const navbar = document.querySelector('.navbar');
  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');

  function onScroll() {
    navbar.classList.toggle('scrolled', window.scrollY > 30);
    let currentId = 'hero';
    sections.forEach((sec) => {
      if (window.scrollY >= sec.offsetTop - 200) currentId = sec.id;
    });
    navLinks.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + currentId);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Scroll arrow (up/down) ---------- */
  const scrollArrow = document.getElementById('scrollArrow');
  const contactSec = document.getElementById('contact');
  let lastY = window.scrollY;

  function onScrollArrow() {
    const y = window.scrollY;
    scrollArrow.classList.toggle('show', y > 200);
    if (y > lastY) {
      scrollArrow.classList.remove('down');
    } else if (y < lastY) {
      scrollArrow.classList.add('down');
    }
    lastY = y;
  }
  scrollArrow.addEventListener('click', () => {
    if (scrollArrow.classList.contains('down')) {
      contactSec.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  window.addEventListener('scroll', onScrollArrow, { passive: true });

  /* ---------- Mobile menu ---------- */
  const menuToggle = document.getElementById('menuToggle');
  const navLinksWrap = document.querySelector('.nav-links');
  menuToggle.addEventListener('click', () => navLinksWrap.classList.toggle('open'));
  navLinksWrap.querySelectorAll('a').forEach((link) =>
    link.addEventListener('click', () => navLinksWrap.classList.remove('open'))
  );
});
