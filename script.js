import * as THREE from './vendor/three.module.min.js';

const { gsap, ScrollTrigger, Lenis } = window;
document.documentElement.dataset.js = 'active';
gsap.registerPlugin(ScrollTrigger);

const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('[data-menu]');
const progressBar = document.querySelector('[data-scroll-progress]');

/* O Windows desta máquina usa “reduzir movimento”. Neste projeto a direção
   de arte pede motion explícito, então a coreografia permanece ligada. */
const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: .9, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

function closeMenu() {
  menu?.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('menu-open');
}

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menu?.classList.toggle('open', open);
  document.body.classList.toggle('menu-open', open);
});
menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('resize', () => { if (window.innerWidth > 960) closeMenu(); });

document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

function splitHeadingIntoLines(heading) {
  if (heading.dataset.split === 'true') return [...heading.querySelectorAll('.sweep-line')];
  const words = [];
  [...heading.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent.trim().split(/\s+/).filter(Boolean).forEach((text) => words.push({ text, accent: false }));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      node.textContent.trim().split(/\s+/).filter(Boolean).forEach((text) => words.push({ text, accent: node.tagName === 'EM' }));
    }
  });

  heading.textContent = '';
  words.forEach((word, index) => {
    const span = document.createElement('span');
    span.className = `measure-word${word.accent ? ' is-accent' : ''}`;
    span.textContent = word.text;
    heading.appendChild(span);
    if (index < words.length - 1) heading.appendChild(document.createTextNode(' '));
  });

  const measured = [...heading.querySelectorAll('.measure-word')];
  const rows = [];
  measured.forEach((word) => {
    const top = Math.round(word.offsetTop);
    let row = rows.find((item) => Math.abs(item.top - top) < 5);
    if (!row) { row = { top, words: [] }; rows.push(row); }
    row.words.push({ text: word.textContent, accent: word.classList.contains('is-accent') });
  });

  heading.textContent = '';
  rows.forEach((row) => {
    const line = document.createElement('span');
    line.className = 'sweep-line';
    const inner = document.createElement('span');
    row.words.forEach((word, index) => {
      const part = document.createElement(word.accent ? 'em' : 'span');
      part.textContent = word.text;
      inner.appendChild(part);
      if (index < row.words.length - 1) inner.appendChild(document.createTextNode(' '));
    });
    line.appendChild(inner);
    heading.appendChild(line);
  });
  heading.dataset.split = 'true';
  return [...heading.querySelectorAll('.sweep-line')];
}

function animateSweep(heading) {
  const lines = splitHeadingIntoLines(heading);
  const inners = lines.map((line) => line.firstElementChild);
  gsap.set(inners, { yPercent: 125, rotateX: -46, transformPerspective: 1000, transformOrigin: 'left bottom' });
  gsap.to(inners, {
    yPercent: 0, rotateX: 0, duration: 1.25, ease: 'power4.out', stagger: .12,
    scrollTrigger: { trigger: heading, start: 'top 88%', once: true },
  });
}

function initThreeScene() {
  const canvas = document.querySelector('#cosmos-canvas');
  if (!canvas) return { setProgress() {} };
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x10091d, .055);
    const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, .1, 80);
    camera.position.set(0, 0, 10);

    const world = new THREE.Group();
    world.position.set(window.innerWidth > 960 ? 3.4 : .8, .1, 0);
    scene.add(world);

    const ambient = new THREE.AmbientLight(0x8e66b8, 1.7);
    const key = new THREE.PointLight(0xf1d59a, 18, 18, 2);
    key.position.set(4, 3, 5);
    const fill = new THREE.PointLight(0x6f3ea6, 12, 16, 2);
    fill.position.set(-4, -2, 3);
    scene.add(ambient, key, fill);

    const glass = new THREE.MeshPhysicalMaterial({ color: 0x8c5fbc, roughness: .16, metalness: .08, transmission: .22, thickness: .8, transparent: true, opacity: .26, side: THREE.DoubleSide });
    const mainGeo = new THREE.IcosahedronGeometry(2.15, 1);
    const main = new THREE.Mesh(mainGeo, glass);
    const mainEdges = new THREE.LineSegments(new THREE.EdgesGeometry(mainGeo), new THREE.LineBasicMaterial({ color: 0xe4c17c, transparent: true, opacity: .5 }));
    main.add(mainEdges);
    world.add(main);

    const forms = [
      { geo: new THREE.OctahedronGeometry(.8, 0), pos: [-2.8, 1.8, -1.8], color: 0xb790dc },
      { geo: new THREE.TetrahedronGeometry(.68, 0), pos: [2.9, -1.7, -1.1], color: 0xe2c078 },
      { geo: new THREE.DodecahedronGeometry(.58, 0), pos: [-2.4, -2.2, -2.8], color: 0x8f63b8 },
    ];
    forms.forEach(({ geo, pos, color }) => {
      const mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color, wireframe: true, transparent: true, opacity: .42 }));
      mesh.position.set(...pos);
      world.add(mesh);
    });

    const count = window.innerWidth < 700 ? 480 : 950;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const radius = 4 + Math.random() * 18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      sizes[i] = .5 + Math.random();
    }
    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xcbb1e6, size: .035, transparent: true, opacity: .68, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(stars);

    let progress = 0;
    let pointerX = 0;
    let pointerY = 0;
    window.addEventListener('pointermove', (event) => {
      pointerX = (event.clientX / window.innerWidth - .5) * 2;
      pointerY = (event.clientY / window.innerHeight - .5) * 2;
    }, { passive: true });

    const sceneStartedAt = performance.now();
    function render() {
      const time = (performance.now() - sceneStartedAt) / 1000;
      world.rotation.y += ((time * .045 + progress * 2.6 + pointerX * .12) - world.rotation.y) * .035;
      world.rotation.x += ((Math.sin(time * .22) * .1 + progress * .7 - pointerY * .08) - world.rotation.x) * .035;
      main.rotation.z = time * .035 - progress * .8;
      stars.rotation.y = time * .006 + progress * .18;
      stars.rotation.x = progress * .08;
      camera.position.z = 10 - progress * 2.8;
      renderer.render(scene, camera);
      requestAnimationFrame(render);
    }
    render();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      world.position.x = window.innerWidth > 960 ? 3.4 : .8;
    });
    document.documentElement.classList.add('has-webgl');
    return { setProgress(value) { progress = value; } };
  } catch (error) {
    console.warn('A cena 3D usou o fundo de reserva.', error);
    return { setProgress() {} };
  }
}

const threeScene = initThreeScene();

function initHero() {
  const titleLines = [...document.querySelectorAll('.hero-title .title-line b')];
  const sigilPaths = [...document.querySelectorAll('[data-sigil] circle')];
  gsap.set(titleLines, { yPercent: 120, rotateX: -42, transformPerspective: 1000, transformOrigin: 'left bottom' });
  gsap.set('.hero-eyebrow, .hero-lead, .hero-actions, .hero-facts, .scroll-cue', { opacity: 0, y: 34 });
  gsap.set('.hero-portrait', { clipPath: 'inset(48% 5% 48% 5% round 50%)', scale: 1.15, rotateY: -8, transformPerspective: 1200 });

  const intro = gsap.timeline({ delay: .15 });
  intro.to(titleLines, { yPercent: 0, rotateX: 0, duration: 1.28, ease: 'power4.out', stagger: .11 })
    .to('.hero-portrait', { clipPath: 'inset(0% round 50% 50% 7% 7%)', scale: 1, rotateY: 0, duration: 1.55, ease: 'power3.inOut' }, .05)
    .to(sigilPaths, { strokeDashoffset: 0, duration: 1.8, stagger: .06, ease: 'power2.inOut' }, .22)
    .to('.hero-eyebrow, .hero-lead, .hero-actions', { opacity: 1, y: 0, duration: .9, ease: 'power3.out', stagger: .1 }, .55)
    .to('.hero-facts, .scroll-cue', { opacity: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .08 }, .95);

  const scrollState = { value: 0 };
  const heroTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.hero-cinema', start: 'top top', end: 'bottom bottom', scrub: .75,
      onUpdate: (self) => { scrollState.value = self.progress; threeScene.setProgress(self.progress); },
    },
  });
  heroTl
    .to('.hero-copy', { yPercent: -32, opacity: .05, filter: 'blur(10px)', ease: 'none' }, 0)
    .to('.hero-portrait', { xPercent: -34, yPercent: 4, scale: 1.23, rotateY: 6, clipPath: 'inset(7% 12% 7% 12% round 2rem)', ease: 'none' }, 0)
    .to('.hero-sigil', { rotation: 105, scale: 1.28, opacity: .45, ease: 'none' }, 0)
    .to('.hero-facts, .scroll-cue', { y: -90, opacity: 0, ease: 'none' }, 0)
    .to('.hero-vignette', { opacity: .58, ease: 'none' }, 0);
}

function initDrawings() {
  document.querySelectorAll('[data-draw]').forEach((svg) => {
    const paths = [...svg.querySelectorAll('path, circle, line, polyline')];
    paths.forEach((path) => {
      const length = path.getTotalLength ? path.getTotalLength() : 420;
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
    });
    gsap.to(paths, { strokeDashoffset: 0, duration: 1.8, stagger: .1, ease: 'power2.inOut', scrollTrigger: { trigger: svg, start: 'top 78%', once: true } });
  });
}

function initAbout() {
  gsap.from('.about-body > *', { y: 90, opacity: 0, rotateX: -16, duration: 1.35, ease: 'power4.out', stagger: .13, scrollTrigger: { trigger: '.about-body', start: 'top 82%', once: true } });
  gsap.fromTo('.about-manifesto', { xPercent: 8 }, { xPercent: -8, ease: 'none', scrollTrigger: { trigger: '.about-film', start: 'top bottom', end: 'bottom top', scrub: .7 } });
}

function initCourse() {
  const track = document.querySelector('[data-course-track]');
  const symbols = [...document.querySelectorAll('.pillar .symbol')];
  const current = document.querySelector('[data-course-current]');
  if (!track) return;

  const mm = gsap.matchMedia();
  mm.add('(min-width: 961px)', () => {
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth * .56);
    gsap.to(track, {
      x: () => -distance(), ease: 'none',
      scrollTrigger: {
        trigger: '.course-film', start: 'top top', end: 'bottom bottom', scrub: .75, invalidateOnRefresh: true,
        onUpdate: (self) => {
          const index = Math.min(3, Math.floor(self.progress * 4));
          if (current) current.textContent = String(index + 1).padStart(2, '0');
          symbols.forEach((symbol, i) => { symbol.style.transform += ''; symbol.dataset.active = String(i === index); });
        },
      },
    });
    symbols.forEach((symbol, index) => {
      gsap.to(symbol, { rotation: 150 + index * 35, rotateX: index % 2 ? 28 : -18, ease: 'none', scrollTrigger: { trigger: '.course-film', start: 'top top', end: 'bottom bottom', scrub: 1 } });
    });
  });
}

function initJourney() {
  const cards = [...document.querySelectorAll('.journey-stack li')];
  const mm = gsap.matchMedia();
  mm.add('(min-width: 961px)', () => {
    gsap.set(cards, { yPercent: 122, rotateX: -14, scale: .88, opacity: 0 });
    gsap.set(cards[0], { yPercent: 0, rotateX: 0, scale: 1, opacity: 1 });
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.journey-film', start: 'top top', end: 'bottom bottom', scrub: .75 } });
    cards.slice(1).forEach((card, index) => {
      const previous = cards[index];
      tl.to(previous, { yPercent: -12, scale: .9, opacity: .42, rotateX: 8, duration: 1, ease: 'none' }, index)
        .to(card, { yPercent: 0, scale: 1, opacity: 1, rotateX: 0, duration: 1, ease: 'power2.out' }, index);
    });
  });
}

function initQuoteAndClosing() {
  gsap.to('.quote-rings', { rotation: 125, scale: 1.24, ease: 'none', scrollTrigger: { trigger: '.quote-film', start: 'top bottom', end: 'bottom top', scrub: .8 } });
  gsap.from('.quote-film blockquote', { scale: .72, opacity: 0, filter: 'blur(16px)', duration: 1.55, ease: 'power4.out', scrollTrigger: { trigger: '.quote-film', start: 'top 70%', once: true } });
  gsap.to('.marquee div', { xPercent: -50, duration: 22, repeat: -1, ease: 'none' });
  gsap.to('.interest-sigil', { rotation: 90, scale: 1.16, ease: 'none', scrollTrigger: { trigger: '.interest-film', start: 'top bottom', end: 'bottom top', scrub: .8 } });
}

function initHeaderAndProgress() {
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      progressBar.style.transform = `scaleX(${self.progress})`;
      header.classList.toggle('scrolled', self.scroll() > 30);
    },
  });
  document.querySelectorAll('[data-tema]').forEach((section) => {
    ScrollTrigger.create({
      trigger: section, start: 'top 6%', end: 'bottom 6%',
      onEnter: () => header.setAttribute('data-barra', section.dataset.tema === 'claro' ? 'claro' : 'escuro'),
      onEnterBack: () => header.setAttribute('data-barra', section.dataset.tema === 'claro' ? 'claro' : 'escuro'),
    });
  });
}

function initMagnetic() {
  if (!window.matchMedia('(pointer:fine)').matches) return;
  document.querySelectorAll('.magnetic').forEach((element) => {
    element.addEventListener('pointermove', (event) => {
      const rect = element.getBoundingClientRect();
      gsap.to(element, { x: (event.clientX - rect.left - rect.width / 2) * .18, y: (event.clientY - rect.top - rect.height / 2) * .26, duration: .35, ease: 'power2.out' });
    });
    element.addEventListener('pointerleave', () => gsap.to(element, { x: 0, y: 0, duration: .7, ease: 'elastic.out(1,.35)' }));
  });
}

async function start() {
  await document.fonts.ready;
  document.querySelectorAll('[data-sweep]').forEach(animateSweep);
  initHero();
  initDrawings();
  initAbout();
  initCourse();
  initJourney();
  initQuoteAndClosing();
  initHeaderAndProgress();
  initMagnetic();
  ScrollTrigger.refresh();

  const prelude = document.querySelector('[data-prelude]');
  const preludeTl = gsap.timeline({ onComplete: () => prelude?.remove() });
  preludeTl.to('.prelude-mark i', { rotation: 150, scale: .72, duration: 1.05, ease: 'power3.inOut', stagger: .06 })
    .to('.prelude span', { y: -18, opacity: 0, duration: .5, ease: 'power2.in' }, .65)
    .to(prelude, { clipPath: 'inset(0 0 100% 0)', duration: .9, ease: 'power4.inOut' }, .8);
}

start();
