import { supabase } from './supabase-client.js';

const params =
    new URLSearchParams(
        window.location.search
    );

const requestedProject =
    (
        params.get('project') ||
        ''
    )
        .trim()
        .toLowerCase();

let renders = [];
let currentIndex = 0;


function parseJsonArray(value) {

    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === 'string') {

        try {

            const parsed =
                JSON.parse(value);

            return Array.isArray(parsed)
                ? parsed
                : [];

        } catch (error) {

            console.error(
                '[Renders] No se pudo interpretar renders:',
                error
            );

        }
    }

    return [];
}


function escapeHtml(value) {

    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}


/* =====================================================
   CREAR GALERÍA
===================================================== */

function createGallery() {

    if (!renders.length) {
        return;
    }

    const controls =
        document.querySelector(
            '.viewer-controls'
        );

    if (!controls) {

        console.warn(
            '[Renders] No se encontró .viewer-controls.'
        );

        return;
    }

    if (
        document.getElementById(
            'rendersGalleryButton'
        )
    ) {
        return;
    }


    const button =
        document.createElement(
            'button'
        );

    button.id =
        'rendersGalleryButton';

    button.type =
        'button';

    button.title =
        'Ver renders';

    button.innerHTML =
        '▧ <span>Renders</span>';

    button.addEventListener(
        'click',
        () => openGallery(0)
    );

    controls.appendChild(
        button
    );


    const modal =
        document.createElement(
            'div'
        );

    modal.id =
        'rendersGallery';

    modal.className =
        'renders-gallery';

    modal.setAttribute(
        'aria-hidden',
        'true'
    );


    modal.innerHTML = `

        <div
            class="renders-gallery-backdrop"
            data-gallery-close
        ></div>


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


            <div
                class="renders-gallery-header"
            >

                <div>

                    <small>
                        PROYECTO
                    </small>

                    <h2
                        id="rendersGalleryTitle"
                    >
                        Renders
                    </h2>

                </div>


                <div
                    id="rendersGalleryCounter"
                    class="renders-gallery-counter"
                ></div>

            </div>


            <div
                class="renders-gallery-main"
            >

                <button
                    type="button"
                    class="renders-gallery-nav renders-gallery-prev"
                    id="rendersGalleryPrev"
                    aria-label="Render anterior"
                >
                    ‹
                </button>


                <div
                    class="renders-gallery-image-wrap"
                >

                    <span
                        class="renders-gallery-loading"
                        id="rendersGalleryLoading"
                    >
                        Cargando...
                    </span>


                    <img
                        id="rendersGalleryImage"
                        src=""
                        alt="Render"
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


            <div
                class="renders-gallery-footer"
            >

                <div
                    id="rendersGalleryThumbs"
                    class="renders-gallery-thumbs"
                ></div>


                <div
                    class="renders-gallery-actions"
                >

                    <button
                        type="button"
                        id="rendersGalleryOpen"
                    >
                        Abrir imagen
                    </button>


                    <button
                        type="button"
                        id="rendersGalleryDownload"
                    >
                        Descargar
                    </button>

                </div>

            </div>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    modal
        .querySelectorAll(
            '[data-gallery-close]'
        )
        .forEach(
            element => {

                element.addEventListener(
                    'click',
                    closeGallery
                );

            }
        );


    document
        .getElementById(
            'rendersGalleryPrev'
        )
        ?.addEventListener(
            'click',
            () => moveGallery(-1)
        );


    document
        .getElementById(
            'rendersGalleryNext'
        )
        ?.addEventListener(
            'click',
            () => moveGallery(1)
        );


    document
        .getElementById(
            'rendersGalleryOpen'
        )
        ?.addEventListener(
            'click',
            () => {

                const item =
                    renders[currentIndex];

                if (item?.url) {
                    window.open(
                        item.url,
                        '_blank',
                        'noopener,noreferrer'
                    );
                }

            }
        );


    document
        .getElementById(
            'rendersGalleryDownload'
        )
        ?.addEventListener(
            'click',
            downloadCurrentRender
        );


    renderGallery();
}


/* =====================================================
   RENDER
===================================================== */

function renderGallery() {

    const item =
        renders[currentIndex];

    if (!item) {
        return;
    }


    const image =
        document.getElementById(
            'rendersGalleryImage'
        );

    const loading =
        document.getElementById(
            'rendersGalleryLoading'
        );

    const counter =
        document.getElementById(
            'rendersGalleryCounter'
        );

    const thumbs =
        document.getElementById(
            'rendersGalleryThumbs'
        );


    if (
        !image ||
        !counter ||
        !thumbs
    ) {
        return;
    }


    image.style.display =
        'none';

    if (loading) {
        loading.style.display =
            'block';
    }


    image.onload =
        () => {

            image.style.display =
                'block';

            if (loading) {
                loading.style.display =
                    'none';
            }
        };


    image.src =
        item.url;

    image.alt =
        item.name ||
        `Render ${currentIndex + 1}`;


    counter.textContent =
        `${currentIndex + 1} / ${renders.length}`;


    thumbs.innerHTML =
        '';


    renders.forEach(
        (render, index) => {

            const thumb =
                document.createElement(
                    'button'
                );

            thumb.type =
                'button';

            thumb.className =
                'renders-gallery-thumb' +
                (
                    index === currentIndex
                        ? ' is-active'
                        : ''
                );


            thumb.innerHTML = `

                <img
                    src="${escapeHtml(
                        render.url
                    )}"
                    alt="${escapeHtml(
                        render.name ||
                        `Render ${index + 1}`
                    )}"
                    loading="lazy"
                >
            `;


            thumb.addEventListener(
                'click',
                () => {

                    currentIndex =
                        index;

                    renderGallery();

                }
            );


            thumbs.appendChild(
                thumb
            );
        }
    );


    const disabled =
        renders.length <= 1;


    const previous =
        document.getElementById(
            'rendersGalleryPrev'
        );

    const next =
        document.getElementById(
            'rendersGalleryNext'
        );


    if (previous) {
        previous.disabled =
            disabled;
    }

    if (next) {
        next.disabled =
            disabled;
    }
}


/* =====================================================
   ABRIR / CERRAR
===================================================== */

function openGallery(
    index = 0
) {

    if (!renders.length) {
        return;
    }


    currentIndex =
        Math.max(
            0,
            Math.min(
                index,
                renders.length - 1
            )
        );


    renderGallery();


    const modal =
        document.getElementById(
            'rendersGallery'
        );


    if (!modal) {
        return;
    }


    modal.classList.add(
        'is-open'
    );


    modal.setAttribute(
        'aria-hidden',
        'false'
    );


    document.body.classList.add(
        'renders-gallery-opened'
    );
}


function closeGallery() {

    const modal =
        document.getElementById(
            'rendersGallery'
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        'is-open'
    );


    modal.setAttribute(
        'aria-hidden',
        'true'
    );


    document.body.classList.remove(
        'renders-gallery-opened'
    );
}


/* =====================================================
   NAVEGACIÓN
===================================================== */

function moveGallery(
    direction
) {

    if (
        renders.length <=
        1
    ) {
        return;
    }


    currentIndex =
        (
            currentIndex +
            direction +
            renders.length
        ) %
        renders.length;


    renderGallery();
}


function handleKeyboard(
    event
) {

    const modal =
        document.getElementById(
            'rendersGallery'
        );


    if (
        !modal?.classList.contains(
            'is-open'
        )
    ) {
        return;
    }


    if (
        event.key ===
        'Escape'
    ) {

        closeGallery();

    } else if (
        event.key ===
        'ArrowLeft'
    ) {

        moveGallery(-1);

    } else if (
        event.key ===
        'ArrowRight'
    ) {

        moveGallery(1);
    }
}


document.addEventListener(
    'keydown',
    handleKeyboard
);


/* =====================================================
   DESCARGA
===================================================== */

async function downloadCurrentRender() {

    const item =
        renders[currentIndex];

    if (!item?.url) {
        return;
    }


    const filename =
        (
            item.name ||
            `render-${currentIndex + 1}`
        )
            .replace(
                /[\\/:*?"<>|]+/g,
                '-'
            );


    try {

        const response =
            await fetch(
                item.url
            );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const blob =
            await response.blob();


        const objectUrl =
            URL.createObjectURL(
                blob
            );


        const anchor =
            document.createElement(
                'a'
            );

        anchor.href =
            objectUrl;

        anchor.download =
            filename;


        document.body.appendChild(
            anchor
        );

        anchor.click();

        anchor.remove();


        setTimeout(
            () => {
                URL.revokeObjectURL(
                    objectUrl
                );
            },
            1000
        );

    } catch (error) {

        console.error(
            '[Renders] Error descargando imagen:',
            error
        );


        window.open(
            item.url,
            '_blank',
            'noopener,noreferrer'
        );
    }
}


/* =====================================================
   CARGAR RENDERS DESDE SUPABASE
===================================================== */

async function loadRenders() {

    let project =
        null;


    try {

        if (requestedProject) {

            const {
                data: bySlug,
                error: slugError
            } = await supabase
                .from('projects')
                .select(
                    'id, slug, cliente, proyecto, renders'
                )
                .eq(
                    'slug',
                    requestedProject
                )
                .maybeSingle();


            if (slugError) {

                console.error(
                    '[Renders] Error buscando por slug:',
                    slugError
                );

            }


            project =
                bySlug || null;


            if (!project) {

                const {
                    data: byId,
                    error: idError
                } = await supabase
                    .from('projects')
                    .select(
                        'id, slug, cliente, proyecto, renders'
                    )
                    .eq(
                        'id',
                        requestedProject
                    )
                    .maybeSingle();


                if (idError) {

                    console.error(
                        '[Renders] Error buscando por ID:',
                        idError
                    );

                }


                project =
                    byId || null;
            }
        }


        /*
         * Si el enlace quedó viejo, usamos el último proyecto actualizado.
         * Esto mantiene el botón conectado al mismo proyecto que usa el visor.
         */
        if (!project) {

            const {
                data: latest,
                error: latestError
            } = await supabase
                .from('projects')
                .select(
                    'id, slug, cliente, proyecto, renders'
                )
                .order(
                    'updated_at',
                    {
                        ascending: false,
                        nullsFirst: false
                    }
                )
                .order(
                    'created_at',
                    {
                        ascending: false,
                        nullsFirst: false
                    }
                )
                .limit(1)
                .maybeSingle();


            if (latestError) {

                console.error(
                    '[Renders] Error buscando último proyecto:',
                    latestError
                );

            }


            project =
                latest || null;
        }


        if (!project) {

            console.warn(
                '[Renders] No se encontró ningún proyecto en Supabase.'
            );

            return;
        }


        renders =
            parseJsonArray(
                project.renders
            ).filter(
                render =>
                    render &&
                    typeof render.url ===
                        'string' &&
                    render.url.trim()
            );


        if (!renders.length) {

            console.log(
                '[Renders] El proyecto no tiene renders publicados:',
                project.slug
            );

            return;
        }


        createGallery();


    } catch (error) {

        console.error(
            '[Renders] Error inicializando galería:',
            error
        );
    }
}


loadRenders();
