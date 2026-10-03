import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';


/* ============================================================
   CONFIGURACIÓN DE MATERIALES
============================================================ */

// Pon true para ver en la consola (F12) el nombre y color de cada
// material del GLB. Sirve para saber cuáles salen con otro color.
const DEBUG_MATERIALS = true;

// Fuerza el color de materiales concretos por nombre (hex sRGB).
// Ejemplo: { 'Silla': 0xffffff, 'Blanco_02': 0xffffff }
const MATERIAL_OVERRIDES = {
    // 'nombre_del_material': 0xffffff,
};

// Pon true si hay caras que se ven mal porque SketchUp las exportó
// con la cara posterior hacia afuera (renderiza ambos lados).
const FORCE_DOUBLE_SIDE = false;

// Imita SketchUp: en materiales de doble lado, el lado frontal usa el
// color del material y el lado posterior se pinta con BACK_FACE_COLOR.
const SPLIT_BACK_FACES = false;
const BACK_FACE_COLOR = 0xffffff;

// Materiales que SÍ deben verse igual por ambos lados (nombre exacto).
const BACK_FACE_EXCEPT = [
    // 'nombre_del_material',
];

// Multiplicador de saturación para colores con color propio.
// 1.0 = color exacto del GLB (igual que SketchUp).
const SATURATION_BOOST = 1.0;

// Intensidades de luz. La suma sobre una cara horizontal (ambiente +
// hemisferio + direccional) debe quedar <= 1.0; si pasa de 1, el canal
// dominante se satura y el color se ve lavado (rojo -> rosa).
// Iluminación estilo SketchUp: una luz ambiente + una luz pegada a la
// cámara ("headlight"). Una cara que mira de frente a la cámara recibe
// AMBIENT + HEADLIGHT = 1.0 => color EXACTO del material (como SketchUp).
// Las caras oblicuas (piso, paredes laterales) salen más oscuras.
// Mantén AMBIENT + HEADLIGHT = 1.0.
const AMBIENT_INTENSITY = 0.65;
const HEADLIGHT_INTENSITY = 0.15;

// Materiales con opacidad >= este valor se tratan como opacos.
// Evita mezclas/tintes raros por materiales marcados "transparent"
// con opacidad casi 1 (los vidrios reales, con menos opacidad, se mantienen).
const OPAQUE_THRESHOLD = 0.2;


export function createViewer(options = {}) {

    const container = options.container;
    const modelUrl = options.modelUrl;

    if (!container) {
        throw new Error('No se encontró el contenedor del visor.');
    }

    if (!modelUrl) {
        throw new Error('No se indicó la ruta del modelo GLB.');
    }

    // El visor de administración no tiene colisiones
    const collisions = container.id !== 'adminViewer';


    /* ============================================================
       ESCENA + FONDO (gradiente cielo → suelo)
    ============================================================ */

    const scene = new THREE.Scene();

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 2;
    bgCanvas.height = 512;

    const bgContext = bgCanvas.getContext('2d');
    const bgGradient = bgContext.createLinearGradient(0, 0, 0, 512);
    bgGradient.addColorStop(0.0, '#4fa8e8');
    bgGradient.addColorStop(0.55, '#a8d4f0');
    bgGradient.addColorStop(0.65, '#e8e8e8');
    bgGradient.addColorStop(1.0, '#e0dddd');
    bgContext.fillStyle = bgGradient;
    bgContext.fillRect(0, 0, 2, 512);

    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    bgTexture.colorSpace = THREE.SRGBColorSpace;
    scene.background = bgTexture;


    /* ============================================================
       CÁMARA + RENDERER
    ============================================================ */

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 10000);
    camera.position.set(7, 1.80, 7);

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
    });

    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const maxPixelRatio = Math.min(
        window.devicePixelRatio || 1,
        isMobile ? 1.25 : 1.5
    );

    let currentPixelRatio = maxPixelRatio;

    renderer.setPixelRatio(currentPixelRatio);
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;

    container.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(width, height);

    Object.assign(labelRenderer.domElement.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
    });

    container.appendChild(labelRenderer.domElement);


    /* ============================================================
       CONTROLES
       - Clic izquierdo: orbitar (OrbitControls)
       - Clic derecho: mirar alrededor (manual, más abajo)
       - Rueda: avanzar/retroceder (manual, más abajo)
       Por eso se desactivan el pan derecho y el zoom de OrbitControls,
       que peleaban con los controles manuales.
    ============================================================ */

    const controls = new OrbitControls(camera, renderer.domElement);

    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableZoom = false;
    controls.mouseButtons.RIGHT = null;
    controls.minDistance = 0;
    controls.maxDistance = 1000;


    /* ============================================================
       PARÁMETROS DE MOVIMIENTO
    ============================================================ */

    const WALK_HEIGHT = 1.80;
    const MOVE_SPEED = 4;
    const RUN_MULTIPLIER = 5;
    const VERTICAL_SPEED = 4;
    const WHEEL_SPEED = 4;
    const MOUSE_SENSITIVITY = 0.004;
    const CAMERA_RADIUS = 0.18;
    const MIN_CAMERA_HEIGHT = 0.5;
    const DEFAULT_MAX_CAMERA_HEIGHT = 12.0;

    const keys = new Set();

    let yaw = 0;
    let pitch = 0;
    let looking = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    let model = null;
    let modelSize = new THREE.Vector3(1, 1, 1);
    let modelCenter = new THREE.Vector3();

    const meshes = [];
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();


    /* ============================================================
       FPS ADAPTATIVO
       Baja el pixelRatio si el promedio cae de 40 FPS y lo sube
       si sobra rendimiento (hasta el máximo).
    ============================================================ */

    const fpsSamples = [];
    let fpsCheckTimer = 0;

    function applyPixelRatio() {
        renderer.setPixelRatio(currentPixelRatio);
        renderer.setSize(
            Math.max(container.clientWidth, 1),
            Math.max(container.clientHeight, 1),
            false
        );
    }

    function checkFPS(delta) {

        if (delta <= 0) {
            return;
        }

        fpsSamples.push(1 / delta);

        if (fpsSamples.length > 30) {
            fpsSamples.shift();
        }

        fpsCheckTimer += delta;

        if (fpsCheckTimer < 2) {
            return;
        }

        fpsCheckTimer = 0;

        const avgFPS =
            fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;

        const minPixelRatio = 1.0;

        if (avgFPS < 40 && currentPixelRatio > minPixelRatio) {

            currentPixelRatio = Math.max(currentPixelRatio - 0.25, minPixelRatio);
            applyPixelRatio();

        } else if (avgFPS > 58 && currentPixelRatio < maxPixelRatio) {

            currentPixelRatio = Math.min(currentPixelRatio + 0.25, maxPixelRatio);
            applyPixelRatio();
        }
    }


    /* ============================================================
       ORIENTACIÓN DE CÁMARA
    ============================================================ */

    function clampPitch() {
        const limit = THREE.MathUtils.degToRad(82);
        pitch = THREE.MathUtils.clamp(pitch, -limit, limit);
    }

    function updateCameraRotation() {

        const direction = new THREE.Vector3(0, 0, -1)
            .applyEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));

        const target = camera.position
            .clone()
            .add(direction.multiplyScalar(10));

        controls.target.copy(target);
        camera.lookAt(target);
    }

    function syncAnglesFromCamera() {

        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);

        yaw = Math.atan2(-direction.x, -direction.z);
        pitch = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1));

        clampPitch();
    }

    function setCameraHeight() {

        const maxHeight = model
            ? Math.max(DEFAULT_MAX_CAMERA_HEIGHT, modelSize.y * 2.5)
            : DEFAULT_MAX_CAMERA_HEIGHT;

        if (!Number.isFinite(camera.position.y)) {
            camera.position.y = WALK_HEIGHT;
        }

        camera.position.y = THREE.MathUtils.clamp(
            camera.position.y,
            MIN_CAMERA_HEIGHT,
            maxHeight
        );
    }


    /* ============================================================
       MOVIMIENTO + COLISIONES
    ============================================================ */

    function firstMeshHit(hits) {

        const hit = hits.find(h => !h.object.userData.isEdgeLine);

        if (!hit) {
            return null;
        }

        if (hit.object.userData.isBackFace) {
            hit.object = hit.object.parent;
            hit.isBackFace = true;
        }

        return hit;
    }

    function moveWithCollision(direction, distance) {

        if (distance === 0 || !direction.lengthSq()) {
            return;
        }

        const normalized = direction.clone().normalize();

        if (!collisions) {
            camera.position.addScaledVector(normalized, distance);
            return;
        }

        let allowedDistance = Math.abs(distance);

        const moveDirection = normalized.multiplyScalar(Math.sign(distance));

        if (model && meshes.length) {

            raycaster.set(camera.position, moveDirection);

            const hit = firstMeshHit(raycaster.intersectObjects(meshes, true));

            if (hit) {
                allowedDistance = hit.distance <= CAMERA_RADIUS
                    ? 0
                    : Math.min(allowedDistance, hit.distance - CAMERA_RADIUS);
            }
        }

        camera.position.addScaledVector(moveDirection, allowedDistance);
    }

    function moveForward(amount) {
        moveWithCollision(
            new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)),
            amount
        );
    }

    function moveRight(amount) {
        moveWithCollision(
            new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)),
            amount
        );
    }

    function moveByKeyboard(delta) {

        let forward = 0;
        let strafe = 0;
        let vertical = 0;

        if (keys.has('KeyW') || keys.has('ArrowUp')) forward += 1;
        if (keys.has('KeyS') || keys.has('ArrowDown')) forward -= 1;
        if (keys.has('KeyD') || keys.has('ArrowRight')) strafe += 1;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) strafe -= 1;

        if (keys.has('KeyE')) vertical += 1;
        if (keys.has('KeyQ')) vertical -= 1;

        if (forward === 0 && strafe === 0 && vertical === 0) {
            return;
        }

        const length = Math.hypot(forward, strafe);

        if (length > 0) {
            forward /= length;
            strafe /= length;
        }

        const speedMultiplier =
            keys.has('ShiftLeft') || keys.has('ShiftRight')
                ? RUN_MULTIPLIER
                : 1;

        const distance = MOVE_SPEED * speedMultiplier * delta;

        if (forward !== 0) {
            moveForward(forward * distance);
        }

        if (strafe !== 0) {
            moveRight(strafe * distance);
        }

        if (vertical !== 0) {
            camera.position.y +=
                vertical *
                VERTICAL_SPEED *
                speedMultiplier *
                delta;

            setCameraHeight();
        }
    }


    /* ============================================================
       EVENTOS
    ============================================================ */

    const ALLOWED_KEYS = new Set([
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
        'KeyE',
        'KeyQ',
        'ShiftLeft',
        'ShiftRight',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight'
    ]);

    function isEditableTarget(target) {

        if (!target) {
            return false;
        }

        const element = target instanceof HTMLElement
            ? target
            : target.parentElement;

        if (!element) {
            return false;
        }

        return Boolean(
            element.closest(
                'input, textarea, select, button, [contenteditable="true"]'
            )
        );
    }

    const canvas = renderer.domElement;

    canvas.tabIndex = 0;
    canvas.style.outline = 'none';
    canvas.style.touchAction = 'none';

    function onMouseDown(event) {

        canvas.focus();

        if (event.button !== 2) {
            return;
        }

        looking = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;

        event.preventDefault();
    }

    function onContextMenu(event) {
        event.preventDefault();
    }

    function onMouseUp(event) {

        if (event.button === 2) {
            looking = false;
        }
    }

    function onMouseMove(event) {

        if (!looking) {
            return;
        }

        const dx = event.clientX - lastMouseX;
        const dy = event.clientY - lastMouseY;

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;

        yaw -= dx * MOUSE_SENSITIVITY;
        pitch -= dy * MOUSE_SENSITIVITY;

        clampPitch();
        updateCameraRotation();
    }

    function onWheel(event) {

        event.preventDefault();

        moveForward(
            (event.deltaY > 0 ? -1 : 1) * WHEEL_SPEED
        );

        setCameraHeight();
        updateCameraRotation();
    }


    /* ============================================================
       TECLADO
       Se acepta tanto event.code como event.key.
       Esto evita problemas con distintos layouts de teclado.
    ============================================================ */

    function normalizeMovementKey(event) {

        if (event.code && ALLOWED_KEYS.has(event.code)) {
            return event.code;
        }

        const key = String(event.key || '').toLowerCase();

        const keyMap = {
            w: 'KeyW',
            a: 'KeyA',
            s: 'KeyS',
            d: 'KeyD',
            q: 'KeyQ',
            e: 'KeyE',
            arrowup: 'ArrowUp',
            arrowdown: 'ArrowDown',
            arrowleft: 'ArrowLeft',
            arrowright: 'ArrowRight'
        };

        return keyMap[key] || null;
    }

    function onKeyDown(event) {

        if (isEditableTarget(event.target)) {
            return;
        }

        const movementKey = normalizeMovementKey(event);

        if (!movementKey) {
            return;
        }

        keys.add(movementKey);

        event.preventDefault();
        event.stopPropagation();
    }

    function onKeyUp(event) {

        if (isEditableTarget(event.target)) {
            return;
        }

        const movementKey = normalizeMovementKey(event);

        if (movementKey) {
            keys.delete(movementKey);
        }
    }

    function onBlur() {
        keys.clear();
        looking = false;
    }


    /* ============================================================
       DEBUG DE MATERIALES
    ============================================================ */

    function onDebugClick(event) {

        const hit = raycast(event);

        if (!hit) {
            return;
        }

        const material = Array.isArray(hit.object.material)
            ? hit.object.material[hit.face?.materialIndex ?? 0]
            : hit.object.material;

        console.log(
            'CLIC ->',
            'objeto:', hit.object.userData.originalName,
            '| material:', material?.name || '(sin nombre)',
            '| color: #' +
                (material?.color?.getHexString(THREE.SRGBColorSpace) ?? '?'),
            '| cara vista:',
            hit.isBackFace ? 'POSTERIOR' : 'frontal'
        );
    }

    if (DEBUG_MATERIALS) {
        canvas.addEventListener('click', onDebugClick);
    }

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('blur', onBlur);

    document.addEventListener(
        'keydown',
        onKeyDown,
        {
            passive: false,
            capture: true
        }
    );

    document.addEventListener(
        'keyup',
        onKeyUp,
        {
            capture: true
        }
    );

    syncAnglesFromCamera();
    setCameraHeight();
    updateCameraRotation();


    /* ============================================================
       ILUMINACIÓN ESTILO SKETCHUP
    ============================================================ */

    scene.add(
        new THREE.AmbientLight(
            0xffffff,
            Math.PI * AMBIENT_INTENSITY
        )
    );

    scene.add(camera);

    const headLight = new THREE.DirectionalLight(
        0xffffff,
        Math.PI * HEADLIGHT_INTENSITY
    );

    headLight.position.set(0, 0, 0);

    headLight.target.position.set(0, 0, -1);

    camera.add(headLight);
    camera.add(headLight.target);


    /* ============================================================
       SUELO
    ============================================================ */

    const floorGeometry = new THREE.PlaneGeometry(200, 200);

    const floorMaterial =
        new THREE.MeshLambertMaterial({
            color: 0xd8d8d8
        });

    const floor = new THREE.Mesh(
        floorGeometry,
        floorMaterial
    );

    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.002;

    scene.add(floor);


    /* ============================================================
       SOMBRA DE CONTACTO
    ============================================================ */

    const contactShadowCanvas =
        document.createElement('canvas');

    contactShadowCanvas.width = 256;
    contactShadowCanvas.height = 256;

    const contactShadowContext =
        contactShadowCanvas.getContext('2d');

    const contactGradient =
        contactShadowContext.createRadialGradient(
            128,
            128,
            0,
            128,
            128,
            128
        );

    contactGradient.addColorStop(
        0.0,
        'rgba(0, 0, 0, 0.35)'
    );

    contactGradient.addColorStop(
        0.5,
        'rgba(0, 0, 0, 0.15)'
    );

    contactGradient.addColorStop(
        1.0,
        'rgba(0, 0, 0, 0.0)'
    );

    contactShadowContext.fillStyle =
        contactGradient;

    contactShadowContext.fillRect(
        0,
        0,
        256,
        256
    );

    const contactShadowTexture =
        new THREE.CanvasTexture(
            contactShadowCanvas
        );

    contactShadowTexture.colorSpace =
        THREE.SRGBColorSpace;

    const contactShadowMaterial =
        new THREE.MeshBasicMaterial({
            map: contactShadowTexture,
            transparent: true,
            depthWrite: false,
            opacity: 0.85
        });

    const contactShadowGeometry =
        new THREE.PlaneGeometry(1, 1);

    const contactShadow =
        new THREE.Mesh(
            contactShadowGeometry,
            contactShadowMaterial
        );

    contactShadow.rotation.x =
        -Math.PI / 2;

    contactShadow.position.y =
        0.001;

    contactShadow.visible = false;

    scene.add(contactShadow);


    /* ============================================================
       CARGA DEL MODELO
    ============================================================ */

    const loader = new GLTFLoader();

    const maxAnisotropy =
        renderer.capabilities.getMaxAnisotropy();

    const edgeCache = new WeakMap();
    const edgeGeometries = [];
    const loggedMaterials = new Set();


    /* ============================================================
       MATERIALES
    ============================================================ */

    function prepareMaterial(
        material,
        forceFront = false
    ) {

        if (!material) {
            return material;
        }

        if (
            DEBUG_MATERIALS &&
            !loggedMaterials.has(material.uuid)
        ) {

            loggedMaterials.add(material.uuid);

            console.log(
                'MATERIAL:',
                material.name || '(sin nombre)',
                material.color
                    ? '#' +
                      material.color.getHexString(
                          THREE.SRGBColorSpace
                      )
                    : 'sin color',
                material.map
                    ? 'con textura'
                    : 'sin textura',
                'side=' + material.side
            );
        }

        [
            material.map,
            material.emissiveMap
        ].forEach(texture => {

            if (!texture) {
                return;
            }

            texture.colorSpace =
                THREE.SRGBColorSpace;

            texture.anisotropy =
                maxAnisotropy;

            texture.minFilter =
                THREE.LinearMipmapLinearFilter;

            texture.magFilter =
                THREE.LinearFilter;

            texture.generateMipmaps =
                true;

            texture.needsUpdate =
                true;
        });

        const baseColor =
            material.color
                ? material.color.clone()
                : new THREE.Color(0xffffff);

        const hasOverride =
            MATERIAL_OVERRIDES[
                material.name
            ] !== undefined;

        if (hasOverride) {

            baseColor.set(
                MATERIAL_OVERRIDES[
                    material.name
                ]
            );

        } else if (!material.map) {

            const hsl = {
                h: 0,
                s: 0,
                l: 0
            };

            baseColor.getHSL(
                hsl,
                THREE.SRGBColorSpace
            );

            const isGrayish =
                hsl.s < 0.12 &&
                hsl.l > 0.4 &&
                hsl.l < 0.98;

            if (isGrayish) {
                baseColor.setRGB(
                    1,
                    1,
                    1
                );
            }
        }

        const rawOpacity =
            material.opacity !== undefined
                ? material.opacity
                : 1.0;

        const isReallyTransparent =
            (material.transparent || false) &&
            rawOpacity < OPAQUE_THRESHOLD;

        const lambert =
            new THREE.MeshLambertMaterial({
                color: baseColor,
                map: material.map || null,

                emissive:
                    material.emissive
                        ? material.emissive.clone()
                        : new THREE.Color(0x000000),

                emissiveMap:
                    material.emissiveMap || null,

                transparent:
                    isReallyTransparent,

                opacity:
                    isReallyTransparent
                        ? rawOpacity
                        : 1.0,

                side:
                    forceFront
                        ? THREE.FrontSide
                        : FORCE_DOUBLE_SIDE
                            ? THREE.DoubleSide
                            : (
                                material.side ||
                                THREE.FrontSide
                            ),

                alphaMap:
                    material.alphaMap || null,

                alphaTest:
                    material.alphaTest || 0,

                depthWrite:
                    material.depthWrite !== undefined
                        ? material.depthWrite
                        : true,

                depthTest:
                    material.depthTest !== undefined
                        ? material.depthTest
                        : true
            });

        if (
            !hasOverride &&
            SATURATION_BOOST !== 1.0
        ) {

            const hsl = {
                h: 0,
                s: 0,
                l: 0
            };

            lambert.color.getHSL(
                hsl,
                THREE.SRGBColorSpace
            );

            if (hsl.s > 0.1) {

                lambert.color.setHSL(
                    hsl.h,
                    Math.min(
                        hsl.s *
                        SATURATION_BOOST,
                        1.0
                    ),
                    hsl.l,
                    THREE.SRGBColorSpace
                );
            }
        }

        lambert.name =
            material.name || '';

        material.dispose();

        return lambert;
    }


    /* ============================================================
       ARISTAS
    ============================================================ */

    function createEdgeLines(
        geometry,
        thresholdAngle = 60
    ) {

        let edgesGeometry =
            edgeCache.get(geometry);

        if (!edgesGeometry) {

            edgesGeometry =
                new THREE.EdgesGeometry(
                    geometry,
                    thresholdAngle
                );

            edgeCache.set(
                geometry,
                edgesGeometry
            );

            edgeGeometries.push(
                edgesGeometry
            );
        }

        const edgeLines =
            new THREE.LineSegments(
                edgesGeometry,
                new THREE.LineBasicMaterial({
                    color: 0x000000,
                    transparent: true,
                    opacity: 0.2,
                    depthWrite: false
                })
            );

        edgeLines.userData.isEdgeLine =
            true;

        edgeLines.renderOrder = 1;

        return edgeLines;
    }


    const backMaterial =
        new THREE.MeshLambertMaterial({
            color: BACK_FACE_COLOR,
            side: THREE.BackSide
        });

    const hiddenMaterial =
        new THREE.MeshBasicMaterial({
            visible: false
        });

    function shouldSplitBack(material) {

        return (
            SPLIT_BACK_FACES &&
            material &&
            material.side === THREE.DoubleSide &&
            !material.transparent &&
            !BACK_FACE_EXCEPT.includes(
                material.name
            )
        );
    }

    function prepareModel(object) {

        meshes.length = 0;

        const found = [];

        object.traverse(child => {

            if (child.isMesh) {
                found.push(child);
            }
        });

        found.forEach(
            (child, index) => {

                child.userData.meshIndex =
                    index;

                child.userData.originalName =
                    child.name ||
                    `Objeto ${index + 1}`;

                const originals =
                    Array.isArray(
                        child.material
                    )
                        ? child.material
                        : [child.material];

                const splits =
                    originals.map(
                        shouldSplitBack
                    );

                const converted =
                    originals.map(
                        (material, i) =>
                            prepareMaterial(
                                material,
                                splits[i]
                            )
                    );

                child.material =
                    Array.isArray(
                        child.material
                    )
                        ? converted
                        : converted[0];

                if (
                    splits.some(Boolean) &&
                    child.geometry
                ) {

                    const backMesh =
                        new THREE.Mesh(
                            child.geometry,
                            Array.isArray(
                                child.material
                            )
                                ? splits.map(
                                    s =>
                                        s
                                            ? backMaterial
                                            : hiddenMaterial
                                )
                                : backMaterial
                        );

                    backMesh.userData.isBackFace =
                        true;

                    child.add(backMesh);
                }

                if (child.geometry) {

                    child.add(
                        createEdgeLines(
                            child.geometry,
                            60
                        )
                    );
                }

                meshes.push(child);
            }
        );
    }


    /* ============================================================
       CENTRADO DEL MODELO
    ============================================================ */

    function centerModel() {

        if (!model) {
            return null;
        }

        const box =
            new THREE.Box3()
                .setFromObject(model);

        const center =
            box.getCenter(
                new THREE.Vector3()
            );

        model.position.x -=
            center.x;

        model.position.z -=
            center.z;

        model.position.y -=
            box.min.y;

        const finalBox =
            new THREE.Box3()
                .setFromObject(model);

        modelSize =
            finalBox.getSize(
                new THREE.Vector3()
            );

        modelCenter =
            finalBox.getCenter(
                new THREE.Vector3()
            );

        const contactRadius =
            Math.max(
                modelSize.x,
                modelSize.z
            ) * 1.05;

        contactShadow.scale.set(
            contactRadius,
            contactRadius,
            1
        );

        contactShadow.position.x =
            0;

        contactShadow.position.z =
            0;

        contactShadow.visible =
            true;

        return {
            box: finalBox,
            size: modelSize.clone(),
            center: modelCenter.clone()
        };
    }


    function fitCamera(
        multiplier = 1.45
    ) {

        if (!model) {
            return;
        }

        const maxSize =
            Math.max(
                modelSize.x,
                modelSize.y,
                modelSize.z
            );

        const distance =
            maxSize * multiplier;

        camera.position.set(
            distance,
            WALK_HEIGHT,
            distance
        );

        camera.near =
            Math.max(
                maxSize / 1000,
                0.01
            );

        camera.far =
            Math.max(
                maxSize * 100,
                1000
            );

        camera.updateProjectionMatrix();

        controls.minDistance =
            0.5;

        controls.maxDistance =
            Math.max(
                maxSize * 20,
                1000
            );

        syncAnglesFromCamera();
        setCameraHeight();
        updateCameraRotation();
    }


    /* ============================================================
       GLB
    ============================================================ */

    const modelPromise =
        new Promise(
            (resolve, reject) => {

                loader.load(

                    modelUrl,

                    gltf => {

                        try {

                            model =
                                gltf.scene;

                            scene.add(
                                model
                            );

                            prepareModel(
                                model
                            );

                            const info =
                                centerModel();

                            fitCamera();

                            resolve({
                                model,
                                size:
                                    info.size,
                                center:
                                    info.center,
                                meshes
                            });

                        } catch (error) {

                            console.error(
                                'Error preparando GLB:',
                                error
                            );

                            reject(error);
                        }
                    },

                    undefined,

                    error => {

                        console.error(
                            'Error cargando GLB:',
                            error
                        );

                        reject(error);
                    }
                );
            }
        );


    /* ============================================================
       UTILIDADES PÚBLICAS
    ============================================================ */

    function raycast(event) {

        if (!model) {
            return null;
        }

        const rect =
            canvas.getBoundingClientRect();

        mouse.x =
            (
                (event.clientX - rect.left) /
                rect.width
            ) * 2 - 1;

        mouse.y =
            -(
                (event.clientY - rect.top) /
                rect.height
            ) * 2 + 1;

        raycaster.setFromCamera(
            mouse,
            camera
        );

        return firstMeshHit(
            raycaster.intersectObject(
                model,
                true
            )
        );
    }

    function localPositionFromHit(hit) {

        if (!hit || !model) {
            return null;
        }

        return model.worldToLocal(
            hit.point.clone()
        );
    }

    function worldPositionFromLocal(
        position
    ) {

        if (!position || !model) {
            return null;
        }

        return model.localToWorld(
            new THREE.Vector3(
                position.x,
                position.y,
                position.z
            )
        );
    }

    function getMeshByIndex(index) {
        return meshes[index] || null;
    }

    function createLabel(
        text,
        className = 'viewer-hotspot-label'
    ) {

        const element =
            document.createElement(
                'div'
            );

        element.className =
            className;

        element.textContent =
            text;

        const object =
            new CSS2DObject(
                element
            );

        return {
            object,
            element
        };
    }

    function resize() {

        const newWidth =
            Math.max(
                container.clientWidth,
                1
            );

        const newHeight =
            Math.max(
                container.clientHeight,
                1
            );

        camera.aspect =
            newWidth / newHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            newWidth,
            newHeight,
            false
        );

        labelRenderer.setSize(
            newWidth,
            newHeight
        );
    }

    window.addEventListener(
        'resize',
        resize
    );

    function getCameraState() {

        return {
            position:
                camera.position.clone(),

            target:
                controls.target.clone()
        };
    }

    function setCameraState(
        state,
        smooth = true
    ) {

        if (!state) {
            return;
        }

        const targetPosition =
            state.position instanceof
            THREE.Vector3
                ? state.position.clone()
                : new THREE.Vector3(
                    state.position?.x ??
                        camera.position.x,

                    state.position?.y ??
                        camera.position.y,

                    state.position?.z ??
                        camera.position.z
                );

        const targetLook =
            state.target instanceof
            THREE.Vector3
                ? state.target.clone()
                : new THREE.Vector3(
                    state.target?.x ??
                        controls.target.x,

                    state.target?.y ??
                        controls.target.y,

                    state.target?.z ??
                        controls.target.z
                );

        if (!smooth) {

            camera.position.copy(
                targetPosition
            );

            controls.target.copy(
                targetLook
            );

            setCameraHeight();

            camera.lookAt(
                controls.target
            );

            syncAnglesFromCamera();

            controls.update();

            return;
        }

        const startPosition =
            camera.position.clone();

        const startTarget =
            controls.target.clone();

        const startTime =
            performance.now();

        const duration =
            500;

        function animateCamera(now) {

            const progress =
                Math.min(
                    (now - startTime) /
                        duration,
                    1
                );

            const eased =
                progress *
                progress *
                (3 - 2 * progress);

            camera.position.lerpVectors(
                startPosition,
                targetPosition,
                eased
            );

            controls.target.lerpVectors(
                startTarget,
                targetLook,
                eased
            );

            setCameraHeight();

            camera.lookAt(
                controls.target
            );

            syncAnglesFromCamera();

            controls.update();

            if (progress < 1) {

                requestAnimationFrame(
                    animateCamera
                );
            }
        }

        requestAnimationFrame(
            animateCamera
        );
    }

    function zoomBy(multiplier) {

        if (
            !Number.isFinite(
                multiplier
            ) ||
            multiplier <= 0
        ) {
            return;
        }

        const offset =
            camera.position
                .clone()
                .sub(
                    controls.target
                );

        const currentDistance =
            offset.length();

        if (!currentDistance) {
            return;
        }

        const distance =
            THREE.MathUtils.clamp(
                currentDistance *
                    multiplier,
                controls.minDistance,
                controls.maxDistance
            );

        offset.normalize()
            .multiplyScalar(
                distance
            );

        camera.position.copy(
            controls.target
                .clone()
                .add(offset)
        );

        setCameraHeight();

        camera.lookAt(
            controls.target
        );

        syncAnglesFromCamera();

        controls.update();
    }


    /* ============================================================
       BUCLE DE RENDER
    ============================================================ */

    let animationFrame;
    let lastTime = 0;

    function animate() {

        animationFrame =
            requestAnimationFrame(
                animate
            );

        const now =
            performance.now();

        if (!lastTime) {
            lastTime = now;
        }

        const delta =
            Math.min(
                (now - lastTime) / 1000,
                0.1
            );

        lastTime = now;

        checkFPS(delta);

        moveByKeyboard(delta);

        setCameraHeight();

        updateCameraRotation();

        controls.update();

        renderer.render(
            scene,
            camera
        );

        labelRenderer.render(
            scene,
            camera
        );
    }

    animate();


    /* ============================================================
       API PÚBLICA
    ============================================================ */

    return {

        THREE,
        scene,
        camera,
        renderer,
        labelRenderer,
        controls,
        loader,
        modelPromise,

        get model() {
            return model;
        },

        get modelSize() {
            return modelSize.clone();
        },

        get modelCenter() {
            return modelCenter.clone();
        },

        meshes,

        fitCamera,
        getCameraState,
        setCameraState,
        zoomBy,
        resize,
        raycast,
        localPositionFromHit,
        worldPositionFromLocal,
        getMeshByIndex,
        createLabel,

        destroy() {

            cancelAnimationFrame(
                animationFrame
            );

            window.removeEventListener(
                'resize',
                resize
            );

            window.removeEventListener(
                'mouseup',
                onMouseUp
            );

            window.removeEventListener(
                'mousemove',
                onMouseMove
            );

            window.removeEventListener(
                'blur',
                onBlur
            );

            document.removeEventListener(
                'keydown',
                onKeyDown,
                { capture: true }
            );

            document.removeEventListener(
                'keyup',
                onKeyUp,
                { capture: true }
            );

            canvas.removeEventListener(
                'mousedown',
                onMouseDown
            );

            canvas.removeEventListener(
                'contextmenu',
                onContextMenu
            );

            canvas.removeEventListener(
                'wheel',
                onWheel
            );

            canvas.removeEventListener(
                'click',
                onDebugClick
            );

            backMaterial.dispose();
            hiddenMaterial.dispose();

            keys.clear();

            looking = false;

            controls.dispose();

            renderer.dispose();

            canvas.parentNode
                ?.removeChild(
                    canvas
                );

            labelRenderer
                .domElement
                .parentNode
                ?.removeChild(
                    labelRenderer.domElement
                );

            if (model) {

                model.traverse(
                    child => {

                        if (!child.isMesh) {
                            return;
                        }

                        child.geometry
                            ?.dispose();

                        const materials =
                            Array.isArray(
                                child.material
                            )
                                ? child.material
                                : [child.material];

                        materials.forEach(
                            material => {

                                if (!material) {
                                    return;
                                }

                                Object.keys(
                                    material
                                ).forEach(
                                    key => {

                                        const value =
                                            material[
                                                key
                                            ];

                                        if (
                                            value &&
                                            value.isTexture
                                        ) {

                                            value.dispose();
                                        }
                                    }
                                );

                                material.dispose();
                            }
                        );

                        child.children
                            .forEach(
                                line => {

                                    if (
                                        line.isLineSegments
                                    ) {

                                        line.material
                                            ?.dispose();
                                    }
                                }
                            );
                    }
                );
            }

            edgeGeometries.forEach(
                geometry =>
                    geometry.dispose()
            );

            floorGeometry.dispose();
            floorMaterial.dispose();

            contactShadowTexture.dispose();
            contactShadowGeometry.dispose();
            contactShadowMaterial.dispose();

            bgTexture.dispose();
        }
    };
}