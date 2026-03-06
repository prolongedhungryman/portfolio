/* ── CURSOR REVEAL ── */
const crScene = document.getElementById('cr-scene');
const crTopLayer = document.getElementById('cr-top-layer');

const crDot = document.createElement('div');
crDot.className = 'cr-cursor-dot';
document.body.appendChild(crDot);

if (crScene && crTopLayer) {
    crScene.addEventListener('mousemove', (e) => {
        const rect = crScene.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        crTopLayer.style.clipPath = `circle(130px at ${x}px ${y}px)`;
        crTopLayer.style.transition = 'none';

        crDot.style.left = e.clientX + 'px';
        crDot.style.top = e.clientY + 'px';
        crDot.classList.add('visible');

        if (typeof cursor !== 'undefined') cursor.style.opacity = '0';
        if (typeof ring !== 'undefined') ring.style.opacity = '0';
    });

    crScene.addEventListener('mouseleave', () => {
        crTopLayer.style.transition = 'clip-path 0.5s cubic-bezier(0.16,1,0.3,1)';
        crTopLayer.style.clipPath = 'circle(0px at 50% 50%)';
        crDot.classList.remove('visible');

        if (typeof cursor !== 'undefined') cursor.style.opacity = '1';
        if (typeof ring !== 'undefined') ring.style.opacity = '1';
    });
}
