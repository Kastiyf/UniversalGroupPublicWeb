import {
    supabase
} from '../supabase-client.js';


const API_BASE =
    window.SKP_CONVERTER_API ||
    'https://universal-stand-converter.onrender.com';

const PROJECTS_KEY =
    'universalStandProjects';

const ACTIVE_PROJECT_KEY =
    'universalStandActiveProject';

const LEGACY_KEY =
    'universalStand';

const fileInput =
    document.getElementById(
        'skpFile'
    );

const uploadButton =
    document.getElementById(
        'uploadSkp'
    );

const statusElement =
    document.getElementById(
        'skpUploadStatus'
    );


function setUploadStatus(
    message
) {

    if (statusElement) {

        statusElement.textContent =
            message;
    }
}


function getProjects() {

    try {

        const stored =
            localStorage.getItem(
                PROJECTS_KEY
            );

        if (!stored) {
            return [];
        }

        const projects =
            JSON.parse(stored);

        return Array.isArray(projects)
            ? projects
            : [];

    } catch (error) {

        console.error(
            'No se pudieron leer los proyectos:',
            error
        );

        return [];
    }
}


function getProjectSlugFromUrl() {

    return (
        new URLSearchParams(
            window.location.search
        )
            .get(
                'project'
            ) ||
        ''
    )
        .trim()
        .toLowerCase();
}


async function getActiveProject() {

    const projects =
        getProjects();

    /*
     * Si el Admin está abierto con ?project=slug,
     * ese proyecto es la fuente de verdad.
     *
     * Esto evita depender de localStorage para saber
     * qué proyecto está activo. El proyecto ya está
     * indicado explícitamente en la URL.
     */
    const requestedSlug =
        getProjectSlugFromUrl();

    if (requestedSlug) {

        try {

            const response =
                await supabase
                    .from('projects')
                    .select('*')
                    .ilike(
                        'slug',
                        requestedSlug
                    )
                    .maybeSingle();

            if (
                !response.error &&
                response.data
            ) {

                const onlineProject =
                    response.data;

                const index =
                    projects.findIndex(
                        item =>
                            String(item.id) ===
                            String(onlineProject.id)
                    );

                if (index >= 0) {

                    projects[index] = {
                        ...projects[index],
                        ...onlineProject
                    };

                } else {

                    projects.push(
                        onlineProject
                    );
                }

                saveProjects(
                    projects,
                    onlineProject
                );

                return {
                    projects,
                    project:
                        onlineProject
                };
            }

        } catch (error) {

            console.error(
                'SKP: no se pudo cargar el proyecto de la URL desde Supabase:',
                error
            );
        }

        /*
         * Si Supabase no responde, intentamos usar
         * el proyecto local que coincida con el slug.
         */
        const localBySlug =
            projects.find(
                item =>
                    String(
                        item?.slug || ''
                    )
                        .trim()
                        .toLowerCase() ===
                    requestedSlug
            );

        if (localBySlug) {

            saveProjects(
                projects,
                localBySlug
            );

            return {
                projects,
                project:
                    localBySlug
            };
        }
    }

    /*
     * Compatibilidad con el sistema anterior:
     * si no hay ?project=..., usamos el proyecto
     * guardado como activo en localStorage.
     */
    const activeId =
        localStorage.getItem(
            ACTIVE_PROJECT_KEY
        );

    if (activeId) {

        try {

            const response =
                await supabase
                    .from('projects')
                    .select('*')
                    .eq(
                        'id',
                        activeId
                    )
                    .maybeSingle();

            if (
                !response.error &&
                response.data
            ) {

                const onlineProject =
                    response.data;

                const index =
                    projects.findIndex(
                        item =>
                            String(item.id) ===
                            String(onlineProject.id)
                    );

                if (index >= 0) {

                    projects[index] = {
                        ...projects[index],
                        ...onlineProject
                    };

                } else {

                    projects.push(
                        onlineProject
                    );
                }

                saveProjects(
                    projects,
                    onlineProject
                );

                return {
                    projects,
                    project:
                        onlineProject
                };
            }

        } catch (error) {

            console.error(
                'SKP: no se pudo cargar el proyecto activo desde Supabase:',
                error
            );
        }
    }

    if (!projects.length) {
        return null;
    }

    const project =
        projects.find(
            item =>
                item &&
                String(item.id) ===
                String(activeId)
        ) ||
        projects[0];

    if (!project) {
        return null;
    }

    saveProjects(
        projects,
        project
    );

    return {
        projects,
        project
    };
}


function saveProjects(
    projects,
    project
) {

    localStorage.setItem(
        PROJECTS_KEY,
        JSON.stringify(
            projects
        )
    );

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
}


function isValidSkp(
    file
) {

    if (!file) {
        return false;
    }

    return (
        file.name &&
        file.name
            .toLowerCase()
            .endsWith('.skp')
    );
}


function getModelName(
    result,
    file
) {

    if (
        result &&
        typeof result.modelName ===
            'string' &&
        result.modelName.trim()
    ) {

        return result.modelName;
    }

    return file.name.replace(
        /\.skp$/i,
        '.glb'
    );
}


function dispatchProjectUpdate(
    project
) {

    window.dispatchEvent(
        new CustomEvent(
            'universalStandModelUpdated',
            {
                detail: {
                    projectId:
                        project.id,
                    project,
                    modelUrl:
                        project.modelo,
                    skpUrl:
                        project.skp,
                    modelName:
                        project.modelName
                }
            }
        )
    );

    window.dispatchEvent(
        new CustomEvent(
            'universalStandProjectChanged',
            {
                detail: {
                    projectId:
                        project.id,
                    project
                }
            }
        )
    );
}


fileInput?.addEventListener(
    'change',
    () => {

        const file =
            fileInput.files?.[0];

        if (!file) {

            setUploadStatus(
                'Ningún archivo seleccionado.'
            );

            return;
        }

        if (!isValidSkp(file)) {

            setUploadStatus(
                'Seleccioná un archivo .SKP válido.'
            );

            fileInput.value = '';

            return;
        }

        const sizeMb =
            file.size /
            (1024 * 1024);

        setUploadStatus(
            `Archivo seleccionado: ${file.name} (${sizeMb.toFixed(1)} MB).`
        );
    }
);


uploadButton?.addEventListener(
    'click',
    async () => {

        const file =
            fileInput?.files?.[0];

        if (!isValidSkp(file)) {

            setUploadStatus(
                'Seleccioná primero un archivo .SKP.'
            );

            return;
        }

        const active =
            await getActiveProject();

        if (!active) {

            setUploadStatus(
                'No existe un proyecto activo.'
            );

            return;
        }

        const {
            projects,
            project
        } = active;

        const projectIndex =
            projects.findIndex(
                item =>
                    item &&
                    String(item.id) ===
                        String(project.id)
            );

        if (projectIndex === -1) {

            setUploadStatus(
                'No se encontró el proyecto activo.'
            );

            return;
        }

        const formData =
            new FormData();

        formData.append(
            'file',
            file,
            file.name
        );

        formData.append(
            'project_id',
            project.id
        );

        formData.append(
            'project_slug',
            project.slug || ''
        );

        uploadButton.disabled =
            true;

        if (fileInput) {
            fileInput.disabled =
                true;
        }

        try {

            setUploadStatus(
                'Subiendo el SKP al servidor...'
            );

            const response =
                await fetch(
                    `${API_BASE}/api/convert-skp`,
                    {
                        method:
                            'POST',

                        body:
                            formData
                    }
                );

            const contentType =
                response.headers.get(
                    'content-type'
                ) || '';

            let result = {};

            if (
                contentType.includes(
                    'application/json'
                )
            ) {

                result =
                    await response.json();

            } else {

                const text =
                    await response.text();

                result = {
                    detail:
                        text ||
                        'El servidor devolvió una respuesta inválida.'
                };
            }

            if (!response.ok) {

                throw new Error(
                    result.detail ||
                    result.message ||
                    'El servidor no pudo convertir el archivo.'
                );
            }

            if (result.jobId) {

                let job = null;
                let attempts = 0;

                do {
                    await new Promise(resolve => setTimeout(resolve, 800));

                    const statusResponse =
                        await fetch(
                            `${API_BASE}/api/convert-skp/status/${encodeURIComponent(result.jobId)}`
                        );

                    const statusType =
                        statusResponse.headers.get('content-type') || '';

                    job = statusType.includes('application/json')
                        ? await statusResponse.json()
                        : null;

                    if (!statusResponse.ok || !job) {
                        throw new Error(
                            job?.detail ||
                            'No se pudo consultar el estado de la conversión.'
                        );
                    }

                    const progress =
                        Number.isFinite(Number(job.progress))
                            ? Number(job.progress)
                            : 0;

                    setUploadStatus(
                        `${job.message || 'Procesando SKP...'} ${progress}%`
                    );

                    attempts += 1;

                    if (attempts > 900) {
                        throw new Error('La conversión tardó demasiado y fue detenida.');
                    }

                } while (job.status !== 'completed' && job.status !== 'error');

                if (job.status === 'error') {
                    throw new Error(
                        job.error ||
                        job.message ||
                        'La conversión terminó con error.'
                    );
                }

                if (job.result) {
                    result = {
                        ...result,
                        ...job.result
                    };
                }

                if (!result.modelUrl && job.modelUrl) {
                    result.modelUrl = job.modelUrl;
                }
            }

            if (
                !result.modelUrl ||
                typeof result.modelUrl !==
                    'string'
            ) {

                throw new Error(
                    'El servidor terminó la conversión pero no devolvió el GLB.'
                );
            }

            setUploadStatus(
                'Conversión terminada. Guardando el modelo...'
            );

            /*
             * Solo actualizamos los datos del modelo.
             *
             * navigation, hotspots, dimensiones,
             * descripción y demás datos del proyecto
             * se conservan exactamente como estaban.
             */

            project.modelo =
                result.modelUrl;

            if (
                typeof result.skpUrl ===
                    'string' &&
                result.skpUrl.trim()
            ) {

                project.skp =
                    result.skpUrl;

            } else if (
                typeof project.skp !==
                    'string'
            ) {

                project.skp = '';
            }

            project.modelName =
                getModelName(
                    result,
                    file
                );

            project.updatedAt =
                new Date().toISOString();

            projects[projectIndex] =
                project;

            saveProjects(
                projects,
                project
            );

            setUploadStatus(
                'Modelo GLB guardado. Actualizando el visor...'
            );

            dispatchProjectUpdate(
                project
            );

            /*
             * Le damos tiempo al resto de módulos
             * para recibir el evento antes de recargar.
             */
            setTimeout(
                () => {
                    window.location.reload();
                },
                150
            );

        } catch (error) {

            console.error(
                'ERROR SKP → GLB:',
                error
            );

            setUploadStatus(
                `No se pudo convertir el SKP: ${
                    error?.message ||
                    'Error desconocido.'
                }`
            );

        } finally {

            uploadButton.disabled =
                false;

            if (fileInput) {
                fileInput.disabled =
                    false;
            }
        }
    }
);