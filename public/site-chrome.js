/* =====================================================================
   UNIVERSAL GROUP — COMPORTAMIENTO DEL HEADER (páginas estáticas)
   - Tema del header según la sección que queda debajo
   - Ventana de servicios (mega menú)
   - Menú móvil
   - Barra de progreso de scroll
   La página principal (React) tiene la misma lógica en SiteHeader.jsx
===================================================================== */

(function () {
    'use strict';

    var header = document.getElementById('ugHeader');

    if (!header) {
        return;
    }

    var mega = document.getElementById('ugMega');
    var servicesBtn = document.getElementById('ugServicesBtn');
    var burger = document.getElementById('ugBurger');
    var drawer = document.getElementById('ugDrawer');
    var progress = document.querySelector('.ug-progress');
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

    /* ---------- tema del header ---------- */

    function updateTheme() {

        var y = header.offsetHeight / 2;
        var theme = 'dark';
        var sections = document.querySelectorAll('[data-header-theme]');

        for (var i = 0; i < sections.length; i++) {
            var rect = sections[i].getBoundingClientRect();

            if (rect.top <= y && rect.bottom > y) {
                theme = sections[i].getAttribute('data-header-theme');
            }
        }

        if (header.getAttribute('data-theme') !== theme) {
            header.setAttribute('data-theme', theme);
        }
    }

    function updateProgress() {

        if (!progress) {
            return;
        }

        var max = document.documentElement.scrollHeight - window.innerHeight;
        var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

        progress.style.setProperty('--p', p.toFixed(4));
    }

    var ticking = false;

    function onScroll() {

        if (ticking) {
            return;
        }

        ticking = true;

        requestAnimationFrame(function () {
            ticking = false;
            updateTheme();
            updateProgress();
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateTheme();
    updateProgress();

    /* ---------- ventana de servicios ---------- */

    if (mega && servicesBtn) {

        var items = mega.querySelectorAll('.ug-mega-item');
        var blueprints = mega.querySelectorAll('g[data-bp]');
        var caption = mega.querySelector('.ug-mega-caption');
        var tagIndex = mega.querySelector('.ug-mega-tag b');
        var closeTimer = 0;

        var captions = [
            'Concepto, plantas, recorridos y materiales pensados para construirse.',
            'Carpintería, metal, gráfica e iluminación llevados a piezas reales.',
            'Instalación, gráfica y puesta a punto para llegar listos al evento.',
            'Recorré el proyecto en 3D antes de fabricarlo.'
        ];

        function setActive(index) {

            items.forEach(function (item, i) {
                item.classList.toggle('is-active', i === index);
            });

            blueprints.forEach(function (bp, i) {
                bp.classList.toggle('is-on', i === index);
            });

            if (caption) {
                caption.textContent = captions[index] || '';
            }

            if (tagIndex) {
                tagIndex.textContent = '0' + (index + 1);
            }
        }

        function openMega() {

            window.clearTimeout(closeTimer);

            if (mega.classList.contains('is-open')) {
                return;
            }

            mega.classList.add('is-open');
            servicesBtn.setAttribute('aria-expanded', 'true');
            mega.setAttribute('aria-hidden', 'false');
            setActive(0);
        }

        function closeMega() {

            window.clearTimeout(closeTimer);
            mega.classList.remove('is-open');
            servicesBtn.setAttribute('aria-expanded', 'false');
            mega.setAttribute('aria-hidden', 'true');
        }

        function scheduleClose() {
            window.clearTimeout(closeTimer);
            closeTimer = window.setTimeout(closeMega, 220);
        }

        servicesBtn.addEventListener('click', function (event) {

            event.stopPropagation();

            if (mega.classList.contains('is-open')) {
                closeMega();
            } else {
                openMega();
            }
        });

        servicesBtn.addEventListener('pointerenter', function () {
            if (finePointer.matches) {
                openMega();
            }
        });

        [servicesBtn, mega].forEach(function (el) {

            el.addEventListener('pointerleave', function () {
                if (finePointer.matches) {
                    scheduleClose();
                }
            });

            el.addEventListener('pointerenter', function () {
                window.clearTimeout(closeTimer);
            });
        });

        items.forEach(function (item, i) {
            item.addEventListener('pointerenter', function () { setActive(i); });
            item.addEventListener('focus', function () { setActive(i); });
        });

        mega.addEventListener('pointermove', function (event) {

            var rect = mega.getBoundingClientRect();

            mega.style.setProperty('--mx', (event.clientX - rect.left) + 'px');
            mega.style.setProperty('--my', (event.clientY - rect.top) + 'px');
        });

        document.addEventListener('click', function (event) {

            if (!mega.contains(event.target) && !servicesBtn.contains(event.target)) {
                closeMega();
            }
        });

        document.addEventListener('keydown', function (event) {

            if (event.key === 'Escape' && mega.classList.contains('is-open')) {
                closeMega();
                servicesBtn.focus();
            }
        });
    }

    /* ---------- menú móvil ---------- */

    if (burger && drawer) {

        function setDrawer(open) {

            drawer.classList.toggle('is-open', open);
            drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
            burger.setAttribute('aria-expanded', open ? 'true' : 'false');
            burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
            document.documentElement.style.overflow = open ? 'hidden' : '';
        }

        burger.addEventListener('click', function () {
            setDrawer(!drawer.classList.contains('is-open'));
        });

        drawer.addEventListener('click', function (event) {

            if (event.target.closest('a')) {
                setDrawer(false);
            }
        });

        document.addEventListener('keydown', function (event) {

            if (event.key === 'Escape') {
                setDrawer(false);
            }
        });

        window.addEventListener('resize', function () {

            if (window.innerWidth > 960) {
                setDrawer(false);
            }
        });
    }
})();
