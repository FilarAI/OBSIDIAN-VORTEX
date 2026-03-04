document.addEventListener("DOMContentLoaded", () => {

    // =========================================
    // 1. LENIS SMOOTH SCROLL
    // =========================================
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // =========================================
    // 2. CONFIG & DOM
    // =========================================
    const FRAME_COUNT = 159;
    const frames = [];

    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const loader = document.getElementById("loader");
    const loaderBar = document.getElementById("loader-bar");
    const loaderPercent = document.getElementById("loader-percent");
    const header = document.getElementById("site-header");
    const hero = document.getElementById("hero");

    let currentFrame = -1;

    // =========================================
    // 3. CANVAS SETUP
    // =========================================
    function resizeCanvas() {
        const wrap = canvas.parentElement;
        canvas.width = wrap.clientWidth * window.devicePixelRatio;
        canvas.height = wrap.clientHeight * window.devicePixelRatio;
        if (currentFrame >= 0) drawFrame(currentFrame);
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // =========================================
    // 4. FRAME PRELOADER
    // =========================================
    const pad = (num, size) => ("0000" + num).substr(-size);
    let framesLoaded = 0;

    function getFrameUrl(index) {
        return `frames/frame_${pad(index + 1, 4)}.webp`;
    }

    function loadFrame(index) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                frames[index] = img;
                framesLoaded++;
                updateLoader();
                resolve(img);
            };
            img.onerror = reject;
            img.src = getFrameUrl(index);
        });
    }

    function updateLoader() {
        const p = Math.floor((framesLoaded / FRAME_COUNT) * 100);
        loaderBar.style.width = p + "%";
        loaderPercent.innerText = p + "%";
    }

    async function preloadFrames() {
        // Phase 1: first 10 frames for fast first paint
        const firstBatch = Math.min(10, FRAME_COUNT);
        const firstPromises = [];
        for (let i = 0; i < firstBatch; i++) firstPromises.push(loadFrame(i));
        await Promise.all(firstPromises);

        // Draw first frame immediately
        if (frames[0]) drawFrame(0);

        // Phase 2: remaining frames
        const restPromises = [];
        for (let i = firstBatch; i < FRAME_COUNT; i++) restPromises.push(loadFrame(i));
        await Promise.all(restPromises);

        // Hide loader
        gsap.to(loader, {
            opacity: 0,
            duration: 0.6,
            ease: "power2.inOut",
            onComplete: () => {
                loader.style.display = "none";
                revealHero();
            }
        });

        // Initialize everything
        initScrollAnimations();
        initSectionAnimations();
        initCounters();
        initHeader();
        initMobileMenu();
    }

    // =========================================
    // 5. CANVAS RENDERER
    // =========================================
    function drawFrame(index) {
        const img = frames[index];
        if (!img) return;

        const cw = canvas.width;
        const ch = canvas.height;
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;

        // Cover the canvas, keeping aspect ratio
        const scale = Math.max(cw / iw, ch / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (cw - dw) / 2;
        const dy = (ch - dh) / 2;

        // Fill black behind (to match page bg perfectly)
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(img, dx, dy, dw, dh);
    }

    // =========================================
    // 6. HERO REVEAL ANIMATION
    // =========================================
    function revealHero() {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        tl.to(".hero-eyebrow", {
            opacity: 1,
            y: 0,
            duration: 0.8,
        })
            .to(".hero-title", {
                opacity: 1,
                y: 0,
                duration: 1,
            }, "-=0.5")
            .to(".hero-subtitle", {
                opacity: 1,
                y: 0,
                duration: 0.8,
            }, "-=0.6")
            .to(".scroll-cue", {
                opacity: 1,
                duration: 0.6,
            }, "-=0.3");
    }

    // =========================================
    // 7. SCROLL-DRIVEN FRAME ANIMATION
    // =========================================
    function initScrollAnimations() {
        const scrollContainer = document.getElementById("scroll-container");

        // Frame scrubbing — bind scroll progress to frame index
        ScrollTrigger.create({
            trigger: scrollContainer,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
            onUpdate: (self) => {
                // Use an eased curve so frames play faster in the first half
                const accelerated = Math.min(self.progress * 1.8, 1);
                const index = Math.min(Math.floor(accelerated * FRAME_COUNT), FRAME_COUNT - 1);
                if (index !== currentFrame) {
                    currentFrame = index;
                    requestAnimationFrame(() => drawFrame(currentFrame));
                }
            }
        });

        // Hero fade-out on scroll
        ScrollTrigger.create({
            trigger: hero,
            start: "top top",
            end: "bottom top",
            scrub: true,
            onUpdate: (self) => {
                const p = self.progress;
                hero.style.opacity = Math.max(0, 1 - p * 1.5);
                hero.style.transform = `translateY(${p * 40}px)`;
            }
        });
    }

    // =========================================
    // 8. SECTION ANIMATIONS (Intersection-based)
    // =========================================
    function initSectionAnimations() {
        // Standard fade-up sections
        document.querySelectorAll('[data-anim="fade-up"]').forEach(section => {
            const targets = section.querySelectorAll(
                '.section-badge, .section-title, .section-text, .pull-quote, .quote-cite, .specs-grid, .cta-title, .cta-text, .cta-button'
            );

            gsap.set(targets, { opacity: 0, y: 40 });

            ScrollTrigger.create({
                trigger: section,
                start: "top 85%",
                end: "bottom 15%",
                onEnter: () => {
                    gsap.to(targets, {
                        opacity: 1,
                        y: 0,
                        duration: 0.9,
                        stagger: 0.12,
                        ease: "power3.out"
                    });
                },
                onLeaveBack: () => {
                    gsap.to(targets, {
                        opacity: 0,
                        y: 40,
                        duration: 0.5,
                        stagger: 0.05,
                        ease: "power2.in"
                    });
                }
            });
        });

    }

    // =========================================
    // 9. COUNTER ANIMATIONS
    // =========================================
    function initCounters() {
        document.querySelectorAll('.spec-value[data-counter]').forEach(el => {
            const target = parseFloat(el.dataset.counter);
            const decimals = parseInt(el.dataset.decimals || "0");

            ScrollTrigger.create({
                trigger: el.closest('.specs-section'),
                start: "top 75%",
                onEnter: () => {
                    gsap.fromTo(el,
                        { textContent: 0 },
                        {
                            textContent: target,
                            duration: 2,
                            ease: "power1.out",
                            snap: { textContent: decimals === 0 ? 1 : 0.1 },
                            onUpdate: function () {
                                const val = parseFloat(el.textContent);
                                el.textContent = decimals > 0 ? val.toFixed(decimals) : Math.round(val);
                            }
                        }
                    );
                },
                once: true
            });
        });
    }

    // =========================================
    // 10. HEADER SHOW/HIDE ON SCROLL
    // =========================================
    function initHeader() {
        let lastScroll = 0;
        const threshold = 80;

        lenis.on('scroll', ({ scroll }) => {
            // Add background after scrolling past hero
            if (scroll > 100) {
                header.classList.add('is-scrolled');
            } else {
                header.classList.remove('is-scrolled');
            }

            // Hide/show on scroll direction
            if (scroll > threshold) {
                if (scroll > lastScroll + 5) {
                    header.classList.add('is-hidden');
                } else if (scroll < lastScroll - 5) {
                    header.classList.remove('is-hidden');
                }
            } else {
                header.classList.remove('is-hidden');
            }

            lastScroll = scroll;
        });
    }

    // =========================================
    // 11. MOBILE MENU
    // =========================================
    function initMobileMenu() {
        const btn = document.getElementById('mobile-menu-btn');
        const menu = document.getElementById('mobile-menu');

        if (!btn || !menu) return;

        btn.addEventListener('click', () => {
            btn.classList.toggle('is-open');
            menu.classList.toggle('is-open');
            document.body.style.overflow = menu.classList.contains('is-open') ? 'hidden' : '';
        });

        // Close menu on link click
        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                btn.classList.remove('is-open');
                menu.classList.remove('is-open');
                document.body.style.overflow = '';
            });
        });
    }

    // =========================================
    // START
    // =========================================
    preloadFrames();

});
