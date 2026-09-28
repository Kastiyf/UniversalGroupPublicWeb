import {
    supabase
} from '../supabase-client.js';


const PROJECTS_KEY =
    'universalStandProjects';


const ACTIVE_PROJECT_KEY =
    'universalStandActiveProject';


const URL_PROJECT_PARAM =
    'project';


const viewerContainer =
    document.getElementById(
        'adminViewer'
    );


const projectSelector =
    document.getElementById(
        'projectSelector'
    );


const saveButton =
    document.getElementById(
        'saveNavigationStart'
    );


const applyButton =
    document.getElementById(
        'applyNavigationStart'
    );


const resetButton =
    document.getElementById(
        'resetNavigationStart'
    );


const status =
    document.getElementById(
        'navigationStatus'
    );


let appliedViewer =
    null;


/* =====================================================
   STATUS
===================================================== */

function setStatus(
    text
) {

    if (status) {

        status.textContent =
            text;
    }
}


/* =====================================================
   PROYECTOS
===================================================== */

function getProjects() {

    try {

        const saved =
            localStorage.getItem(
                PROJECTS_KEY
            );


        const projects =
            saved
                ? JSON.parse(
                    saved
                )
                : [];


        return Array.isArray(
            projects
        )
            ? projects
            : [];

    } catch (
        error
    ) {

        console.error(
            'Error leyendo proyectos:',
            error
        );


        return [];
    }
}


/* =====================================================
   PROYECTO ACTIVO
===================================================== */

function getProjectSlugFromUrl() {

    return (
        new URLSearchParams(
            window.location.search
        )
            .get(
                URL_PROJECT_PARAM
            ) ||
        ''
    )
        .trim()
        .toLowerCase();
}


async function getActiveProject() {

    const projects =
        getProjects();


    const requestedSlug =
        getProjectSlugFromUrl();


    /* Supabase es la fuente de verdad cuando el Admin está
       abierto para un proyecto concreto. */
    if (requestedSlug) {

        try {

            const response =
                await supabase
                    .from('projects')
                    .select('*')
                    .eq('slug', requestedSlug)
                    .maybeSingle();


            if (!response.error && response.data) {

                localStorage.setItem(
                    ACTIVE_PROJECT_KEY,
                    response.data.id
                );

                return response.data;
            }

        } catch (error) {

            console.error(
                'No se pudo cargar el proyecto activo desde Supabase:',
                error
            );
        }


        const localBySlug =
            projects.find(
                project =>
                    String(project.slug || '')
                        .toLowerCase() ===
                    requestedSlug
            );


        if (localBySlug) {
            return localBySlug;
        }
    }


    const activeId =
        localStorage.getItem(
            ACTIVE_PROJECT_KEY
        );


    return (
        projects.find(
            project =>
                String(project.id) ===
                String(activeId)
        ) ||
        projects[0] ||
        null
    );
}


/* =====================================================
   GUARDAR PROYECTOS
===================================================== */

function saveProjects(
    projects,
    activeProject
) {

    localStorage.setItem(
        PROJECTS_KEY,
        JSON.stringify(
            projects
        )
    );


    if (
        activeProject?.id
    ) {

        localStorage.setItem(
            ACTIVE_PROJECT_KEY,
            activeProject.id
        );


        localStorage.setItem(
            'universalStand',
            JSON.stringify(
                activeProject
            )
        );
    }
}


/* =====================================================
   VALIDAR COORDENADA
===================================================== */

function isFiniteNumber(
    value
) {

    return Number.isFinite(
        Number(
            value
        )
    );
}


/* =====================================================
   VALIDAR VECTOR
===================================================== */

function isValidVector(
    vector
) {

    return Boolean(

        vector &&

        typeof vector ===
            'object' &&

        isFiniteNumber(
            vector.x
        ) &&

        isFiniteNumber(
            vector.y
        ) &&

        isFiniteNumber(
            vector.z
        )
    );
}


/* =====================================================
   VALIDAR NAVEGACIÓN
===================================================== */

function hasNavigation(
    project
) {

    return Boolean(
        normalizeNavigation(
            project?.navigation
        )
    );
}


/* =====================================================
   NORMALIZAR NAVEGACIÓN
===================================================== */

function normalizeNavigation(
    navigation
) {

    if (typeof navigation === 'string') {
        try {
            navigation = JSON.parse(navigation);
        } catch (error) {
            console.error(
                'No se pudo interpretar navigation:',
                error
            );
            return null;
        }
    }

    if (
        !navigation ||
        !isValidVector(
            navigation.position
        ) ||
        !isValidVector(
            navigation.target
        )
    ) {
        return null;
    }

    return {
        position: {
            x: Number(navigation.position.x),
            y: Number(navigation.position.y),
            z: Number(navigation.position.z)
        },
        target: {
            x: Number(navigation.target.x),
            y: Number(navigation.target.y),
            z: Number(navigation.target.z)
        }
    };
}


/* =====================================================
   ESTADO
===================================================== */

function updateStatus(
    project
) {

    setStatus(

        hasNavigation(
            project
        )

            ? 'Inicio del recorrido guardado para este proyecto.'

            : 'No hay un inicio guardado. Acomodá el visor y guardá la vista que quieras.'
    );
}


/* =====================================================
   OBTENER VISOR
===================================================== */

async function getViewer() {

    if (
        !viewerContainer
    ) {

        return null;
    }


    if (
        viewerContainer
            .__universalStandViewer
    ) {

        return (
            viewerContainer
                .__universalStandViewer
        );
    }


    return new Promise(
        resolve => {

            let attempts =
                0;


            const timer =
                setInterval(
                    () => {

                        const viewer =
                            viewerContainer
                                .__universalStandViewer ||
                            null;


                        attempts++;


                        if (
                            viewer ||
                            attempts >= 100
                        ) {

                            clearInterval(
                                timer
                            );


                            resolve(
                                viewer
                            );
                        }

                    },
                    100
                );
        }
    );
}


/* =====================================================
   APLICAR NAVEGACIÓN
===================================================== */

async function applyProjectNavigation(
    force = false
) {

    const viewer =
        await getViewer();


    if (
        !viewer
    ) {

        return;
    }


    if (
        !force &&
        viewer ===
            appliedViewer
    ) {

        return;
    }


    try {

        await viewer.modelPromise;

    } catch (
        error
    ) {

        console.error(
            'No se pudo esperar al modelo 3D:',
            error
        );


        return;
    }


    const project =
        await getActiveProject();


    if (
        !project
    ) {

        return;
    }


    const navigation =
        normalizeNavigation(
            project.navigation
        );


    if (
        navigation
    ) {

        try {

            viewer.setCameraState(
                navigation,
                false
            );

        } catch (
            error
        ) {

            console.error(
                'Error aplicando la navegación guardada:',
                error
            );


            viewer.fitCamera(
                1.20
            );
        }

    } else {

        viewer.fitCamera(
            1.20
        );
    }


    appliedViewer = viewer;

    updateStatus(
        project
    );
}


/* =====================================================
   GUARDAR NAVEGACIÓN
===================================================== */

async function updateNavigationOnline(project, navigation) {

    const payload = {
        navigation: navigation,
        updated_at: new Date().toISOString()
    };

    const candidates = [];

    if (project?.slug) {
        candidates.push({ field: 'slug', value: project.slug });
    }

    if (project?.id) {
        candidates.push({ field: 'id', value: project.id });
    }

    if (!candidates.length) {
        throw new Error(
            'El proyecto no tiene slug ni id para guardarlo en Supabase.'
        );
    }

    let lastError = null;

    for (const candidate of candidates) {
        try {
            const updateResponse = await supabase
                .from('projects')
                .update(payload)
                .eq(candidate.field, candidate.value);

            if (updateResponse.error) {
                lastError = updateResponse.error;
                continue;
            }

            /*
             * El UPDATE no depende de .select().
             * Esto evita que una política SELECT de Supabase haga
             * parecer que el UPDATE falló aunque se haya ejecutado.
             */
            const verifyResponse = await supabase
                .from('projects')
                .select('id, slug, navigation')
                .eq(candidate.field, candidate.value)
                .maybeSingle();

            if (verifyResponse.error) {
                console.warn(
                    'La vista se actualizó, pero no se pudo verificar la lectura:',
                    verifyResponse.error
                );
                return project;
            }

            if (!verifyResponse.data) {
                throw new Error(
                    'Supabase no devolvió el proyecto después de guardar la vista.'
                );
            }

            const savedNavigation =
                normalizeNavigation(verifyResponse.data.navigation);

            if (navigation !== null && !savedNavigation) {
                throw new Error(
                    'Supabase respondió, pero la navegación guardada no pudo verificarse.'
                );
            }

            if (navigation === null && verifyResponse.data.navigation !== null) {
                throw new Error(
                    'Supabase respondió, pero no se pudo confirmar la eliminación de la vista.'
                );
            }

            return verifyResponse.data;

        } catch (error) {
            lastError = error;
        }
    }

    throw (
        lastError ||
        new Error('No se encontró el proyecto en Supabase.')
    );
}


async function saveNavigation() {

    const viewer = await getViewer();

    if (!viewer) {
        setStatus('Esperá a que cargue el modelo 3D.');
        return;
    }

    try {
        await viewer.modelPromise;
    } catch (error) {
        setStatus('No se pudo cargar el modelo 3D.');
        return;
    }

    const projects = getProjects();

    const project =
        await getActiveProject();

    if (!project) {
        setStatus('No existe un proyecto activo.');
        return;
    }

    const view = viewer.getCameraState();

    if (!view || !view.position || !view.target) {
        setStatus(
            'No se pudo obtener la posición actual de la cámara.'
        );
        return;
    }

    project.navigation = {
        position: {
            x: Number(view.position.x),
            y: Number(view.position.y),
            z: Number(view.position.z)
        },
        target: {
            x: Number(view.target.x),
            y: Number(view.target.y),
            z: Number(view.target.z)
        }
    };

    project.updatedAt = new Date().toISOString();

    const localIndex =
        projects.findIndex(
            item => String(item.id) === String(project.id)
        );

    if (localIndex >= 0) {
        projects[localIndex] = {
            ...projects[localIndex],
            ...project
        };
    } else {
        projects.push(project);
    }

    saveProjects(projects, project);
    setStatus('Guardando vista inicial...');

    try {
        await updateNavigationOnline(project, project.navigation);
        appliedViewer = viewer;
        setStatus(
            'Vista inicial guardada correctamente en Supabase.'
        );

        window.dispatchEvent(
            new CustomEvent(
                'universalStandNavigationSaved',
                {
                    detail: {
                        project: project,
                        navigation: project.navigation
                    }
                }
            )
        );
    } catch (error) {
        console.error(
            'Error guardando navegación en Supabase:',
            error
        );
        setStatus(
            `No se pudo guardar en Supabase: ${
                error?.message || error
            }`
        );
    }
}


/* =====================================================
   APLICAR VISTA GUARDADA
===================================================== */

async function applySavedNavigation() {

    appliedViewer = null;
    setStatus('Aplicando vista inicial guardada...');
    await applyProjectNavigation(true);

    const project = await getActiveProject();

    if (project && hasNavigation(project)) {
        setStatus(
            'Vista inicial guardada aplicada al visor.'
        );
    } else {
        setStatus(
            'Este proyecto todavía no tiene una vista inicial guardada.'
        );
    }
}


/* =====================================================
   RESTABLECER NAVEGACIÓN
===================================================== */

async function resetNavigation() {

    const projects = getProjects();

    const project =
        await getActiveProject();

    if (!project) {
        setStatus('No existe un proyecto activo.');
        return;
    }

    project.navigation = null;
    project.updatedAt = new Date().toISOString();
    saveProjects(projects, project);
    setStatus('Eliminando vista inicial...');

    let online = false;

    try {
        await updateNavigationOnline(project, null);
        online = true;
    } catch (error) {
        console.error(
            'Error eliminando navegación en Supabase:',
            error
        );
    }

    appliedViewer = null;

    const viewer = await getViewer();

    if (viewer) {
        try {
            await viewer.modelPromise;
            viewer.fitCamera(1.20);
        } catch (error) {
            console.error(
                'No se pudo restablecer la cámara:',
                error
            );
        }
    }

    updateStatus(project);

    setStatus(
        online
            ? 'Vista inicial eliminada. Se usa nuevamente la vista automática.'
            : 'Vista eliminada localmente, pero no se pudo actualizar Supabase.'
    );

    window.dispatchEvent(
        new CustomEvent(
            'universalStandNavigationReset',
            {
                detail: {
                    project: project
                }
            }
        )
    );
}


/* =====================================================
   BOTÓN GUARDAR
===================================================== */

saveButton?.addEventListener(
    'click',
    event => {

        event.preventDefault();


        saveNavigation();
    }
);


/* =====================================================
   BOTÓN APLICAR VISTA GUARDADA
===================================================== */

applyButton?.addEventListener(
    'click',
    event => {
        event.preventDefault();
        applySavedNavigation();
    }
);


/* =====================================================
   BOTÓN RESTABLECER
===================================================== */

resetButton?.addEventListener(
    'click',
    event => {

        event.preventDefault();


        resetNavigation();
    }
);


/* =====================================================
   CAMBIO DE PROYECTO
===================================================== */

projectSelector?.addEventListener(
    'change',
    () => {

        appliedViewer =
            null;


        setTimeout(
            () => {

                applyProjectNavigation(
                    true
                );

            },
            150
        );
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
                ACTIVE_PROJECT_KEY
        ) {

            appliedViewer =
                null;


            applyProjectNavigation(
                true
            );
        }
    }
);


/* =====================================================
   EVENTO DEL VISOR
===================================================== */

window.addEventListener(
    'universalStand:viewer-ready',
    () => {

        appliedViewer =
            null;


        applyProjectNavigation(
            true
        );
    }
);


/* =====================================================
   MODELO ACTUALIZADO
===================================================== */

window.addEventListener(
    'universalStandModelUpdated',
    () => {

        appliedViewer =
            null;


        setTimeout(
            () => {

                applyProjectNavigation(
                    true
                );

            },
            150
        );
    }
);


/* =====================================================
   INICIALIZAR
===================================================== */

applyProjectNavigation(
    true
);