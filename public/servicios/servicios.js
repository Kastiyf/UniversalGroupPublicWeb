/* =====================================================================
   UNIVERSAL GROUP — INTERACCIONES DE LAS PÁGINAS DE SERVICIOS
   (el header, la ventana de servicios y el menú móvil están en
   /site-chrome.js)
===================================================================== */

(function () {
    'use strict';

    document.documentElement.classList.add('js');

    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function qs(sel, root) { return (root || document).querySelector(sel); }
    function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
    function fmt(n) { return n.toFixed(2).replace('.', ','); }

    /* ---------- aparición al hacer scroll ---------- */

    var revealEls = qsa('.rv');

    if ('IntersectionObserver' in window && !reduced) {

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

        revealEls.forEach(function (el) { io.observe(el); });

    } else {
        revealEls.forEach(function (el) { el.classList.add('in'); });
    }

    /* ---------- relleno de los sliders ---------- */

    function paintRange(input) {
        var min = Number(input.min || 0);
        var max = Number(input.max || 100);
        var fill = ((Number(input.value) - min) / (max - min)) * 100;
        input.style.setProperty('--fill', fill + '%');
    }

    qsa('input[type="range"]').forEach(function (input) {
        paintRange(input);
        input.addEventListener('input', function () { paintRange(input); });
    });

    /* ---------- cursor propio ---------- */

    if (finePointer && !reduced) {

        var cursor = document.createElement('div');
        cursor.className = 'sv-cursor';
        document.body.appendChild(cursor);

        var cx = 0, cy = 0, tx = 0, ty = 0;

        window.addEventListener('pointermove', function (e) {
            tx = e.clientX; ty = e.clientY;
            cursor.classList.add('on');
        }, { passive: true });

        document.addEventListener('pointerleave', function () { cursor.classList.remove('on'); });

        (function loop() {
            cx += (tx - cx) * 0.2;
            cy += (ty - cy) * 0.2;
            cursor.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px)';
            requestAnimationFrame(loop);
        })();

        document.addEventListener('pointerover', function (e) {
            var t = e.target.closest ? e.target.closest('a, button, summary, input, .sv-pj-img') : null;
            cursor.classList.toggle('big', !!(t && t.classList && t.classList.contains('sv-pj-img')));
        });
    }

    /* ---------- botones magnéticos ---------- */

    if (finePointer && !reduced) {

        qsa('.sv-btn').forEach(function (btn) {

            btn.addEventListener('pointermove', function (e) {
                var r = btn.getBoundingClientRect();
                btn.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px');
                btn.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px');
            });

            btn.addEventListener('pointerleave', function () {
                btn.style.setProperty('--bx', '0px');
                btn.style.setProperty('--by', '0px');
            });
        });
    }

    /* ---------- hero: linterna sobre la grilla + plano en 3D ---------- */

    var hero = qs('.sv-hero');

    if (hero && finePointer && !reduced) {

        hero.addEventListener('pointermove', function (e) {

            var r = hero.getBoundingClientRect();
            var x = (e.clientX - r.left) / r.width;
            var y = (e.clientY - r.top) / r.height;

            hero.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
            hero.style.setProperty('--my', (y * 100).toFixed(1) + '%');
            hero.style.setProperty('--px', (x - 0.5).toFixed(3));
            hero.style.setProperty('--py', (y - 0.5).toFixed(3));
            hero.style.setProperty('--ry', ((x - 0.5) * 9).toFixed(2) + 'deg');
            hero.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
        });

        hero.addEventListener('pointerleave', function () {
            hero.style.setProperty('--rx', '0deg');
            hero.style.setProperty('--ry', '0deg');
        });
    }

    var cta = qs('.sv-cta');

    if (cta && finePointer && !reduced) {
        cta.addEventListener('pointermove', function (e) {
            var r = cta.getBoundingClientRect();
            cta.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
            cta.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
        });
    }

    /* ---------- tarjetas de "otros servicios": foco de luz ---------- */

    qsa('.sv-more-card').forEach(function (card) {
        card.addEventListener('pointermove', function (e) {
            var r = card.getBoundingClientRect();
            card.style.setProperty('--sx', (e.clientX - r.left) + 'px');
            card.style.setProperty('--sy', (e.clientY - r.top) + 'px');
        });
    });

    /* ---------- "qué incluye": abrir con el teclado / táctil ---------- */

    qsa('.sv-inc').forEach(function (item) {
        item.addEventListener('click', function () { item.classList.toggle('open'); });
    });

    /* ---------- proyectos: dibujo -> obra real con el mouse ---------- */

    qsa('.sv-pj-img').forEach(function (box) {

        box.addEventListener('pointermove', function (e) {
            if (e.pointerType === 'touch') { return; }
            var r = box.getBoundingClientRect();
            box.style.setProperty('--rx', (e.clientX - r.left) + 'px');
            box.style.setProperty('--ry', (e.clientY - r.top) + 'px');
            box.classList.add('hov');
        });

        box.addEventListener('pointerleave', function () { box.classList.remove('hov'); });

        box.addEventListener('click', function (e) {
            if (e.pointerType === 'touch' || !finePointer) { box.classList.toggle('hov'); }
        });
    });

    /* =================================================================
       LABORATORIO 1 — DISEÑO: plano configurable con cotas en vivo
    ================================================================= */

    var planRoot = qs('[data-lab="plan"]');

    if (planRoot) {

        var types = {
            linea: {
                name: 'Stand lineal', open: ['S'], wall: ['N', 'E', 'W'],
                text: 'Un solo frente abierto al pasillo, con paredes laterales y fondo. Es un formato muy frecuente en ferias: concentra la gráfica en el fondo y ordena el recorrido en una única entrada.',
                ideal: 'Producto y gráfica de frente'
            },
            esquina: {
                name: 'Stand en esquina', open: ['S', 'E'], wall: ['N', 'W'],
                text: 'Dos frentes abiertos: el stand se ve desde dos pasillos, gana visibilidad y permite ubicar el acceso en la esquina, trabajando dos fachadas.',
                ideal: 'Más visibilidad con dos accesos'
            },
            peninsula: {
                name: 'Stand península', open: ['S', 'E', 'W'], wall: ['N'],
                text: 'Tres frentes abiertos, apoyado en un fondo o en un stand vecino. Se recorre por ambos lados y permite exhibir producto en varias caras.',
                ideal: 'Exhibición y recorrido por ambos lados'
            },
            isla: {
                name: 'Stand isla', open: ['N', 'S', 'E', 'W'], wall: [],
                text: 'Cuatro frentes abiertos, visible desde todos los pasillos. Todas las caras son fachada, por lo que la altura, la señalética y la iluminación pasan a ser protagonistas.',
                ideal: 'Máxima presencia desde cualquier lado'
            }
        };

        var NS = 'http://www.w3.org/2000/svg';
        var svg = qs('svg', planRoot);
        var range = qs('input[type="range"]', planRoot);
        var out = qs('output', planRoot);
        var tabs = qsa('.lab-tab', planRoot);
        var readout = qs('.lab-readout', planRoot);
        var current = 'linea';
        var geom = null;
        var SC = 52;

        function el(name, attrs, parent) {
            var node = document.createElementNS(NS, name);
            Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
            if (parent) { parent.appendChild(node); }
            return node;
        }

        function text(parent, x, y, str, cls, rot) {
            var t = el('text', { x: x, y: y, class: 'plan-txt ' + (cls || '') }, parent);
            if (rot) { t.setAttribute('transform', 'rotate(' + rot + ' ' + x + ' ' + y + ')'); }
            t.textContent = str;
            return t;
        }

        function arrow(parent, x, y, dir) {
            var s = 7, pts;
            if (dir === 'S') { pts = [x - s, y + 4, x + s, y + 4, x, y - 6]; }
            if (dir === 'N') { pts = [x - s, y - 4, x + s, y - 4, x, y + 6]; }
            if (dir === 'E') { pts = [x + 4, y - s, x + 4, y + s, x - 6, y]; }
            if (dir === 'W') { pts = [x - 4, y - s, x - 4, y + s, x + 6, y]; }
            el('polygon', { points: pts.join(' '), class: 'plan-arrow' }, parent);
        }

        function drawPlan() {

            var cfg = types[current];
            var area = Number(range.value);
            var w = Math.sqrt(area * 4 / 3);
            var d = area / w;
            var W = w * SC, D = d * SC;
            var cx = 360, cy = 256;
            var x0 = cx - W / 2, y0 = cy - D / 2, x1 = x0 + W, y1 = y0 + D;

            geom = { x0: x0, y0: y0, x1: x1, y1: y1, w: w, d: d };

            while (svg.firstChild) { svg.removeChild(svg.firstChild); }

            var defs = el('defs', {}, svg);
            var pat = el('pattern', { id: 'hatch', width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
            el('line', { x1: 0, y1: 0, x2: 0, y2: 8, stroke: 'rgba(255,255,255,.14)', 'stroke-width': 2 }, pat);

            var g = el('g', {}, svg);
            var T = 30; /* espesor del vecino */

            var sides = {
                N: { r: [x0 - T, y0 - T, W + T * 2, T], line: [x0, y0, x1, y0], mid: [cx, y0 - 34], lab: 'PASILLO', rot: 0 },
                S: { r: [x0 - T, y1, W + T * 2, T], line: [x0, y1, x1, y1], mid: [cx, y1 + 38], lab: 'PASILLO', rot: 0 },
                W: { r: [x0 - T, y0 - T, T, D + T * 2], line: [x0, y0, x0, y1], mid: [x0 - 36, cy], lab: 'PASILLO', rot: -90 },
                E: { r: [x1, y0 - T, T, D + T * 2], line: [x1, y0, x1, y1], mid: [x1 + 36, cy], lab: 'PASILLO', rot: 90 }
            };

            ['N', 'S', 'E', 'W'].forEach(function (k) {
                var isWall = cfg.wall.indexOf(k) > -1;
                var s = sides[k];

                if (isWall) {
                    el('rect', { x: s.r[0], y: s.r[1], width: s.r[2], height: s.r[3], class: 'plan-nb' }, g);
                } else {
                    var label = (k === 'N') ? 'PASILLO' : (k === 'W' ? 'PASILLO' : 'PASILLO');
                    text(g, s.mid[0], s.mid[1] + (k === 'S' ? 0 : 0), label, 's', s.rot);
                }
            });

            el('rect', { x: x0, y: y0, width: W, height: D, class: 'plan-fill' }, g);

            ['N', 'S', 'E', 'W'].forEach(function (k) {
                var isWall = cfg.wall.indexOf(k) > -1;
                var l = sides[k].line;
                el('line', { x1: l[0], y1: l[1], x2: l[2], y2: l[3], class: isWall ? 'plan-wall' : 'plan-open' }, g);
                if (!isWall) {
                    var mx = (l[0] + l[2]) / 2, my = (l[1] + l[3]) / 2;
                    var ax = k === 'W' ? mx - 14 : (k === 'E' ? mx + 14 : mx);
                    var ay = k === 'N' ? my - 14 : (k === 'S' ? my + 14 : my);
                    arrow(g, ax, ay, k === 'N' ? 'S' : k === 'S' ? 'N' : k === 'E' ? 'W' : 'E');
                }
            });

            /* mobiliario (escala real: 1 m = SC px) */
            var counterW = Math.min(1.8, w * 0.32) * SC, counterD = 0.55 * SC;
            var hasN = cfg.wall.indexOf('N') > -1;
            var counterX = cx - counterW / 2;
            var counterY = hasN ? y0 + 0.25 * SC : cy - counterD / 2 - 0.2 * SC;
            el('rect', { x: counterX, y: counterY, width: counterW, height: counterD, class: 'plan-red' }, g);
            text(g, cx, counterY + counterD / 2 + 3, 'MOSTRADOR', 's');

            var tr = Math.min(0.5, d * 0.09) * SC;
            var tx = x0 + W * 0.7, ty = y0 + D * 0.7;
            el('circle', { cx: tx, cy: ty, r: tr, class: 'plan-obj' }, g);
            [[-1, 0], [1, 0], [0, 1]].forEach(function (o) {
                el('circle', { cx: tx + o[0] * (tr + 11), cy: ty + o[1] * (tr + 11), r: 6, class: 'plan-obj' }, g);
            });
            text(g, tx, ty - tr - 12, 'REUNIÓN', 's');

            if (cfg.wall.indexOf('W') > -1) {
                el('rect', { x: x0 + 4, y: cy - 0.9 * SC + 20, width: 0.3 * SC, height: 1.8 * SC, class: 'plan-obj' }, g);
            } else if (cfg.wall.length === 0) {
                el('rect', { x: cx - 0.25 * SC, y: y0 + 0.4 * SC, width: 0.5 * SC, height: 0.5 * SC, class: 'plan-obj' }, g);
                text(g, cx, y0 + 0.4 * SC - 7, 'TÓTEM', 's');
            }

            /* cotas */
            var dy = y1 + 58, dx = x1 + 62;
            el('path', { d: 'M' + x0 + ' ' + dy + ' H' + x1 + ' M' + x0 + ' ' + (dy - 6) + ' V' + (dy + 6) + ' M' + x1 + ' ' + (dy - 6) + ' V' + (dy + 6), class: 'plan-dim' }, g);
            text(g, cx, dy + 18, fmt(w) + ' m');
            el('path', { d: 'M' + dx + ' ' + y0 + ' V' + y1 + ' M' + (dx - 6) + ' ' + y0 + ' H' + (dx + 6) + ' M' + (dx - 6) + ' ' + y1 + ' H' + (dx + 6), class: 'plan-dim' }, g);
            text(g, dx + 16, cy, fmt(d) + ' m', '', 90);

            /* cruz de medición */
            var cross = el('g', { id: 'planCross', style: 'display:none' }, g);
            el('line', { id: 'crX', x1: x0, x2: x1, y1: 0, y2: 0, class: 'plan-cross' }, cross);
            el('line', { id: 'crY', y1: y0, y2: y1, x1: 0, x2: 0, class: 'plan-cross' }, cross);

            /* panel lateral */
            qs('[data-f="name"]', planRoot).textContent = cfg.name;
            qs('[data-f="text"]', planRoot).textContent = cfg.text;
            qs('[data-f="open"]', planRoot).textContent = cfg.open.length + ' de 4';
            qs('[data-f="wall"]', planRoot).textContent = cfg.wall.length + ' de 4';
            qs('[data-f="size"]', planRoot).textContent = fmt(w) + ' × ' + fmt(d) + ' m';
            qs('[data-f="ideal"]', planRoot).textContent = cfg.ideal;
            qs('[data-f="kick"]', planRoot).textContent = 'FRENTES ABIERTOS: ' + cfg.open.length;
            out.textContent = area + ' m²';
        }

        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                current = tab.getAttribute('data-type');
                tabs.forEach(function (t) { t.setAttribute('aria-selected', t === tab ? 'true' : 'false'); });
                drawPlan();
            });
        });

        range.addEventListener('input', drawPlan);

        svg.addEventListener('pointermove', function (e) {

            if (!geom) { return; }

            var pt = svg.createSVGPoint();
            pt.x = e.clientX; pt.y = e.clientY;
            var p = pt.matrixTransform(svg.getScreenCTM().inverse());
            var cross = qs('#planCross', svg);

            if (!cross) { return; }

            if (p.x >= geom.x0 && p.x <= geom.x1 && p.y >= geom.y0 && p.y <= geom.y1) {
                cross.style.display = '';
                qs('#crX', svg).setAttribute('y1', p.y); qs('#crX', svg).setAttribute('y2', p.y);
                qs('#crY', svg).setAttribute('x1', p.x); qs('#crY', svg).setAttribute('x2', p.x);
                readout.textContent = 'X ' + fmt((p.x - geom.x0) / SC) + ' m  ·  Y ' + fmt((p.y - geom.y0) / SC) + ' m';
            } else {
                cross.style.display = 'none';
                readout.textContent = 'X – m  ·  Y – m';
            }
        });

        svg.addEventListener('pointerleave', function () {
            var cross = qs('#planCross', svg);
            if (cross) { cross.style.display = 'none'; }
        });

        drawPlan();
    }

    /* =================================================================
       LABORATORIO 2 — FABRICACIÓN: despiece por capas
    ================================================================= */

    var expRoot = qs('[data-lab="explode"]');

    if (expRoot) {

        var layers = qsa('.exp-layer', expRoot);
        var items = qsa('.exp-item', expRoot);
        var stage = qs('.exp-stage', expRoot);
        var eRange = qs('input[type="range"]', expRoot);
        var eOut = qs('output', expRoot);

        function setExplode() {
            expRoot.style.setProperty('--e', eRange.value);
            eOut.textContent = Math.round((eRange.value / 70) * 100) + '%';
        }

        function highlight(i) {
            layers.forEach(function (l, k) { l.classList.toggle('on', k === i); });
            items.forEach(function (it, k) { it.classList.toggle('on', k === i); });
            stage.classList.toggle('is-dim', i > -1);
        }

        items.forEach(function (it, i) {
            it.addEventListener('pointerenter', function () { highlight(i); });
            it.addEventListener('focus', function () { highlight(i); });
            it.addEventListener('click', function () { highlight(i); });
        });

        layers.forEach(function (l, i) {
            l.addEventListener('pointerenter', function () { highlight(i); });
        });

        expRoot.addEventListener('pointerleave', function () { highlight(-1); });

        eRange.addEventListener('input', setExplode);
        setExplode();
        highlight(-1);

        /* el mouse sobre el dibujo separa las capas */
        var sg = qs('.lab-stage', expRoot);

        if (finePointer && !reduced) {
            sg.addEventListener('pointermove', function (e) {
                var r = sg.getBoundingClientRect();
                var k = clamp((e.clientX - r.left) / r.width, 0, 1);
                eRange.value = Math.round(14 + k * 56);
                paintRange(eRange);
                setExplode();
            });
        }
    }

    /* =================================================================
       LABORATORIO 3 — MONTAJE: línea de tiempo armable
    ================================================================= */

    var mtRoot = qs('[data-lab="assemble"]');

    if (mtRoot) {

        var groups = qsa('.mt-g', mtRoot);
        var chips = qsa('.lab-tab', mtRoot);
        var mRange = qs('input[type="range"]', mtRoot);
        var mOut = qs('output', mtRoot);
        var panes = qsa('[data-stage]', mtRoot);
        var playBtn = qs('.mt-play', mtRoot);
        var timer = 0;

        function setStage(n) {

            n = clamp(n, 1, 5);
            mRange.value = n;
            paintRange(mRange);
            mOut.textContent = 'Etapa ' + n + ' de 5';

            groups.forEach(function (g) {
                var from = Number(g.getAttribute('data-from'));
                var to = Number(g.getAttribute('data-to') || 99);
                g.classList.toggle('on', n >= from && n <= to);
            });

            chips.forEach(function (c, i) { c.setAttribute('aria-selected', i + 1 === n ? 'true' : 'false'); });
            panes.forEach(function (p) { p.hidden = Number(p.getAttribute('data-stage')) !== n; });
        }

        function stop() {
            window.clearInterval(timer);
            timer = 0;
            playBtn.textContent = '▶  Reproducir el montaje';
        }

        chips.forEach(function (c, i) {
            c.addEventListener('click', function () { stop(); setStage(i + 1); });
        });

        mRange.addEventListener('input', function () { stop(); setStage(Number(mRange.value)); });

        playBtn.addEventListener('click', function () {

            if (timer) { stop(); return; }

            playBtn.textContent = '❚❚  Pausar';
            setStage(1);

            timer = window.setInterval(function () {
                var next = Number(mRange.value) + 1;
                if (next > 5) { stop(); return; }
                setStage(next);
            }, 1500);
        });

        setStage(1);
    }

    /* =================================================================
       LABORATORIO 4 — 3D: mini visor que se gira con el mouse
    ================================================================= */

    var vwRoot = qs('[data-lab="viewer"]');

    if (vwRoot) {

        var vStage = qs('.vw-stage', vwRoot);
        var scene = qs('.vw-scene', vwRoot);
        var feats = qsa('.vw-feat', vwRoot);
        var panes3 = qsa('[data-feat]', vwRoot);

        function addBox(parent, w, h, d, x, y, z, cls) {

            var box = document.createElement('div');
            box.className = 'vw-box ' + (cls || '');
            box.style.transform = 'translate3d(' + x + 'px,' + y + 'px,' + z + 'px)';

            var faces = [
                ['front', w, h, 'translateZ(' + (d / 2) + 'px)'],
                ['back', w, h, 'rotateY(180deg) translateZ(' + (d / 2) + 'px)'],
                ['right', d, h, 'rotateY(90deg) translateZ(' + (w / 2) + 'px)'],
                ['left', d, h, 'rotateY(-90deg) translateZ(' + (w / 2) + 'px)'],
                ['top', w, d, 'rotateX(90deg) translateZ(' + (h / 2) + 'px)'],
                ['bottom', w, d, 'rotateX(-90deg) translateZ(' + (h / 2) + 'px)']
            ];

            faces.forEach(function (f) {
                var face = document.createElement('div');
                face.style.width = f[1] + 'px';
                face.style.height = f[2] + 'px';
                face.style.left = (-f[1] / 2) + 'px';
                face.style.top = (-f[2] / 2) + 'px';
                face.style.transform = f[3];
                box.appendChild(face);
            });

            parent.appendChild(box);
            return box;
        }

        /* mostrador (se resalta en "Elementos") y mesa */
        var counter = addBox(scene, 120, 46, 50, 80, 87, 120, '');
        addBox(scene, 44, 40, 44, -90, 90, 20, '');
        addBox(scene, 70, 150, 12, -150, 35, -120, '');

        var vx = -22, vy = -34, targetX = -22, targetY = -34, vel = 0, dragging = false;
        var lastX = 0, lastY = 0, idle = 0, auto = true;

        function applyScene() {
            scene.style.setProperty('--vx', vx.toFixed(2) + 'deg');
            scene.style.setProperty('--vy', vy.toFixed(2) + 'deg');
        }

        function fit() {
            var w = vStage.clientWidth;
            scene.style.setProperty('--sc', clamp(w / 760, 0.62, 1.2).toFixed(3));
        }

        vStage.addEventListener('pointerdown', function (e) {
            dragging = true; auto = false;
            lastX = e.clientX; lastY = e.clientY;
            vStage.classList.add('drag');
            vStage.setPointerCapture(e.pointerId);
        });

        vStage.addEventListener('pointermove', function (e) {

            if (!dragging) { return; }

            var dx = e.clientX - lastX, dy = e.clientY - lastY;
            lastX = e.clientX; lastY = e.clientY;
            targetY += dx * 0.45;
            targetX = clamp(targetX - dy * 0.3, -60, -4);
            vel = dx * 0.45;
        });

        function endDrag() {
            dragging = false;
            vStage.classList.remove('drag');
            idle = 0;
        }

        vStage.addEventListener('pointerup', endDrag);
        vStage.addEventListener('pointercancel', endDrag);

        (function loop() {

            if (!dragging) {
                if (Math.abs(vel) > 0.02) { targetY += vel; vel *= 0.94; }
                idle++;
                if (idle > 240 && !reduced) { auto = true; }
                if (auto && !reduced) { targetY += 0.12; }
            }

            vx += (targetX - vx) * 0.12;
            vy += (targetY - vy) * 0.12;
            applyScene();
            requestAnimationFrame(loop);
        })();

        function pick(i) {

            feats.forEach(function (f, k) { f.classList.toggle('on', k === i); });
            panes3.forEach(function (p) { p.hidden = Number(p.getAttribute('data-feat')) !== i; });

            var cls = ['f-walk', 'f-measure', 'f-pick', 'f-view'];
            cls.forEach(function (c, k) { scene.classList.toggle(c, k === i); });
            counter.classList.toggle('hot', i === 2);

            if (i === 3) { auto = false; targetX = -22; targetY = Math.round(vy / 360) * 360 - 34; }
            if (i === 1) { auto = false; targetX = -46; }
            if (i === 0) { auto = false; targetX = -36; }
            if (i === 2) { auto = false; targetX = -22; }
            idle = 0;
        }

        feats.forEach(function (f, i) {
            f.addEventListener('click', function () { pick(i); });
            f.addEventListener('pointerenter', function () { if (finePointer) { pick(i); } });
        });

        window.addEventListener('resize', fit);
        fit();
        pick(0);
    }

})();
