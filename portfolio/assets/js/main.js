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
   CURTAIN REVEAL
════════════════════════════════════════════ */
gsap.to("#about-section", {
    clipPath: "inset(0% 0 0 0)", ease: "none",
    scrollTrigger: { trigger: "#about-section", start: "top bottom", end: "top top", scrub: 1, invalidateOnRefresh: true }
});


/* ═══════════════════════════════════════════
   STICKY NOTES
════════════════════════════════════════════ */
gsap.utils.toArray(".sticky-note").forEach((note, i) => {
    gsap.fromTo(note, { opacity: 0, y: 40 }, {
        opacity: 1, y: 0, duration: 0.7, ease: "back.out(1.4)", delay: i * 0.15,
        scrollTrigger: { trigger: ".sticky-board", start: "top 75%", toggleActions: "play none none reverse" }
    });
});
document.querySelectorAll(".sticky-note").forEach(note => {
    let drag = false, sx, sy, il, it;
    note.addEventListener("mousedown", e => { drag = true; sx = e.clientX; sy = e.clientY; il = note.offsetLeft; it = note.offsetTop; note.style.zIndex = 999; note.style.transition = "none"; e.preventDefault(); });
    window.addEventListener("mousemove", e => { if (!drag) return; note.style.left = (il + e.clientX - sx) + "px"; note.style.top = (it + e.clientY - sy) + "px"; });
    window.addEventListener("mouseup", () => { if (!drag) return; drag = false; note.style.zIndex = 10; note.style.transition = "box-shadow 0.2s,transform 0.2s"; });
    note.addEventListener("touchstart", e => { const t = e.touches[0]; drag = true; sx = t.clientX; sy = t.clientY; il = note.offsetLeft; it = note.offsetTop; note.style.zIndex = 999; }, { passive: true });
    window.addEventListener("touchmove", e => { if (!drag) return; const t = e.touches[0]; note.style.left = (il + t.clientX - sx) + "px"; note.style.top = (it + t.clientY - sy) + "px"; }, { passive: true });
    window.addEventListener("touchend", () => { drag = false; note.style.zIndex = 10; });
});


/* ═══════════════════════════════════════════
   PIXEL SNOW
════════════════════════════════════════════ */
(function () {
    const snowCanvas = document.getElementById("snow-canvas"); if (!snowCanvas) return;
    const sc = snowCanvas.getContext("2d");
    const COLORS = ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.6)", "rgba(242,235,224,0.7)", "rgba(255,255,255,0.4)"];
    let flakes = [], rafId = null, lastTime = 0;
    const resize = () => { snowCanvas.width = snowCanvas.offsetWidth; snowCanvas.height = snowCanvas.offsetHeight; };
    function spawn() { const r = 1.5 + Math.random() * 3; flakes.push({ x: Math.random() * (snowCanvas.width || 800), y: -r * 2, r, speed: 0.4 + Math.random() * 0.8, color: COLORS[Math.floor(Math.random() * COLORS.length)], drift: (Math.random() - 0.5) * 0.4 }); }
    function draw(ts) { const dt = Math.min(ts - lastTime, 50); lastTime = ts; sc.clearRect(0, 0, snowCanvas.width, snowCanvas.height); if (flakes.length < 100) spawn(); flakes.forEach(f => { f.y += f.speed * (dt / 16); f.x += f.drift * (dt / 16); sc.beginPath(); sc.arc(f.x, f.y, f.r, 0, Math.PI * 2); sc.fillStyle = f.color; sc.fill(); }); flakes = flakes.filter(f => f.y < snowCanvas.height + 10); rafId = requestAnimationFrame(draw); }
    new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting && !rafId) { resize(); rafId = requestAnimationFrame(draw); } if (!e.isIntersecting && rafId) { cancelAnimationFrame(rafId); rafId = null; } }); }, { threshold: 0.05 }).observe(document.getElementById("about-section"));
    window.addEventListener("resize", resize, { passive: true });
})();