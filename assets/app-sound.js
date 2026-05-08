(function () {
    "use strict";

    const PAGE = (location.pathname.split("/").pop() || "index.html").replace(/\.html?$/i, "") || "index";
    const CLICK_SRC = "sound/SUARA KLIK.mp3";
    const MUSIC_SRC = "sound/BACKSOUND VIRTUAL LAB.mp3";
    const CLICK_MS = 150;
    const CLICK_VOLUME = 0.85;
    const MUSIC_VOLUME = 0.32;
    const MUSIC_KEY = "virtualLabMusicEnabled";

    function ready(fn) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", fn, { once: true });
        } else {
            fn();
        }
    }


    setupLandscapeViewport();

    function setupLandscapeViewport() {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) return;

        const originalContent = viewport.getAttribute("content") || "width=device-width, initial-scale=1.0";

        function isSmallTouchDevice() {
            const sw = Math.min(screen.width || 9999, screen.height || 9999);
            const lw = Math.max(screen.width || 0, screen.height || 0);
            return (navigator.maxTouchPoints > 0 && lw <= 1100) || (sw <= 600 && lw <= 1100);
        }

        function applyViewport() {
            const landscape = window.matchMedia("(orientation: landscape)").matches;
            if (landscape && isSmallTouchDevice()) {
                viewport.setAttribute("content", "width=1366, initial-scale=1.0, viewport-fit=cover");
            } else {
                viewport.setAttribute("content", originalContent);
            }
        }

        applyViewport();
        window.addEventListener("orientationchange", function () {
            setTimeout(applyViewport, 120);
        }, { passive: true });
        window.addEventListener("resize", applyViewport, { passive: true });
    }

    ready(function () {
        document.body.dataset.page = PAGE;

        setupStageFit();
        setupSound();
    });

    function setupStageFit() {
        const nonStagePages = new Set([
            "materi",
            "materi1",
            "materi2",
            "pembahasan",
            "lab",
            "demo_lab",
            "demo2",
            "demo3",
            "halaman2",
            "halaman3"
        ]);

        if (!nonStagePages.has(PAGE) && document.querySelector(".stage")) {
            document.body.classList.add("app-stage-fit");
        }

        function updateScale() {
            const isLandscapePhone = window.matchMedia("(orientation: landscape) and (max-height: 560px)").matches;
            if (!isLandscapePhone) {
                document.documentElement.style.setProperty("--app-stage-scale", "1");
                return;
            }

            const vw = window.innerWidth || document.documentElement.clientWidth;
            const vh = window.innerHeight || document.documentElement.clientHeight;
            const scale = Math.min(vw / 1366, vh / 768);
            document.documentElement.style.setProperty("--app-stage-scale", String(Math.max(scale, 0.1)));
        }

        updateScale();
        window.addEventListener("resize", updateScale, { passive: true });
        window.addEventListener("orientationchange", function () {
            setTimeout(updateScale, 250);
        }, { passive: true });
    }

    function setupSound() {
        const clickAudio = ensureAudio("clickSound", CLICK_SRC, false);
        const bgMusic = ensureAudio("bgMusic", MUSIC_SRC, true);
        const musicBtn = ensureMusicButton();

        let lastClickAt = 0;
        let musicOn = localStorage.getItem(MUSIC_KEY) === "1";

        clickAudio.volume = CLICK_VOLUME;
        bgMusic.volume = MUSIC_VOLUME;
        bgMusic.loop = true;

        updateMusicButton();

        function playClickSound() {
            const now = Date.now();
            if (now - lastClickAt < 80) return;
            lastClickAt = now;

            try {
                const s = clickAudio.cloneNode(true);
                s.volume = CLICK_VOLUME;
                s.currentTime = 0;
                const playPromise = s.play();
                if (playPromise && typeof playPromise.catch === "function") {
                    playPromise.catch(function () { });
                }
                setTimeout(function () {
                    try {
                        s.pause();
                        s.currentTime = 0;
                    } catch (e) { }
                }, CLICK_MS);
            } catch (e) { }
        }

        // Mengganti fungsi lama agar suara klik tidak terlalu panjang.
        window.playClickSound = playClickSound;
        window.appPlayClickSound = playClickSound;

        function tryPlayMusic() {
            if (!musicOn) return;
            const p = bgMusic.play();
            if (p && typeof p.catch === "function") {
                p.catch(function () { });
            }
            updateMusicButton();
        }

        function pauseMusic() {
            try { bgMusic.pause(); } catch (e) { }
            updateMusicButton();
        }

        function updateMusicButton() {
            if (!musicBtn) return;
            musicBtn.classList.toggle("off", !musicOn);
            musicBtn.setAttribute("aria-label", musicOn ? "Matikan musik" : "Nyalakan musik");
            musicBtn.setAttribute("title", musicOn ? "Matikan musik" : "Nyalakan musik");
        }

        if (musicBtn) {
            musicBtn.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                playClickSound();

                musicOn = !musicOn;
                localStorage.setItem(MUSIC_KEY, musicOn ? "1" : "0");

                if (musicOn) {
                    tryPlayMusic();
                } else {
                    pauseMusic();
                }
            }, true);
        }

        document.addEventListener("pointerdown", function () {
            if (musicOn) tryPlayMusic();
        }, { passive: true });

        document.addEventListener("click", function (event) {
            const target = event.target && event.target.nodeType === 1 ? event.target : event.target && event.target.parentElement;
            if (!target || typeof target.closest !== "function") return;

            const clickable = target.closest("button, a, [role='button'], input[type='button'], input[type='submit'], .tool-card, .symbol-card, .rule-card, .safety-card, .menu-card, .nav-btn, .btn, .float-btn, .lab-btn, .back-btn, .close-btn");
            if (!clickable) return;

            // Musik tombol sudah ditangani sendiri.
            if (clickable === musicBtn || clickable.id === "musicBtn") return;

            const inlineClick = clickable.getAttribute("onclick") || "";
            const hrefMatch = inlineClick.match(/location\.href\s*=\s*['\"]([^'\"]+)['\"]/);
            const anchor = clickable.closest("a[href]");

            playClickSound();

            if (hrefMatch && !clickable.dataset.appDelayHandled) {
                event.preventDefault();
                event.stopImmediatePropagation();
                clickable.dataset.appDelayHandled = "1";
                setTimeout(function () {
                    location.href = hrefMatch[1];
                }, CLICK_MS);
                return;
            }

            if (anchor && shouldDelayAnchor(anchor, event)) {
                event.preventDefault();
                const url = anchor.getAttribute("href");
                setTimeout(function () {
                    location.href = url;
                }, CLICK_MS);
            }
        }, true);

        if (musicOn) {
            // Browser biasanya tetap menunggu tap pertama, tetapi ini aman dicoba.
            setTimeout(tryPlayMusic, 80);
        }
    }

    function ensureAudio(id, src, loop) {
        let audio = document.getElementById(id);
        if (!audio) {
            audio = document.createElement("audio");
            audio.id = id;
            audio.src = src;
            audio.preload = "auto";
            if (loop) audio.loop = true;
            audio.style.display = "none";
            document.body.appendChild(audio);
        }
        return audio;
    }

    function ensureMusicButton() {
        let btn = document.getElementById("musicBtn");
        if (btn) return btn;

        btn = document.createElement("button");
        btn.id = "musicBtn";
        btn.type = "button";
        btn.className = "app-music-btn off";
        document.body.appendChild(btn);
        return btn;
    }

    function shouldDelayAnchor(anchor, event) {
        const href = anchor.getAttribute("href");
        if (!href || href === "#" || href.startsWith("javascript:")) return false;
        if (href.startsWith("#")) return false;
        if (anchor.target && anchor.target !== "_self") return false;
        if (anchor.hasAttribute("download")) return false;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
        return true;
    }
})();
