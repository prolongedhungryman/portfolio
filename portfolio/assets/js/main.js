gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ limitCallbacks: true });
gsap.config({ force3D: true });

/* ═══════════════════════════════════════════
   ELEMENTS
════════════════════════════════════════════ */
const video = document.getElementById("bg-video");
const loader = document.getElementById("loader");
const darkNav = document.getElementById("main-nav");
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
const logoTrigger = document.getElementById("logo-trigger");
const logoB1 = document.getElementById("logo-b1");
const catchHand = document.getElementById("catch-hand");

const canvas = document.getElementById("mask-canvas");
const ctx = canvas.getContext("2d");

/* ═══════════════════════════════════════════
   CUSTOM CURSOR
════════════════════════════════════════════ */
const cursor = document.createElement("div");
const ring = document.createElement("div");
cursor.className = "cursor";
ring.className = "cursor-ring";
document.body.appendChild(cursor);
document.body.appendChild(ring);

let mx = 0, my = 0, rx = 0, ry = 0;
document.addEventListener("mousemove", e => {
    mx = e.clientX; my = e.clientY;
    cursor.style.left = mx + "px";
    cursor.style.top = my + "px";
});
// Ring follows with lag
function animateRing() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + "px";
    ring.style.top = ry + "px";
    requestAnimationFrame(animateRing);
}
animateRing();

// Hover effect on interactive elements
document.querySelectorAll("a, button, .logo-letters, .ctrl-btn").forEach(el => {
    el.addEventListener("mouseenter", () => {
        cursor.classList.add("hovering");
        ring.classList.add("hovering");
    });
    el.addEventListener("mouseleave", () => {
        cursor.classList.remove("hovering");
        ring.classList.remove("hovering");
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
    ctx.fillStyle = `rgba(14, 19, 32, ${darkOpacity})`;
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

sizeCanvas();
drawMask(1, 1);

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

    // Dark nav fades in between VIBE and homepage
    ScrollTrigger.create({
        trigger: "#hero",
        start: "bottom 80%",
        end: "bottom 20%",
        onEnter: () => darkNav.classList.add("visible"),
        onLeaveBack: () => darkNav.classList.remove("visible"),
    });
}

/* ═══════════════════════════════════════════
   HOMEPAGE — animations & music player
════════════════════════════════════════════ */
function buildHomepage() {

    // Music player appears when homepage enters view
    ScrollTrigger.create({
        trigger: "#homepage",
        start: "top 80%",
        onEnter: () => {
            player.classList.add("visible");
            darkNav.classList.remove("visible");
            cursor.style.background = "#1A1A1A";
            ring.style.borderColor = "rgba(26,26,26,0.4)";
        },
        onLeaveBack: () => {
            player.classList.remove("visible");
            darkNav.classList.add("visible");
            cursor.style.background = "#ffffff";
            ring.style.borderColor = "rgba(255,255,255,0.4)";
        }
    });

    // Headline reveal — lines slide up one by one
    gsap.utils.toArray(".reveal-line").forEach((line, i) => {
        gsap.fromTo(line,
            { y: "110%", opacity: 0 },
            {
                y: "0%", opacity: 1,
                duration: 1.1, ease: "power4.out",
                delay: i * 0.12,
                scrollTrigger: {
                    trigger: "#homepage",
                    start: "top 70%",
                    invalidateOnRefresh: true,
                }
            }
        );
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

    ScrollTrigger.refresh();
}

/* ═══════════════════════════════════════════
   LETTER B DROP ANIMATION
   Click BB logo → first B drops → hand catches
════════════════════════════════════════════ */
let dropped = false;

logoTrigger.addEventListener("mouseenter", () => {
    if (dropped) return;
    dropped = true;
    logoB1.classList.add("drop");
    setTimeout(() => {
        catchHand.classList.add("visible");
    }, 350);
});

logoTrigger.addEventListener("mouseleave", () => {
    setTimeout(() => {
        logoB1.classList.remove("drop");
        catchHand.classList.remove("visible");
        dropped = false;
    }, 800);
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
