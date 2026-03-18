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

/* ═══════════════════════════════════════════
   TEXT CURSOR — vanilla port of ReactBits
   Spawns "Lazy" labels trailing the mouse,
   each floats and fades out independently.
════════════════════════════════════════════ */
(function () {
    const LABEL = "Lazy";
    const SPACING = 90;       // px between spawns
    const MAX = 6;        // max live labels
    const LIFETIME = 900;      // ms before fade starts

    const container = document.createElement("div");
    container.className = "text-cursor-container";
    document.body.appendChild(container);

    let lastX = 0, lastY = 0;
    let items = [];

    function spawnItem(x, y) {
        if (items.length >= MAX) {
            // kill oldest
            const old = items.shift();
            old.el.remove();
        }

        const el = document.createElement("div");
        el.className = "text-cursor-item";
        el.textContent = LABEL;

        // slight random rotation/offset
        const rx = (Math.random() - 0.5) * 14;
        const ry = (Math.random() - 0.5) * 14;
        const rot = (Math.random() - 0.5) * 16;
        el.style.left = x + "px";
        el.style.top = y + "px";
        el.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;

        container.appendChild(el);

        // trigger alive state next frame
        requestAnimationFrame(() => el.classList.add("alive"));

        const item = { el, x, y };
        items.push(item);

        // start dying after LIFETIME
        setTimeout(() => {
            el.classList.remove("alive");
            el.classList.add("dying");
            setTimeout(() => {
                el.remove();
                items = items.filter(i => i !== item);
            }, 500);
        }, LIFETIME);

        return item;
    }

    window.addEventListener("mousemove", (e) => {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= SPACING) {
            spawnItem(e.clientX, e.clientY);
            lastX = e.clientX;
            lastY = e.clientY;
        }
    }, { passive: true });
})();


/* ═══════════════════════════════════════════
   BLOB CURSOR
════════════════════════════════════════════ */
const cursorContainer = document.createElement("div");
cursorContainer.className = "blob-container";

const blobMain = document.createElement("div");
blobMain.className = "blob-main";

const sizes = [60, 125, 75];
const innerSizes = [20, 35, 25];
const opacities = [0.8, 0.6, 0.7];
const blobs = [];

for (let i = 0; i < 3; i++) {
    const b = document.createElement("div");
    b.className = "blob";
    b.style.width = sizes[i] + "px";
    b.style.height = sizes[i] + "px";
    b.style.borderRadius = "50%";
    b.style.opacity = opacities[i];
    b.style.boxShadow = "10px 10px 5px 0 rgba(0,0,0,0.75)";

    const inner = document.createElement("div");
    inner.className = "inner-dot";
    inner.style.width = innerSizes[i] + "px";
    inner.style.height = innerSizes[i] + "px";
    inner.style.top = (sizes[i] - innerSizes[i]) / 2 + "px";
    inner.style.left = (sizes[i] - innerSizes[i]) / 2 + "px";
    inner.style.backgroundColor = "rgba(255,255,255,0.8)";
    inner.style.borderRadius = "50%";
    inner.style.position = "absolute";

    b.appendChild(inner);
    blobMain.appendChild(b);
    blobs.push(b);
}

cursorContainer.appendChild(blobMain);
document.body.appendChild(cursorContainer);

window.addEventListener("mousemove", (e) => {
    blobs.forEach((el, i) => {
        gsap.to(el, {
            x: e.clientX, y: e.clientY,
            duration: i === 0 ? 0.1 : 0.5,
            ease: i === 0 ? "power3.out" : "power1.out"
        });
    });
}, { passive: true });


/* ═══════════════════════════════════════════
   CANVAS MASK
════════════════════════════════════════════ */
let currentScale = 1;
let currentDark = 1;
let maskRafId = null;

function sizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
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
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(0,180,180,${currentDark})`;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
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
   VIDEO SCRUB — rAF gated
════════════════════════════════════════════ */
let pendingSeekTime = null;
let seekRafId = null;

function scheduleSeek(t) {
    pendingSeekTime = t;
    if (!seekRafId) seekRafId = requestAnimationFrame(_flushSeek);
}

function _flushSeek() {
    seekRafId = null;
    if (pendingSeekTime === null) return;
    const t = pendingSeekTime;
    pendingSeekTime = null;
    if (
        video.readyState >= 2 &&
        video.duration &&
        isFinite(video.duration) &&
        Math.abs(video.currentTime - t) > 0.1
    ) {
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
            if (entry.isIntersecting) {
                homeBgVideo.play().catch(() => { });
                homeBgVideo.classList.add("active");
            } else {
                homeBgVideo.pause();
                homeBgVideo.classList.remove("active");
            }
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
    const vibeProxy = { scale: 1 };
    const darkProxy = { opacity: 1 };

    sizeCanvas();
    currentScale = 1; currentDark = 1;
    _flushMask();

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: "#hero",
            start: "top top",
            end: "+=300%",
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            fastScrollEnd: true,
            onUpdate: (self) => {
                if (video.duration && isFinite(video.duration))
                    scheduleSeek(self.progress * video.duration);
            },
            onLeaveBack: () => {
                vibeProxy.scale = 1; darkProxy.opacity = 1;
                if (maskRafId) { cancelAnimationFrame(maskRafId); maskRafId = null; }
                currentScale = 1; currentDark = 1;
                _flushMask();
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
        onEnter: () => document.getElementById("dock").classList.add("visible"),
        onLeaveBack: () => document.getElementById("dock").classList.remove("visible"),
    });

    ScrollTrigger.refresh();
}


/* ═══════════════════════════════════════════
   CURSOR REVEAL
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
        dot.style.left = e.clientX + "px";
        dot.style.top = e.clientY + "px";
        dot.classList.add("on");
        cursorContainer.style.opacity = "0";
    }, { passive: true });

    scene.addEventListener("mouseleave", (e) => {
        const base = document.querySelector(".cr-base-layer");
        if (base) base.style.opacity = "1";
        const rect = scene.getBoundingClientRect();
        reveal.style.transition = "clip-path 0.5s cubic-bezier(0.16,1,0.3,1)";
        reveal.style.clipPath = `circle(0px at ${(e.clientX - rect.left).toFixed(1)}px ${(e.clientY - rect.top).toFixed(1)}px)`;
        setTimeout(() => { reveal.style.transition = "none"; }, 500);
        dot.classList.remove("on");
        cursorContainer.style.opacity = "1";
    });
}


/* ═══════════════════════════════════════════
   CONNECT BUTTON
════════════════════════════════════════════ */
const connectBtn = document.getElementById("connect-btn");
const contactReveal = document.getElementById("contact-reveal");
if (connectBtn) {
    connectBtn.addEventListener("click", () => contactReveal.classList.toggle("open"));
}


/* ═══════════════════════════════════════════
   MAGNETIC BUTTONS
════════════════════════════════════════════ */
document.querySelectorAll(".magnetic").forEach(btn => {
    btn.addEventListener("mousemove", e => {
        const r = btn.getBoundingClientRect();
        gsap.to(btn, {
            x: (e.clientX - (r.left + r.width / 2)) * 0.35,
            y: (e.clientY - (r.top + r.height / 2)) * 0.35,
            duration: 0.4, ease: "power2.out"
        });
    });
    btn.addEventListener("mouseleave", () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1,0.4)" });
    });
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
const displayName = f => f.replace(/\.mp3$/i, "").replace(/\[.*?\]/g, "")
    .replace(/\(Official.*?\)/gi, "").replace(/Official Video/gi, "")
    .replace(/\s{2,}/g, " ").trim();

let currentIndex = 0, isShuffled = false, shuffleOrder = [];

function buildShuffleOrder() {
    shuffleOrder = [...Array(SONGS.length).keys()];
    for (let i = shuffleOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffleOrder[i], shuffleOrder[j]] = [shuffleOrder[j], shuffleOrder[i]];
    }
}
buildShuffleOrder();

function loadSong(idx) {
    currentIndex = idx;
    audio.src = songPath(SONGS[idx]);
    songName.textContent = displayName(SONGS[idx]);
    progress.style.width = "0%";
}
function playSong() {
    audio.play().then(() => {
        playIcon.style.display = "none"; pauseIcon.style.display = "block";
    }).catch(() => { });
}
function pauseSong() {
    audio.pause();
    playIcon.style.display = "block"; pauseIcon.style.display = "none";
}
function nextSong() {
    const pos = shuffleOrder.indexOf(currentIndex);
    const next = isShuffled ? shuffleOrder[(pos + 1) % SONGS.length] : (currentIndex + 1) % SONGS.length;
    loadSong(next); playSong();
}
function prevSong() {
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    const pos = shuffleOrder.indexOf(currentIndex);
    const prev = isShuffled ? shuffleOrder[(pos - 1 + SONGS.length) % SONGS.length] : (currentIndex - 1 + SONGS.length) % SONGS.length;
    loadSong(prev); playSong();
}

loadSong(0);
playBtn.addEventListener("click", () => audio.paused ? playSong() : pauseSong());
nextBtn.addEventListener("click", nextSong);
prevBtn.addEventListener("click", prevSong);
shuffleBtn.addEventListener("click", () => {
    isShuffled = !isShuffled;
    shuffleBtn.classList.toggle("active", isShuffled);
    if (isShuffled) buildShuffleOrder();
});
audio.addEventListener("ended", nextSong);
audio.addEventListener("timeupdate", () => {
    if (audio.duration && isFinite(audio.duration))
        progress.style.width = (audio.currentTime / audio.duration * 100) + "%";
});


/* ═══════════════════════════════════════════
   FLOATING MUSIC TRIGGER
════════════════════════════════════════════ */
(function () {
    const btn = document.getElementById("music-trigger-btn");
    const mp = document.getElementById("music-player");
    if (!btn) return;
    let open = false;
    btn.addEventListener("click", () => {
        open = !open;
        mp.classList.toggle("open", open);
        open ? playSong() : pauseSong();
    });
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
    const el1 = document.getElementById("typewriter");
    const el2 = document.getElementById("typewriter-clone");
    if (!el1) return;
    const words = ["Developer", "Musician", "IT Engineer", "Full Stack Dev", "Guitarist", "Network Engineer", "Problem Solver"];
    let wi = 0, ci = 0, del = false;
    function type() {
        const w = words[wi];
        const text = del ? w.slice(0, ci - 1) : w.slice(0, ci + 1);
        el1.textContent = text;
        if (el2) el2.textContent = text;
        if (!del) {
            ci++;
            if (ci === w.length) { del = true; setTimeout(type, 1800); return; }
        } else {
            ci--;
            if (ci === 0) { del = false; wi = (wi + 1) % words.length; setTimeout(type, 400); return; }
        }
        setTimeout(type, del ? 50 : 90);
    }
    type();
})();


/* ═══════════════════════════════════════════
   CURTAIN REVEAL
════════════════════════════════════════════ */
gsap.to("#about-section", {
    clipPath: "inset(0% 0 0 0)", ease: "none",
    scrollTrigger: {
        trigger: "#about-section", start: "top bottom", end: "top top",
        scrub: 1, invalidateOnRefresh: true,
    }
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
    note.addEventListener("mousedown", e => {
        drag = true; sx = e.clientX; sy = e.clientY;
        il = note.offsetLeft; it = note.offsetTop;
        note.style.zIndex = 999; note.style.transition = "none"; e.preventDefault();
    });
    window.addEventListener("mousemove", e => {
        if (!drag) return;
        note.style.left = (il + e.clientX - sx) + "px";
        note.style.top = (it + e.clientY - sy) + "px";
    });
    window.addEventListener("mouseup", () => {
        if (!drag) return;
        drag = false; note.style.zIndex = 10;
        note.style.transition = "box-shadow 0.2s, transform 0.2s";
    });
    note.addEventListener("touchstart", e => {
        const t = e.touches[0]; drag = true; sx = t.clientX; sy = t.clientY;
        il = note.offsetLeft; it = note.offsetTop; note.style.zIndex = 999;
    }, { passive: true });
    window.addEventListener("touchmove", e => {
        if (!drag) return;
        const t = e.touches[0];
        note.style.left = (il + t.clientX - sx) + "px";
        note.style.top = (it + t.clientY - sy) + "px";
    }, { passive: true });
    window.addEventListener("touchend", () => { drag = false; note.style.zIndex = 10; });
});


/* ═══════════════════════════════════════════
   PIXEL SNOW
════════════════════════════════════════════ */
(function () {
    const snowCanvas = document.getElementById("snow-canvas");
    if (!snowCanvas) return;
    const sc = snowCanvas.getContext("2d");
    const COLORS = ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.6)", "rgba(242,235,224,0.7)", "rgba(255,255,255,0.4)"];
    let flakes = [], rafId = null, lastTime = 0;
    const resize = () => { snowCanvas.width = snowCanvas.offsetWidth; snowCanvas.height = snowCanvas.offsetHeight; };
    function spawn() {
        const r = 1.5 + Math.random() * 3;
        flakes.push({
            x: Math.random() * (snowCanvas.width || 800), y: -r * 2, r,
            speed: 0.4 + Math.random() * 0.8, color: COLORS[Math.floor(Math.random() * COLORS.length)],
            drift: (Math.random() - 0.5) * 0.4
        });
    }
    function draw(ts) {
        const dt = Math.min(ts - lastTime, 50); lastTime = ts;
        sc.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
        if (flakes.length < 100) spawn();
        flakes.forEach(f => {
            f.y += f.speed * (dt / 16); f.x += f.drift * (dt / 16);
            sc.beginPath(); sc.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            sc.fillStyle = f.color; sc.fill();
        });
        flakes = flakes.filter(f => f.y < snowCanvas.height + 10);
        rafId = requestAnimationFrame(draw);
    }
    new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting && !rafId) { resize(); rafId = requestAnimationFrame(draw); }
            if (!e.isIntersecting && rafId) { cancelAnimationFrame(rafId); rafId = null; }
        });
    }, { threshold: 0.05 }).observe(document.getElementById("about-section"));
    window.addEventListener("resize", resize, { passive: true });
})();


/* ═══════════════════════════════════════════
   HIRE ME PARALLAX
════════════════════════════════════════════ */
const hireContainer = document.getElementById("hire-me");
if (hireContainer) {
    gsap.fromTo(hireContainer, { y: 150, opacity: 0 }, {
        y: 0, opacity: 1,
        scrollTrigger: { trigger: hireContainer, start: "top 85%", end: "top 25%", scrub: 1 }
    });
}