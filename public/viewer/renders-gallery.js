import { supabase } from './supabase-client.js';

const params = new URLSearchParams(window.location.search);
const requestedSlug = (params.get('project') || '').trim().toLowerCase();

let renders = [];
let currentIndex = 0;

function escapeHtml(value) {
    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function createGallery() {
    if (!renders.length) return;

    const controls = document.querySelector('.viewer-controls');

    if (!controls) {
        console.warn('No se encontró .viewer-controls para el botón de renders.');
        return;
    }

    if (document.getElementById('rendersGalleryButton')) return;

    const button = document.createElement('button');
    button.id = 'rendersGalleryButton';
    button.type = 'button';
    button.title = 'Ver renders';
    button.innerHTML = '▧ <span>Renders</span>';
    button.addEventListener('click', () => openGallery(0));

    controls.appendChild(button);

    const modal = document.createElement('div');
    modal.id = 'rendersGallery';
    modal.className = 'renders-gallery';
    modal.setAttribute('aria-hidden', 'true');

    modal.innerHTML = `
        <div class="renders-gallery-backdrop" data-gallery-close></div>

        <div
            class="renders-gallery-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rendersGalleryTitle"
        >
            <button
                type="button"
                class="renders-gallery-close"
                aria-label="Cerrar renders"
                data-gallery-close
            >
                ×
            </button>

            <div class="renders-gallery-header">
                <div>
                    <small>PROYECTO</small>
                    <h2 id="rendersGalleryTitle">Renders</h2>
                </div>

                <div
                    id="rendersGalleryCounter"
                    class="renders-gallery-counter"
                ></div>
            </div>

            <div class="renders-gallery-main">
                <button
                    type="button"
                    class="renders-gallery-nav renders-gallery-prev"
                    id="rendersGalleryPrev"
                    aria-label="Render anterior"
                >
                    ‹
                </button>

                <div class="renders-gallery-image-wrap">
                    <img
                        id="rendersGalleryImage"
                        class="renders-gallery-image"
                        src=""
                        alt=""
                    >
                </div>

                <button
                    type="button"
                    class="renders-gallery-nav renders-gallery-next"
                    id="rendersGalleryNext"
                    aria-label="Render siguiente"
                >
                    ›
                </button>
            </div>

            <div class="renders-gallery-footer">
                <div class="renders-gallery-footer">

             <div
                id="rendersGalleryThumbs"
                class="renders-gallery-thumbs"
            ></div>

            <div class="renders-gallery-actions">

        <a
            id="rendersGalleryDownload"
            class="renders-gallery-action renders-gallery-open-image"
            href="#"
            target="_blank"
            rel="noopener"
        >
            Abrir imagen
        </a>

        <a
            id="rendersGalleryDownloadFile"
            class="renders-gallery-action renders-gallery-download-file"
            href="#"
            download
        >
            Descargar
        </a>

    </div>

</div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll('[data-gallery-close]').forEach((element) => {
        element.addEventListener('click', closeGallery);
    });

    document.getElementById('rendersGalleryPrev')
        ?.addEventListener('click', () => moveGallery(-1));

    document.getElementById('rendersGalleryNext')
        ?.addEventListener('click', () => moveGallery(1));

    document.addEventListener('keydown', handleKeyboard);

    renderGallery();
}

function renderGallery() {
    const item = renders[currentIndex];

    if (!item) return;

    const image = document.getElementById('rendersGalleryImage');
    const counter = document.getElementById('rendersGalleryCounter');
    const thumbs = document.getElementById('rendersGalleryThumbs');
    const download = document.getElementById('rendersGalleryDownload');

    if (!image || !counter || !thumbs || !download) return;

    image.src = item.url;
    image.alt = item.name || `Render ${currentIndex + 1}`;

    counter.textContent =
        `${currentIndex + 1} / ${renders.length}`;

download.href = item.url;

const downloadFile =
    document.getElementById(
        'rendersGalleryDownloadFile'
    );

if (downloadFile) {

    downloadFile.href = item.url;

    downloadFile.onclick = async (event) => {

        event.preventDefault();

        const originalText =
            downloadFile.textContent;

        downloadFile.textContent =
            'Descargando...';

        try {

            const response =
                await fetch(item.url);

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }

            const blob =
                await response.blob();

            const blobUrl =
                URL.createObjectURL(blob);

            const link =
                document.createElement('a');

            link.href = blobUrl;

            link.download =
                item.name ||
                `render-${currentIndex + 1}`;

            document.body.appendChild(link);

            link.click();

            link.remove();

            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
            }, 1000);

        } catch (error) {

            console.error(
                'Error descargando render:',
                error
            );

            window.open(
                item.url,
                '_blank',
                'noopener'
            );

        } finally {

            downloadFile.textContent =
                originalText;
        }
    };
}

    thumbs.innerHTML = '';

    renders.forEach((render, index) => {
        const thumbButton = document.createElement('button');

        thumbButton.type = 'button';
        thumbButton.className =
            'renders-gallery-thumb' +
            (index === currentIndex ? ' is-active' : '');

        thumbButton.setAttribute(
            'aria-label',
            `Ver render ${index + 1}`
        );

        thumbButton.innerHTML = `
            <img
                src="${escapeHtml(render.url)}"
                alt=""
                loading="lazy"
            >
        `;

        thumbButton.addEventListener('click', () => {
            currentIndex = index;
            renderGallery();
        });

        thumbs.appendChild(thumbButton);
    });

    const disabled = renders.length <= 1;

    const prev = document.getElementById('rendersGalleryPrev');
    const next = document.getElementById('rendersGalleryNext');

    if (prev) prev.disabled = disabled;
    if (next) next.disabled = disabled;
}

function openGallery(index = 0) {
    if (!renders.length) return;

    currentIndex =
        Math.max(
            0,
            Math.min(index, renders.length - 1)
        );

    const modal = document.getElementById('rendersGallery');

    if (!modal) return;

    renderGallery();

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');

    document.body.classList.add('renders-gallery-open');
}

function closeGallery() {
    const modal = document.getElementById('rendersGallery');

    if (!modal) return;

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');

    document.body.classList.remove('renders-gallery-open');
}

function moveGallery(direction) {
    if (renders.length <= 1) return;

    currentIndex =
        (
            currentIndex +
            direction +
            renders.length
        ) % renders.length;

    renderGallery();
}

function handleKeyboard(event) {
    const modal = document.getElementById('rendersGallery');

    if (!modal?.classList.contains('is-open')) return;

    if (event.key === 'Escape') {
        closeGallery();
    }

    if (event.key === 'ArrowLeft') {
        moveGallery(-1);
    }

    if (event.key === 'ArrowRight') {
        moveGallery(1);
    }
}

async function loadRenders() {
    if (!requestedSlug) {
        return;
    }

    try {
        const {
            data,
            error
        } = await supabase
            .from('projects')
            .select('renders')
            .eq('slug', requestedSlug)
            .maybeSingle();

        if (error) {
            console.error(
                'Error cargando renders:',
                error
            );
            return;
        }

        if (!data) {
            console.warn(
                'No se encontró el proyecto:',
                requestedSlug
            );
            return;
        }

        renders = Array.isArray(data.renders)
            ? data.renders.filter(
                (render) =>
                    render &&
                    typeof render.url === 'string' &&
                    render.url.trim()
            )
            : [];

        if (!renders.length) {
            return;
        }

        createGallery();

    } catch (error) {
        console.error(
            'Error inicializando galería de renders:',
            error
        );
    }
}

loadRenders();
