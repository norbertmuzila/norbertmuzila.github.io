/* ============================================
   NORBERT MUZILA – Personal Website Script
   ============================================ */

// ── Dynamic Year ──
document.getElementById('year').textContent = new Date().getFullYear();

// ── Navbar: scroll effect + active link tracking ──
const navbar = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.nav-links a:not(.nav-cta)');
const sections = document.querySelectorAll('section[id]');

window.addEventListener('scroll', () => {
    // Scrolled class for blur background
    navbar.classList.toggle('scrolled', window.scrollY > 40);

    // Active link highlighting
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        if (window.scrollY >= sectionTop) current = section.getAttribute('id');
    });
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) link.classList.add('active');
    });
});

// ── Hamburger Menu ──
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-links');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navMenu.classList.toggle('open');
});

// Close mobile menu when a link is clicked
navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navMenu.classList.remove('open');
    });
});

// ── Smooth Scroll ──
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ── Typed Text Animation (Hero) ──
const phrases = [
    'MSS Student @ ISU 🛸',
    'Data Scientist',
    'Geospatial AI Enthusiast',
    'CubeSat Engineer',
    'Python Developer',
    'Space & Tech Advocate',
];
let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typedEl = document.getElementById('typed-text');

function type() {
    const current = phrases[phraseIndex];
    if (isDeleting) {
        typedEl.textContent = current.substring(0, charIndex - 1);
        charIndex--;
    } else {
        typedEl.textContent = current.substring(0, charIndex + 1);
        charIndex++;
    }

    let speed = isDeleting ? 60 : 100;
    if (!isDeleting && charIndex === current.length) {
        speed = 2000; // Pause at end
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        speed = 400;
    }
    setTimeout(type, speed);
}
type();

// ── Scroll Reveal (Intersection Observer) ──
const revealObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                // Stagger children inside the same parent
                const siblings = [...entry.target.parentElement.querySelectorAll('.reveal')];
                const delay = siblings.indexOf(entry.target) * 80;
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, delay);
                revealObserver.unobserve(entry.target);
            }
        });
    },
    { threshold: 0.12, rootMargin: '0px 0px -50px 0px' }
);
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── Contact Form: basic submission feedback ──
const form = document.getElementById('contact-form');
if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const origText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Message Sent!';
        btn.style.background = 'linear-gradient(135deg, #00d4aa, #06b6d4)';
        btn.disabled = true;
        setTimeout(() => {
            btn.innerHTML = origText;
            btn.style.background = '';
            btn.disabled = false;
            form.reset();
        }, 3000);
    });
}

// ── Profile Image Fallback ──
const profileImg = document.getElementById('profile-img');
if (profileImg) {
    profileImg.onerror = function () {
        // Replace with a stylish SVG avatar if image fails to load
        const wrapper = this.parentElement;
        this.style.display = 'none';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 200 200');
        svg.style.cssText = 'width:100%;height:100%;border-radius:50%;border:3px solid #1a3a6b;';
        svg.innerHTML = `
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1a3a6b"/>
          <stop offset="100%" stop-color="#2554a0"/>
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill="url(#g1)" rx="100"/>
      <circle cx="100" cy="75" r="38" fill="rgba(255,255,255,0.25)"/>
      <ellipse cx="100" cy="162" rx="58" ry="42" fill="rgba(255,255,255,0.2)"/>
      <text x="100" y="85" text-anchor="middle" font-size="44" font-weight="800"
        font-family="Outfit,sans-serif" fill="white" dy="8">NM</text>
    `;
        wrapper.appendChild(svg);
    };
}
