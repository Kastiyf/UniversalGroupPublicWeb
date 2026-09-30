import {
    createViewer
} from './viewer-engine.js';

import {
    createMeasurementTool
} from './measurement-tool.js';

import {
    supabase
} from './supabase-client.js';


const PROJECTS_KEY =
    'universalStandProjects';

const LEGACY_KEY =
    'universalStand';


/* =====================================================
   DATOS POR PROYECTO
===================================================== */

function getDefaultData() {

    return {

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
   NORMALIZAR DATOS DEL PROYECTO
===================================================== */

function toPositiveDimension(...values) {

    for (const value of values) {

        if (
            typeof value === 'number' &&
            Number.isFinite(value) &&
            value > 0
        ) {
            return value;
        }

        if (
            typeof value === 'string'
        ) {

            const normalized =
                value
                    .trim()
                    .replace(',', '.');

            const parsed =
                Number.parseFloat(
                    normalized
                );

            if (
                Number.isFinite(parsed) &&
                parsed > 0
            ) {
                return parsed;
            }
        }
    }

    return 0;
}


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
                '[UniversalStand] No se pudo interpretar una lista JSON:',
                error
            );

        }
    }

    return [];
}


function normalizeStandData(
    project
) {

    const source =
        project &&
        typeof project === 'object'
            ? project
            : {};

    const dimensions =
        source.dimensions &&
        typeof source.dimensions === 'object'
            ? source.dimensions
            : {};

    const ancho =
        toPositiveDimension(
            source.ancho,
            source.width,
            source.ancho_m,
            dimensions.ancho,
            dimensions.width
        );

    const profundidad =
        toPositiveDimension(
            source.profundidad,
            source.depth,
            source.profundidad_m,
            dimensions.profundidad,
            dimensions.depth
        );

    const altura =
        toPositiveDimension(
            source.altura,
            source.height,
            source.altura_m,
            dimensions.altura,
            dimensions.height
        );

    const superficie =
        toPositiveDimension(
            source.superficie,
            source.area,
            dimensions.superficie,
            dimensions.area
        ) ||
        (
            ancho > 0 &&
            profundidad > 0
                ? ancho * profundidad
                : 0
        );

    return {

        ...getDefaultData(),

        ...source,

        ancho,

        profundidad,

        altura,

        superficie,

        hotspots:
            parseJsonArray(
                source.hotspots
            ),

        navigation:
            normalizeNavigation(
                source.navigation
            )
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
   VALIDAR NAVEGACIÓN
===================================================== */

function hasValidNavigation(
    navigation
) {

    if (
        !navigation ||
        typeof navigation !==
            'object'
    ) {

        return false;
    }


    const position =
        navigation.position;

    const target =
        navigation.target;


    if (
        !position ||
        !target ||
        typeof position !==
            'object' ||
        typeof target !==
            'object'
    ) {

        return false;
    }


    const positionValid =
        Number.isFinite(
            Number(
                position.x
            )
        ) &&
        Number.isFinite(
            Number(
                position.y
            )
        ) &&
        Number.isFinite(
            Number(
                position.z
            )
        );


    const targetValid =
        Number.isFinite(
            Number(
                target.x
            )
        ) &&
        Number.isFinite(
            Number(
                target.y
            )
        ) &&
        Number.isFinite(
            Number(
                target.z
            )
        );


    return (
        positionValid &&
        targetValid
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
            navigation =
                JSON.parse(navigation);
        } catch (error) {
            console.error(
                'No se pudo interpretar navigation:',
                error
            );
            return null;
        }
    }

    if (
        !hasValidNavigation(
            navigation
        )
    ) {

        return null;
    }


    return {

        position: {

            x:
                Number(
                    navigation.position.x
                ),

            y:
                Number(
                    navigation.position.y
                ),

            z:
                Number(
                    navigation.position.z
                )
        },

        target: {

            x:
                Number(
                    navigation.target.x
                ),

            y:
                Number(
                    navigation.target.y
                ),

            z:
                Number(
                    navigation.target.z
                )
        }
    };
}


/* =====================================================
   CARGAR PROYECTO
===================================================== */

async function getStandData() {

    const requestedSlug =
        getProjectSlugFromUrl();


    /*
     * PRIMERO: cargar desde Supabase cuando la URL contiene
     * ?project=...
     *
     * Se intenta primero una coincidencia exacta. Si no aparece,
     * hacemos una segunda búsqueda sobre la biblioteca para tolerar
     * diferencias de mayúsculas/minúsculas o espacios en el slug.
     */

    if (requestedSlug) {

        try {

            const {
                data: onlineProject,
                error: onlineError
            } = await supabase
                .from('projects')
                .select('*')
                .eq('slug', requestedSlug)
                .maybeSingle();


            if (onlineError) {

                console.error(
                    '[UniversalStand] Error en búsqueda exacta de Supabase:',
                    onlineError
                );

            }


            if (onlineProject) {

                console.log(
                    '[UniversalStand] Proyecto cargado desde Supabase:',
                    onlineProject.slug,
                    onlineProject
                );

                return {

                    ...getDefaultData(),

                    ...onlineProject,

                    hotspots:
                        parseJsonArray(
                            onlineProject.hotspots
                        ),

                    navigation:
                        normalizeNavigation(
                            onlineProject.navigation
                        )
                };
            }


            const {
                data: projects,
                error: projectsError
            } = await supabase
                .from('projects')
                .select('*')
                .limit(1000);


            if (projectsError) {

                throw projectsError;
            }


            const wanted =
                String(
                    requestedSlug
                )
                    .trim()
                    .toLowerCase();


            const normalizedProject =
                Array.isArray(projects)
                    ? projects.find(
                        project => {

                            const projectSlug =
                                String(
                                    project?.slug ||
                                    ''
                                )
                                    .trim()
                                    .toLowerCase();

                            const projectId =
                                String(
                                    project?.id ||
                                    ''
                                )
                                    .trim()
                                    .toLowerCase();

                            return (
                                projectSlug === wanted ||
                                projectId === wanted
                            );
                        }
                    )
                    : null;


            if (normalizedProject) {

                console.log(
                    '[UniversalStand] Proyecto encontrado mediante búsqueda normalizada:',
                    normalizedProject
                );

                return {

                    ...getDefaultData(),

                    ...normalizedProject,

                    hotspots:
                        parseJsonArray(
                            normalizedProject.hotspots
                        ),

                    navigation:
                        normalizeNavigation(
                            normalizedProject.navigation
                        )
                };
            }


            console.error(
                '[UniversalStand] No se encontró el proyecto solicitado en Supabase:',
                requestedSlug
            );

        } catch (
            error
        ) {

            console.error(
                '[UniversalStand] Error cargando proyecto desde Supabase:',
                error
            );
        }
    }


    /*
     * SEGUNDO: sistema local original como respaldo.
     */

    try {

        const projectsSaved =
            localStorage.getItem(
                PROJECTS_KEY
            );


        if (projectsSaved) {

            const projects =
                JSON.parse(
                    projectsSaved
                );


            if (
                Array.isArray(
                    projects
                ) &&
                projects.length
            ) {

                if (
                    requestedSlug
                ) {

                    const requestedProject =
                        projects.find(
                            project =>
                                String(
                                    project.slug ||
                                    ''
                                )
                                    .trim()
                                    .toLowerCase() ===
                                requestedSlug
                        );


                    if (
                        requestedProject
                    ) {

                        return {

                            ...getDefaultData(),

                            ...requestedProject,

                            hotspots:
                                Array.isArray(
                                    requestedProject.hotspots
                                )
                                    ? requestedProject.hotspots
                                    : [],

                            navigation:
                                normalizeNavigation(
                                    requestedProject.navigation
                                )
                        };
                    }
                }


                const activeId =
                    localStorage.getItem(
                        'universalStandActiveProject'
                    );


                const activeProject =
                    projects.find(
                        project =>
                            project.id ===
                            activeId
                    );


                if (
                    activeProject
                ) {

                    return {

                        ...getDefaultData(),

                        ...activeProject,

                        hotspots:
                            parseJsonArray(
                                activeProject.hotspots
                            ),

                        navigation:
                            normalizeNavigation(
                                activeProject.navigation
                            )
                    };
                }


                return {

                    ...getDefaultData(),

                    ...projects[0],

                    hotspots:
                        parseJsonArray(
                            projects[0].hotspots
                        ),

                    navigation:
                        normalizeNavigation(
                            projects[0].navigation
                        )
                };
            }
        }


        const legacy =
            localStorage.getItem(
                LEGACY_KEY
            );


        if (legacy) {

            const data =
                JSON.parse(
                    legacy
                );


            return {

                ...getDefaultData(),

                ...data,

                hotspots:
                    parseJsonArray(
                        data.hotspots
                    ),

                navigation:
                    normalizeNavigation(
                        data.navigation
                    )
            };
        }


        return getDefaultData();


    } catch (
        error
    ) {

        console.error(
            'Error leyendo proyecto:',
            error
        );


        return getDefaultData();
    }
}


const standData =
    normalizeStandData(
        await getStandData()
    );


/* =====================================================
   DOM
===================================================== */

const viewerContainer =
    document.getElementById(
        'viewer3d'
    );


/* =====================================================
   INFORMACIÓN
===================================================== */

function updateStandInformation() {

    const title =
        document.getElementById(
            'standTitle'
        );

    const description =
        document.getElementById(
            'standDescription'
        );

    const ancho =
        document.getElementById(
            'dimensionAncho'
        );

    const profundidad =
        document.getElementById(
            'dimensionProfundidad'
        );

    const altura =
        document.getElementById(
            'dimensionAltura'
        );

    const superficie =
        document.getElementById(
            'dimensionSuperficie'
        );


    const width =
        Number(
            standData.ancho
        ) || 0;

    const depth =
        Number(
            standData.profundidad
        ) || 0;

    const height =
        Number(
            standData.altura
        ) || 0;

    const calculatedSurface =
        width *
        depth;

    const surface =
        Number(
            standData.superficie
        ) > 0
            ? Number(
                standData.superficie
            )
            : calculatedSurface;


    if (title) {

        title.textContent =
            standData.cliente ||
            'Universal Group';
    }


    if (description) {

        description.textContent =
            standData.proyecto ||
            standData.descripcion ||
            '';
    }


    if (ancho) {

        ancho.textContent =
            Math.round(
                width * 100
            ) +
            ' cm';
    }


    if (profundidad) {

        profundidad.textContent =
            Math.round(
                depth * 100
            ) +
            ' cm';
    }


    if (altura) {

        altura.textContent =
            Math.round(
                height * 100
            ) +
            ' cm';
    }


    if (superficie) {

        superficie.textContent =
            surface.toFixed(
                2
            ) +
            ' m²';
    }


    console.log(
        '[UniversalStand] Información mostrada en el panel:',
        {
            cliente:
                standData.cliente,

            proyecto:
                standData.proyecto,

            ancho:
                width,

            profundidad:
                depth,

            altura:
                height,

            superficie:
                surface
        }
    );
}


updateStandInformation();


/* =====================================================
   PANEL
===================================================== */

function setupInfoPanel() {

    const panel =
        document.getElementById(
            'infoPanel'
        );

    const minimize =
        document.getElementById(
            'togglePanel'
        );

    const restore =
        document.getElementById(
            'showPanel'
        );


    if (
        minimize &&
        panel
    ) {

        minimize.addEventListener(
            'click',
            () => {

                panel.classList.add(
                    'hidden'
                );


                if (restore) {

                    restore.classList.add(
                        'visible'
                    );
                }
            }
        );
    }


    if (
        restore &&
        panel
    ) {

        restore.addEventListener(
            'click',
            () => {

                panel.classList.remove(
                    'hidden'
                );


                restore.classList.remove(
                    'visible'
                );
            }
        );
    }
}


setupInfoPanel();


/* =====================================================
   VISOR
===================================================== */

let viewer =
    null;

let hotspotGroup =
    null;

let selectionHelper =
    null;

let selectedHotspotId =
    null;

let focusRestoreEntries =
    [];

let measurementTool =
    null;


/* =====================================================
   INICIALIZAR VISOR
===================================================== */

async function initViewer() {

    if (!viewerContainer) {

        console.error(
            'No existe #viewer3d.'
        );

        return;
    }


    try {

        const modelUrl =
            standData.modelo ||
            'models/stand.glb';


        viewer =
            createViewer({

                container:
                    viewerContainer,

                modelUrl:
                    modelUrl
            });


        hotspotGroup =
            new viewer.THREE.Group();


        hotspotGroup.name =
            'PublicHotspots';


        viewer.scene.add(
            hotspotGroup
        );


        await viewer.modelPromise;


        /*
         * Si el administrador guardó una vista
         * de inicio, esa vista tiene prioridad.
         */

        if (
            hasValidNavigation(
                standData.navigation
            )
        ) {

            try {

                viewer.setCameraState(
                    standData.navigation,
                    false
                );

                console.log(
                    '[UniversalStand] Vista inicial aplicada:',
                    standData.navigation
                );

            } catch (
                navigationError
            ) {

                console.error(
                    'Error restaurando la navegación guardada:',
                    navigationError
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
            'VISOR PÚBLICO LISTO'
        );


    } catch (
        error
    ) {

        console.error(
            'ERROR INICIALIZANDO VISOR:',
            error
        );
    }
}


initViewer();


/* =====================================================
   HOTSPOTS
===================================================== */

function clearHotspots() {

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

            if (
                Array.isArray(
                    child.material
                )
            ) {

                child.material.forEach(
                    material =>
                        material.dispose()
                );

            } else {

                child.material.dispose();
            }
        }
    }
}


function renderHotspotLeaderLine(
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

    if (!hotspotGroup) {
        return;
    }


    clearHotspots();


    renderHotspotList();
}


/* =====================================================
   CLICK HOTSPOT
===================================================== */

function setupHotspotClick() {

    if (!viewer) {
        return;
    }


    viewer.renderer.domElement.addEventListener(
        'click',
        event => {

            if (
                measurementTool &&
                measurementTool.active
            ) {

                return;
            }


            const rect =
                viewer.renderer.domElement
                    .getBoundingClientRect();


            const mouse =
                new viewer.THREE.Vector2();


            mouse.x =
                (
                    (
                        event.clientX -
                        rect.left
                    ) /
                    rect.width
                ) *
                2 -
                1;


            mouse.y =
                -(
                    (
                        event.clientY -
                        rect.top
                    ) /
                    rect.height
                ) *
                2 +
                1;


            const raycaster =
                new viewer.THREE.Raycaster();


            raycaster.setFromCamera(
                mouse,
                viewer.camera
            );


            const markers =
                hotspotGroup.children.filter(
                    child =>
                        child.isMesh
                );


            const hits =
                raycaster.intersectObjects(
                    markers,
                    false
                );


            if (!hits.length) {
                return;
            }


            const hotspot =
                hits[0]
                    .object
                    .userData
                    .hotspot;


            if (!hotspot) {
                return;
            }


            selectHotspot(
                hotspot
            );
        }
    );
}


/* =====================================================
   DOBLE CLICK MODELO
===================================================== */

function setupCanvasClick() {

    viewer.renderer.domElement.addEventListener(
        'dblclick',
        event => {

            if (
                measurementTool &&
                measurementTool.active
            ) {

                return;
            }


            const hit =
                viewer.raycast(
                    event
                );


            if (!hit) {
                return;
            }


            const mesh =
                hit.object;


            if (
                mesh &&
                mesh.userData
            ) {

                selectMesh(
                    mesh.userData.meshIndex
                );
            }
        }
    );
}


/* =====================================================
   HOTSPOT
===================================================== */

function selectHotspot(
    hotspot
) {

    if (!hotspot || !viewer) {
        return;
    }


    selectedHotspotId =
        hotspot.id ||
        null;


    renderHotspotList();


    const target =
        getHotspotWorldPosition(
            hotspot
        );


    const selectedMesh =
        getHotspotMesh(
            hotspot,
            target
        );


    if (selectedMesh) {
        selectMesh(
            selectedMesh.userData?.meshIndex
        );
    }


    focusModelOnHotspot(
        hotspot
    );


    focusHotspot(
        hotspot
    );
}


/* =====================================================
   ELEMENTO SELECCIONADO
===================================================== */

function showSelectedElement(
    hotspot
) {

    const section =
        document.getElementById(
            'selectedElement'
        );

    const title =
        document.getElementById(
            'selectedTitle'
        );

    const shortTitle =
        document.getElementById(
            'selectedShortTitle'
        );

    const description =
        document.getElementById(
            'selectedDescription'
        );


    if (section) {

        section.hidden =
            false;
    }


    if (title) {

        title.textContent =
            hotspot.name || '-';
    }


    if (shortTitle) {

        shortTitle.textContent =
            hotspot.shortTitle || '-';
    }


    if (description) {

        description.textContent =
            hotspot.description || '-';
    }
}


/* =====================================================
   POPUP HOTSPOT
===================================================== */

function showHotspotPopup(
    hotspot
) {

    if (!viewer) {
        return;
    }


    let popup =
        document.getElementById(
            'hotspotPopup'
        );


    if (!popup) {

        popup =
            document.createElement(
                'div'
            );


        popup.id =
            'hotspotPopup';


        popup.className =
            'hotspot-popup';


        document.body.appendChild(
            popup
        );
    }


    popup.innerHTML = `

        <button
            type="button"
            class="hotspot-popup-close"
            aria-label="Cerrar"
        >
            ×
        </button>

        <div class="hotspot-popup-number">
            ${escapeHtml(
                hotspot.number
            )}
        </div>

        <div class="hotspot-popup-content">

            <div class="hotspot-popup-title">
                ${escapeHtml(
                    hotspot.name || ''
                )}
            </div>

            <div class="hotspot-popup-short">
                ${escapeHtml(
                    hotspot.shortTitle || ''
                )}
            </div>

            <div class="hotspot-popup-description">
                ${escapeHtml(
                    hotspot.description || ''
                )}
            </div>

        </div>
    `;


    const worldPosition =
        getHotspotWorldPosition(
            hotspot
        );


    if (!worldPosition) {
        return;
    }


    const projected =
        worldPosition.clone()
            .project(
                viewer.camera
            );


    const rect =
        viewer.renderer
            .domElement
            .getBoundingClientRect();


    let x =
        (
            projected.x + 1
        ) *
        .5 *
        rect.width;


    let y =
        (
            -projected.y + 1
        ) *
        .5 *
        rect.height;


    x =
        Math.max(
            20,
            Math.min(
                window.innerWidth - 310,
                rect.left +
                x +
                18
            )
        );


    y =
        Math.max(
            20,
            Math.min(
                window.innerHeight - 180,
                rect.top +
                y -
                25
            )
        );


    popup.style.left =
        `${x}px`;


    popup.style.top =
        `${y}px`;


    popup.classList.add(
        'visible'
    );


    const closeButton =
        popup.querySelector(
            '.hotspot-popup-close'
        );


    if (closeButton) {

        closeButton.addEventListener(
            'click',
            () => {

                popup.classList.remove(
                    'visible'
                );

            },
            {
                once:
                    true
            }
        );
    }
}


function closeHotspotPopup() {

    const popup =
        document.getElementById(
            'hotspotPopup'
        );


    if (popup) {

        popup.classList.remove(
            'visible'
        );
    }
}


/* =====================================================
   ENFOQUE VISUAL DEL ELEMENTO
===================================================== */

function clearModelFocus() {

    focusRestoreEntries.forEach(
        entry => {

            if (!entry || !entry.mesh) {
                return;
            }


            entry.mesh.material =
                entry.originalMaterial;


            if (entry.clonedMaterials) {

                entry.clonedMaterials.forEach(
                    material => {

                        if (material && material.dispose) {
                            material.dispose();
                        }
                    }
                );
            }
        }
    );


    focusRestoreEntries =
        [];
}


function getHotspotMesh(
    hotspot,
    target
) {

    if (!viewer || !viewer.model || !target) {
        return null;
    }


    if (Number.isFinite(Number(hotspot?.meshIndex))) {

        const indexedMesh =
            viewer.getMeshByIndex(
                Number(hotspot.meshIndex)
            );


        if (indexedMesh) {
            return indexedMesh;
        }
    }


    let closestMesh =
        null;

    let closestDistance =
        Infinity;

    const box =
        new viewer.THREE.Box3();


    viewer.model.traverse(
        child => {

            if (!child.isMesh || !child.geometry) {
                return;
            }


            box.setFromObject(
                child
            );

            const distance =
                box.distanceToPoint(
                    target
                );


            if (distance < closestDistance) {

                closestDistance =
                    distance;

                closestMesh =
                    child;
            }
        }
    );


    return closestMesh;
}


function applyModelFocus(
    hotspot
) {

    if (!viewer) {
        return;
    }


    const target =
        getHotspotWorldPosition(
            hotspot
        );


    if (!target) {
        return;
    }


    clearModelFocus();


    const selectedMesh =
        getHotspotMesh(
            hotspot,
            target
        );


    if (!selectedMesh) {
        return;
    }


    /*
     * El objeto seleccionado conserva exactamente sus materiales,
     * colores y texturas originales.
     */
    const selectedOriginalMaterial =
        selectedMesh.material;


    /*
     * Todo lo demás pasa a una versión monocromática clara.
     * No usamos opacity baja porque eso hacía desaparecer el modelo
     * completo y dejaba al usuario mirando un vacío blanco.
     */
    const backgroundColor =
        new viewer.THREE.Color(
            0.82,
            0.82,
            0.82
        );


    viewer.model.traverse(
        mesh => {

            if (!mesh.isMesh || mesh === selectedMesh) {
                return;
            }


            const originalMaterial =
                mesh.material;


            const originalMaterials =
                Array.isArray(originalMaterial)
                    ? originalMaterial
                    : [originalMaterial];


            const clonedMaterials =
                originalMaterials.map(
                    material => {

                        if (!material || !material.clone) {
                            return material;
                        }


                        const faded =
                            material.clone();


                        /*
                         * Quitamos textura/color original para que el
                         * fondo realmente quede sin color.
                         */
                        if ('map' in faded) {
                            faded.map = null;
                        }


                        if (faded.color) {
                            faded.color.copy(
                                backgroundColor
                            );
                        }


                        if (faded.emissive) {
                            faded.emissive.setRGB(
                                0.03,
                                0.03,
                                0.03
                            );
                        }


                        if ('emissiveIntensity' in faded) {
                            faded.emissiveIntensity =
                                0.05;
                        }


                        if ('opacity' in faded) {
                            faded.opacity = 1;
                        }


                        if ('transparent' in faded) {
                            faded.transparent = false;
                        }


                        if ('depthWrite' in faded) {
                            faded.depthWrite = true;
                        }


                        faded.needsUpdate =
                            true;


                        return faded;
                    }
                );


            mesh.material =
                Array.isArray(originalMaterial)
                    ? clonedMaterials
                    : clonedMaterials[0];


            focusRestoreEntries.push({
                mesh,
                originalMaterial,
                clonedMaterials
            });
        }
    );


    /*
     * El objeto seleccionado queda por encima visualmente porque
     * conserva sus materiales reales. Añadimos solamente un pequeño
     * refuerzo de luz, sin cambiar su color de diseño.
     */
    const selectedMaterials =
        Array.isArray(selectedOriginalMaterial)
            ? selectedOriginalMaterial
            : [selectedOriginalMaterial];


    const selectedClonedMaterials =
        selectedMaterials.map(
            material => {

                if (!material || !material.clone) {
                    return material;
                }


                const highlighted =
                    material.clone();


                if (highlighted.emissive) {
                    highlighted.emissive =
                        new viewer.THREE.Color(
                            0.06,
                            0.06,
                            0.06
                        );


                    if ('emissiveIntensity' in highlighted) {
                        highlighted.emissiveIntensity =
                            0.18;
                    }
                }


                highlighted.needsUpdate =
                    true;


                return highlighted;
            }
        );


    selectedMesh.material =
        Array.isArray(selectedOriginalMaterial)
            ? selectedClonedMaterials
            : selectedClonedMaterials[0];


    focusRestoreEntries.push({
        mesh: selectedMesh,
        originalMaterial: selectedOriginalMaterial,
        clonedMaterials: selectedClonedMaterials
    });
}


function focusModelOnHotspot(
    hotspot
) {

    applyModelFocus(
        hotspot
    );
}


/* =====================================================
   SELECCIÓN MESH
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


    if (!viewer) {
        return;
    }


    const mesh =
        viewer.getMeshByIndex(
            meshIndex
        );


    if (!mesh) {
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
   CÁMARA
===================================================== */

function focusHotspot(
    hotspot
) {

    if (!viewer || !hotspot) {
        return;
    }


    /*
     * Al seleccionar un elemento interactivo no hacemos zoom
     * hacia el objeto. La cámara vuelve directamente a la
     * vista inicial guardada por el administrador.
     */
    if (
        hasValidNavigation(
            standData.navigation
        )
    ) {

        viewer.setCameraState(
            standData.navigation,
            true
        );

        return;
    }


    /*
     * Si el proyecto todavía no tiene una vista inicial guardada,
     * dejamos la cámara en el encuadre normal del modelo.
     */
    viewer.fitCamera(
        1.20
    );
}


/* =====================================================
   LISTA HOTSPOTS
===================================================== */

function renderHotspotList() {

    const list =
        document.getElementById(
            'pointsList'
        );

    const section =
        document.getElementById(
            'pointsSection'
        );


    if (!list) {
        return;
    }


    list.innerHTML =
        '';


    if (
        !Array.isArray(
            standData.hotspots
        ) ||
        !standData.hotspots.length
    ) {

        if (section) {

            section.hidden =
                true;
        }

        return;
    }


    if (section) {

        section.hidden =
            false;
    }


    standData.hotspots.forEach(
        hotspot => {

            const button =
                document.createElement(
                    'button'
                );


            button.type =
                'button';


            button.className =
                'viewer-point-item' +
                (
                    hotspot.id ===
                    selectedHotspotId
                        ? ' is-selected'
                        : ''
                );


            if (hotspot.id === selectedHotspotId) {

                button.setAttribute(
                    'aria-current',
                    'true'
                );
            }


            button.innerHTML = `

                <span class="viewer-point-number">
                    ${escapeHtml(
                        hotspot.number
                    )}
                </span>

                <span class="viewer-point-text">

                    <strong>
                        ${escapeHtml(
                            hotspot.name || ''
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(
                            hotspot.shortTitle || ''
                        )}
                    </small>

                </span>

                <span class="viewer-point-state" aria-hidden="true">
                    ${
                        hotspot.id ===
                        selectedHotspotId
                            ? '✓'
                            : ''
                    }
                </span>
            `;


            button.addEventListener(
                'click',
                () => {

                    selectHotspot(
                        hotspot
                    );

                    button.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest'
                    });
                }
            );


            list.appendChild(
                button
            );
        }
    );
}


/* =====================================================
   CONTROLES
===================================================== */

function setupViewerControls() {

    const home =
        document.getElementById(
            'controlHome'
        );

    const zoomOut =
        document.getElementById(
            'controlZoomOut'
        );

    const zoomIn =
        document.getElementById(
            'controlZoomIn'
        );

    const measure =
        document.getElementById(
            'controlMeasure'
        );

    const fullscreen =
        document.getElementById(
            'controlFullscreen'
        );


    if (home) {

        home.addEventListener(
            'click',
            () => {

                closeHotspotPopup();

                selectedHotspotId =
                    null;

                clearModelFocus();
                clearSelection();
                renderHotspotList();

                hasValidNavigation(
                    standData.navigation
                )
                    ? viewer.setCameraState(
                        standData.navigation,
                        false
                    )
                    : viewer.fitCamera(
                        1.20
                    );
            }
        );
    }


    if (zoomOut) {

        zoomOut.addEventListener(
            'click',
            () => {

                zoomCamera(
                    1.22
                );
            }
        );
    }


    if (zoomIn) {

        zoomIn.addEventListener(
            'click',
            () => {

                zoomCamera(
                    .82
                );
            }
        );
    }


    if (measure) {

        measure.addEventListener(
            'click',
            () => {

                if (!measurementTool) {
                    return;
                }


                if (
                    measurementTool.active
                ) {

                    measurementTool.disable();

                } else {

                    closeHotspotPopup();

                    selectedHotspotId =
                        null;

                    clearModelFocus();
                    clearSelection();
                    renderHotspotList();

                    measurementTool.enable();
                }
            }
        );
    }


    if (fullscreen) {

        fullscreen.addEventListener(
            'click',
            async () => {

                try {

                    if (
                        !document.fullscreenElement
                    ) {

                        await viewerContainer
                            .requestFullscreen?.();

                    } else {

                        await document
                            .exitFullscreen?.();
                    }

                } catch (
                    error
                ) {

                    console.error(
                        'Error en pantalla completa:',
                        error
                    );
                }
            }
        );
    }
}


/* =====================================================
   ZOOM
===================================================== */

function zoomCamera(
    multiplier
) {

    if (!viewer) {
        return;
    }

    if (typeof viewer.zoomBy === 'function') {
        viewer.zoomBy(multiplier);
        return;
    }


    const direction =
        new viewer.THREE.Vector3()
            .subVectors(
                viewer.camera.position,
                viewer.controls.target
            )
            .normalize();


    const currentDistance =
        viewer.camera.position.distanceTo(
            viewer.controls.target
        );


    const distance =
        Math.max(

            viewer.controls.minDistance,

            Math.min(

                viewer.controls.maxDistance,

                currentDistance *
                multiplier
            )
        );


    viewer.camera.position.copy(

        viewer.controls.target
            .clone()
            .add(
                direction.multiplyScalar(
                    distance
                )
            )
    );


    viewer.controls.update();
}


/* =====================================================
   AYUDA
===================================================== */

function setupViewerHelp() {

    const button =
        document.getElementById(
            'controlHelp'
        );

    const help =
        document.getElementById(
            'viewerHelp'
        );

    const close =
        document.getElementById(
            'closeViewerHelp'
        );


    function openHelp() {

        if (!help) {
            return;
        }


        help.classList.add(
            'visible'
        );


        help.setAttribute(
            'aria-hidden',
            'false'
        );
    }


    function closeHelp() {

        if (!help) {
            return;
        }


        help.classList.remove(
            'visible'
        );


        help.setAttribute(
            'aria-hidden',
            'true'
        );
    }


    if (button) {

        button.addEventListener(
            'click',
            openHelp
        );
    }


    if (close) {

        close.addEventListener(
            'click',
            closeHelp
        );
    }


    if (help) {

        help.addEventListener(
            'click',
            event => {

                if (
                    event.target ===
                    help
                ) {

                    closeHelp();
                }
            }
        );
    }


    window.closeViewerHelp =
        closeHelp;
}


/* =====================================================
   TECLADO
===================================================== */

function setupKeyboard() {

    document.addEventListener(
        'keydown',
        event => {

            const editable =
                event.target?.closest?.(
                    'input, textarea, select, button, [contenteditable="true"]'
                );

            if (editable) {
                return;
            }

            if (
                event.key ===
                'Escape'
            ) {

                const help =
                    document.getElementById(
                        'viewerHelp'
                    );


                if (
                    help &&
                    help.classList.contains(
                        'visible'
                    )
                ) {

                    help.classList.remove(
                        'visible'
                    );


                    help.setAttribute(
                        'aria-hidden',
                        'true'
                    );


                    return;
                }


                if (
                    measurementTool &&
                    measurementTool.active
                ) {

                    measurementTool.disable();

                    return;
                }


                closeHotspotPopup();

                return;
            }


            if (
                event.key ===
                'h'
            ) {

                if (
                    viewer &&
                    measurementTool &&
                    !measurementTool.active
                ) {

                    selectedHotspotId =
                        null;

                    clearModelFocus();
                    clearSelection();
                    renderHotspotList();

                    closeHotspotPopup();

                    hasValidNavigation(
                        standData.navigation
                    )
                        ? viewer.setCameraState(
                            standData.navigation,
                            false
                        )
                        : viewer.fitCamera(
                            1.20
                        );
                }

                return;
            }


            if (
                event.key ===
                '+' ||
                event.key ===
                '='
            ) {

                if (
                    viewer &&
                    !measurementTool?.active
                ) {

                    zoomCamera(
                        .82
                    );
                }

                return;
            }


            if (
                event.key ===
                '-' ||
                event.key ===
                '_'
            ) {

                if (
                    viewer &&
                    !measurementTool?.active
                ) {

                    zoomCamera(
                        1.22
                    );
                }
            }
        }
    );
}


/* =====================================================
   UTILIDAD
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
   GALERÍA DE RENDERS DEL PROYECTO
   Carga directamente desde Supabase.
===================================================== */

let publicRenders = [];
let publicRenderIndex = 0;

async function loadPublicRenders() {

    try {

        const requestedSlug =
            getProjectSlugFromUrl();

        let project =
            null;

        if (requestedSlug) {

            const {
                data,
                error
            } = await supabase
                .from('projects')
                .select('id, slug, cliente, proyecto, renders')
                .eq('slug', requestedSlug)
                .maybeSingle();

            if (error) {
                console.error(
                    '[UniversalStand] Error buscando renders por slug:',
                    error
                );
            }

            project = data || null;
        }

        /*
         * Si la búsqueda exacta no encuentra el proyecto,
         * usamos el proyecto que ya cargó el visor.
         */
        if (!project && standData?.id) {

            const {
                data,
                error
            } = await supabase
                .from('projects')
                .select('id, slug, cliente, proyecto, renders')
                .eq('id', standData.id)
                .maybeSingle();

            if (error) {
                console.error(
                    '[UniversalStand] Error buscando renders por id:',
                    error
                );
            }

            project = data || null;
        }

        /*
         * Si standData ya trae renders, también los usamos.
         */
        const rawRenders =
            project?.renders ??
            standData?.renders ??
            [];

        publicRenders =
            parseJsonArray(
                rawRenders
            ).filter(
                render =>
                    render &&
                    typeof render.url === 'string' &&
                    render.url.trim()
            );

        if (!publicRenders.length) {
            return;
        }

        createPublicRendersGallery();

    } catch (error) {

        console.error(
            '[UniversalStand] Error cargando renders públicos:',
            error
        );
    }
}


function createPublicRendersGallery() {

    if (
        document.getElementById(
            'rendersGalleryButton'
        )
    ) {
        return;
    }

    const controls =
        document.querySelector(
            '.viewer-controls'
        );

    if (!controls) {
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
        () => openPublicRendersGallery(0)
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
            data-public-render-close
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
                data-public-render-close
            >
                ×
            </button>

            <div class="renders-gallery-header">

                <div>

                    <small>
                        PROYECTO
                    </small>

                    <h2 id="rendersGalleryTitle">
                        Renders
                    </h2>

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

                <div
                    id="rendersGalleryThumbs"
                    class="renders-gallery-thumbs"
                ></div>

                <div class="renders-gallery-actions">

                    <a
                        id="rendersGalleryOpen"
                        class="renders-gallery-action renders-gallery-open-image"
                        href="#"
                        target="_blank"
                        rel="noopener"
                    >
                        Abrir imagen
                    </a>

                    <a
                        id="rendersGalleryDownload"
                        class="renders-gallery-action renders-gallery-download-file"
                        href="#"
                        download
                    >
                        Descargar
                    </a>

                </div>

            </div>

        </div>
    `;

    document.body.appendChild(
        modal
    );


    modal
        .querySelectorAll(
            '[data-public-render-close]'
        )
        .forEach(
            element => {

                element.addEventListener(
                    'click',
                    closePublicRendersGallery
                );

            }
        );


    document
        .getElementById(
            'rendersGalleryPrev'
        )
        ?.addEventListener(
            'click',
            () => movePublicRendersGallery(-1)
        );


    document
        .getElementById(
            'rendersGalleryNext'
        )
        ?.addEventListener(
            'click',
            () => movePublicRendersGallery(1)
        );


    document.addEventListener(
        'keydown',
        event => {

            const gallery =
                document.getElementById(
                    'rendersGallery'
                );

            if (
                !gallery ||
                gallery.getAttribute(
                    'aria-hidden'
                ) !== 'false'
            ) {
                return;
            }

            if (
                event.key ===
                'Escape'
            ) {
                closePublicRendersGallery();
            }

            if (
                event.key ===
                'ArrowLeft'
            ) {
                movePublicRendersGallery(-1);
            }

            if (
                event.key ===
                'ArrowRight'
            ) {
                movePublicRendersGallery(1);
            }
        }
    );

    renderPublicRendersGallery();
}


function renderPublicRendersGallery() {

    const item =
        publicRenders[
            publicRenderIndex
        ];

    if (!item) {
        return;
    }

    const image =
        document.getElementById(
            'rendersGalleryImage'
        );

    const counter =
        document.getElementById(
            'rendersGalleryCounter'
        );

    const thumbs =
        document.getElementById(
            'rendersGalleryThumbs'
        );

    const open =
        document.getElementById(
            'rendersGalleryOpen'
        );

    const download =
        document.getElementById(
            'rendersGalleryDownload'
        );

    if (
        !image ||
        !counter ||
        !thumbs ||
        !open ||
        !download
    ) {
        return;
    }

    image.src =
        item.url;

    image.alt =
        item.name ||
        `Render ${publicRenderIndex + 1}`;

    counter.textContent =
        `${publicRenderIndex + 1} / ${publicRenders.length}`;

    open.href =
        item.url;

    download.href =
        item.url;

    download.download =
        item.name ||
        `render-${publicRenderIndex + 1}`;

    thumbs.innerHTML =
        '';

    publicRenders.forEach(
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
                    index ===
                    publicRenderIndex
                        ? ' is-active'
                        : ''
                );

            thumb.innerHTML = `

                <img
                    src="${escapeHtml(render.url)}"
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

                    publicRenderIndex =
                        index;

                    renderPublicRendersGallery();
                }
            );

            thumbs.appendChild(
                thumb
            );
        }
    );

    const disabled =
        publicRenders.length <= 1;

    const prev =
        document.getElementById(
            'rendersGalleryPrev'
        );

    const next =
        document.getElementById(
            'rendersGalleryNext'
        );

    if (prev) {
        prev.disabled =
            disabled;
    }

    if (next) {
        next.disabled =
            disabled;
    }
}


function openPublicRendersGallery(
    index = 0
) {

    if (!publicRenders.length) {
        return;
    }

    publicRenderIndex =
        Math.max(
            0,
            Math.min(
                index,
                publicRenders.length - 1
            )
        );

    renderPublicRendersGallery();

    const modal =
        document.getElementById(
            'rendersGallery'
        );

    if (!modal) {
        return;
    }

    modal.classList.add(
        'visible'
    );

    modal.setAttribute(
        'aria-hidden',
        'false'
    );

    document.body.classList.add(
        'renders-gallery-open'
    );
}


function closePublicRendersGallery() {

    const modal =
        document.getElementById(
            'rendersGallery'
        );

    if (!modal) {
        return;
    }

    modal.classList.remove(
        'visible'
    );

    modal.setAttribute(
        'aria-hidden',
        'true'
    );

    document.body.classList.remove(
        'renders-gallery-open'
    );
}


function movePublicRendersGallery(
    direction
) {

    if (
        publicRenders.length <=
        1
    ) {
        return;
    }

    publicRenderIndex =
        (
            publicRenderIndex +
            direction +
            publicRenders.length
        ) %
        publicRenders.length;

    renderPublicRendersGallery();
}


loadPublicRenders();
