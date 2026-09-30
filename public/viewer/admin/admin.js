import {
    createViewer
} from '../viewer-engine.js';

import {
    createMeasurementTool
} from '../measurement-tool.js';

import {
    supabase
} from '../supabase-client.js';




/* =====================================================
   DATOS POR PROYECTO
===================================================== */

function getDefaultData() {

    return {

        id:
            'cooprolanda-expo-2026',

        cliente:
            'Cooprolanda',

        proyecto:
            'Expo 2026',

        ancho:
            7,

        profundidad:
            5,

        altura:
            3.5,

        superficie:
            35,

        descripcion:
            'Visualización interactiva del proyecto.',

        slug:
            'cooprolanda-expo-2026',

        modelo:
            'models/stand.glb',

        hotspots:
            [],

        navigation:
            null
    };
}


/* =====================================================
   SLUG DE LA URL
===================================================== */

function getProjectSlugFromUrl() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    return (
        params.get(
            'project'
        ) ||
        ''
    )
        .trim()
        .toLowerCase();
}


/* =====================================================
   CARGAR PROYECTO
===================================================== */

async function getStandData() {

    const requestedSlug =
        getProjectSlugFromUrl();

    try {

        let query =
            supabase
                .from('projects')
                .select('*');

        if (requestedSlug) {

            query =
                query.eq(
                    'slug',
                    requestedSlug
                );
        } else {

            query =
                query
                    .order(
                        'created_at',
                        {
                            ascending: false
                        }
                    )
                    .limit(1);
        }

        const {
            data,
            error
        } =
            await query.maybeSingle();

        if (error) {
            throw error;
        }

        if (data) {

            console.log(
                '[UniversalStand] Proyecto cargado desde Supabase:',
                data.slug
            );

            return {

                ...getDefaultData(),

                ...data,

                hotspots:
                    Array.isArray(data.hotspots)
                        ? data.hotspots
                        : [],

                navigation:
                    data.navigation || null
            };
        }

        console.warn(
            '[UniversalStand] No se encontró el proyecto en Supabase:',
            requestedSlug
        );

    } catch (error) {

        console.error(
            'Error cargando proyecto desde Supabase:',
            error
        );
    }

    return getDefaultData();
}

/* =====================================================
   DATOS ACTUALES
===================================================== */

const standData =
    await getStandData();


/* =====================================================
   DOM
===================================================== */

const viewerContainer =
    document.getElementById(
        'adminViewer'
    );


/* =====================================================
   FORMULARIO Y GESTOR DE PROYECTOS
===================================================== */

function initFormAndProjects() {
    const clientInput = document.getElementById('client');
    const projectInput = document.getElementById('project');
    const widthInput = document.getElementById('width');
    const depthInput = document.getElementById('depth');
    const heightInput = document.getElementById('height');
    const surfaceInput = document.getElementById('surface');
    const descriptionInput = document.getElementById('description');
    const slugInput = document.getElementById('slug');

    const saveStandBtn = document.getElementById('saveStand');
    const resetStandBtn = document.getElementById('resetStand');

    const projectSelector = document.getElementById('projectSelector');
    const newProjectBtn = document.getElementById('newProject');
    const deleteProjectBtn = document.getElementById('deleteProject');
    const projectPublicLink = document.getElementById('projectPublicLink');
    const copyProjectLinkBtn = document.getElementById('copyProjectLink');
    const projectStatus = document.getElementById('projectStatus');

    function updatePublicLink() {
        const slug = standData.slug || standData.id;
        const relativeUrl = `../index.html?project=${encodeURIComponent(slug)}`;
        if (projectPublicLink) {
            projectPublicLink.textContent = relativeUrl;
            projectPublicLink.title = relativeUrl;
        }
    }

    function populateForm() {
        if (clientInput) clientInput.value = standData.cliente || '';
        if (projectInput) projectInput.value = standData.proyecto || '';
        if (widthInput) widthInput.value = standData.ancho ?? 7;
        if (depthInput) depthInput.value = standData.profundidad ?? 5;
        if (heightInput) heightInput.value = standData.altura ?? 3.5;
        if (surfaceInput) {
            const surface = Number(standData.superficie) || (Number(standData.ancho || 0) * Number(standData.profundidad || 0));
            surfaceInput.value = surface.toFixed(2);
        }
        if (descriptionInput) descriptionInput.value = standData.descripcion || '';
        if (slugInput) slugInput.value = standData.slug || '';
        updatePublicLink();
    }

    function calculateSurface() {
        const w = parseFloat(widthInput?.value) || 0;
        const d = parseFloat(depthInput?.value) || 0;
        if (surfaceInput) {
            surfaceInput.value = (w * d).toFixed(2);
        }
    }

    widthInput?.addEventListener('input', calculateSurface);
    depthInput?.addEventListener('input', calculateSurface);

    async function updateProjectSelector() {

        if (!projectSelector) {
            return;
        }

        try {

            const {
                data,
                error
            } =
                await supabase
                    .from('projects')
                    .select('id, cliente, proyecto, slug')
                    .order(
                        'created_at',
                        {
                            ascending: false
                        }
                    );

            if (error) {
                throw error;
            }

            const projects =
                Array.isArray(data)
                    ? data
                    : [];

            projectSelector.innerHTML = '';

            projects.forEach(
                project => {

                    const option =
                        document.createElement(
                            'option'
                        );

                    option.value =
                        project.id;

                    const label =
                        project.cliente
                            ? `${project.cliente} - ${project.proyecto || 'Stand'}`
                            : (
                                project.proyecto ||
                                project.slug ||
                                project.id
                            );

                    option.textContent =
                        label;

                    if (
                        project.id ===
                        standData.id
                    ) {
                        option.selected =
                            true;
                    }

                    projectSelector.appendChild(
                        option
                    );
                }
            );

        } catch (error) {

            console.error(
                'Error cargando proyectos desde Supabase:',
                error
            );
        }
    }

    projectSelector?.addEventListener(
        'change',
        async () => {

            const targetId =
                projectSelector.value;

            if (
                !targetId ||
                targetId === standData.id
            ) {
                return;
            }

            try {

                const {
                    data,
                    error
                } =
                    await supabase
                        .from('projects')
                        .select('slug')
                        .eq(
                            'id',
                            targetId
                        )
                        .maybeSingle();

                if (error) {
                    throw error;
                }

                if (!data?.slug) {
                    return;
                }

                window.location.href =
                    `${window.location.pathname}?project=${encodeURIComponent(data.slug)}`;

            } catch (error) {

                console.error(
                    'Error cambiando de proyecto:',
                    error
                );
            }
        }
    );

    copyProjectLinkBtn?.addEventListener('click', async () => {
        const slug = standData.slug || standData.id;
        const fullUrl = new URL(`../index.html?project=${encodeURIComponent(slug)}`, window.location.href).href;
        try {
            await navigator.clipboard.writeText(fullUrl);
            const originalText = copyProjectLinkBtn.textContent;
            copyProjectLinkBtn.textContent = '¡Copiado!';
            setTimeout(() => { copyProjectLinkBtn.textContent = originalText; }, 2000);
        } catch (err) {
            console.error('Error al copiar enlace:', err);
        }
    });

    saveStandBtn?.addEventListener(
        'click',
        async () => {

            standData.cliente =
                clientInput?.value.trim() || '';

            standData.proyecto =
                projectInput?.value.trim() || '';

            standData.ancho =
                parseFloat(widthInput?.value) || 0;

            standData.profundidad =
                parseFloat(depthInput?.value) || 0;

            standData.altura =
                parseFloat(heightInput?.value) || 0;

            standData.superficie =
                parseFloat(surfaceInput?.value) ||
                (
                    standData.ancho *
                    standData.profundidad
                );

            standData.descripcion =
                descriptionInput?.value.trim() || '';

            standData.slug =
                slugInput?.value.trim() ||
                standData.slug;

            if (projectStatus) {
                projectStatus.textContent =
                    'Guardando en Supabase...';
            }

            const saved =
                await saveProjectOnline();

            if (saved) {

                updatePublicLink();

                await updateProjectSelector();

                if (projectStatus) {
                    projectStatus.textContent =
                        'Stand guardado correctamente.';
                }

                window.dispatchEvent(
                    new CustomEvent(
                        'universalStandProjectChanged',
                        {
                            detail: {
                                projectId:
                                    standData.id,

                                project:
                                    standData
                            }
                        }
                    )
                );

            } else {

                if (projectStatus) {
                    projectStatus.textContent =
                        'No se pudo guardar el stand en Supabase.';
                }
            }
        }
    );

    resetStandBtn?.addEventListener('click', () => {
        populateForm();
        if (projectStatus) {
            projectStatus.textContent = 'Formulario restablecido.';
        }
    });

    newProjectBtn?.addEventListener(
        'click',
        async () => {

            const cliente =
                window.prompt(
                    'Nombre del cliente para el nuevo proyecto:'
                );

            if (
                !cliente ||
                !cliente.trim()
            ) {
                return;
            }

            const proyectoNombre =
                window.prompt(
                    'Nombre del proyecto:',
                    'Expo 2026'
                ) ||
                'Proyecto';

            const token =
                Math.random()
                    .toString(36)
                    .slice(2, 7);

            const slug =
                `${cliente.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${token}`;

            const newProject = {

                cliente:
                    cliente.trim(),

                proyecto:
                    proyectoNombre.trim(),

                ancho:
                    7,

                profundidad:
                    5,

                altura:
                    3.5,

                superficie:
                    35,

                descripcion:
                    'Visualización interactiva del proyecto.',

                slug,

                modelo:
                    '',

                hotspots:
                    [],

                navigation:
                    null
            };

            try {

                const {
                    data,
                    error
                } =
                    await supabase
                        .from('projects')
                        .insert(newProject)
                        .select('*')
                        .single();

                if (error) {
                    throw error;
                }

                window.location.href =
                    `${window.location.pathname}?project=${encodeURIComponent(data.slug)}`;

            } catch (error) {

                console.error(
                    'Error creando proyecto en Supabase:',
                    error
                );

                window.alert(
                    'No se pudo crear el proyecto en Supabase.'
                );
            }
        }
    );

    deleteProjectBtn?.addEventListener(
        'click',
        async () => {

            const confirmDelete =
                window.confirm(
                    `¿Seguro que querés eliminar el proyecto "${standData.cliente || standData.proyecto}"?`
                );

            if (!confirmDelete) {
                return;
            }

            try {

                const {
                    error
                } =
                    await supabase
                        .from('projects')
                        .delete()
                        .eq(
                            'id',
                            standData.id
                        );

                if (error) {
                    throw error;
                }

                const {
                    data: nextProject,
                    error: nextError
                } =
                    await supabase
                        .from('projects')
                        .select('slug')
                        .order(
                            'created_at',
                            {
                                ascending: false
                            }
                        )
                        .limit(1)
                        .maybeSingle();

                if (nextError) {
                    throw nextError;
                }

                if (nextProject?.slug) {

                    window.location.href =
                        `${window.location.pathname}?project=${encodeURIComponent(nextProject.slug)}`;

                } else {

                    window.location.href =
                        window.location.pathname;
                }

            } catch (error) {

                console.error(
                    'Error eliminando proyecto de Supabase:',
                    error
                );

                window.alert(
                    'No se pudo eliminar el proyecto de Supabase.'
                );
            }
        }
    );

    populateForm();
    updateProjectSelector();
}


initFormAndProjects();
setupHotspotEditor();


/* =====================================================
   VISOR
===================================================== */

let viewer =
    null;

let hotspotGroup =
    null;

let selectionHelper =
    null;

let measurementTool =
    null;


/* =====================================================
   INICIALIZAR VISOR
===================================================== */

async function initViewer() {

    if (
        !viewerContainer
    ) {

        console.error(
            'No existe #adminViewer.'
        );

        return;
    }

    const hotspotStatus =
        document.getElementById(
            'hotspotStatus'
        );

    if (
        hotspotStatus
    ) {

        hotspotStatus.textContent =
            'Cargando modelo 3D...';
    }


    try {

        let modelUrl =
            (standData.modelo || '').trim() ||
            'models/stand.glb';

        if (
            modelUrl &&
            !modelUrl.startsWith('http://') &&
            !modelUrl.startsWith('https://') &&
            !modelUrl.startsWith('/') &&
            !modelUrl.startsWith('../')
        ) {

            modelUrl =
                `../${modelUrl}`;
        }

        viewer =
            createViewer({

                container:
                    viewerContainer,

                modelUrl:
                    modelUrl
            });

        viewerContainer.__universalStandViewer =
            viewer;


        hotspotGroup =
            new viewer.THREE.Group();


        hotspotGroup.name =
            'PublicHotspots';


        viewer.scene.add(
            hotspotGroup
        );


        await viewer.modelPromise;

        if (
            hotspotStatus
        ) {

            hotspotStatus.textContent =
                'Modelo cargado correctamente.';
        }


        applySavedStartView();


        measurementTool =
            createMeasurementTool(
                viewer,
                {
                    projectId:
                        standData.id ||
                        standData.slug
                }
            );


        renderHotspots();

        renderHotspotList();

        setupViewerControls();

        setupHotspotClick();

        setupCanvasClick();

        setupViewerHelp();

        setupKeyboard();

        window.dispatchEvent(
            new CustomEvent(
                'universalStand:viewer-ready',
                {
                    detail: {
                        viewer:
                            viewer,

                        project:
                            standData
                    }
                }
            )
        );


        console.log(
            'VISOR ADMIN LISTO'
        );

    } catch (
        error
    ) {

        console.error(
            'ERROR INICIALIZANDO VISOR:',
            error
        );

        if (
            hotspotStatus
        ) {

            hotspotStatus.textContent =
                `No se pudo cargar el modelo 3D (${error?.message || error}). Cargá un archivo SKP para generarlo.`;
        }
    }
}


initViewer();


/* =====================================================
   HOTSPOTS
===================================================== */

function clearHotspots() {

    if (
        !hotspotGroup
    ) {

        return;
    }


    while (
        hotspotGroup.children.length
    ) {

        const child =
            hotspotGroup.children[
                hotspotGroup.children.length - 1
            ];


        hotspotGroup.remove(
            child
        );
    }
}


function clearHotspotVisuals() {

    if (!hotspotGroup) {
        return;
    }

    while (
        hotspotGroup.children.length
    ) {
        const child =
            hotspotGroup.children[
                hotspotGroup.children.length - 1
            ];

        hotspotGroup.remove(
            child
        );

        if (child.geometry) {
            child.geometry.dispose();
        }

        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(
                    material => material.dispose()
                );
            } else {
                child.material.dispose();
            }
        }
    }
}


function createHotspotLeaderLine(
    anchor,
    labelPosition
) {

    const THREE =
        viewer.THREE;

    const geometry =
        new THREE.BufferGeometry().setFromPoints([
            anchor,
            labelPosition
        ]);

    const material =
        new THREE.LineBasicMaterial({
            color: 0x111111,
            transparent: true,
            opacity: 0.72,
            depthTest: false
        });

    const line =
        new THREE.Line(
            geometry,
            material
        );

    line.renderOrder =
        20;

    return line;
}


function getHotspotWorldPosition(
    hotspot
) {

    if (!hotspot || !viewer) {
        return null;
    }

    if (
        hotspot.coordinateSpace === 'world' &&
        hotspot.position
    ) {
        return new viewer.THREE.Vector3(
            Number(hotspot.position.x) || 0,
            Number(hotspot.position.y) || 0,
            Number(hotspot.position.z) || 0
        );
    }

    if (hotspot.position) {
        return viewer.worldPositionFromLocal(
            hotspot.position
        );
    }

    if (hotspot.worldPosition) {
        return new viewer.THREE.Vector3(
            Number(hotspot.worldPosition.x) || 0,
            Number(hotspot.worldPosition.y) || 0,
            Number(hotspot.worldPosition.z) || 0
        );
    }

    return null;
}


function renderHotspots() {

    clearHotspotVisuals();

    renderHotspotList();
}


/* =====================================================
   LISTA HOTSPOTS
===================================================== */

function renderHotspotList() {

    const list =
        document.getElementById(
            'hotspotList'
        );


    if (
        !list
    ) {

        return;
    }


    list.innerHTML =
        '';


    if (
        !standData.hotspots.length
    ) {

        const empty =
            document.createElement(
                'div'
            );


        empty.className =
            'empty-hotspots';


        empty.textContent =
            'Todavía no hay elementos agregados.';


        list.appendChild(
            empty
        );


        return;
    }


    standData.hotspots.forEach(
        hotspot => {

            const item =
                document.createElement(
                    'div'
                );


            item.className =
                'admin-hotspot-item';


            item.innerHTML = `

                <div
                    class="admin-hotspot-number"
                >
                    ${hotspot.number}
                </div>

                <div
                    class="admin-hotspot-info"
                >

                    <strong>
                        ${escapeHtml(
                            hotspot.name ||
                            ''
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(
                            hotspot.shortTitle ||
                            ''
                        )}
                    </small>

                </div>

                <div
                    class="admin-hotspot-actions"
                >

                    <button
                        type="button"
                        data-action="focus"
                        data-id="${hotspot.id}"
                    >
                        Ver
                    </button>

                    <button
                        type="button"
                        data-action="relocate"
                        data-id="${hotspot.id}"
                    >
                        Cambiar parte
                    </button>

                    <button
                        type="button"
                        data-action="delete"
                        data-id="${hotspot.id}"
                    >
                        Eliminar
                    </button>

                </div>
            `;


            list.appendChild(
                item
            );
        }
    );
}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(
    value
) {

    return String(
        value ||
        ''
    )
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        )
        .replace(
            /"/g,
            '&quot;'
        )
        .replace(
            /'/g,
            '&#039;'
        );
}


/* =====================================================
   SELECCIÓN
===================================================== */

function clearSelection() {

    if (
        selectionHelper &&
        viewer
    ) {

        viewer.scene.remove(
            selectionHelper
        );


        selectionHelper =
            null;
    }
}


function selectMesh(
    meshIndex
) {

    clearSelection();


    if (
        !viewer
    ) {

        return;
    }


    const mesh =
        viewer.getMeshByIndex(
            meshIndex
        );


    if (
        !mesh
    ) {

        return;
    }


    selectionHelper =
        new viewer.THREE.BoxHelper(
            mesh,
            0x00aaff
        );


    viewer.scene.add(
        selectionHelper
    );


    selectionHelper.update();
}


/* =====================================================
   OBJETO SELECCIONADO
===================================================== */

let selectedObjectHelper =
    null;

let selectedMeshIndex =
    null;

let hoverObjectHelper =
    null;

let hoveredMesh =
    null;


function clearHoverObject() {

    if (
        hoverObjectHelper &&
        viewer?.scene
    ) {

        viewer.scene.remove(
            hoverObjectHelper
        );

        try {

            hoverObjectHelper.geometry?.dispose?.();
            hoverObjectHelper.material?.dispose?.();

        } catch (error) {

            console.warn(
                'No se pudo liberar el contorno de preselección:',
                error
            );
        }
    }

    hoverObjectHelper =
        null;

    hoveredMesh =
        null;
}


function previewObject(
    mesh
) {

    if (
        !viewer ||
        !mesh ||
        !mesh.geometry
    ) {

        clearHoverObject();
        return;
    }

    if (
        hoveredMesh === mesh &&
        hoverObjectHelper
    ) {

        hoverObjectHelper.matrix.copy(
            mesh.matrixWorld
        );

        return;
    }

    clearHoverObject();

    hoveredMesh =
        mesh;

    try {

        const edgesGeometry =
            new viewer.THREE.EdgesGeometry(
                mesh.geometry,
                18
            );

        const edgeMaterial =
            new viewer.THREE.LineBasicMaterial({
                color: 0x111111,
                transparent: true,
                opacity: 0.95,
                depthTest: false
            });

        hoverObjectHelper =
            new viewer.THREE.LineSegments(
                edgesGeometry,
                edgeMaterial
            );

        hoverObjectHelper.matrixAutoUpdate =
            false;

        hoverObjectHelper.matrix.copy(
            mesh.matrixWorld
        );

        hoverObjectHelper.renderOrder =
            49;

        viewer.scene.add(
            hoverObjectHelper
        );

    } catch (error) {

        hoveredMesh =
            null;

        console.error(
            'No se pudo mostrar el contorno de preselección:',
            error
        );
    }
}


function selectObject(
    mesh
) {

    clearObjectSelection();

    clearHoverObject();

    clearSelection();


    if (
        !viewer ||
        !mesh
    ) {

        return;
    }


    selectedMeshIndex =
        Number.isFinite(
            Number(mesh.userData?.meshIndex)
        )
            ? Number(mesh.userData.meshIndex)
            : null;


    if (
        selectedMeshIndex === null
    ) {

        return;
    }


    /*
     * No usamos una esfera ni un punto flotando sobre el modelo.
     * El objeto real queda resaltado mediante un contorno que copia
     * exactamente su geometría. Esto permite ver qué capa/malla se
     * está seleccionando antes de guardarla como elemento interactivo.
     */
    try {

        const edgesGeometry =
            new viewer.THREE.EdgesGeometry(
                mesh.geometry,
                18
            );

        const edgeMaterial =
            new viewer.THREE.LineBasicMaterial({
                color: 0x111111,
                transparent: true,
                opacity: 0.95,
                depthTest: false
            });

        selectedObjectHelper =
            new viewer.THREE.LineSegments(
                edgesGeometry,
                edgeMaterial
            );

        selectedObjectHelper.matrixAutoUpdate =
            false;

        selectedObjectHelper.matrix.copy(
            mesh.matrixWorld
        );

        selectedObjectHelper.renderOrder =
            50;

        viewer.scene.add(
            selectedObjectHelper
        );

    } catch (error) {

        console.error(
            'No se pudo mostrar el contorno de selección:',
            error
        );
    }


    const status =
        document.getElementById(
            'hotspotStatus'
        );

    if (status) {

        status.textContent =
            `Parte seleccionada: ${mesh.name || `Objeto ${selectedMeshIndex + 1}`}. Ahora esta malla puede ser el elemento interactivo.`;
    }
}


function clearObjectSelection() {

    if (
        selectedObjectHelper &&
        viewer
    ) {

        viewer.scene.remove(
            selectedObjectHelper
        );

        selectedObjectHelper.geometry?.dispose();
        selectedObjectHelper.material?.dispose();

        selectedObjectHelper =
            null;
    }

    selectedMeshIndex =
        null;
}


function selectHotspotMesh(
    hotspot
) {

    if (
        !viewer ||
        !hotspot
    ) {

        return null;
    }

    if (
        !Number.isFinite(
            Number(hotspot.meshIndex)
        )
    ) {

        return null;
    }

    const mesh =
        viewer.getMeshByIndex(
            Number(hotspot.meshIndex)
        );

    if (mesh) {
        selectObject(mesh);
    }

    return mesh || null;
}


/* =====================================================
   ELIMINAR HOTSPOT
===================================================== */

async function deleteHotspot(
    id
) {

    const index =
        standData.hotspots.findIndex(
            item =>
                item.id ===
                id
        );


    if (
        index ===
        -1
    ) {

        return;
    }


    const confirmed =
        window.confirm(
            '¿Eliminar este elemento?'
        );


    if (
        !confirmed
    ) {

        return;
    }


    standData.hotspots.splice(
        index,
        1
    );


    standData.hotspots.forEach(
        (
            item,
            index
        ) => {

            item.number =
                index + 1;
        }
    );


    await saveProjectOnline();


    selectedHotspotId =
        null;


    clearSelection();


    renderHotspots();


    if (
        editingHotspotId === id
    ) {

        closeHotspotEditor();
    }

    setStatus(
        'Elemento eliminado.'
    );
}


/* =====================================================
   ESTADO
===================================================== */

function setStatus(
    message
) {

    const status =
        document.getElementById(
            'hotspotStatus'
        ) ||
        document.getElementById(
            'statusMessage'
        );


    if (
        status
    ) {

        status.textContent =
            message;
    }
}


/* =====================================================
   HOTSPOT ACTUAL
===================================================== */

let selectedHotspotId =
    null;


/* =====================================================
   CREAR HOTSPOT
===================================================== */

async function createHotspotAt(
    position,
    meshIndex
) {

    if (
        !position
    ) {

        return;
    }


    const number =
        standData.hotspots.length +
        1;


    const hotspot = {

        id:
            `hotspot-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,

        number,

        name:
            `Elemento ${number}`,

        shortTitle:
            '',

        description:
            '',

        position: {

            x:
                position.x,

            y:
                position.y,

            z:
                position.z
        },

        coordinateSpace:
            'local',

        worldPosition:
            null,

        meshIndex:
            Number.isFinite(Number(meshIndex))
                ? Number(meshIndex)
                : null
    };


    standData.hotspots.push(
        hotspot
    );


    selectedHotspotId =
        hotspot.id;


    await saveProjectOnline();

    renderHotspots();


    setStatus(
        'Elemento agregado. Podés editarlo abajo.'
    );

    saveProjectOnline();

    openHotspotEditor(
        hotspot
    );
}


/* =====================================================
   EDITOR DE HOTSPOTS
===================================================== */

let editingHotspotId =
    null;


function openHotspotEditor(
    hotspot
) {

    const editor =
        document.getElementById(
            'hotspotEditor'
        );

    const nameInput =
        document.getElementById(
            'hotspotName'
        );

    const shortInput =
        document.getElementById(
            'hotspotShortTitle'
        );

    const descriptionInput =
        document.getElementById(
            'hotspotDescription'
        );

    if (!editor || !hotspot) {
        return;
    }

    editingHotspotId =
        hotspot.id;

    if (nameInput) {
        nameInput.value =
            hotspot.name || '';
    }

    if (shortInput) {
        shortInput.value =
            hotspot.shortTitle || '';
    }

    if (descriptionInput) {
        descriptionInput.value =
            hotspot.description || '';
    }

    editor.hidden =
        false;

    nameInput?.focus();

    setStatus(
        `Editando ${hotspot.name || 'elemento'}.`
    );
}


function closeHotspotEditor() {

    const editor =
        document.getElementById(
            'hotspotEditor'
        );

    if (editor) {
        editor.hidden =
            true;
    }

    editingHotspotId =
        null;
}


async function saveHotspotEditor() {

    if (!editingHotspotId) {
        return;
    }

    const hotspot =
        standData.hotspots.find(
            item =>
                item.id ===
                editingHotspotId
        );

    if (!hotspot) {
        closeHotspotEditor();
        return;
    }

    const nameInput =
        document.getElementById(
            'hotspotName'
        );

    const shortInput =
        document.getElementById(
            'hotspotShortTitle'
        );

    const descriptionInput =
        document.getElementById(
            'hotspotDescription'
        );

    hotspot.name =
        nameInput?.value.trim() ||
        `Elemento ${hotspot.number}`;

    hotspot.shortTitle =
        shortInput?.value.trim() ||
        '';

    hotspot.description =
        descriptionInput?.value.trim() ||
        '';

    renderHotspots();

    closeHotspotEditor();

    setStatus(
        'Elemento guardado correctamente.'
    );

    await saveProjectOnline();
}


function setupHotspotEditor() {

    document.getElementById(
        'saveHotspot'
    )?.addEventListener(
        'click',
        () => {
            saveHotspotEditor();
        }
    );

    document.getElementById(
        'cancelHotspot'
    )?.addEventListener(
        'click',
        () => {
            closeHotspotEditor();
            setStatus(
                'Edición cancelada.'
            );
        }
    );
}


/* =====================================================
   GUARDADO ONLINE DEL PROYECTO
===================================================== */

async function saveProjectOnline() {

    if (!standData?.id && !standData?.slug) {
        return false;
    }

    const payload = {
        cliente:
            standData.cliente || '',
        proyecto:
            standData.proyecto || '',
        ancho:
            Number(standData.ancho) || 0,
        profundidad:
            Number(standData.profundidad) || 0,
        altura:
            Number(standData.altura) || 0,
        superficie:
            Number(standData.superficie) || 0,
        descripcion:
            standData.descripcion || '',
        slug:
            standData.slug || '',
        modelo:
            standData.modelo || '',
        hotspots:
            Array.isArray(standData.hotspots)
                ? standData.hotspots
                : [],
        navigation:
            standData.navigation || null,
        updated_at:
            new Date().toISOString()
    };

    const candidates = [];

    if (standData.slug) {
        candidates.push({
            field: 'slug',
            value: standData.slug
        });
    }

    if (standData.id) {
        candidates.push({
            field: 'id',
            value: standData.id
        });
    }

    for (const candidate of candidates) {
        try {
            const response =
                await supabase
                    .from('projects')
                    .update(payload)
                    .eq(
                        candidate.field,
                        candidate.value
                    )
                    .select('id, slug, hotspots, navigation')
                    .maybeSingle();

            if (!response.error && response.data) {
                standData.id =
                    response.data.id ||
                    standData.id;
                return true;
            }
        } catch (error) {
            console.error(
                'Error guardando proyecto en Supabase:',
                error
            );
        }
    }

    return false;
}


/* =====================================================
   RAYCASTER
===================================================== */

const raycaster =
    new THREE_RAYCASTER_PLACEHOLDER();


/* =====================================================
   UTILIDAD RAYCAST
===================================================== */

function createRaycaster() {

    if (
        !viewer
    ) {

        return null;
    }


    return new viewer.THREE.Raycaster();
}


/* =====================================================
   CLICK SOBRE MODELO
===================================================== */

function setupCanvasClick() {

    if (!viewer || !viewer.renderer) {
        return;
    }

    const canvas =
        viewer.renderer.domElement;

    canvas.addEventListener(
        'pointermove',
        event => {

            if (
                !placingHotspot &&
                !relocatingHotspotId
            ) {

                clearHoverObject();
                return;
            }

            const hit =
                viewer.raycast(event);

            if (
                !hit ||
                !hit.point ||
                !hit.object
            ) {

                clearHoverObject();
                return;
            }

            previewObject(
                hit.object
            );
        }
    );

    canvas.addEventListener(
        'pointerleave',
        () => {

            clearHoverObject();
        }
    );

    canvas.addEventListener(
        'click',
        async event => {

            if (
                !placingHotspot &&
                !relocatingHotspotId
            ) {
                return;
            }

            const hit =
                viewer.raycast(event);

            if (!hit || !hit.point) {
                return;
            }

            if (relocatingHotspotId) {
                await relocateHotspotAt(
                    hit
                );
                return;
            }

            const localPosition =
                viewer.localPositionFromHit?.(
                    hit
                );

            const mesh =
                hit.object;

            const meshIndex =
                mesh?.userData?.meshIndex;

            if (
                !localPosition ||
                !Number.isFinite(Number(meshIndex))
            ) {
                setStatus(
                    'No se pudo identificar la capa seleccionada.'
                );
                return;
            }

            selectObject(mesh);

            createHotspotAt(
                localPosition,
                Number(meshIndex)
            );

            cancelPlacement();
        }
    );
}

/* =====================================================
   COLOCACIÓN
===================================================== */

let placingHotspot =
    false;


let relocatingHotspotId =
    null;


function startRelocateHotspot(
    hotspot
) {

    if (!hotspot || !viewer) {
        return;
    }

    relocatingHotspotId =
        hotspot.id;

    placingHotspot =
        false;

    viewerContainer?.classList.add(
        'placing-hotspot'
    );

    setStatus(
        `Seleccionando la parte de ${hotspot.name || 'elemento'}. Hacé clic directamente sobre la capa del modelo que querés vincular.`
    );
}


function cancelRelocateHotspot() {

    relocatingHotspotId =
        null;

    clearHoverObject();

    viewerContainer?.classList.remove(
        'placing-hotspot'
    );
}


async function relocateHotspotAt(
    hit
) {

    if (
        !relocatingHotspotId ||
        !hit ||
        !viewer
    ) {
        return;
    }

    const hotspot =
        standData.hotspots.find(
            item =>
                item.id ===
                relocatingHotspotId
        );

    if (!hotspot) {
        cancelRelocateHotspot();
        return;
    }

    const localPosition =
        viewer.localPositionFromHit?.(
            hit
        );

    const mesh =
        hit.object;

    const meshIndex =
        mesh?.userData?.meshIndex;

    if (
        !localPosition ||
        !Number.isFinite(Number(meshIndex))
    ) {
        setStatus(
            'No se pudo identificar la capa seleccionada.'
        );
        return;
    }

    hotspot.position = {
        x: localPosition.x,
        y: localPosition.y,
        z: localPosition.z
    };

    hotspot.coordinateSpace =
        'local';

    hotspot.worldPosition =
        null;

    hotspot.meshIndex =
        Number(meshIndex);

    selectObject(mesh);
    renderHotspots();

    const savedOnline =
        await saveProjectOnline();

    cancelRelocateHotspot();

    setStatus(
        savedOnline
            ? `${hotspot.name || 'Elemento'} ahora está vinculado a la capa seleccionada y fue guardado correctamente.`
            : `${hotspot.name || 'Elemento'} quedó vinculado a la capa seleccionada localmente, pero no se pudo confirmar el guardado online.`
    );
}


function startPlacement() {

    placingHotspot =
        true;


    viewerContainer?.classList.add(
        'placing-hotspot'
    );


    setStatus(
        'Hacé clic directamente sobre la parte/capa del modelo que querés convertir en elemento interactivo.'
    );
}


function cancelPlacement() {

    placingHotspot =
        false;

    clearHoverObject();


    viewerContainer?.classList.remove(
        'placing-hotspot'
    );
}


/* =====================================================
   CONTROLES
===================================================== */

function setupViewerControls() {

    const addButton =
        document.getElementById(
            'addHotspot'
        );


    if (
        addButton
    ) {

        addButton.addEventListener(
            'click',
            () => {

                startPlacement();
            }
        );
    }


    const cancelButton =
        document.getElementById(
            'cancelHotspot'
        );


    if (
        cancelButton
    ) {

        cancelButton.addEventListener(
            'click',
            () => {

                cancelPlacement();
            }
        );
    }


    const list =
        document.getElementById(
            'hotspotList'
        );


    if (
        list
    ) {

        list.addEventListener(
            'click',
            event => {

                const button =
                    event.target.closest(
                        'button'
                    );


                if (
                    !button
                ) {

                    return;
                }


                const id =
                    button.dataset.id;


                const action =
                    button.dataset.action;


                const hotspot =
                    standData.hotspots.find(
                        item =>
                            item.id ===
                            id
                    );


                if (
                    !hotspot
                ) {

                    return;
                }


                if (
                    action ===
                    'delete'
                ) {

                    deleteHotspot(
                        id
                    );

                    return;
                }


                if (
                    action ===
                    'relocate'
                ) {

                    startRelocateHotspot(
                        hotspot
                    );

                    return;
                }


                if (
                    action ===
                    'focus'
                ) {

                    selectHotspotMesh(
                        hotspot
                    );

                    focusHotspot(
                        hotspot
                    );

                    openHotspotEditor(
                        hotspot
                    );
                }
            }
        );
    }
}


/* =====================================================
   HOTSPOT CLICK
===================================================== */

function setupHotspotClick() {

    if (
        !viewer ||
        !viewer.renderer
    ) {

        return;
    }


    viewer.renderer.domElement.addEventListener(
        'dblclick',
        event => {

            if (
                placingHotspot
            ) {

                return;
            }


            const canvas =
                viewer.renderer.domElement;


            const rect =
                canvas.getBoundingClientRect();


            const mouse =
                new viewer.THREE.Vector2(

                    (
                        event.clientX -
                        rect.left
                    ) /
                    rect.width *
                    2 -
                    1,

                    -(
                        (
                            event.clientY -
                            rect.top
                        ) /
                        rect.height
                    ) *
                    2 +
                    1
                );


            const ray =
                new viewer.THREE.Raycaster();


            ray.setFromCamera(
                mouse,
                viewer.camera
            );


            const objects =
                [];


            if (
                viewer.model
            ) {

                viewer.model.traverse(
                    object => {

                        if (
                            object.isMesh
                        ) {

                            objects.push(
                                object
                            );
                        }
                    }
                );
            }


            const hits =
                ray.intersectObjects(
                    objects,
                    true
                );


            if (
                !hits.length
            ) {

                return;
            }


            const mesh =
                hits[0].object;


            selectObject(
                mesh
            );
        }
    );
}


/* =====================================================
   FOCO EN HOTSPOT
===================================================== */

function focusHotspot(
    hotspot
) {

    if (
        !viewer
    ) {

        return;
    }


    selectHotspotMesh(
        hotspot
    );


    const target =
        getHotspotWorldPosition(
            hotspot
        );


    if (
        !target
    ) {

        return;
    }


    const direction =
        new viewer.THREE.Vector3()
            .subVectors(
                viewer.camera.position,
                viewer.controls.target
            )
            .normalize();


    const distance =
        Math.max(
            viewer.modelSize.x,
            viewer.modelSize.y,
            viewer.modelSize.z
        ) *
        0.75;


    const destination =
        target.clone()
            .add(
                direction.multiplyScalar(
                    distance
                )
            );


    const startCamera =
        viewer.camera.position.clone();


    const startTarget =
        viewer.controls.target.clone();


    const startTime =
        performance.now();


    const duration =
        500;


    function animateCamera(
        now
    ) {

        const progress =
            Math.min(
                (
                    now -
                    startTime
                ) /
                duration,
                1
            );


        const eased =
            progress *
            progress *
            (
                3 -
                2 *
                progress
            );


        viewer.camera.position.lerpVectors(
            startCamera,
            destination,
            eased
        );


        viewer.controls.target.lerpVectors(
            startTarget,
            target,
            eased
        );


        viewer.controls.update();


        if (
            progress <
            1
        ) {

            requestAnimationFrame(
                animateCamera
            );
        }
    }


    requestAnimationFrame(
        animateCamera
    );
}


/* =====================================================
   GUARDAR PROYECTO
===================================================== */



/* =====================================================
   INICIO DEL RECORRIDO
===================================================== */

function applySavedStartView() {

    if (
        !viewer ||
        !standData.navigation
    ) {

        return;
    }

    const navigation =
        standData.navigation;

    if (
        navigation.position &&
        navigation.target &&
        typeof viewer.setCameraState === 'function'
    ) {

        viewer.setCameraState(
            {
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
            },
            false
        );

        return;
    }

    /* Compatibilidad con vistas antiguas. */
    if (navigation.position) {
        viewer.camera.position.set(
            Number(navigation.position.x || 0),
            Number(navigation.position.y || 1.8),
            Number(navigation.position.z || 0)
        );

        if (navigation.rotation) {
            viewer.setCameraRotation?.(
                Number(navigation.rotation.yaw || 0),
                Number(navigation.rotation.pitch || 0)
            );
        }

        viewer.setCameraHeight?.();
        viewer.controls?.update?.();
    }
}


/* =====================================================
   SINCRONIZAR VISTA GUARDADA
===================================================== */

window.addEventListener(
    'universalStandNavigationSaved',
    event => {

        if (event.detail?.navigation) {
            standData.navigation = event.detail.navigation;
        }
    }
);


/* =====================================================
   TECLADO
===================================================== */

function setupKeyboard() {

    document.addEventListener(
        'keydown',
        event => {

            const target =
                event.target;

            if (
                target &&
                (
                    target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT' ||
                    target.isContentEditable
                )
            ) {
                return;
            }

            if (
                event.code ===
                'KeyH'
            ) {

                if (
                    viewer &&
                    standData.navigation
                ) {

                    applySavedStartView();

                    event.preventDefault();
                }
            }
        }
    );
}


/* =====================================================
   AYUDA DEL VISOR
===================================================== */

function setupViewerHelp() {

    const instruction =
        document.getElementById(
            'viewerInstruction'
        );


    if (
        instruction
    ) {

        instruction.textContent =
            'Mouse para mirar. WASD o flechas para caminar. Ruedita para avanzar o retroceder. H para volver al inicio del recorrido.';
    }
}


/* =====================================================
   MEDICIÓN
===================================================== */

function setupMeasurement() {

    if (
        !measurementTool
    ) {

        return;
    }


    const measureButton =
        document.getElementById(
            'measureMode'
        );


    if (
        !measureButton
    ) {

        return;
    }


    measureButton.addEventListener(
        'click',
        () => {

            measurementTool.toggle();
        }
    );
}


/* =====================================================
   INICIALIZACIÓN FINAL
===================================================== */

setTimeout(
    () => {

        setupMeasurement();

    },
    0
);


/* =====================================================
   RAYCASTER PLACEHOLDER
===================================================== */

function THREE_RAYCASTER_PLACEHOLDER() {

    return null;
}