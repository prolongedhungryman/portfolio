// ============================================
// gesture.js — Drop-in Gesture Controller
// For akavibek.art | Web Serial API
// 
// HOW TO USE:
// 1. Add <script src="gesture.js"></script> to your HTML
// 2. Add <div id="gesture-ui"></div> anywhere in your HTML
// 3. Define sections with class="section" on each one
// 4. Done. Wave your hand.
// ============================================

(function () {
    'use strict';

    // ─── CONFIG ─────────────────────────────────────────────
    // Tweak these to match your preference
    const CONFIG = {
        baudRate: 9600,

        // Distance zones (must match your Arduino sketch)
        zones: {
            CLOSE: { max: 10, label: 'CLOSE' },   // 0–10cm  → scroll up / prev
            MID: { max: 25, label: 'MID' },     // 10–25cm → hover glow effect
            FAR: { max: 80, label: 'FAR' },     // 25–80cm → scroll down / next
        },

        // How long a zone must be held before triggering a scroll (ms)
        // Prevents accidental triggers while moving hand
        scrollDebounce: 800,

        // Cooldown after a scroll fires before next scroll can happen (ms)
        scrollCooldown: 1200,

        // CSS class on your page sections (e.g. <section class="section">)
        sectionClass: 'section',

        // Glow color for MID zone hover effect (customize to your palette)
        glowColor: 'rgba(120, 200, 255, 0.15)',
        glowAccent: '#78C8FF',
    };
    // ────────────────────────────────────────────────────────

    let port = null;
    let reader = null;
    let currentSection = 0;
    let lastZone = 'NONE';
    let zoneHeldSince = null;
    let lastScrollTime = 0;
    let glowOverlay = null;
    let glowIntensity = 0;
    let animFrame = null;
    let uiEl = null;
    let statusDot = null;
    let statusLabel = null;
    let zoneDisplay = null;

    // ─── INIT UI ────────────────────────────────────────────
    function buildUI() {
        const container = document.getElementById('gesture-ui');
        if (!container) {
            console.warn('[gesture.js] No #gesture-ui element found. Add <div id="gesture-ui"></div> to your HTML.');
            return;
        }

        container.innerHTML = `
      <div id="gst-panel">
        <div id="gst-inner">
          <div id="gst-indicator">
            <span id="gst-dot"></span>
            <span id="gst-status">Sensor disconnected</span>
          </div>
          <div id="gst-zone-wrap">
            <span id="gst-zone">―</span>
          </div>
          <button id="gst-btn">Connect Sensor</button>
        </div>
      </div>
    `;

        injectStyles();

        statusDot = document.getElementById('gst-dot');
        statusLabel = document.getElementById('gst-status');
        zoneDisplay = document.getElementById('gst-zone');

        document.getElementById('gst-btn').addEventListener('click', toggleConnection);

        // Glow overlay — covers full viewport
        glowOverlay = document.createElement('div');
        glowOverlay.id = 'gst-glow';
        document.body.appendChild(glowOverlay);

        uiEl = container;
    }

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
      #gst-panel {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        font-family: 'Courier New', monospace;
      }
      #gst-inner {
        background: rgba(10, 10, 10, 0.85);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 14px 18px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        backdrop-filter: blur(12px);
        min-width: 180px;
        box-shadow: 0 4px 30px rgba(0,0,0,0.4);
      }
      #gst-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      #gst-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #444;
        display: inline-block;
        transition: background 0.3s;
        flex-shrink: 0;
      }
      #gst-dot.connected { background: #4cff91; box-shadow: 0 0 6px #4cff91; }
      #gst-dot.active    { background: #78C8FF; box-shadow: 0 0 8px #78C8FF; }
      #gst-status {
        color: rgba(255,255,255,0.5);
        font-size: 11px;
        letter-spacing: 0.05em;
      }
      #gst-zone-wrap {
        text-align: center;
      }
      #gst-zone {
        font-size: 13px;
        font-weight: bold;
        letter-spacing: 0.15em;
        color: rgba(255,255,255,0.3);
        transition: color 0.2s;
      }
      #gst-zone.CLOSE { color: #ff6b6b; }
      #gst-zone.MID   { color: #78C8FF; }
      #gst-zone.FAR   { color: #4cff91; }
      #gst-btn {
        background: transparent;
        border: 1px solid rgba(255,255,255,0.15);
        color: rgba(255,255,255,0.7);
        font-family: 'Courier New', monospace;
        font-size: 11px;
        letter-spacing: 0.08em;
        padding: 7px 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        text-transform: uppercase;
      }
      #gst-btn:hover {
        background: rgba(255,255,255,0.08);
        border-color: rgba(255,255,255,0.3);
        color: #fff;
      }
      #gst-btn.disconnect {
        border-color: rgba(255, 100, 100, 0.3);
        color: rgba(255, 100, 100, 0.7);
      }
      #gst-btn.disconnect:hover {
        background: rgba(255, 100, 100, 0.08);
        color: #ff6b6b;
      }
      #gst-glow {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 9000;
        transition: opacity 0.3s;
        opacity: 0;
        background: radial-gradient(ellipse at center, ${CONFIG.glowColor} 0%, transparent 70%);
      }
    `;
        document.head.appendChild(style);
    }

    // ─── CONNECTION ─────────────────────────────────────────
    async function toggleConnection() {
        if (port) {
            await disconnect();
        } else {
            await connect();
        }
    }

    async function connect() {
        if (!('serial' in navigator)) {
            alert('Web Serial API not supported.\nPlease use Chrome or Edge browser.');
            return;
        }
        try {
            port = await navigator.serial.requestPort();
            await port.open({ baudRate: CONFIG.baudRate });

            setStatus('connected', 'Sensor ready');
            document.getElementById('gst-btn').textContent = 'Disconnect';
            document.getElementById('gst-btn').classList.add('disconnect');

            readLoop();
        } catch (err) {
            console.error('[gesture.js] Connection failed:', err);
            setStatus('disconnected', 'Connection failed');
            port = null;
        }
    }

    async function disconnect() {
        try {
            if (reader) { await reader.cancel(); reader = null; }
            if (port) { await port.close(); port = null; }
        } catch (_) { }
        setStatus('disconnected', 'Sensor disconnected');
        document.getElementById('gst-btn').textContent = 'Connect Sensor';
        document.getElementById('gst-btn').classList.remove('disconnect');
        updateZoneDisplay('NONE');
        cancelAnimationFrame(animFrame);
        if (glowOverlay) glowOverlay.style.opacity = 0;
    }

    // ─── READ LOOP ──────────────────────────────────────────
    async function readLoop() {
        const decoder = new TextDecoderStream();
        port.readable.pipeTo(decoder.writable);
        reader = decoder.readable.getReader();

        let buffer = '';
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += value;
                const lines = buffer.split('\n');
                buffer = lines.pop(); // keep incomplete line
                for (const line of lines) {
                    processLine(line.trim());
                }
            }
        } catch (err) {
            console.warn('[gesture.js] Read loop ended:', err.message);
        }
    }

    // ─── PROCESS INCOMING DATA ──────────────────────────────
    function processLine(line) {
        if (!line) return;

        let zone = 'NONE';
        let dist = null;

        if (line.startsWith('CLOSE:')) { zone = 'CLOSE'; dist = parseInt(line.split(':')[1]); }
        else if (line.startsWith('MID:')) { zone = 'MID'; dist = parseInt(line.split(':')[1]); }
        else if (line.startsWith('FAR:')) { zone = 'FAR'; dist = parseInt(line.split(':')[1]); }
        else if (line === 'NONE') { zone = 'NONE'; }

        updateZoneDisplay(zone, dist);
        handleGesture(zone);
        handleGlowEffect(zone, dist);
    }

    // ─── GESTURE LOGIC ──────────────────────────────────────
    function handleGesture(zone) {
        const now = Date.now();
        const cooldownOk = (now - lastScrollTime) > CONFIG.scrollCooldown;

        if (zone !== lastZone) {
            zoneHeldSince = now;
            lastZone = zone;
            return;
        }

        if (!zoneHeldSince) { zoneHeldSince = now; return; }

        const held = now - zoneHeldSince;

        if (cooldownOk && held >= CONFIG.scrollDebounce) {
            if (zone === 'CLOSE') {
                scrollToSection(currentSection - 1);
                lastScrollTime = now;
                zoneHeldSince = now; // reset hold timer
            } else if (zone === 'FAR') {
                scrollToSection(currentSection + 1);
                lastScrollTime = now;
                zoneHeldSince = now;
            }
        }
    }

    // ─── SCROLL ─────────────────────────────────────────────
    function scrollToSection(index) {
        const sections = document.querySelectorAll('.' + CONFIG.sectionClass);
        if (sections.length === 0) {
            // Fallback: smooth scroll by viewport height if no .section classes
            const dir = index > currentSection ? 1 : -1;
            window.scrollBy({ top: dir * window.innerHeight * 0.9, behavior: 'smooth' });
            currentSection = index;
            return;
        }

        const clamped = Math.max(0, Math.min(sections.length - 1, index));
        if (clamped === currentSection && index === clamped) return;

        currentSection = clamped;
        sections[currentSection].scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Fire a custom event your site can listen to
        window.dispatchEvent(new CustomEvent('gestureScroll', {
            detail: { section: currentSection, total: sections.length }
        }));
    }

    // ─── GLOW / HOVER EFFECT ────────────────────────────────
    function handleGlowEffect(zone, dist) {
        cancelAnimationFrame(animFrame);

        if (zone === 'MID' && dist !== null) {
            // Intensity based on how centered hand is in MID zone (10–25cm)
            // Peak at ~17cm (center of zone)
            const normalized = 1 - Math.abs(dist - 17) / 8;
            const target = Math.max(0, Math.min(1, normalized));
            animateGlow(target * 0.6); // max 60% opacity
        } else {
            animateGlow(0);
        }
    }

    function animateGlow(targetOpacity) {
        const current = parseFloat(glowOverlay.style.opacity) || 0;
        const diff = targetOpacity - current;
        if (Math.abs(diff) < 0.01) {
            glowOverlay.style.opacity = targetOpacity;
            return;
        }
        glowOverlay.style.opacity = current + diff * 0.1;
        animFrame = requestAnimationFrame(() => animateGlow(targetOpacity));
    }

    // ─── UI UPDATES ─────────────────────────────────────────
    function setStatus(state, label) {
        if (!statusDot || !statusLabel) return;
        statusDot.className = state === 'connected' ? 'connected' : '';
        statusLabel.textContent = label;
    }

    function updateZoneDisplay(zone, dist) {
        if (!zoneDisplay) return;
        zoneDisplay.className = zone;
        if (zone === 'NONE') {
            zoneDisplay.textContent = '―';
        } else {
            zoneDisplay.textContent = dist !== null ? `${zone} · ${dist}cm` : zone;
        }
        if (statusDot) {
            statusDot.className = zone !== 'NONE' ? 'connected active' : 'connected';
        }
    }

    // ─── BOOT ───────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildUI);
    } else {
        buildUI();
    }

    // Expose public API so your site can hook in if needed
    window.GestureController = {
        onScroll: function (callback) {
            window.addEventListener('gestureScroll', (e) => callback(e.detail));
        },
        config: CONFIG,
    };

})();