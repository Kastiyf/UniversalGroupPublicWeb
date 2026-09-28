/* =====================================================
   UNIVERSAL STAND
   ADMIN PROJECTS
   Biblioteca de proyectos
===================================================== */

import {
    supabase
} from '../supabase-client.js';


const PROJECTS_KEY =
    'universalStandProjects';

const ACTIVE_PROJECT_KEY =
    'universalStandActiveProject';

const LEGACY_KEY =
    'universalStand';


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
   UTILIDADES
===================================================== */

function getProjects() {

    try {

        const saved =
            localStorage.getItem(
                PROJECTS_KEY
            );


        if (!saved) {

            return [];
        }


        const parsed =
            JSON.parse(
                saved
            );


        if (
            !Array.isArray(
                parsed
            )
        ) {

            return [];
        }


        return parsed;

    } catch (
        error
    ) {

        console.error(
            'ADMIN PROJECTS: error leyendo proyectos:',
            error
        );


        return [];
    }
}


/* =====================================================
   PROYECTO ACTIVO
===================================================== */

function getActiveProjectId() {

    return localStorage.getItem(
        ACTIVE_PROJECT_KEY
    );
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

    let onlineProjects = [];

    try {

        const response =
            await supabase
                .from('projects')
                .select('*');

        if (!response.error && Array.isArray(response.data)) {
            onlineProjects = response.data;
        }

    } catch (error) {

        console.error(
            'ADMIN PROJECTS: no se pudo cargar Supabase:',
            error
        );
    }


    const localProjects =
        getProjects();

    /*
     * Supabase es la fuente principal, pero no descartamos
     * proyectos locales que todavía no hayan llegado a Supabase.
     * Se mezclan por ID para que crear un proyecto no lo haga
     * desaparecer de la biblioteca.
     */
    const mergedProjects =
        new Map();

    localProjects.forEach(
        project => {
            if (project?.id) {
                mergedProjects.set(
                    String(project.id),
                    project
                );
            }
        }
    );

    onlineProjects.forEach(
        project => {
            if (!project?.id) {
                return;
            }

            const previous =
                mergedProjects.get(
                    String(project.id)
                ) || {};

            mergedProjects.set(
                String(project.id),
                {
                    ...previous,
                    ...project
                }
            );
        }
    );

    allProjects =
        Array.from(
            mergedProjects.values()
        );

    localStorage.setItem(
        PROJECTS_KEY,
        JSON.stringify(allProjects)
    );


    filteredProjects =
        [...allProjects];


    renderProjectLibrary();
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
            'No hay proyectos guardados.'
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
                    project.id ===
                        activeId
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
                    ${Number(
                        project.ancho || 0
                    )} × ${Number(
                        project.profundidad || 0
                    )} × ${Number(
                        project.altura || 0
                    )} m
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
                        project.updatedAt ||
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
                project.id
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
                project.id
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
            'No hay proyectos guardados.';

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
    projectId
) {

    if (!projectId) {

        return;
    }


    const projects =
        getProjects();


    const project =
        projects.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    projectId
                )
        );


    if (!project) {

        setLibraryMessage(
            'No se encontró el proyecto seleccionado.'
        );

        return;
    }


    localStorage.setItem(
        ACTIVE_PROJECT_KEY,
        project.id
    );


    localStorage.setItem(
        LEGACY_KEY,
        JSON.stringify(
            project
        )
    );


    /*
     * Avisamos al resto del administrador.
     * admin.js y admin-navigation.js pueden
     * reaccionar sin duplicar la lógica.
     */

    window.dispatchEvent(
        new CustomEvent(
            'universalStandProjectChanged',
            {
                detail: {
                    project
                }
            }
        )
    );


    /*
     * El selector principal del admin
     * también debe cambiar.
     */

    const selector =
        document.getElementById(
            'projectSelector'
        );


    if (
        selector
    ) {

        selector.value =
            project.id;


        selector.dispatchEvent(
            new Event(
                'change',
                {
                    bubbles:
                        true
                }
            )
        );
    }


    /*
     * Si el selector anterior no existe,
     * recargamos para mantener el estado.
     */

    if (
        !selector
    ) {

        window.location.reload();

        return;
    }


    allProjects =
        getProjects();


    filteredProjects =
        [...allProjects];


    renderProjectLibrary();


    setLibraryMessage(
        `Proyecto activo: ${
            project.proyecto ||
            'Sin nombre'
        }`
    );
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

function refreshLibrary() {

    if (
        refreshProjectLibrary
    ) {

        refreshProjectLibrary.disabled =
            true;

        refreshProjectLibrary.textContent =
            'Actualizando...';
    }


    /*
     * Volvemos a leer directamente
     * desde localStorage.
     */

    setTimeout(
        () => {

            loadProjectLibrary();


            if (
                refreshProjectLibrary
            ) {

                refreshProjectLibrary.disabled =
                    false;

                refreshProjectLibrary.textContent =
                    'Actualizar';
            }

        },
        50
    );
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
   CAMBIOS DE LOCALSTORAGE
===================================================== */

window.addEventListener(
    'storage',
    event => {

        if (
            event.key ===
                PROJECTS_KEY ||

            event.key ===
                ACTIVE_PROJECT_KEY ||

            event.key ===
                LEGACY_KEY
        ) {

            loadProjectLibrary();
        }
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
    'UNIVERSAL STAND ADMIN - BIBLIOTECA DE PROYECTOS ACTIVA'
);