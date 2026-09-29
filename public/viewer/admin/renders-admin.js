import { supabase } from '../supabase-client.js';


/* =====================================================
   CONFIGURACIÓN
===================================================== */

const STORAGE_BUCKET = 'models';
const MAX_FILE_SIZE = 25 * 1024 * 1024;


/* =====================================================
   OBTENER PROYECTO ACTUAL
===================================================== */

function getProjectSlug() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const urlSlug =
        params.get('project');

    if (urlSlug) {

        return urlSlug
            .trim()
            .toLowerCase();
    }

    return '';
}


function getActiveProjectId() {

    return (
        localStorage.getItem(
            'universalStandActiveProject'
        ) || ''
    ).trim();
}


/* =====================================================
   PROYECTO
===================================================== */

async function getCurrentProject() {

    const slug =
        getProjectSlug();

    const activeProjectId =
        getActiveProjectId();


    /*
     * Primero intentamos por slug.
     * Esto mantiene funcionando el acceso
     * directo mediante ?project=...
     */

    if (slug) {

        const {
            data,
            error
        } = await supabase
            .from('projects')
            .select(
                'id, slug, cliente, proyecto, renders'
            )
            .eq(
                'slug',
                slug
            )
            .maybeSingle();


        if (error) {

            console.error(
                'Error buscando proyecto por slug:',
                error
            );

            throw error;
        }


        if (data) {

            return data;
        }
    }


    /*
     * Si el Admin no tiene ?project=...
     * usamos el proyecto activo que ya maneja
     * el administrador.
     */

    if (activeProjectId) {

        const {
            data,
            error
        } = await supabase
            .from('projects')
            .select(
                'id, slug, cliente, proyecto, renders'
            )
            .eq(
                'id',
                activeProjectId
            )
            .maybeSingle();


        if (error) {

            console.error(
                'Error buscando proyecto activo:',
                error
            );

            throw error;
        }


        if (data) {

            return data;
        }
    }


    return null;
}

/* =====================================================
   UTILIDADES
===================================================== */

function escapeHtml(value) {

    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}


function createId() {

    return (
        Date.now().toString(36) +
        '-' +
        Math.random()
            .toString(36)
            .slice(2, 9)
    );
}


/* =====================================================
   NORMALIZAR RENDERS
===================================================== */

function normalizeRenders(
    renders
) {

    if (!Array.isArray(renders)) {
        return [];
    }

    return renders
        .filter(render =>
            render &&
            typeof render === 'object' &&
            render.url
        )
        .map(render => ({
            id:
                render.id ||
                createId(),

            name:
                render.name ||
                'Render',

            url:
                render.url,

            path:
                render.path ||
                '',

            createdAt:
                render.createdAt ||
                new Date().toISOString()
        }));
}


/* =====================================================
   ESTADO
===================================================== */

let currentProject = null;

let currentRenders = [];


/* =====================================================
   CREAR INTERFAZ
===================================================== */

function createInterface() {

    const existing =
        document.getElementById(
            'rendersAdminSection'
        );

    if (existing) {
        return existing;
    }

    const section =
        document.createElement('section');

    section.id =
        'rendersAdminSection';

    section.className =
        'admin-card renders-admin-section';

    section.innerHTML = `

        <div class="admin-section-header">

            <div>

                <h2>
                    Renders del proyecto
                </h2>

                <p>
                    Subí las imágenes de presentación.
                    Quedarán asociadas automáticamente
                    a este proyecto.
                </p>

            </div>

        </div>


        <div
            id="rendersDropzone"
            class="renders-dropzone"
        >

            <input
                id="rendersFileInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
            >

            <div class="renders-dropzone-icon">
                +
            </div>

            <strong>
                Agregar renders
            </strong>

            <span>
                JPG, PNG o WEBP · hasta 25 MB por imagen
            </span>

            <button
                id="rendersSelectButton"
                type="button"
            >
                Seleccionar imágenes
            </button>

        </div>


        <div
            id="rendersStatus"
            class="renders-status"
        >
            Cargando renders...
        </div>


        <div
            id="rendersGrid"
            class="renders-grid"
        ></div>

    `;

const anchor =
    document.querySelector(
        '.skp-upload'
    );

const anchorCard =
    anchor?.parentElement;

const main =
    document.querySelector('main');

if (
    main &&
    anchorCard
) {

    main.insertBefore(
        section,
        anchorCard.nextElementSibling
    );

} else if (main) {

    main.prepend(section);
}

    return section;
}


/* =====================================================
   ELEMENTOS
===================================================== */

function getElements() {

    return {

        fileInput:
            document.getElementById(
                'rendersFileInput'
            ),

        selectButton:
            document.getElementById(
                'rendersSelectButton'
            ),

        dropzone:
            document.getElementById(
                'rendersDropzone'
            ),

        status:
            document.getElementById(
                'rendersStatus'
            ),

        grid:
            document.getElementById(
                'rendersGrid'
            )
    };
}


/* =====================================================
   ESTADO
===================================================== */

function setStatus(
    message
) {

    const {
        status
    } =
        getElements();

    if (status) {
        status.textContent =
            message;
    }
}


/* =====================================================
   RENDERIZAR GALERÍA ADMIN
===================================================== */

function renderAdminGrid() {

    const {
        grid
    } =
        getElements();

    if (!grid) {
        return;
    }

    if (!currentRenders.length) {

        grid.innerHTML = `

            <div class="renders-empty">

                <strong>
                    Todavía no hay renders.
                </strong>

                <span>
                    Agregá las imágenes del proyecto.
                </span>

            </div>

        `;

        return;
    }

    grid.innerHTML =
        currentRenders
            .map(
                (render, index) => `

                    <article
                        class="render-admin-item"
                        data-render-id="${escapeHtml(render.id)}"
                    >

                        <div
                            class="render-admin-image"
                        >

                            <img
                                src="${escapeHtml(render.url)}"
                                alt="${escapeHtml(render.name)}"
                                loading="lazy"
                            >

                        </div>


                        <div
                            class="render-admin-info"
                        >

                            <input
                                class="render-admin-name"
                                type="text"
                                value="${escapeHtml(render.name)}"
                                data-render-name="${escapeHtml(render.id)}"
                            >

                            <div
                                class="render-admin-actions"
                            >

                                <button
                                    type="button"
                                    data-action="save-name"
                                    data-id="${escapeHtml(render.id)}"
                                >
                                    Guardar nombre
                                </button>

                                <button
                                    type="button"
                                    data-action="delete"
                                    data-id="${escapeHtml(render.id)}"
                                    class="render-delete-button"
                                >
                                    Eliminar
                                </button>

                            </div>

                        </div>

                    </article>

                `
            )
            .join('');
}


/* =====================================================
   GUARDAR RENDERS EN SUPABASE
===================================================== */

async function saveRenders() {

    if (!currentProject) {
        return false;
    }

    const {
        error
    } =
        await supabase
            .from('projects')
            .update({
                renders:
                    currentRenders
            })
            .eq(
                'id',
                currentProject.id
            );

    if (error) {

        console.error(
            'Error guardando renders:',
            error
        );

        return false;
    }

    return true;
}


/* =====================================================
   SUBIR ARCHIVOS
===================================================== */

async function uploadFiles(
    files
) {

    if (!currentProject) {

        setStatus(
            'Primero guardá el proyecto en Supabase.'
        );

        return;
    }

    const validFiles =
        Array.from(files || [])
            .filter(file => {

                const validType =
                    [
                        'image/jpeg',
                        'image/png',
                        'image/webp'
                    ]
                        .includes(
                            file.type
                        );

                const validSize =
                    file.size <=
                    MAX_FILE_SIZE;

                return (
                    validType &&
                    validSize
                );
            });

    if (!validFiles.length) {

        setStatus(
            'No hay imágenes válidas para subir.'
        );

        return;
    }

    setStatus(
        `Subiendo ${validFiles.length} render(s)...`
    );

    for (
        let index = 0;
        index < validFiles.length;
        index++
    ) {

        const file =
            validFiles[index];

        try {

            setStatus(
                `Subiendo render ${index + 1} de ${validFiles.length}...`
            );

            const extension =
                file.name
                    .split('.')
                    .pop()
                    .toLowerCase();

            const renderId =
                createId();

            const safeBase =
                file.name
                    .replace(
                        /\.[^/.]+$/,
                        ''
                    )
                    .toLowerCase()
                    .replace(
                        /[^a-z0-9]+/g,
                        '-'
                    )
                    .replace(
                        /^-+|-+$/g,
                        ''
                    ) ||
                `render-${renderId}`;

            const filePath =
                `projects/${currentProject.id}/renders/${renderId}-${safeBase}.${extension}`;

            const {
                error: uploadError
            } =
                await supabase
                    .storage
                    .from(
                        STORAGE_BUCKET
                    )
                    .upload(
                        filePath,
                        file,
                        {
                            contentType:
                                file.type,

                            cacheControl:
                                '31536000',

                            upsert:
                                false
                        }
                    );

            if (uploadError) {
                throw uploadError;
            }

            const {
                data: publicData
            } =
                supabase
                    .storage
                    .from(
                        STORAGE_BUCKET
                    )
                    .getPublicUrl(
                        filePath
                    );

            const render = {

                id:
                    renderId,

                name:
                    file.name
                        .replace(
                            /\.[^/.]+$/,
                            ''
                        ),

                url:
                    publicData.publicUrl,

                path:
                    filePath,

                createdAt:
                    new Date()
                        .toISOString()
            };

            currentRenders.push(
                render
            );

        } catch (error) {

            console.error(
                'Error subiendo render:',
                error
            );

            setStatus(
                `Error subiendo ${file.name}.`
            );
        }
    }

    const saved =
        await saveRenders();

    if (!saved) {

        setStatus(
            'Los archivos fueron subidos, pero no se pudo guardar la asociación con el proyecto.'
        );

        return;
    }

    renderAdminGrid();

    setStatus(
        `${currentRenders.length} render(s) asociados al proyecto.`
    );
}


/* =====================================================
   ELIMINAR RENDER
===================================================== */

async function deleteRender(
    renderId
) {

    const render =
        currentRenders.find(
            item =>
                item.id ===
                renderId
        );

    if (!render) {
        return;
    }

    const confirmed =
        window.confirm(
            `¿Eliminar "${render.name}"?`
        );

    if (!confirmed) {
        return;
    }

    try {

        if (render.path) {

            const {
                error
            } =
                await supabase
                    .storage
                    .from(
                        STORAGE_BUCKET
                    )
                    .remove([
                        render.path
                    ]);

            if (error) {
                throw error;
            }
        }

        currentRenders =
            currentRenders.filter(
                item =>
                    item.id !==
                    renderId
            );

        const saved =
            await saveRenders();

        if (!saved) {
            throw new Error(
                'No se pudo guardar el proyecto.'
            );
        }

        renderAdminGrid();

        setStatus(
            'Render eliminado correctamente.'
        );

    } catch (error) {

        console.error(
            'Error eliminando render:',
            error
        );

        setStatus(
            'No se pudo eliminar el render.'
        );
    }
}


/* =====================================================
   RENOMBRAR
===================================================== */

async function renameRender(
    renderId,
    name
) {

    const render =
        currentRenders.find(
            item =>
                item.id ===
                renderId
        );

    if (!render) {
        return;
    }

    render.name =
        name.trim() ||
        'Render';

    const saved =
        await saveRenders();

    if (saved) {

        setStatus(
            'Nombre guardado correctamente.'
        );

    } else {

        setStatus(
            'No se pudo guardar el nombre.'
        );
    }
}


/* =====================================================
   EVENTOS
===================================================== */

function setupEvents() {

    const {
        fileInput,
        selectButton,
        dropzone,
        grid
    } =
        getElements();

    selectButton?.addEventListener(
        'click',
        () => {
            fileInput?.click();
        }
    );

    fileInput?.addEventListener(
        'change',
        event => {

            uploadFiles(
                event.target.files
            );

            event.target.value =
                '';
        }
    );


    dropzone?.addEventListener(
        'dragover',
        event => {

            event.preventDefault();

            dropzone.classList.add(
                'is-dragging'
            );
        }
    );


    dropzone?.addEventListener(
        'dragleave',
        () => {

            dropzone.classList.remove(
                'is-dragging'
            );
        }
    );


    dropzone?.addEventListener(
        'drop',
        event => {

            event.preventDefault();

            dropzone.classList.remove(
                'is-dragging'
            );

            uploadFiles(
                event.dataTransfer.files
            );
        }
    );


    grid?.addEventListener(
        'click',
        event => {

            const button =
                event.target.closest(
                    'button'
                );

            if (!button) {
                return;
            }

            const id =
                button.dataset.id;

            const action =
                button.dataset.action;

            if (
                action ===
                'delete'
            ) {

                deleteRender(
                    id
                );

                return;
            }

            if (
                action ===
                'save-name'
            ) {

                const input =
                    grid.querySelector(
                        `[data-render-name="${CSS.escape(id)}"]`
                    );

                renameRender(
                    id,
                    input?.value ||
                    'Render'
                );
            }
        }
    );
}


/* =====================================================
   INICIALIZAR
===================================================== */

async function init() {

    createInterface();

    setupEvents();

    try {

        currentProject =
            await getCurrentProject();

        if (!currentProject) {

            setStatus(
                'No se encontró el proyecto online. Guardá primero el proyecto.'
            );

            renderAdminGrid();

            return;
        }

        currentRenders =
            normalizeRenders(
                currentProject.renders
            );

        renderAdminGrid();

        setStatus(
            currentRenders.length
                ? `${currentRenders.length} render(s) cargados.`
                : 'No hay renders cargados.'
        );

    } catch (error) {

        console.error(
            'Error inicializando renders:',
            error
        );

        setStatus(
            'No se pudieron cargar los renders.'
        );
    }
}


init();