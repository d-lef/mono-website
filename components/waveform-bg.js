/**
 * Animated waveform background for mono-ai.uk
 *
 * Desktop: Three overlapping sine waves, mouse-reactive
 * Mobile: Auto-breathing waveform, gentler amplitude
 *
 * Usage:
 *   <script src="/components/waveform-bg.js" defer></script>
 */

(function() {
    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    const isMobile = window.innerWidth < 768;

    // Configuration
    const CONFIG = {
        barWidth: isMobile ? 2 : 3,
        barGap: isMobile ? 3 : 4,
        barRadius: 1.5,
        baseAmplitude: isMobile ? 0.25 : 0.35,
        animationSpeed: isMobile ? 0.008 : 0.02,
        // Colors — mobile is subtler
        lightColor: isMobile ? 'rgba(189, 189, 189, 0.2)' : 'rgba(189, 189, 189, 0.35)',
        darkColor: isMobile ? 'rgba(96, 96, 96, 0.18)' : 'rgba(96, 96, 96, 0.25)',
        // Mouse interaction (desktop only)
        mouseSoundRadius: 350,
        // Mobile breathing
        breatheSpeed: 0.003,
    };

    // Inject minimal styles
    const style = document.createElement('style');
    style.textContent = `
        .waveform-bg-canvas {
            position: fixed;
            top: 50%;
            left: 0;
            width: 100%;
            height: ${isMobile ? 200 : 300}px;
            transform: translateY(-50%);
            z-index: -1;
            pointer-events: none;
            opacity: 0;
            transition: opacity 1s ease;
        }
        .waveform-bg-canvas.active {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'waveform-bg-canvas';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let phase = 0;
    let breathePhase = 0;
    let animationId = null;
    let isVisible = true;

    // Mouse tracking (desktop)
    let mouseX = -1000;
    let mouseY = -1000;
    let isMouseNear = false;

    // Screen center
    let screenCenterX = window.innerWidth / 2;
    const canvasHeight = isMobile ? 200 : 300;

    // Detect theme
    function isDarkTheme() {
        const root = document.documentElement;
        if (root.classList.contains('light')) return false;
        if (root.classList.contains('dark')) return true;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // Resize handler
    function resize() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = canvasHeight * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = canvasHeight + 'px';

        screenCenterX = window.innerWidth / 2;
    }

    // Desktop: bar height based on mouse proximity
    function getBarHeightDesktop(index, totalBars, maxHeight, barX) {
        const canvasRect = canvas.getBoundingClientRect();
        const canvasCenterY = canvasRect.top + canvasRect.height / 2;
        const dx = barX - mouseX;
        const dy = canvasCenterY - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance >= CONFIG.mouseSoundRadius) {
            return 0;
        }

        const influence = 1 - (distance / CONFIG.mouseSoundRadius);
        const smoothInfluence = influence * influence;

        const x = index / totalBars;
        const wave1 = Math.sin((x * 4 * Math.PI) - phase) * 0.25;
        const wave2 = Math.sin((x * 2 * Math.PI) - phase * 0.7) * 0.15;
        const wave3 = Math.sin((x * 8 * Math.PI) - phase * 1.3) * 0.08;
        const noise = Math.sin(index * 0.7 + phase * 0.3) * 0.05;

        let amplitude = CONFIG.baseAmplitude + wave1 + wave2 + wave3 + noise;
        amplitude = Math.max(0.1, Math.min(0.95, amplitude));

        return amplitude * maxHeight * smoothInfluence;
    }

    // Mobile: auto-breathing bar height
    function getBarHeightMobile(index, totalBars, maxHeight) {
        const x = index / totalBars;

        // Breathing envelope — slow sine that modulates overall amplitude
        const breathe = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(breathePhase));

        // Waves
        const wave1 = Math.sin((x * 3 * Math.PI) - phase) * 0.3;
        const wave2 = Math.sin((x * 5 * Math.PI) - phase * 0.6) * 0.15;
        const wave3 = Math.sin((x * 1.5 * Math.PI) + phase * 0.4) * 0.1;

        let amplitude = CONFIG.baseAmplitude + wave1 + wave2 + wave3;
        amplitude = Math.max(0.05, Math.min(0.85, amplitude));

        return amplitude * maxHeight * breathe;
    }

    // Get center fade opacity
    function getCenterFadeOpacity(barX) {
        const dx = Math.abs(barX - screenCenterX);
        const innerRadius = isMobile ? 100 : 300;
        const outerRadius = isMobile ? 220 : 500;

        if (dx < innerRadius) {
            return 0;
        } else if (dx < outerRadius) {
            const t = (dx - innerRadius) / (outerRadius - innerRadius);
            return t * t;
        }
        return 1;
    }

    // Draw waveform
    function draw() {
        const width = window.innerWidth;
        const height = canvasHeight;
        const centerY = height / 2;
        const baseColor = isDarkTheme() ? CONFIG.darkColor : CONFIG.lightColor;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = baseColor;

        const totalBarWidth = CONFIG.barWidth + CONFIG.barGap;
        const barsNeeded = Math.ceil(width / totalBarWidth) + 2;
        const startX = (width - (barsNeeded * totalBarWidth)) / 2;

        for (let i = 0; i < barsNeeded; i++) {
            const barX = startX + (i * totalBarWidth);

            const centerOpacity = getCenterFadeOpacity(barX);
            if (centerOpacity < 0.01) continue;

            const barHeight = isMobile
                ? getBarHeightMobile(i, barsNeeded, centerY * 0.6)
                : getBarHeightDesktop(i, barsNeeded, centerY * 0.8, barX);

            if (barHeight < 1) continue;

            const match = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
            if (match) {
                const a = parseFloat(match[4] || 1) * centerOpacity;
                ctx.fillStyle = `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${a})`;
            }

            ctx.beginPath();
            ctx.roundRect(barX, centerY - barHeight, CONFIG.barWidth, barHeight, CONFIG.barRadius);
            ctx.fill();

            ctx.beginPath();
            ctx.roundRect(barX, centerY, CONFIG.barWidth, barHeight, CONFIG.barRadius);
            ctx.fill();
        }
    }

    // Animation loop
    function animate() {
        if (!isVisible) return;

        if (isMobile) {
            // Always animate on mobile
            phase += CONFIG.animationSpeed;
            breathePhase += CONFIG.breatheSpeed;
        } else {
            // Desktop: only animate when mouse is near
            if (isMouseNear) {
                phase += CONFIG.animationSpeed;
            }
        }

        draw();
        animationId = requestAnimationFrame(animate);
    }

    // Visibility change handler
    function handleVisibilityChange() {
        if (document.hidden) {
            isVisible = false;
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        } else {
            isVisible = true;
            if (!animationId) {
                animate();
            }
        }
    }

    // Mouse move handler (desktop only)
    function handleMouseMove(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;

        const canvasRect = canvas.getBoundingClientRect();
        const canvasCenterY = canvasRect.top + canvasRect.height / 2;
        const dy = Math.abs(e.clientY - canvasCenterY);
        isMouseNear = dy < 250;
    }

    // Theme change observer
    function watchThemeChanges() {
        const observer = new MutationObserver(() => draw());
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
    }

    // Initialize
    function init() {
        resize();
        watchThemeChanges();

        window.addEventListener('resize', resize);
        if (!isMobile) {
            window.addEventListener('mousemove', handleMouseMove);
        }
        document.addEventListener('visibilitychange', handleVisibilityChange);

        requestAnimationFrame(() => {
            canvas.classList.add('active');
            animate();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
