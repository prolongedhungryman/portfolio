/* ═══════════════════════════════════════════
   INIT GSAP
════════════════════════════════════════════ */
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ limitCallbacks: true });
gsap.config({ force3D: true });

/* ═══════════════════════════════════════════
   ELEMENTS
════════════════════════════════════════════ */
const video = document.getElementById("bg-video");
const loader = document.getElementById("loader");
const hint = document.getElementById("scroll-hint");
const player = document.getElementById("music-player");
const audio = document.getElementById("audio-player");
const playBtn = document.getElementById("play-btn");
const nextBtn = document.getElementById("next-btn");
const prevBtn = document.getElementById("prev-btn");
const shuffleBtn = document.getElementById("shuffle-btn");
const songName = document.getElementById("song-name");
const playIcon = document.getElementById("play-icon");
const pauseIcon = document.getElementById("pause-icon");
const progress = document.getElementById("progress-fill");
const canvas = document.getElementById("mask-canvas");
const ctx = canvas.getContext("2d");
const dock = document.getElementById("dock");

/* ═══════════════════════════════════════════
   TARGET CURSOR — vanilla port of ReactBits
   ─ Small dot follows mouse exactly
   ─ Outer ring follows with smooth lag (GSAP)
   ─ Ring expands + label appears on hover
     over interactive / text elements
   ─ Ring shrinks to dot on click
   ─ Everything is pointer-events:none so it
     never blocks clicks or hover states
════════════════════════════════════════════ */
(function () {
    /* ── Build DOM ── */
    const cursorWrap = document.createElement("div");
    cursorWrap.id = "tc-wrap";

    const dot = document.createElement("div");
    dot.id = "tc-dot";

    const ring = document.createElement("div");
    ring.id = "tc-ring";

    const label = document.createElement("span");
    label.id = "tc-label";

    ring.appendChild(label);
    cursorWrap.appendChild(dot);
    cursorWrap.appendChild(ring);
    document.body.appendChild(cursorWrap);

    /* ── State ── */
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let isHover = false;
    let isDown = false;
    let rafId = null;

    /* ── Selectors that trigger expanded ring ── */
    const HOVER_SEL = [
        "a", "button", "input", "textarea", "select", "label",
        "[role='button']", ".dock-item", ".hire-social-link",
        ".hire-menu-link", ".hire-submit-btn", ".connect-btn",
        ".ctrl-btn", ".social-icon", ".sticky-note",
        ".hire-menu-btn", ".hire-menu-close", ".hire-target",
        "#music-trigger-btn"
    ].join(", ");

    /* ── Track mouse ── */
    window.addEventListener("mousemove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Snap dot immediately
        dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;

        // Check if over interactive element
        const over = e.target.closest(HOVER_SEL);
        if (over && !isHover) {
            isHover = true;
            ring.classList.add("tc-hover");
            // Show label from data-cursor attr if present
            const lbl = over.getAttribute("data-cursor");
            label.textContent = lbl || "";
            label.style.opacity = lbl ? "1" : "0";
        } else if (!over && isHover) {
            isHover = false;
            ring.classList.remove("tc-hover");
            label.textContent = "";
            label.style.opacity = "0";
        }
    }, { passive: true });

    /* ── Hide when leaving window ── */
    document.addEventListener("mouseleave", () => {
        cursorWrap.style.opacity = "0";
    }, { passive: true });

    document.addEventListener("mouseenter", () => {
        cursorWrap.style.opacity = "1";
    }, { passive: true });

    /* ── Click shrink effect ── */
    window.addEventListener("mousedown", () => {
        isDown = true;
        ring.classList.add("tc-click");
    }, { passive: true });

    window.addEventListener("mouseup", () => {
        isDown = false;
        ring.classList.remove("tc-click");
    }, { passive: true });

    /* ── Animate ring with lerp (smooth lag) ── */
    const LERP = 0.12; // 0 = no follow, 1 = instant — 0.12 = smooth lag

    function animate() {
        // Lerp ring towards mouse
        ringX += (mouseX - ringX) * LERP;
        ringY += (mouseY - ringY) * LERP;

        ring.style.transform = `translate(${ringX}px, ${ringY}px)`;

        rafId = requestAnimationFrame(animate);
    }

    animate();

    /* ── Hide native cursor everywhere ── */
    document.documentElement.style.cursor = "none";
})();


/* ═══════════════════════════════════════════
   CANVAS MASK
════════════════════════════════════════════ */
let currentScale = 1, currentDark = 1, maskRafId = null;

function sizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawMask(scale, darkOpacity) {
    if (scale !== undefined) currentScale = scale;
    if (darkOpacity !== undefined) currentDark = darkOpacity;
    if (maskRafId) return;
    maskRafId = requestAnimationFrame(_flushMask);
}

function _flushMask() {
    maskRafId = null;
    const w = window.innerWidth, h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(192,0,26,${currentDark})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `900 ${(w * 0.26) * currentScale}px "Barlow Condensed", sans-serif`;
    ctx.fillText("VIBE", w / 2, h / 2);
    ctx.globalCompositeOperation = "source-over";
}

window.addEventListener("resize", () => {
    sizeCanvas();
    if (maskRafId) { cancelAnimationFrame(maskRafId); maskRafId = null; }
    _flushMask();
}, { passive: true });


/* ═══════════════════════════════════════════
   VIDEO SCRUB
════════════════════════════════════════════ */
let pendingSeekTime = null, seekRafId = null;

function scheduleSeek(t) {
    pendingSeekTime = t;
    if (!seekRafId) seekRafId = requestAnimationFrame(_flushSeek);
}

function _flushSeek() {
    seekRafId = null;
    if (pendingSeekTime === null) return;
    const t = pendingSeekTime; pendingSeekTime = null;
    if (video.readyState >= 2 && video.duration && isFinite(video.duration) && Math.abs(video.currentTime - t) > 0.1) {
        video.currentTime = t;
    }
}


/* ═══════════════════════════════════════════
   HOMEPAGE BG VIDEO
════════════════════════════════════════════ */
const homeBgVideo = document.getElementById("homepage-bg-video");
if (homeBgVideo) {
    homeBgVideo.load();
    new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { homeBgVideo.play().catch(() => { }); homeBgVideo.classList.add("active"); }
            else { homeBgVideo.pause(); homeBgVideo.classList.remove("active"); }
        });
    }, { threshold: 0.05 }).observe(document.getElementById("homepage"));
}


/* ═══════════════════════════════════════════
   LOADER GATE
════════════════════════════════════════════ */
let started = false;

function startExperience() {
    if (started) return;
    started = true;
    loader.classList.add("fade");
    setTimeout(() => { if (loader.parentNode) loader.remove(); }, 900);
    buildVibe();
    buildHomepage();
    initCursorReveal();
    initHireMe();
}

Promise.all([
    document.fonts.ready,
    new Promise(res => {
        if (video.readyState >= 1) { res(); return; }
        video.addEventListener("loadedmetadata", res, { once: true });
        video.addEventListener("error", res, { once: true });
    })
]).then(startExperience);

setTimeout(startExperience, 3500);


/* ═══════════════════════════════════════════
   VIBE SECTION
════════════════════════════════════════════ */
function buildVibe() {
    const vibeProxy = { scale: 1 }, darkProxy = { opacity: 1 };
    sizeCanvas(); currentScale = 1; currentDark = 1; _flushMask();

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: "#hero", start: "top top", end: "+=300%",
            scrub: 1, pin: true, anticipatePin: 1,
            invalidateOnRefresh: true, fastScrollEnd: true,
            onUpdate: (self) => {
                if (video.duration && isFinite(video.duration)) scheduleSeek(self.progress * video.duration);
            },
            onLeaveBack: () => {
                vibeProxy.scale = 1; darkProxy.opacity = 1;
                if (maskRafId) { cancelAnimationFrame(maskRafId); maskRafId = null; }
                currentScale = 1; currentDark = 1; _flushMask();
                gsap.set("#lazy-text", { x: 0, opacity: 0.85 });
                gsap.set("#ek-text", { x: 0, opacity: 0.85 });
            }
        }
    });

    tl.fromTo(vibeProxy, { scale: 1 }, {
        scale: 14, ease: "none", duration: 1,
        onUpdate: () => drawMask(vibeProxy.scale, darkProxy.opacity)
    }, 0);
    tl.fromTo("#lazy-text", { x: 0, opacity: 0.85 }, { x: -160, opacity: 0, ease: "none", duration: 0.4 }, 0);
    tl.fromTo("#ek-text", { x: 0, opacity: 0.85 }, { x: 160, opacity: 0, ease: "none", duration: 0.4 }, 0);
    tl.fromTo(darkProxy, { opacity: 1 }, {
        opacity: 0, ease: "none", duration: 0.3,
        onUpdate: () => drawMask(vibeProxy.scale, darkProxy.opacity)
    }, 0.7);

    ScrollTrigger.create({
        trigger: "#hero", start: "top+=10 top",
        onEnter: () => hint.classList.add("hidden"),
        onLeaveBack: () => hint.classList.remove("hidden"),
    });
}


/* ═══════════════════════════════════════════
   HOMEPAGE
════════════════════════════════════════════ */
function buildHomepage() {
    ScrollTrigger.create({
        trigger: "#homepage", start: "top 80%",
        onEnter: () => player.classList.add("visible"),
        onLeaveBack: () => player.classList.remove("visible"),
    });

    gsap.utils.toArray("#reveal-headline .word").forEach((word, i) => {
        gsap.to(word, {
            opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: i * 0.12,
            scrollTrigger: { trigger: "#reveal-headline", start: "top 75%", toggleActions: "play none none reverse" },
        });
    });

    gsap.utils.toArray(".reveal-up").forEach((el, i) => {
        gsap.fromTo(el, { y: 30, opacity: 0 }, {
            y: 0, opacity: 1, duration: 1, ease: "power3.out", delay: 0.4 + i * 0.15,
            scrollTrigger: { trigger: "#homepage", start: "top 70%", invalidateOnRefresh: true }
        });
    });

    ScrollTrigger.create({
        trigger: "#homepage", start: "top 80%",
        onEnter: () => dock.classList.add("visible"),
        onLeaveBack: () => dock.classList.remove("visible"),
    });

    ScrollTrigger.refresh();
}


/* ═══════════════════════════════════════════
   HIRE ME
════════════════════════════════════════════ */
function initHireMe() {
    const menuBtn = document.getElementById("hire-menu-btn");
    const overlay = document.getElementById("hire-menu-overlay");
    const closeBtn = document.getElementById("hire-menu-close");
    const menuLinks = document.querySelectorAll(".hire-menu-link");
    const hireSection = document.getElementById("hire-me");
    if (!menuBtn) return;

    const menuBtnObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            menuBtn.style.opacity = entry.isIntersecting ? "1" : "0";
            menuBtn.style.pointerEvents = entry.isIntersecting ? "auto" : "none";
        });
    }, { threshold: 0.05 });
    menuBtnObserver.observe(hireSection);
    menuBtn.style.opacity = "0";
    menuBtn.style.transition = "opacity 0.4s ease";

    function openMenu() {
        overlay.classList.add("open");
        dock.classList.add("hidden-by-menu");
        gsap.fromTo(menuLinks,
            { y: 60, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", stagger: 0.07, delay: 0.1 }
        );
    }

    function closeMenu() {
        overlay.classList.remove("open");
        dock.classList.remove("hidden-by-menu");
    }

    menuBtn.addEventListener("click", openMenu);
    closeBtn.addEventListener("click", closeMenu);
    menuLinks.forEach(link => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("open")) closeMenu();
    });

    gsap.fromTo("#hire-me", { y: 80, opacity: 0 }, {
        y: 0, opacity: 1,
        scrollTrigger: { trigger: "#hire-me", start: "top 90%", end: "top 40%", scrub: 1 }
    });

    const revealOnScroll = (selector, delay = 0) => {
        const el = document.querySelector(selector);
        if (!el) return;
        new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) setTimeout(() => el.classList.add("in-view"), delay); });
        }, { threshold: 0.2 }).observe(el);
    };

    revealOnScroll(".hire-heading", 0);
    revealOnScroll(".hire-subtext", 150);
    revealOnScroll(".hire-form", 300);

    document.querySelectorAll(".hire-social-link").forEach((link) => {
        new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) link.classList.add("in-view"); });
        }, { threshold: 0.15 }).observe(link);
    });

    ScrollTrigger.create({
        trigger: "#hire-me", start: "top 80%",
        onEnter: () => dock.classList.add("hidden-by-menu"),
        onLeaveBack: () => dock.classList.remove("hidden-by-menu"),
    });
}


/* ═══════════════════════════════════════════
   CURSOR REVEAL (cr-scene)
════════════════════════════════════════════ */
function initCursorReveal() {
    const scene = document.getElementById("cr-scene");
    const reveal = document.querySelector(".cr-reveal-layer");
    if (!scene || !reveal) return;

    const dot = document.createElement("div");
    dot.className = "cr-dot";
    document.body.appendChild(dot);

    scene.addEventListener("mousemove", (e) => {
        const base = document.querySelector(".cr-base-layer");
        if (base) base.style.opacity = "0";
        const rect = scene.getBoundingClientRect();
        reveal.style.transition = "none";
        reveal.style.clipPath = `circle(160px at ${(e.clientX - rect.left).toFixed(1)}px ${(e.clientY - rect.top).toFixed(1)}px)`;
        dot.style.left = e.clientX + "px"; dot.style.top = e.clientY + "px";
        dot.classList.add("on");
    }, { passive: true });

    scene.addEventListener("mouseleave", (e) => {
        const base = document.querySelector(".cr-base-layer");
        if (base) base.style.opacity = "1";
        const rect = scene.getBoundingClientRect();
        reveal.style.transition = "clip-path 0.5s cubic-bezier(0.16,1,0.3,1)";
        reveal.style.clipPath = `circle(0px at ${(e.clientX - rect.left).toFixed(1)}px ${(e.clientY - rect.top).toFixed(1)}px)`;
        setTimeout(() => { reveal.style.transition = "none"; }, 500);
        dot.classList.remove("on");
    });
}


/* ═══════════════════════════════════════════
   CONNECT BUTTON
════════════════════════════════════════════ */
const connectBtn = document.getElementById("connect-btn");
const contactReveal = document.getElementById("contact-reveal");
if (connectBtn) connectBtn.addEventListener("click", () => contactReveal.classList.toggle("open"));


/* ═══════════════════════════════════════════
   MAGNETIC BUTTONS
════════════════════════════════════════════ */
document.querySelectorAll(".magnetic").forEach(btn => {
    btn.addEventListener("mousemove", e => {
        const r = btn.getBoundingClientRect();
        gsap.to(btn, { x: (e.clientX - (r.left + r.width / 2)) * 0.35, y: (e.clientY - (r.top + r.height / 2)) * 0.35, duration: 0.4, ease: "power2.out" });
    });
    btn.addEventListener("mouseleave", () => gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1,0.4)" }));
});


/* ═══════════════════════════════════════════
   MUSIC PLAYER
════════════════════════════════════════════ */
const SONGS = [
    "do you know me.mp3",
    "Goo Goo Dolls  Iris [Official Music Video] [4K Remaster].mp3",
    "Kasoor (Acoustic) - Prateek Kuhad  Official Lyric Video.mp3",
    "O Sanam  Farmhouse Frames  Lucky Ali  unplugged 2025.mp3",
    "Sticky Fingers  - A Love Letter From Me To You (The Village Sessions).mp3"
];
const songPath = f => "assets/mp3 file/" + encodeURIComponent(f);
const displayName = f => f.replace(/\.mp3$/i, "").replace(/\[.*?\]/g, "").replace(/\(Official.*?\)/gi, "").replace(/Official Video/gi, "").replace(/\s{2,}/g, " ").trim();
let currentIndex = 0, isShuffled = false, shuffleOrder = [];
function buildShuffleOrder() {
    shuffleOrder = [...Array(SONGS.length).keys()];
    for (let i = shuffleOrder.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[shuffleOrder[i], shuffleOrder[j]] = [shuffleOrder[j], shuffleOrder[i]]; }
}
buildShuffleOrder();
function loadSong(idx) { currentIndex = idx; audio.src = songPath(SONGS[idx]); songName.textContent = displayName(SONGS[idx]); progress.style.width = "0%"; }
function playSong() { audio.play().then(() => { playIcon.style.display = "none"; pauseIcon.style.display = "block"; }).catch(() => { }); }
function pauseSong() { audio.pause(); playIcon.style.display = "block"; pauseIcon.style.display = "none"; }
function nextSong() { const pos = shuffleOrder.indexOf(currentIndex); const next = isShuffled ? shuffleOrder[(pos + 1) % SONGS.length] : (currentIndex + 1) % SONGS.length; loadSong(next); playSong(); }
function prevSong() { if (audio.currentTime > 3) { audio.currentTime = 0; return; } const pos = shuffleOrder.indexOf(currentIndex); const prev = isShuffled ? shuffleOrder[(pos - 1 + SONGS.length) % SONGS.length] : (currentIndex - 1 + SONGS.length) % SONGS.length; loadSong(prev); playSong(); }
loadSong(0);
playBtn.addEventListener("click", () => audio.paused ? playSong() : pauseSong());
nextBtn.addEventListener("click", nextSong);
prevBtn.addEventListener("click", prevSong);
shuffleBtn.addEventListener("click", () => { isShuffled = !isShuffled; shuffleBtn.classList.toggle("active", isShuffled); if (isShuffled) buildShuffleOrder(); });
audio.addEventListener("ended", nextSong);
audio.addEventListener("timeupdate", () => { if (audio.duration && isFinite(audio.duration)) progress.style.width = (audio.currentTime / audio.duration * 100) + "%"; });


/* ═══════════════════════════════════════════
   FLOATING MUSIC TRIGGER
════════════════════════════════════════════ */
(function () {
    const btn = document.getElementById("music-trigger-btn"), mp = document.getElementById("music-player");
    if (!btn) return;
    let open = false;
    btn.addEventListener("click", () => { open = !open; mp.classList.toggle("open", open); open ? playSong() : pauseSong(); });
    audio.addEventListener("play", () => { playIcon.style.display = "none"; pauseIcon.style.display = "block"; });
    audio.addEventListener("pause", () => { playIcon.style.display = "block"; pauseIcon.style.display = "none"; });
})();


/* ═══════════════════════════════════════════
   RHUMB REVEAL
════════════════════════════════════════════ */
document.querySelectorAll(".rhumb-reveal, #about-section").forEach(el => {
    new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) el.classList.add("in-view"); });
    }, { threshold: 0.15 }).observe(el);
});


/* ═══════════════════════════════════════════
   TYPEWRITER
════════════════════════════════════════════ */
(function () {
    const el1 = document.getElementById("typewriter"), el2 = document.getElementById("typewriter-clone");
    if (!el1) return;
    const words = ["Developer", "Musician", "IT Engineer", "Full Stack Dev", "Guitarist", "Network Engineer", "Problem Solver"];
    let wi = 0, ci = 0, del = false;
    function type() {
        const w = words[wi], text = del ? w.slice(0, ci - 1) : w.slice(0, ci + 1);
        el1.textContent = text; if (el2) el2.textContent = text;
        if (!del) { ci++; if (ci === w.length) { del = true; setTimeout(type, 1800); return; } }
        else { ci--; if (ci === 0) { del = false; wi = (wi + 1) % words.length; setTimeout(type, 400); return; } }
        setTimeout(type, del ? 50 : 90);
    }
    type();
})();


/* ═══════════════════════════════════════════
   CURTAIN REVEAL — ABOUT / DRAGON SECTION
════════════════════════════════════════════ */
gsap.to("#about-section", {
    clipPath: "inset(0% 0 0 0)", ease: "none",
    scrollTrigger: { trigger: "#about-section", start: "top bottom", end: "top top", scrub: 1, invalidateOnRefresh: true }
});


/* ═══════════════════════════════════════════
   DRAGON PRETEXT SECTION
   Text flows around an animated dragon shape.
   Uses @chenglou/pretext via CDN ESM for
   DOM-reflow-free text layout measurement.
════════════════════════════════════════════ */
(function () {
    const scene = document.getElementById("dragon-scene");
    const dragonCanvas = document.getElementById("dragon-canvas");
    const textBlock = document.getElementById("dragon-text-block");
    const hint = document.getElementById("dragon-hint");
    if (!scene || !dragonCanvas || !textBlock) return;

    // ── About text content ───────────────────
    const ABOUT_TEXT = `I started playing guitar at 15 and haven't stopped since. Music is the only thing that makes complete sense to me. I build websites at 2am with headphones on — the best ideas come when everyone else is asleep. Nepal gave me everything: the mountains, the silence, the hunger to build something bigger than where I'm from. IT engineering taught me that everything is connected. Systems, people, music — it's all just signals. I'm based in Butwal, Lumbini Province. Small city, big internet connection, unlimited ambition. I speak code, I speak guitar, I speak late-night sessions and mountain air. Reach out anytime: bibekbhusal404@gmail.com — I don't bite. I might send you a song recommendation though.`;

    // ── Dragon path definition (SVG-style points) ─
    // A serpentine dragon shape as a series of bezier control points
    function getDragonPath(cx, cy, scale, time) {
        const s = scale;
        const t = time;
        // Animated serpentine body
        const pts = [];
        const segments = 24;
        for (let i = 0; i <= segments; i++) {
            const progress = i / segments;
            const wave1 = Math.sin(progress * Math.PI * 2.5 + t * 0.8) * 0.18 * s;
            const wave2 = Math.cos(progress * Math.PI * 1.5 + t * 0.5) * 0.08 * s;
            const x = cx + (progress - 0.5) * 1.1 * s + wave1;
            const y = cy + wave2 + Math.sin(progress * Math.PI + t * 0.3) * 0.12 * s;
            pts.push({ x, y });
        }
        return pts;
    }

    // ── Canvas: draw dragon ─────────────────
    const dCtx = dragonCanvas.getContext("2d");
    let dW = 0, dH = 0;
    let mouseX = -999, mouseY = -999;
    let targetX = -999, targetY = -999;
    let animTime = 0;
    let dragonRaf = null;
    let isVisible = false;
    // Dragon body segments for hit-testing text displacement
    let dragonSegments = [];

    function resizeDragonCanvas() {
        dW = scene.offsetWidth;
        dH = scene.offsetHeight;
        const dpr = window.devicePixelRatio || 1;
        dragonCanvas.width = Math.round(dW * dpr);
        dragonCanvas.height = Math.round(dH * dpr);
        dragonCanvas.style.width = dW + "px";
        dragonCanvas.style.height = dH + "px";
        dCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Draw dragon on canvas and return segment data for text displacement
    function drawDragon(cx, cy, scale, time) {
        dCtx.clearRect(0, 0, dW, dH);
        const pts = getDragonPath(cx, cy, scale, time);
        dragonSegments = pts;

        // Thickness varies along body (thick at middle, thin at tail)
        const maxR = scale * 0.055;
        const minR = scale * 0.012;

        // Glow layers
        for (let pass = 0; pass < 3; pass++) {
            const gAlpha = [0.04, 0.08, 0.15][pass];
            const gBlur = [32, 18, 8][pass];
            dCtx.save();
            dCtx.filter = `blur(${gBlur}px)`;
            dCtx.beginPath();
            pts.forEach((p, i) => i === 0 ? dCtx.moveTo(p.x, p.y) : dCtx.lineTo(p.x, p.y));
            dCtx.strokeStyle = `rgba(192, 0, 26, ${gAlpha * 4})`;
            dCtx.lineWidth = maxR * 2.5;
            dCtx.lineCap = "round";
            dCtx.lineJoin = "round";
            dCtx.stroke();
            dCtx.restore();
        }

        // Main body — gradient stroke
        const grad = dCtx.createLinearGradient(pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y);
        grad.addColorStop(0, "rgba(255, 255, 255, 0.1)");
        grad.addColorStop(0.2, "rgba(245, 255, 60, 0.9)");
        grad.addColorStop(0.5, "rgba(255, 80, 30, 1)");
        grad.addColorStop(0.8, "rgba(192, 0, 26, 0.95)");
        grad.addColorStop(1, "rgba(80, 0, 10, 0.4)");

        // Draw body as variable-width path (segments)
        for (let i = 1; i < pts.length; i++) {
            const t = i / pts.length;
            const r = maxR * Math.sin(t * Math.PI) * 1.2 + minR;
            dCtx.beginPath();
            dCtx.moveTo(pts[i - 1].x, pts[i - 1].y);
            dCtx.lineTo(pts[i].x, pts[i].y);
            dCtx.strokeStyle = grad;
            dCtx.lineWidth = r * 2;
            dCtx.lineCap = "round";
            dCtx.stroke();
        }

        // Scales — small circles along body
        for (let i = 2; i < pts.length - 2; i += 2) {
            const t = i / pts.length;
            const r = maxR * Math.sin(t * Math.PI) * 0.6 + minR * 0.5;
            const scaleT = (i / pts.length + time * 0.3) % 1;
            dCtx.beginPath();
            dCtx.arc(pts[i].x, pts[i].y, r * 0.7, 0, Math.PI * 2);
            dCtx.fillStyle = `rgba(245, 255, 60, ${0.15 + scaleT * 0.2})`;
            dCtx.fill();
        }

        // Head (larger circle at start)
        const head = pts[0];
        const headR = maxR * 1.4;
        dCtx.beginPath();
        dCtx.arc(head.x, head.y, headR, 0, Math.PI * 2);
        const headGrad = dCtx.createRadialGradient(head.x, head.y, 0, head.x, head.y, headR);
        headGrad.addColorStop(0, "rgba(245, 255, 60, 1)");
        headGrad.addColorStop(0.5, "rgba(255, 80, 30, 0.9)");
        headGrad.addColorStop(1, "rgba(192, 0, 26, 0.3)");
        dCtx.fillStyle = headGrad;
        dCtx.fill();

        // Eyes
        const eyeOff = headR * 0.35;
        dCtx.beginPath();
        dCtx.arc(head.x + eyeOff, head.y - eyeOff * 0.5, headR * 0.18, 0, Math.PI * 2);
        dCtx.fillStyle = "#fff";
        dCtx.fill();
        dCtx.beginPath();
        dCtx.arc(head.x + eyeOff, head.y - eyeOff * 0.5, headR * 0.09, 0, Math.PI * 2);
        dCtx.fillStyle = "#1A1A1A";
        dCtx.fill();

        // Tail flame
        const tail = pts[pts.length - 1];
        for (let f = 0; f < 5; f++) {
            const angle = Math.PI * 0.8 + (f / 5) * 0.8 + time * 2 + f * 0.4;
            const len = minR * (3 + Math.sin(time * 3 + f) * 1.5);
            dCtx.beginPath();
            dCtx.moveTo(tail.x, tail.y);
            dCtx.lineTo(tail.x + Math.cos(angle) * len, tail.y + Math.sin(angle) * len);
            dCtx.strokeStyle = `rgba(245,255,60,${0.3 + 0.4 * Math.abs(Math.sin(time * 4 + f))})`;
            dCtx.lineWidth = minR * 0.6;
            dCtx.lineCap = "round";
            dCtx.stroke();
        }
    }

    // ── Text displacement ───────────────────
    // For each word, check if it overlaps any dragon segment and push it away
    function getDisplacement(wx, wy, ww, wh) {
        let dx = 0, dy = 0;
        const padding = 18; // extra bubble around dragon
        for (let i = 0; i < dragonSegments.length; i++) {
            const seg = dragonSegments[i];
            const t = i / dragonSegments.length;
            const maxR = dW * 0.055 * 0.5;
            const minR = dW * 0.012 * 0.5;
            const r = maxR * Math.sin(t * Math.PI) * 1.2 + minR + padding;
            // Center of word
            const cx = wx + ww / 2;
            const cy = wy + wh / 2;
            const distX = cx - seg.x;
            const distY = cy - seg.y;
            const dist = Math.sqrt(distX * distX + distY * distY);
            if (dist < r) {
                const push = (r - dist) / r;
                const nx = dist > 0 ? distX / dist : 1;
                const ny = dist > 0 ? distY / dist : 0;
                dx += nx * push * r * 0.8;
                dy += ny * push * r * 0.5;
            }
        }
        return { dx, dy };
    }

    // ── Build word spans ────────────────────
    function buildWords() {
        textBlock.innerHTML = "";
        const words = ABOUT_TEXT.split(/\s+/);
        words.forEach((word, i) => {
            const span = document.createElement("span");
            span.className = "dragon-word";
            span.textContent = word + " ";
            span.style.display = "inline-block";
            span.style.transition = "transform 0.25s cubic-bezier(0.16,1,0.3,1)";
            span.style.willChange = "transform";
            textBlock.appendChild(span);
        });
    }

    // ── Animate ─────────────────────────────
    let hintFaded = false;
    function animateDragon(ts) {
        if (!isVisible) { dragonRaf = null; return; }
        animTime = ts / 1000;

        // Lerp dragon center toward mouse, else float gently
        const hasMouse = mouseX > 0 && mouseY > 0;
        if (hasMouse) {
            targetX += (mouseX - targetX) * 0.06;
            targetY += (mouseY - targetY) * 0.06;
            if (!hintFaded && hint) { hint.style.opacity = "0"; hintFaded = true; }
        } else {
            // Idle float
            targetX = dW * 0.5 + Math.sin(animTime * 0.25) * dW * 0.15;
            targetY = dH * 0.5 + Math.cos(animTime * 0.18) * dH * 0.1;
        }

        const scale = Math.min(dW, dH) * 0.7;
        drawDragon(targetX, targetY, scale, animTime);

        // Displace words
        const words = textBlock.querySelectorAll(".dragon-word");
        const blockRect = textBlock.getBoundingClientRect();
        words.forEach(word => {
            const r = word.getBoundingClientRect();
            const wx = r.left - blockRect.left;
            const wy = r.top - blockRect.top + scene.scrollTop;
            const { dx, dy } = getDisplacement(
                r.left, r.top, r.width, r.height
            );
            const clampX = Math.max(-60, Math.min(60, dx));
            const clampY = Math.max(-40, Math.min(40, dy));
            word.style.transform = `translate(${clampX}px, ${clampY}px)`;
        });

        dragonRaf = requestAnimationFrame(animateDragon);
    }

    function startDragon() {
        if (dragonRaf) return;
        dragonRaf = requestAnimationFrame(animateDragon);
    }

    function stopDragon() {
        if (dragonRaf) { cancelAnimationFrame(dragonRaf); dragonRaf = null; }
        // Reset word positions
        textBlock.querySelectorAll(".dragon-word").forEach(w => w.style.transform = "");
    }

    // ── Events ──────────────────────────────
    scene.addEventListener("mousemove", e => {
        const r = scene.getBoundingClientRect();
        mouseX = e.clientX - r.left;
        mouseY = e.clientY - r.top;
    }, { passive: true });

    scene.addEventListener("mouseleave", () => {
        mouseX = -999; mouseY = -999;
    }, { passive: true });

    scene.addEventListener("touchmove", e => {
        const r = scene.getBoundingClientRect();
        mouseX = e.touches[0].clientX - r.left;
        mouseY = e.touches[0].clientY - r.top;
    }, { passive: true });

    window.addEventListener("resize", () => {
        resizeDragonCanvas();
    }, { passive: true });

    // ── IntersectionObserver ─────────────────
    new IntersectionObserver(entries => {
        entries.forEach(e => {
            isVisible = e.isIntersecting;
            if (isVisible) { resizeDragonCanvas(); startDragon(); }
            else stopDragon();
        });
    }, { threshold: 0.05 }).observe(scene);

    // ── Init ─────────────────────────────────
    buildWords();
    resizeDragonCanvas();
    targetX = (scene.offsetWidth || 800) * 0.5;
    targetY = (scene.offsetHeight || 600) * 0.5;
})();