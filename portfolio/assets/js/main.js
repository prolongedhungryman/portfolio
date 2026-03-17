gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ limitCallbacks: true });
gsap.config({ force3D: true });

/* ═══════════════════════════════════════════
   ELEMENTS
════════════════════════════════════════════ */
const video = document.getElementById("bg-video");
const loader = document.getElementById("loader");
const hint = document.getElementById("scroll-hint");
const homeNav = document.getElementById("home-nav");
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
   BLOB CURSOR
════════════════════════════════════════════ */
const cursorContainer = document.createElement("div");
cursorContainer.className = "blob-container";
// To replace old cursor reference in other scripts gracefully:
const cursor = cursorContainer; 
const ring = cursorContainer; 

const svgNs = "http://www.w3.org/2000/svg";
const svg = document.createElementNS(svgNs, "svg");
svg.style.position = "absolute";
svg.style.width = "0";
svg.style.height = "0";

const filter = document.createElementNS(svgNs, "filter");
filter.id = "blob-filter";

const blur = document.createElementNS(svgNs, "feGaussianBlur");
blur.setAttribute("in", "SourceGraphic");
blur.setAttribute("result", "blur");
blur.setAttribute("stdDeviation", "30");

const colorMatrix = document.createElementNS(svgNs, "feColorMatrix");
colorMatrix.setAttribute("in", "blur");
colorMatrix.setAttribute("values", "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 35 -10");

filter.appendChild(blur);
filter.appendChild(colorMatrix);
svg.appendChild(filter);
cursorContainer.appendChild(svg);

const blobMain = document.createElement("div");
blobMain.className = "blob-main";
blobMain.style.filter = "url(#blob-filter)";

const trailCount = 3;
const sizes = [60, 125, 75];
const innerSizes = [20, 35, 25];
const opacities = [0.6, 0.6, 0.6];
const fillColor = "#5227FF";
const innerColor = "rgba(255,255,255,0.8)";
const blobs = [];

for (let i = 0; i < trailCount; i++) {
    const b = document.createElement("div");
    b.className = "blob";
    b.style.width = sizes[i] + "px";
    b.style.height = sizes[i] + "px";
    b.style.borderRadius = "50%";
    b.style.backgroundColor = fillColor;
    b.style.opacity = opacities[i];
    b.style.boxShadow = "10px 10px 5px 0 rgba(0,0,0,0.75)";
    
    const inner = document.createElement("div");
    inner.className = "inner-dot";
    inner.style.width = innerSizes[i] + "px";
    inner.style.height = innerSizes[i] + "px";
    inner.style.top = (sizes[i] - innerSizes[i]) / 2 + "px";
    inner.style.left = (sizes[i] - innerSizes[i]) / 2 + "px";
    inner.style.backgroundColor = innerColor;
    inner.style.borderRadius = "50%";
    
    b.appendChild(inner);
    blobMain.appendChild(b);
    blobs.push(b);
}

cursorContainer.appendChild(blobMain);
document.body.appendChild(cursorContainer);

window.addEventListener("mousemove", (e) => {
    let x = e.clientX;
    let y = e.clientY;
    
    blobs.forEach((el, i) => {
        const isLead = i === 0;
        gsap.to(el, {
            x: x,
            y: y,
            duration: isLead ? 0.1 : 0.5,
            ease: isLead ? "power3.out" : "power1.out"
        });
    });
});


/* ═══════════════════════════════════════════
   CANVAS MASK — draws dark overlay with
   transparent VIBE-shaped holes so the fixed
   video behind shows through the letters only.
════════════════════════════════════════════ */
let currentScale = 1;
let currentDark = 1;

function sizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawMask(scale, darkOpacity) {
    currentScale = scale;
    currentDark = darkOpacity;

    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);

    // 1. Fill dark overlay
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(0, 180, 180, ${darkOpacity})`;
    ctx.fillRect(0, 0, w, h);

    // 2. Punch out VIBE text — transparent holes
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const baseFontSize = w * 0.26;
    const fontSize = baseFontSize * scale;
    ctx.font = `900 ${fontSize}px "Barlow Condensed", sans-serif`;
    ctx.fillText("VIBE", w / 2, h / 2);

    ctx.globalCompositeOperation = "source-over";
}

window.addEventListener("resize", () => {
    sizeCanvas();
    drawMask(currentScale, currentDark);
});

/* ═══════════════════════════════════════════
   LOADER GATE
════════════════════════════════════════════ */
let started = false;
function startExperience() {
    if (started) return;
    started = true;
    loader.classList.add("fade");
    setTimeout(() => {
        if (loader.parentNode) loader.remove();
    }, 900);
    buildVibe();
    buildHomepage();
    initCrosshair();
}
video.addEventListener("canplaythrough", startExperience, { once: true });
setTimeout(startExperience, 3000);

/* ═══════════════════════════════════════════
   VIBE SECTION — master timeline
════════════════════════════════════════════ */
function buildVibe() {
    /* Proxy objects for canvas redraws */
    const vibeProxy = { scale: 1 };
    const darkProxy = { opacity: 1 };

    sizeCanvas();
    document.fonts.ready.then(() => drawMask(1, 1));

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: "#hero",
            start: "top top",
            end: "+=300%",
            scrub: true,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            fastScrollEnd: true,
            onUpdate: (self) => {
                if (video.duration && isFinite(video.duration)) {
                    const t = self.progress * video.duration;
                    if (Math.abs(video.currentTime - t) > 0.04) {
                        video.currentTime = t;
                    }
                }
            },
            onLeaveBack: () => {
                vibeProxy.scale = 1;
                darkProxy.opacity = 1;
                drawMask(1, 1);
                gsap.set("#lazy-text", { x: 0, opacity: 0.85 });
                gsap.set("#ek-text", { x: 0, opacity: 0.85 });
            }
        }
    });

    tl.fromTo(vibeProxy,
        { scale: 1 },
        { scale: 14, ease: "none", duration: 1, onUpdate: () => drawMask(vibeProxy.scale, darkProxy.opacity) }, 0);
    tl.fromTo("#lazy-text",
        { x: 0, opacity: 0.85 }, { x: -160, opacity: 0, ease: "none", duration: 0.4 }, 0);
    tl.fromTo("#ek-text",
        { x: 0, opacity: 0.85 }, { x: 160, opacity: 0, ease: "none", duration: 0.4 }, 0);
    tl.fromTo(darkProxy,
        { opacity: 1 }, { opacity: 0, ease: "none", duration: 0.3, onUpdate: () => drawMask(vibeProxy.scale, darkProxy.opacity) }, 0.7);

    ScrollTrigger.create({
        trigger: "#hero",
        start: "top+=10 top",
        onEnter: () => hint.classList.add("hidden"),
        onLeaveBack: () => hint.classList.remove("hidden"),
    });

    // Nav removed.
}

/* ═══════════════════════════════════════════
   HOMEPAGE — animations & music player
════════════════════════════════════════════ */
function buildHomepage() {

    // Cursor color changes when entering homepage
    ScrollTrigger.create({
        trigger: "#homepage",
        start: "top 80%",
        onEnter: () => {
            cursor.style.background = "#1A1A1A";
            ring.style.borderColor = "rgba(26,26,26,0.4)";
        },
        onLeaveBack: () => {
            cursor.style.background = "#ffffff";
            ring.style.borderColor = "rgba(255,255,255,0.4)";
        }
    });

    /* ── HOMEPAGE BG VIDEO ── */
    const homeBgVideo = document.getElementById(
        "homepage-bg-video"
    );
    if (homeBgVideo) {
        const videoObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        homeBgVideo.play().catch(() => { });
                        homeBgVideo.classList.add('active');
                    } else {
                        homeBgVideo.pause();
                        homeBgVideo.classList.remove('active');
                    }
                });
            },
            { threshold: 0.1 }
        );
        videoObserver.observe(
            document.getElementById("homepage")
        );
    }

    // Headline reveal — words reveal one by one
    gsap.utils.toArray("#reveal-headline .word").forEach((word, i) => {
        gsap.to(word, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
                trigger: "#reveal-headline",
                start: "top 75%",
                toggleActions: "play none none reverse",
            },
            delay: i * 0.12,
        });
    });

    // Subtitle + scroll cue fade up
    gsap.utils.toArray(".reveal-up").forEach((el, i) => {
        gsap.fromTo(el,
            { y: 30, opacity: 0 },
            {
                y: 0, opacity: 1,
                duration: 1, ease: "power3.out",
                delay: 0.4 + i * 0.15,
                scrollTrigger: {
                    trigger: "#homepage",
                    start: "top 70%",
                    invalidateOnRefresh: true,
                }
            }
        );
    });

    // Mac OS Dock visibility
    ScrollTrigger.create({
        trigger: "#homepage",
        start: "top 80%",
        onEnter: () => {
            document.getElementById("dock").classList.add("visible");
        },
        onLeaveBack: () => {
            document.getElementById("dock").classList.remove("visible");
        }
    });



    ScrollTrigger.refresh();
}

/* ═══════════════════════════════════════════
   LET'S CONNECT BUTTON TOGGLE
════════════════════════════════════════════ */
const connectBtn = document.getElementById("connect-btn");
const contactReveal = document.getElementById("contact-reveal");
connectBtn.addEventListener("click", () => {
    contactReveal.classList.toggle("open");
});



/* ═══════════════════════════════════════════
   MAGNETIC BUTTONS
   Buttons subtly follow cursor on hover
════════════════════════════════════════════ */
document.querySelectorAll(".magnetic").forEach(btn => {
    btn.addEventListener("mousemove", e => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        gsap.to(btn, { x: x * 0.35, y: y * 0.35, duration: 0.4, ease: "power2.out" });
    });
    btn.addEventListener("mouseleave", () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
    });
});

/* ═══════════════════════════════════════════
   MUSIC PLAYER
   Songs from assets/mp3 file/ folder
   Update this array if you add/rename songs
════════════════════════════════════════════ */
const SONGS = [
    "do you know me.mp3",
    "Goo Goo Dolls  Iris [Official Music Video] [4K Remaster].mp3",
    "Kasoor (Acoustic) - Prateek Kuhad  Official Lyric Video.mp3",
    "O Sanam  Farmhouse Frames  Lucky Ali  unplugged 2025.mp3",
    "Sticky Fingers  - A Love Letter From Me To You (The Village Sessions).mp3"
];

// Encode filename for URL (handles spaces and special chars)
function songPath(filename) {
    return "assets/mp3 file/" + encodeURIComponent(filename);
}

// Clean display name — strip file extension and extra spaces
function displayName(filename) {
    return filename
        .replace(/\.mp3$/i, "")
        .replace(/\[.*?\]/g, "")
        .replace(/\(Official.*?\)/gi, "")
        .replace(/Official Video/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

let currentIndex = 0;
let isShuffled = false;
let shuffleOrder = [];

function buildShuffleOrder() {
    shuffleOrder = [...Array(SONGS.length).keys()];
    for (let i = shuffleOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffleOrder[i], shuffleOrder[j]] = [shuffleOrder[j], shuffleOrder[i]];
    }
}
buildShuffleOrder();

function loadSong(index) {
    currentIndex = index;
    const filename = SONGS[index];
    audio.src = songPath(filename);
    songName.textContent = displayName(filename);
    progress.style.width = "0%";
}

function playSong() {
    audio.play().then(() => {
        playIcon.style.display = "none";
        pauseIcon.style.display = "block";
    }).catch(() => {
        // Autoplay blocked — user must interact first
    });
}

function pauseSong() {
    audio.pause();
    playIcon.style.display = "block";
    pauseIcon.style.display = "none";
}

function nextSong() {
    let next;
    if (isShuffled) {
        const pos = shuffleOrder.indexOf(currentIndex);
        next = shuffleOrder[(pos + 1) % SONGS.length];
    } else {
        next = (currentIndex + 1) % SONGS.length;
    }
    loadSong(next);
    playSong();
}

function prevSong() {
    // If more than 3s in — restart current song
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }
    let prev;
    if (isShuffled) {
        const pos = shuffleOrder.indexOf(currentIndex);
        prev = shuffleOrder[(pos - 1 + SONGS.length) % SONGS.length];
    } else {
        prev = (currentIndex - 1 + SONGS.length) % SONGS.length;
    }
    loadSong(prev);
    playSong();
}

// Load first song on init (don't autoplay)
loadSong(0);

// Play / Pause
playBtn.addEventListener("click", () => {
    if (audio.paused) playSong();
    else pauseSong();
});

// Next
nextBtn.addEventListener("click", nextSong);

// Prev
prevBtn.addEventListener("click", prevSong);

// Shuffle toggle
shuffleBtn.addEventListener("click", () => {
    isShuffled = !isShuffled;
    shuffleBtn.classList.toggle("active", isShuffled);
    if (isShuffled) buildShuffleOrder();
});

// Auto-advance to next song when current ends
audio.addEventListener("ended", nextSong);

// Progress bar update
audio.addEventListener("timeupdate", () => {
    if (audio.duration && isFinite(audio.duration)) {
        progress.style.width = (audio.currentTime / audio.duration * 100) + "%";
    }
});

/* ── RHUMB REVEAL OBSERVER ── */
const revealEls = document.querySelectorAll('.rhumb-reveal, #about-section');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
        }
    });
}, { threshold: 0.15 });

revealEls.forEach(el => revealObserver.observe(el));

/* ── CURSOR REVEAL (SVG MASK) ── */
(function () {
    const scene = document.getElementById('cr-scene');
    const reveal = document.querySelector('.cr-reveal-layer');
    if (!scene || !reveal) return;

    const dot = document.createElement('div');
    dot.className = 'cr-dot';
    document.body.appendChild(dot);

    scene.addEventListener('mousemove', function (e) {
        const hint = document.getElementById('cr-hint-wrap');
        if (hint) hint.classList.add('hidden');
        document.querySelector('.cr-base-layer').style.opacity = '0';
        const rect = scene.getBoundingClientRect();
        const x = (e.clientX - rect.left).toFixed(1);
        const y = (e.clientY - rect.top).toFixed(1);
        reveal.style.clipPath = `circle(160px at ${x}px ${y}px)`;
        dot.style.left = e.clientX + 'px';
        dot.style.top = e.clientY + 'px';
        dot.classList.add('on');
        if (window.cursor) window.cursor.style.opacity = '0';
        if (window.ring) window.ring.style.opacity = '0';
    });

    scene.addEventListener('mouseleave', function (e) {
        document.querySelector('.cr-base-layer').style.opacity = '1';
        const rect = scene.getBoundingClientRect();
        const x = (e.clientX - rect.left).toFixed(1);
        const y = (e.clientY - rect.top).toFixed(1);
        reveal.style.transition = 'clip-path 0.5s cubic-bezier(0.16,1,0.3,1)';
        reveal.style.clipPath = `circle(0px at ${x}px ${y}px)`;
        setTimeout(() => { reveal.style.transition = 'none'; }, 500);
        dot.classList.remove('on');
        if (window.cursor) window.cursor.style.opacity = '1';
        if (window.ring) window.ring.style.opacity = '1';
    });
})();

/* ── TYPEWRITER ── */
(function () {
    const el1 = document.getElementById('typewriter');
    const el2 = document.getElementById('typewriter-clone');
    if (!el1) return;

    const words = [
        'Developer',
        'Musician',
        'IT Engineer',
        'Full Stack Dev',
        'Guitarist',
        'Network Engineer',
        'Problem Solver'
    ];

    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;
    const typeSpeed = 90;
    const deleteSpeed = 50;
    const pauseAfterWord = 1800;
    const pauseAfterDelete = 400;

    function type() {
        const current = words[wordIndex];
        const text = deleting
            ? current.slice(0, charIndex - 1)
            : current.slice(0, charIndex + 1);

        el1.textContent = text;
        if (el2) el2.textContent = text;

        if (!deleting) {
            charIndex++;
            if (charIndex === current.length) {
                deleting = true;
                setTimeout(type, pauseAfterWord);
                return;
            }
        } else {
            charIndex--;
            if (charIndex === 0) {
                deleting = false;
                wordIndex = (wordIndex + 1) % words.length;
                setTimeout(type, pauseAfterDelete);
                return;
            }
        }
        setTimeout(type, deleting ? deleteSpeed : typeSpeed);
    }
    type();
})();

/* ── CURTAIN REVEAL into about section ── */
gsap.to("#about-section", {
    clipPath: "inset(0% 0 0 0)",
    ease: "none",
    scrollTrigger: {
        trigger: "#about-section",
        start: "top bottom",
        end: "top top",
        scrub: 1,
        invalidateOnRefresh: true,
    }
});

/* ── STICKY NOTES ── */
gsap.utils.toArray(".sticky-note").forEach((note, i) => {
    const rot = note.style.getPropertyValue("--rot") || "0deg";
    gsap.fromTo(note,
        {
            opacity: 0,
            y: 40,
        },
        {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "back.out(1.4)",
            delay: i * 0.15,
            scrollTrigger: {
                trigger: ".sticky-board",
                start: "top 75%",
                toggleActions: "play none none reverse"
            }
        }
    );
});

document.querySelectorAll(".sticky-note")
    .forEach(note => {
        let isDragging = false;
        let startX, startY, initLeft, initTop;

        note.addEventListener("mousedown", (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initLeft = note.offsetLeft;
            initTop = note.offsetTop;
            note.style.zIndex = 999;
            note.style.transition = "none";
            e.preventDefault();
        });

        window.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            note.style.left = (initLeft + dx) + "px";
            note.style.top = (initTop + dy) + "px";
        });

        window.addEventListener("mouseup", () => {
            if (!isDragging) return;
            isDragging = false;
            note.style.zIndex = 10;
            note.style.transition =
                "box-shadow 0.2s ease, transform 0.2s ease";
        });

        /* Touch support */
        note.addEventListener("touchstart", (e) => {
            const touch = e.touches[0];
            isDragging = true;
            startX = touch.clientX;
            startY = touch.clientY;
            initLeft = note.offsetLeft;
            initTop = note.offsetTop;
            note.style.zIndex = 999;
        }, { passive: true });

        window.addEventListener("touchmove", (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            note.style.left = (initLeft + dx) + "px";
            note.style.top = (initTop + dy) + "px";
        }, { passive: true });

        window.addEventListener("touchend", () => {
            isDragging = false;
            note.style.zIndex = 10;
        });
    });


/* ── FLOATING MUSIC TRIGGER BUTTON ── */
(function () {
    const triggerBtn = document.getElementById("music-trigger-btn");
    const musicPlayer = document.getElementById("music-player");
    let playerOpen = false;

    triggerBtn.addEventListener("click", () => {
        playerOpen = !playerOpen;
        if (playerOpen) {
            musicPlayer.classList.add("open");
            playSong();
        } else {
            musicPlayer.classList.remove("open");
            pauseSong();
        }
    });

    // Keep play/pause icon in player in sync
    audio.addEventListener("play", () => {
        document.getElementById("play-icon").style.display = "none";
        document.getElementById("pause-icon").style.display = "block";
    });
    audio.addEventListener("pause", () => {
        document.getElementById("play-icon").style.display = "block";
        document.getElementById("pause-icon").style.display = "none";
    });
})();

/* ── PIXEL SNOW (about section background) ── */
(function () {
    const snowCanvas = document.getElementById("snow-canvas");
    if (!snowCanvas) return;

    const sc = snowCanvas.getContext("2d");
    const COLORS = [
        "rgba(255,255,255,0.9)",
        "rgba(255,255,255,0.6)",
        "rgba(242,235,224,0.7)",
        "rgba(255,255,255,0.4)",
    ];

    let cols, rows, flakes = [];

    function resizeSnow() {
        snowCanvas.width = snowCanvas.offsetWidth;
        snowCanvas.height = snowCanvas.offsetHeight;
        cols = Math.ceil(snowCanvas.width / 8);
        rows = Math.ceil(snowCanvas.height / 8);
    }

    function spawnFlake() {
        const r = 1.5 + Math.random() * 3;
        flakes.push({
            x: Math.random() * (snowCanvas.width || 800),
            y: -r * 2,
            r: r,
            speed: 0.4 + Math.random() * 0.8,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            drift: (Math.random() - 0.5) * 0.4,
            progress: 0,
        });
    }

    let lastTime = 0;
    function drawSnow(ts) {
        const dt = Math.min(ts - lastTime, 50);
        lastTime = ts;

        sc.clearRect(0, 0, snowCanvas.width, snowCanvas.height);

        if (flakes.length < 100) spawnFlake();

        flakes.forEach(f => {
            f.y += f.speed * (dt / 16);
            f.x += f.drift * (dt / 16);

            sc.beginPath();
            sc.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            sc.fillStyle = f.color;
            sc.fill();
        });

        flakes = flakes.filter(f => f.y < snowCanvas.height + 10);

        requestAnimationFrame(drawSnow);
    }

    const snowObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                resizeSnow();
                requestAnimationFrame(drawSnow);
            }
        });
    }, { threshold: 0.05 });

    snowObserver.observe(document.getElementById("about-section"));
    window.addEventListener("resize", resizeSnow);
})();

/* ═══════════════════════════════════════════
   CROSSHAIR INTERACTION (Hire Me)
════════════════════════════════════════════ */
function initCrosshair() {
    const hireContainer = document.getElementById("hire-me");
    if (!hireContainer) return;

    const lineX = hireContainer.querySelector(".crosshair-line-x");
    const lineY = hireContainer.querySelector(".crosshair-line-y");
    const filterX = document.getElementById("fe-turb-x");
    const filterY = document.getElementById("fe-turb-y");
    const links = hireContainer.querySelectorAll("a");

    let mouse = { x: 0, y: 0 };
    let renderedStyles = {
        tx: { previous: 0, current: 0, amt: 0.15 },
        ty: { previous: 0, current: 0, amt: 0.15 }
    };

    let isInside = false;

    hireContainer.addEventListener("mousemove", (e) => {
        const bounds = hireContainer.getBoundingClientRect();
        mouse.x = e.clientX - bounds.left;
        mouse.y = e.clientY - bounds.top;

        if (!isInside) {
            isInside = true;
            renderedStyles.tx.previous = mouse.x;
            renderedStyles.ty.previous = mouse.y;
            gsap.to([lineX, lineY], { opacity: 1, duration: 0.9, ease: "power3.out" });
        }
    });

    hireContainer.addEventListener("mouseleave", () => {
        isInside = false;
        gsap.to([lineX, lineY], { opacity: 0, duration: 0.5 });
    });

    const primitiveValues = { turbulence: 0 };
    const tl = gsap.timeline({
        paused: true,
        onStart: () => {
            if (lineX && lineY) {
                lineX.style.filter = "url(#filter-noise-x)";
                lineY.style.filter = "url(#filter-noise-y)";
            }
        },
        onUpdate: () => {
            if (filterX && filterY) {
                filterX.setAttribute("baseFrequency", primitiveValues.turbulence);
                filterY.setAttribute("baseFrequency", primitiveValues.turbulence);
            }
        },
        onComplete: () => {
            if (lineX && lineY) {
                lineX.style.filter = "none";
                lineY.style.filter = "none";
            }
        }
    }).to(primitiveValues, {
        duration: 0.5,
        ease: "power1",
        startAt: { turbulence: 1 },
        turbulence: 0
    });

    if(links.length) {
        links.forEach(link => {
            link.addEventListener("mouseenter", () => tl.restart());
            link.addEventListener("mouseleave", () => tl.progress(1).kill());
        });
    }

    function renderCrosshair() {
        if (isInside) {
            renderedStyles.tx.current = mouse.x;
            renderedStyles.ty.current = mouse.y;

            renderedStyles.tx.previous += (renderedStyles.tx.current - renderedStyles.tx.previous) * renderedStyles.tx.amt;
            renderedStyles.ty.previous += (renderedStyles.ty.current - renderedStyles.ty.previous) * renderedStyles.ty.amt;

            if (lineY && lineX) {
                gsap.set(lineY, { x: renderedStyles.tx.previous });
                gsap.set(lineX, { y: renderedStyles.ty.previous });
            }
        }
        requestAnimationFrame(renderCrosshair);
    }
    renderCrosshair();

    // Parallax Reveal for Hire Me Section
    gsap.fromTo(hireContainer,
        { y: 150, opacity: 0 },
        {
            y: 0, opacity: 1,
            scrollTrigger: {
                trigger: hireContainer,
                start: "top 85%",
                end: "top 25%",
                scrub: 1
            }
        }
    );
}