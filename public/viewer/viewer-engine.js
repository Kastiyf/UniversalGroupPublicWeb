import * as THREE from 'three';

import {
    OrbitControls
} from 'three/addons/controls/OrbitControls.js';

import {
    GLTFLoader
} from 'three/addons/loaders/GLTFLoader.js';

import {
    CSS2DRenderer,
    CSS2DObject
} from 'three/addons/renderers/CSS2DRenderer.js';

import {
    RoomEnvironment
} from 'three/addons/environments/RoomEnvironment.js';


export function createViewer(options = {}) {

    const container = options.container;
    const modelUrl = options.modelUrl;

    const collisions =
        container.id !== 'adminViewer';

    if (!container) {
        throw new Error(
            'No se encontró el contenedor del visor.'
        );
    }

    if (!modelUrl) {
        throw new Error(
            'No se indicó la ruta del modelo GLB.'
        );
    }


    const scene =
        new THREE.Scene();

    scene.background =
        new THREE.Color(0xe9e9e9);


    const width =
        Math.max(
            container.clientWidth,
            1
        );

    const height =
        Math.max(
            container.clientHeight,
            1
        );


    const camera =
        new THREE.PerspectiveCamera(
            45,
            width / height,
            0.01,
            10000
        );


    camera.position.set(
        7,
        1.80,
        7
    );


    const renderer =
        new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });


    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio || 1,
            1.35
        )
    );


    renderer.setSize(
        width,
        height,
        false
    );


    renderer.outputColorSpace =
        THREE.SRGBColorSpace;


    renderer.toneMapping =
        THREE.ACESFilmicToneMapping;


    renderer.toneMappingExposure =
        0.88;


    renderer.shadowMap.enabled =
        true;


    renderer.shadowMap.type =
        THREE.PCFSoftShadowMap;


    container.appendChild(
        renderer.domElement
    );


    const labelRenderer =
        new CSS2DRenderer();


    labelRenderer.setSize(
        width,
        height
    );


    labelRenderer.domElement.style.position =
        'absolute';


    labelRenderer.domElement.style.left =
        '0';


    labelRenderer.domElement.style.top =
        '0';


    labelRenderer.domElement.style.width =
        '100%';


    labelRenderer.domElement.style.height =
        '100%';


    labelRenderer.domElement.style.pointerEvents =
        'none';


    container.appendChild(
        labelRenderer.domElement
    );


    const controls =
        new OrbitControls(
            camera,
            renderer.domElement
        );


    controls.enabled =
        false;


    controls.enablePan =
        false;


    controls.enableZoom =
        false;


    controls.enableRotate =
        false;


    controls.minDistance =
        0.5;


    controls.maxDistance =
        1000;


    const WALK_HEIGHT =
        1.80;


    const MOVE_SPEED =
        10000.0;


    const RUN_MULTIPLIER =
        1.5;


    const VERTICAL_SPEED =
        3000.0;


    const WHEEL_SPEED =
        3000.0;


    const MOUSE_SENSITIVITY =
        0.0025;


    const CAMERA_RADIUS =
        0.18;


    const MIN_CAMERA_HEIGHT =
        0.5;


    const DEFAULT_MAX_CAMERA_HEIGHT =
        12.0;


    const keys =
        new Set();


    let yaw =
        0;


    let pitch =
        0;


    let looking =
        false;


    let lastMouseX =
        0;


    let lastMouseY =
        0;


    let model =
        null;


    let modelSize =
        new THREE.Vector3(
            1,
            1,
            1
        );


    let modelCenter =
        new THREE.Vector3();


    const meshes =
        [];


    const raycaster =
        new THREE.Raycaster();


    const mouse =
        new THREE.Vector2();


    function clampPitch() {

        const limit =
            THREE.MathUtils.degToRad(
                82
            );


        pitch =
            THREE.MathUtils.clamp(
                pitch,
                -limit,
                limit
            );
    }


    function updateCameraRotation() {

        const direction =
            new THREE.Vector3(
                0,
                0,
                -1
            );


        const euler =
            new THREE.Euler(
                pitch,
                yaw,
                0,
                'YXZ'
            );


        direction.applyEuler(
            euler
        );


        const target =
            camera.position
                .clone()
                .add(
                    direction.multiplyScalar(
                        10
                    )
                );


        controls.target.copy(
            target
        );


        camera.lookAt(
            target
        );
    }


    function syncAnglesFromCamera() {

        const direction =
            new THREE.Vector3();


        camera.getWorldDirection(
            direction
        );


        yaw =
            Math.atan2(
                -direction.x,
                -direction.z
            );


        pitch =
            Math.asin(
                THREE.MathUtils.clamp(
                    direction.y,
                    -1,
                    1
                )
            );


        clampPitch();
    }


    function setCameraHeight() {

        const maxHeight =
            model
                ? Math.max(
                    DEFAULT_MAX_CAMERA_HEIGHT,
                    modelSize.y * 2.5
                )
                : DEFAULT_MAX_CAMERA_HEIGHT;


        if (
            !Number.isFinite(
                camera.position.y
            )
        ) {

            camera.position.y =
                WALK_HEIGHT;
        }


        camera.position.y =
            THREE.MathUtils.clamp(
                camera.position.y,
                MIN_CAMERA_HEIGHT,
                maxHeight
            );
    }


    function moveWithCollision(
        direction,
        distance
    ) {

        if (
            distance === 0 ||
            !direction.lengthSq()
        ) {

            return;
        }


        if (
            !collisions
        ) {

            camera.position.addScaledVector(
                direction.clone().normalize(),
                distance
            );

            return;
        }


        const normalized =
            direction
                .clone()
                .normalize();


        let allowedDistance =
            Math.abs(
                distance
            );


        const moveDirection =
            normalized
                .clone()
                .multiplyScalar(
                    Math.sign(
                        distance
                    )
                );


        if (
            model &&
            meshes.length
        ) {

            raycaster.set(
                camera.position,
                moveDirection
            );


            const hits =
                raycaster.intersectObjects(
                    meshes,
                    true
                );


            if (
                hits.length
            ) {

                const hitDistance =
                    hits[0].distance;


                if (
                    hitDistance <=
                    CAMERA_RADIUS
                ) {

                    allowedDistance =
                        0;

                } else {

                    allowedDistance =
                        Math.min(
                            allowedDistance,
                            hitDistance -
                            CAMERA_RADIUS
                        );
                }
            }
        }


        camera.position.addScaledVector(
            moveDirection,
            allowedDistance
        );
    }


    function moveForward(
        amount
    ) {

        const forward =
            new THREE.Vector3(
                -Math.sin(yaw),
                0,
                -Math.cos(yaw)
            );


        moveWithCollision(
            forward,
            amount
        );
    }


    function moveRight(
        amount
    ) {

        const right =
            new THREE.Vector3(
                Math.cos(yaw),
                0,
                -Math.sin(yaw)
            );


        moveWithCollision(
            right,
            amount
        );
    }


    function moveByKeyboard(
        delta
    ) {

        let forward =
            0;


        let strafe =
            0;


        let vertical =
            0;


        if (
            keys.has(
                'KeyW'
            ) ||
            keys.has(
                'ArrowUp'
            )
        ) {

            forward +=
                1;
        }


        if (
            keys.has(
                'KeyS'
            ) ||
            keys.has(
                'ArrowDown'
            )
        ) {

            forward -=
                1;
        }


        if (
            keys.has(
                'KeyD'
            ) ||
            keys.has(
                'ArrowRight'
            )
        ) {

            strafe +=
                1;
        }


        if (
            keys.has(
                'KeyA'
            ) ||
            keys.has(
                'ArrowLeft'
            )
        ) {

            strafe -=
                1;
        }


        if (
            keys.has(
                'KeyE'
            )
        ) {

            vertical +=
                1;
        }


        if (
            keys.has(
                'KeyQ'
            )
        ) {

            vertical -=
                1;
        }


        if (
            forward === 0 &&
            strafe === 0 &&
            vertical === 0
        ) {

            return;
        }


        const length =
            Math.hypot(
                forward,
                strafe
            );


        if (
            length > 0
        ) {

            forward /=
                length;


            strafe /=
                length;
        }


        const speedMultiplier =
            keys.has(
                'ShiftLeft'
            ) ||
            keys.has(
                'ShiftRight'
            )
                ? RUN_MULTIPLIER
                : 1;


        const distance =
            MOVE_SPEED *
            speedMultiplier *
            delta;


        if (
            forward !== 0
        ) {

            moveForward(
                forward *
                distance
            );
        }


        if (
            strafe !== 0
        ) {

            moveRight(
                strafe *
                distance
            );
        }


        if (
            vertical !== 0
        ) {

            camera.position.y +=
                vertical *
                VERTICAL_SPEED *
                speedMultiplier *
                delta;


            setCameraHeight();
        }
    }


    function isEditableTarget(target) {

        if (!target) {
            return false;
        }

        const element =
            target instanceof HTMLElement
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


    function setupWalkControls() {

        renderer.domElement.tabIndex =
            0;


        renderer.domElement.style.outline =
            'none';


        renderer.domElement.style.touchAction =
            'none';


        renderer.domElement.addEventListener(
            'mousedown',
            event => {

                renderer.domElement.focus();


                if (
                    event.button !== 2
                ) {

                    return;
                }


                looking =
                    true;


                lastMouseX =
                    event.clientX;


                lastMouseY =
                    event.clientY;


                event.preventDefault();
            }
        );


        renderer.domElement.addEventListener(
            'contextmenu',
            event => {

                event.preventDefault();
            }
        );


        window.addEventListener(
            'mouseup',
            event => {

                if (
                    event.button === 2
                ) {

                    looking =
                        false;
                }
            }
        );


        window.addEventListener(
            'mousemove',
            event => {

                if (
                    !looking
                ) {

                    return;
                }


                const dx =
                    event.clientX -
                    lastMouseX;


                const dy =
                    event.clientY -
                    lastMouseY;


                lastMouseX =
                    event.clientX;


                lastMouseY =
                    event.clientY;


                yaw -=
                    dx *
                    MOUSE_SENSITIVITY;


                pitch -=
                    dy *
                    MOUSE_SENSITIVITY;


                clampPitch();


                updateCameraRotation();
            }
        );


        renderer.domElement.addEventListener(
            'wheel',
            event => {

                event.preventDefault();


                const direction =
                    event.deltaY > 0
                        ? -1
                        : 1;


                moveForward(
                    direction *
                    WHEEL_SPEED
                );


                setCameraHeight();


                updateCameraRotation();

            },
            {
                passive:
                    false
            }
        );


        document.addEventListener(
            'keydown',
            event => {

                if (isEditableTarget(event.target)) {
                    return;
                }


                const allowed =
                    event.code === 'KeyW' ||
                    event.code === 'KeyA' ||
                    event.code === 'KeyS' ||
                    event.code === 'KeyD' ||
                    event.code === 'KeyE' ||
                    event.code === 'KeyQ' ||
                    event.code === 'ShiftLeft' ||
                    event.code === 'ShiftRight' ||
                    event.code === 'ArrowUp' ||
                    event.code === 'ArrowDown' ||
                    event.code === 'ArrowLeft' ||
                    event.code === 'ArrowRight';


                if (
                    !allowed
                ) {

                    return;
                }


                keys.add(
                    event.code
                );


                event.preventDefault();


                event.stopPropagation();

            },
            {
                passive:
                    false,

                capture:
                    true
            }
        );


        document.addEventListener(
            'keyup',
            event => {

                if (isEditableTarget(event.target)) {
                    return;
                }

                keys.delete(
                    event.code
                );

            },
            {
                capture:
                    true
            }
        );


        window.addEventListener(
            'blur',
            () => {

                keys.clear();


                looking =
                    false;
            }
        );
    }


    setupWalkControls();


    syncAnglesFromCamera();


    setCameraHeight();


    updateCameraRotation();


    const hemisphereLight =
        new THREE.HemisphereLight(
            0xffffff,
            0x777777,
            0.78
        );


    scene.add(
        hemisphereLight
    );


    const keyLight =
        new THREE.DirectionalLight(
            0xffffff,
            1.35
        );


    keyLight.position.set(
        6,
        10,
        7
    );


    keyLight.castShadow =
        true;


    keyLight.shadow.mapSize.set(
        1024,
        1024
    );


    keyLight.shadow.camera.near =
        0.1;


    keyLight.shadow.camera.far =
        100;


    keyLight.shadow.bias =
        -0.00015;


    keyLight.shadow.normalBias =
        0.018;


    scene.add(
        keyLight
    );


    const fillLight =
        new THREE.DirectionalLight(
            0xffffff,
            0.28
        );


    fillLight.position.set(
        -6,
        5,
        -7
    );


    scene.add(
        fillLight
    );


    const pmremGenerator =
        new THREE.PMREMGenerator(
            renderer
        );


    const environment =
        new RoomEnvironment();


    const environmentTexture =
        pmremGenerator
            .fromScene(
                environment,
                0.04
            )
            .texture;


    scene.environment =
        environmentTexture;


    scene.environmentIntensity =
        0.20;


    environment.dispose();


    pmremGenerator.dispose();


    const floorGeometry =
        new THREE.PlaneGeometry(
            100,
            100
        );


    const floorMaterial =
        new THREE.MeshStandardMaterial({
            color:
                0xd7d7d7,

            roughness:
                0.88,

            metalness:
                0
        });


    const floor =
        new THREE.Mesh(
            floorGeometry,
            floorMaterial
        );


    floor.rotation.x =
        -Math.PI / 2;


    floor.position.y =
        -0.002;


    floor.receiveShadow =
        true;


    scene.add(
        floor
    );


    const loader =
        new GLTFLoader();


    function prepareMaterial(
        material
    ) {

        if (
            !material
        ) {

            return;
        }


        if (
            material.map
        ) {

            material.map.colorSpace =
                THREE.SRGBColorSpace;


            material.map.needsUpdate =
                true;
        }


        if (
            material.emissiveMap
        ) {

            material.emissiveMap.colorSpace =
                THREE.SRGBColorSpace;


            material.emissiveMap.needsUpdate =
                true;
        }


        if (
            material.normalMap
        ) {

            material.normalMap.needsUpdate =
                true;
        }


        if (
            material.roughnessMap
        ) {

            material.roughnessMap.needsUpdate =
                true;
        }


        if (
            material.metalnessMap
        ) {

            material.metalnessMap.needsUpdate =
                true;
        }


        if (
            material.aoMap
        ) {

            material.aoMap.needsUpdate =
                true;
        }


        if (
            'envMapIntensity'
            in material
        ) {

            material.envMapIntensity =
                0.35;
        }


        material.needsUpdate =
            true;
    }


    function prepareModel(
        object
    ) {

        meshes.length =
            0;


        let index =
            0;


        object.traverse(
            child => {

                if (
                    !child.isMesh
                ) {

                    return;
                }


                child.castShadow =
                    true;


                child.receiveShadow =
                    true;


                child.frustumCulled =
                    true;


                child.userData.meshIndex =
                    index;


                child.userData.originalName =
                    child.name ||
                    `Objeto ${index + 1}`;


                if (
                    Array.isArray(
                        child.material
                    )
                ) {

                    child.material.forEach(
                        prepareMaterial
                    );

                } else {

                    prepareMaterial(
                        child.material
                    );
                }


                meshes.push(
                    child
                );


                index++;
            }
        );
    }


    function centerModel() {

        if (
            !model
        ) {

            return null;
        }


        const box =
            new THREE.Box3()
                .setFromObject(
                    model
                );


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
                .setFromObject(
                    model
                );


        modelSize =
            finalBox.getSize(
                new THREE.Vector3()
            );


        modelCenter =
            finalBox.getCenter(
                new THREE.Vector3()
            );


        const maxDimension =
            Math.max(
                modelSize.x,
                modelSize.y,
                modelSize.z
            );


        keyLight.shadow.camera.left =
            -maxDimension * 1.5;


        keyLight.shadow.camera.right =
            maxDimension * 1.5;


        keyLight.shadow.camera.top =
            maxDimension * 1.5;


        keyLight.shadow.camera.bottom =
            -maxDimension * 1.5;


        keyLight.shadow.camera.far =
            maxDimension * 4;


        keyLight.shadow.camera.updateProjectionMatrix();


        return {

            box:
                finalBox,

            size:
                modelSize.clone(),

            center:
                modelCenter.clone()
        };
    }


    function fitCamera(
        multiplier = 1.45
    ) {

        if (
            !model
        ) {

            return;
        }


        const maxSize =
            Math.max(
                modelSize.x,
                modelSize.y,
                modelSize.z
            );


        const distance =
            maxSize *
            multiplier;


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


    const modelPromise =
        new Promise(
            (
                resolve,
                reject
            ) => {

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

                        } catch (
                            error
                        ) {

                            console.error(
                                'Error preparando GLB:',
                                error
                            );


                            reject(
                                error
                            );
                        }
                    },


                    undefined,


                    error => {

                        console.error(
                            'Error cargando GLB:',
                            error
                        );


                        reject(
                            error
                        );
                    }
                );
            }
        );


    function raycast(
        event
    ) {

        if (
            !model
        ) {

            return null;
        }


        const rect =
            renderer.domElement
                .getBoundingClientRect();


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


        raycaster.setFromCamera(
            mouse,
            camera
        );


        const hits =
            raycaster.intersectObject(
                model,
                true
            );


        return hits.length
            ? hits[0]
            : null;
    }


    function localPositionFromHit(
        hit
    ) {

        if (
            !hit ||
            !model
        ) {

            return null;
        }


        const position =
            hit.point.clone();


        model.worldToLocal(
            position
        );


        return position;
    }


    function worldPositionFromLocal(
        position
    ) {

        if (
            !position ||
            !model
        ) {

            return null;
        }


        const result =
            new THREE.Vector3(
                position.x,
                position.y,
                position.z
            );


        model.localToWorld(
            result
        );


        return result;
    }


    function getMeshByIndex(
        index
    ) {

        return (
            meshes[index] ||
            null
        );
    }


    function createLabel(
        text,
        className =
            'viewer-hotspot-label'
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
            newWidth /
            newHeight;


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
            state.position instanceof THREE.Vector3
                ? state.position.clone()
                : new THREE.Vector3(
                    state.position?.x ?? camera.position.x,
                    state.position?.y ?? camera.position.y,
                    state.position?.z ?? camera.position.z
                );

        const targetLook =
            state.target instanceof THREE.Vector3
                ? state.target.clone()
                : new THREE.Vector3(
                    state.target?.x ?? controls.target.x,
                    state.target?.y ?? controls.target.y,
                    state.target?.z ?? controls.target.z
                );

        if (!smooth) {

            camera.position.copy(targetPosition);
            controls.target.copy(targetLook);
            setCameraHeight();
            camera.lookAt(controls.target);
            syncAnglesFromCamera();
            controls.update();
            return;
        }

        const startPosition = camera.position.clone();
        const startTarget = controls.target.clone();
        const startTime = performance.now();
        const duration = 650;

        function animateCamera(now) {

            const progress = Math.min(
                (now - startTime) / duration,
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
            camera.lookAt(controls.target);
            syncAnglesFromCamera();
            controls.update();

            if (progress < 1) {
                requestAnimationFrame(animateCamera);
            }
        }

        requestAnimationFrame(animateCamera);
    }


    function zoomBy(multiplier) {

        if (!Number.isFinite(multiplier) || multiplier <= 0) {
            return;
        }

        const offset =
            camera.position.clone()
                .sub(controls.target);

        const currentDistance =
            offset.length();

        if (!currentDistance) {
            return;
        }

        const distance = THREE.MathUtils.clamp(
            currentDistance * multiplier,
            controls.minDistance,
            controls.maxDistance
        );

        offset.normalize().multiplyScalar(distance);

        camera.position.copy(
            controls.target.clone().add(offset)
        );

        setCameraHeight();
        camera.lookAt(controls.target);
        syncAnglesFromCamera();
        controls.update();
    }


    let animationFrame;


    function animate() {

        animationFrame =
            requestAnimationFrame(
                animate
            );


        const now =
            performance.now();


        if (
            !animate.lastTime
        ) {

            animate.lastTime =
                now;
        }


        const delta =
            Math.min(
                (
                    now -
                    animate.lastTime
                ) /
                1000,

                0.05
            );


        animate.lastTime =
            now;


        moveByKeyboard(
            delta
        );


        setCameraHeight();


        updateCameraRotation();


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


            keys.clear();


            looking =
                false;


            controls.dispose();


            renderer.dispose();


            if (
                renderer
                    .domElement
                    .parentNode
            ) {

                renderer
                    .domElement
                    .parentNode
                    .removeChild(
                        renderer.domElement
                    );
            }


            if (
                labelRenderer
                    .domElement
                    .parentNode
            ) {

                labelRenderer
                    .domElement
                    .parentNode
                    .removeChild(
                        labelRenderer.domElement
                    );
            }


            if (
                model
            ) {

                model.traverse(
                    child => {

                        if (
                            !child.isMesh
                        ) {

                            return;
                        }


                        if (
                            child.geometry
                        ) {

                            child.geometry.dispose();
                        }


                        const materials =
                            Array.isArray(
                                child.material
                            )

                                ? child.material

                                : [
                                    child.material
                                ];


                        materials.forEach(
                            material => {

                                if (
                                    !material
                                ) {

                                    return;
                                }


                                Object.keys(
                                    material
                                ).forEach(
                                    key => {

                                        const value =
                                            material[key];


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
                    }
                );
            }
        }
    };
}