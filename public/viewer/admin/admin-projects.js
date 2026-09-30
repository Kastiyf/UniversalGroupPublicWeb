/* =====================================================
   UNIVERSAL STAND
   ADMIN PROJECTS
   Biblioteca de proyectos
   FUENTE DE DATOS: SUPABASE
===================================================== */

import {
    supabase
} from '../supabase-client.js';


/* =====================================================
   DOM
===================================================== */

const projectLibrary =
    document.getElementById(
        'projectLibrary'
    );

const projectLibrarySearch =
    document.getElementById(
        'projectLibrarySearch'
    );

const projectLibraryStatus =
    document.getElementById(
        'projectLibraryStatus'
    );

const refreshProjectLibrary =
    document.getElementById(
        'refreshProjectLibrary'
    );


/* =====================================================
   ESTADO
===================================================== */

let allProjects = [];

let filteredProjects = [];


/* =====================================================
   PROYECTO ACTIVO
===================================================== */

function getActiveProjectId() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const requestedSlug =
        (
            params.get('project') ||
            ''
        )
            .trim()
            .toLowerCase();

    if (!requestedSlug) {
        return null;
    }

    const project =
        allProjects.find(
            item =>
                String(
                    item.slug || ''
                )
                    .trim()
                    .toLowerCase() ===
                requestedSlug
        );

    return project?.id || null;
}


/* =====================================================
   NORMALIZAR TEXTO
===================================================== */

function normalizeText(
    value
) {

    return String(
        value || ''
    )
        .normalize(
            'NFD'
        )
        .replace(
            /[\u0300-\u036f]/g,
            ''
        )
        .toLowerCase()
        .trim();
}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(
    value
) {

    return String(
        value ?? ''
    )
        .replaceAll(
            '&',
            '&amp;'
        )
        .replaceAll(
            '<',
            '&lt;'
        )
        .replaceAll(
            '>',
            '&gt;'
        )
        .replaceAll(
            '"',
            '&quot;'
        )
        .replaceAll(
            "'",
            '&#039;'
        );
}


/* =====================================================
   FORMATO FECHA
===================================================== */

function formatDate(
    value
) {

    if (!value) {
        return 'Sin fecha';
    }

    const date =
        new Date(
            value
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return 'Sin fecha';
    }

    return new Intl.DateTimeFormat(
        'es-PY',
        {
            day:
                '2-digit',

            month:
                '2-digit',

            year:
                'numeric',

            hour:
                '2-digit',

            minute:
                '2-digit'
        }
    ).format(
        date
    );
}


/* =====================================================
   ESTADO DEL MODELO
===================================================== */

function getModelStatus(
    project
) {

    const model =
        String(
            project?.modelo || ''
        ).trim();

    if (
        !model ||
        model ===
            'models/stand.glb'
    ) {

        return {
            label:
                'Sin modelo 3D',

            className:
                'project-library-status-no-model'
        };
    }

    return {
        label:
            'Modelo 3D cargado',

        className:
            'project-library-status-model'
    };
}


/* =====================================================
   CARGAR BIBLIOTECA
===================================================== */

async function loadProjectLibrary() {

    if (
        projectLibraryStatus
    ) {

        projectLibraryStatus.textContent =
            'Cargando proyectos desde Supabase...';
    }

    try {

        const {
            data,
            error
        } =
            await supabase
                .from('projects')
                .select('*')
                .order(
                    'created_at',
                    {
                        ascending:
                            false
                    }
                );

        if (error) {
            throw error;
        }

        allProjects =
            Array.isArray(data)
                ? data
                : [];

        filteredProjects =
            [...allProjects];

        renderProjectLibrary();

    } catch (error) {

        console.error(
            'ADMIN PROJECTS: no se pudo cargar Supabase:',
            error
        );

        allProjects = [];
        filteredProjects = [];

        if (
            projectLibrary
        ) {
            projectLibrary.innerHTML = '';
        }

        if (
            projectLibraryStatus
        ) {
            projectLibraryStatus.textContent =
                'No se pudieron cargar los proyectos desde Supabase.';
        }
    }
}


/* =====================================================
   FILTRAR
===================================================== */

function filterProjects(
    search
) {

    const query =
        normalizeText(
            search
        );

    if (!query) {

        filteredProjects =
            [...allProjects];

        return;
    }

    filteredProjects =
        allProjects.filter(
            project => {

                const cliente =
                    normalizeText(
                        project?.cliente
                    );

                const proyecto =
                    normalizeText(
                        project?.proyecto
                    );

                const slug =
                    normalizeText(
                        project?.slug
                    );

                const modelName =
                    normalizeText(
                        project?.modelName
                    );

                const description =
                    normalizeText(
                        project?.descripcion
                    );

                return (

                    cliente.includes(
                        query
                    ) ||

                    proyecto.includes(
                        query
                    ) ||

                    slug.includes(
                        query
                    ) ||

                    modelName.includes(
                        query
                    ) ||

                    description.includes(
                        query
                    )
                );
            }
        );
}


/* =====================================================
   RENDER BIBLIOTECA
===================================================== */

function renderProjectLibrary() {

    if (
        !projectLibrary
    ) {
        return;
    }

    projectLibrary.innerHTML =
        '';

    if (
        !allProjects.length
    ) {

        renderEmptyLibrary(
            'No hay proyectos guardados en Supabase.'
        );

        updateLibraryStatus();

        return;
    }

    if (
        !filteredProjects.length
    ) {

        renderEmptyLibrary(
            'No se encontraron proyectos con esa búsqueda.'
        );

        updateLibraryStatus();

        return;
    }

    const activeId =
        getActiveProjectId();

    filteredProjects.forEach(
        project => {

            const item =
                createProjectItem(
                    project,
                    String(project.id) ===
                        String(activeId)
                );

            projectLibrary.appendChild(
                item
            );
        }
    );

    updateLibraryStatus();
}


/* =====================================================
   ITEM DE PROYECTO
===================================================== */

function createProjectItem(
    project,
    isActive
) {

    const item =
        document.createElement(
            'article'
        );

    item.className =
        'project-library-item';

    if (
        isActive
    ) {

        item.classList.add(
            'active'
        );
    }

    item.dataset.projectId =
        project.id || '';

    const modelStatus =
        getModelStatus(
            project
        );

    const hotspotCount =
        Array.isArray(
            project.hotspots
        )
            ? project.hotspots.length
            : 0;

    const navigationSaved =
        Boolean(
            project.navigation &&
            project.navigation.position &&
            project.navigation.target
        );

    const width =
        Number(
            project.ancho
        ) || 0;

    const depth =
        Number(
            project.profundidad
        ) || 0;

    const height =
        Number(
            project.altura
        ) || 0;

    const surface =
        Number(
            project.superficie
        ) || (
            width *
            depth
        );

    item.innerHTML = `

        <div class="project-library-main">

            <div class="project-library-heading">

                <div class="project-library-title">

                    ${escapeHtml(
                        project.proyecto ||
                        'Proyecto sin nombre'
                    )}

                </div>

                ${
                    isActive

                        ? `
                            <span class="project-library-active">
                                ACTIVO
                            </span>
                        `

                        : ''
                }

            </div>


            <div class="project-library-client">

                ${escapeHtml(
                    project.cliente ||
                    'Sin cliente'
                )}

            </div>


            <div class="project-library-meta">

                <span>
                    ${escapeHtml(
                        project.slug ||
                        'sin-slug'
                    )}
                </span>


                <span>
                    ${width} × ${depth} × ${height} m
                </span>


                <span>
                    ${surface.toFixed(2)} m²
                </span>


                <span>
                    ${hotspotCount}
                    ${
                        hotspotCount === 1
                            ? ' elemento'
                            : ' elementos'
                    }
                </span>


                ${
                    navigationSaved

                        ? `
                            <span>
                                Inicio guardado
                            </span>
                        `

                        : ''
                }

            </div>


            <div class="project-library-date">

                Actualizado:
                ${escapeHtml(
                    formatDate(
                        project.updated_at ||
                        project.updatedAt ||
                        project.created_at ||
                        project.createdAt
                    )
                )}

            </div>


            <div class="project-library-model">

                <span
                    class="${modelStatus.className}"
                >
                    ${modelStatus.label}
                </span>


                ${
                    project.modelName

                        ? `
                            <span>
                                ${escapeHtml(
                                    project.modelName
                                )}
                            </span>
                        `

                        : ''
                }

            </div>

        </div>


        <div class="project-library-actions">

            <button
                type="button"
                data-action="open"
            >
                Abrir
            </button>


            <button
                type="button"
                data-action="public"
            >
                Ver
            </button>


            <button
                type="button"
                data-action="copy"
            >
                Copiar enlace
            </button>

        </div>
    `;


    const openButton =
        item.querySelector(
            '[data-action="open"]'
        );

    const publicButton =
        item.querySelector(
            '[data-action="public"]'
        );

    const copyButton =
        item.querySelector(
            '[data-action="copy"]'
        );


    openButton?.addEventListener(
        'click',
        event => {

            event.preventDefault();
            event.stopPropagation();

            activateProject(
                project
            );
        }
    );


    publicButton?.addEventListener(
        'click',
        event => {

            event.preventDefault();
            event.stopPropagation();

            openPublicProject(
                project
            );
        }
    );


    copyButton?.addEventListener(
        'click',
        event => {

            event.preventDefault();
            event.stopPropagation();

            copyPublicProjectLink(
                project
            );
        }
    );


    item.addEventListener(
        'click',
        event => {

            if (
                event.target.closest(
                    'button'
                )
            ) {
                return;
            }

            activateProject(
                project
            );
        }
    );


    return item;
}


/* =====================================================
   BIBLIOTECA VACÍA
===================================================== */

function renderEmptyLibrary(
    message
) {

    if (
        !projectLibrary
    ) {
        return;
    }

    const empty =
        document.createElement(
            'div'
        );

    empty.className =
        'project-library-empty';

    empty.textContent =
        message;

    projectLibrary.appendChild(
        empty
    );
}


/* =====================================================
   STATUS BIBLIOTECA
===================================================== */

function updateLibraryStatus() {

    if (
        !projectLibraryStatus
    ) {
        return;
    }

    const total =
        allProjects.length;

    const visible =
        filteredProjects.length;

    if (
        total === 0
    ) {

        projectLibraryStatus.textContent =
            'No hay proyectos guardados en Supabase.';

        return;
    }

    if (
        visible ===
        total
    ) {

        projectLibraryStatus.textContent =
            total === 1
                ? '1 proyecto guardado.'
                : `${total} proyectos guardados.`;

        return;
    }

    projectLibraryStatus.textContent =
        `${visible} de ${total} proyectos encontrados.`;
}


/* =====================================================
   ACTIVAR PROYECTO
===================================================== */

function activateProject(
    project
) {

    if (
        !project?.slug
    ) {

        setLibraryMessage(
            'Este proyecto no tiene un slug válido.'
        );

        return;
    }

    window.location.href =
        `${window.location.pathname}?project=${encodeURIComponent(project.slug)}`;
}


/* =====================================================
   MENSAJE TEMPORAL
===================================================== */

let libraryMessageTimer =
    null;


function setLibraryMessage(
    message
) {

    if (
        !projectLibraryStatus
    ) {
        return;
    }

    projectLibraryStatus.textContent =
        message;

    clearTimeout(
        libraryMessageTimer
    );

    libraryMessageTimer =
        setTimeout(
            () => {

                updateLibraryStatus();

            },
            2500
        );
}


/* =====================================================
   ENLACE PÚBLICO
===================================================== */

function getPublicProjectUrl(
    project
) {

    if (
        !project
    ) {
        return '';
    }

    const slug =
        String(
            project.slug || ''
        ).trim();

    if (!slug) {
        return '';
    }

    const url =
        new URL(
            '../index.html',
            window.location.href
        );

    url.searchParams.set(
        'project',
        slug
    );

    return url.href;
}


/* =====================================================
   ABRIR PROYECTO PÚBLICO
===================================================== */

function openPublicProject(
    project
) {

    const url =
        getPublicProjectUrl(
            project
        );

    if (!url) {

        setLibraryMessage(
            'Este proyecto todavía no tiene un slug válido.'
        );

        return;
    }

    window.open(
        url,
        '_blank'
    );
}


/* =====================================================
   COPIAR ENLACE
===================================================== */

async function copyPublicProjectLink(
    project
) {

    const url =
        getPublicProjectUrl(
            project
        );

    if (!url) {

        setLibraryMessage(
            'Este proyecto todavía no tiene un enlace público válido.'
        );

        return;
    }

    try {

        await navigator.clipboard.writeText(
            url
        );

        setLibraryMessage(
            'Enlace público copiado.'
        );

    } catch (
        error
    ) {

        console.error(
            'ADMIN PROJECTS: error copiando enlace:',
            error
        );

        window.prompt(
            'Copiá este enlace:',
            url
        );
    }
}


/* =====================================================
   REFRESCAR
===================================================== */

async function refreshLibrary() {

    if (
        refreshProjectLibrary
    ) {

        refreshProjectLibrary.disabled =
            true;

        refreshProjectLibrary.textContent =
            'Actualizando...';
    }

    await loadProjectLibrary();

    if (
        refreshProjectLibrary
    ) {

        refreshProjectLibrary.disabled =
            false;

        refreshProjectLibrary.textContent =
            'Actualizar';
    }
}


/* =====================================================
   BUSCADOR
===================================================== */

projectLibrarySearch?.addEventListener(
    'input',
    () => {

        filterProjects(
            projectLibrarySearch.value
        );

        renderProjectLibrary();
    }
);


/* =====================================================
   BOTÓN ACTUALIZAR
===================================================== */

refreshProjectLibrary?.addEventListener(
    'click',
    event => {

        event.preventDefault();

        refreshLibrary();
    }
);


/* =====================================================
   EVENTO DE PROYECTO CAMBIADO
===================================================== */

window.addEventListener(
    'universalStandProjectChanged',
    () => {

        loadProjectLibrary();
    }
);


/* =====================================================
   EVENTO DE MODELO ACTUALIZADO
===================================================== */

window.addEventListener(
    'universalStandModelUpdated',
    () => {

        loadProjectLibrary();
    }
);


/* =====================================================
   EVENTO DE NAVEGACIÓN GUARDADA
===================================================== */

window.addEventListener(
    'universalStandNavigationSaved',
    () => {

        loadProjectLibrary();
    }
);


/* =====================================================
   EVENTO DE NAVEGACIÓN RESTABLECIDA
===================================================== */

window.addEventListener(
    'universalStandNavigationReset',
    () => {

        loadProjectLibrary();
    }
);


/* =====================================================
   VISIBILIDAD DE LA PÁGINA
===================================================== */

document.addEventListener(
    'visibilitychange',
    () => {

        if (
            !document.hidden
        ) {

            loadProjectLibrary();
        }
    }
);


/* =====================================================
   INICIALIZACIÓN
===================================================== */

loadProjectLibrary();


console.log(
    'UNIVERSAL STAND ADMIN - BIBLIOTECA SUPABASE ACTIVA'
);
