export function createMeasurementTool(viewer, options = {}) {

    if (!viewer) {

        throw new Error(
            'No se puede crear el sistema de medición sin viewer.'
        );
    }


    const THREE =
        viewer.THREE;


    /*
     * El GLB conserva las unidades del modelo utilizadas por el visor.
     * En este proyecto esas unidades corresponden directamente a metros.
     */
    const MODEL_UNITS_TO_METERS = 1;


    const params =
        new URLSearchParams(
            window.location.search
        );


    const projectId =
        String(
            options.projectId ||
            params.get('project') ||
            localStorage.getItem(
                'universalStandActiveProject'
            ) ||
            'default'
        );


    const STORAGE_KEY =
        `universalStandMeasurements:${projectId}`;


    /* =====================================================
       ESTADO
    ====================================================== */

    let enabled =
        false;

    let firstPoint =
        null;


    /*
     * Todas las mediciones terminadas
     */
    const measurements =
        [];


    /* =====================================================
       GUARDAR MEDICIONES
    ====================================================== */

    function saveMeasurements() {

        try {

            const data =
                measurements.map(
                    measurement => ({

                        id:
                            measurement.id,

                        number:
                            measurement.number,

                        start:
                            {
                                x:
                                    measurement.start.x,

                                y:
                                    measurement.start.y,

                                z:
                                    measurement.start.z
                            },

                        end:
                            {
                                x:
                                    measurement.end.x,

                                y:
                                    measurement.end.y,

                                z:
                                    measurement.end.z
                            },

                        distance:
                            measurement.distance
                    })
                );


            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(
                    data
                )
            );


        } catch (
            error
        ) {

            console.error(
                'Error guardando mediciones:',
                error
            );
        }
    }


    /* =====================================================
       CARGAR MEDICIONES
    ====================================================== */

    function loadMeasurements() {

        try {

            const saved =
                JSON.parse(
                    localStorage.getItem(
                        STORAGE_KEY
                    ) ||
                    '[]'
                );


            if (
                !Array.isArray(
                    saved
                )
            ) {

                return;
            }


            saved.forEach(
                item => {

                    if (
                        !item?.start ||
                        !item?.end
                    ) {

                        return;
                    }


                    const start =
                        new THREE.Vector3(
                            Number(
                                item.start.x
                            ) || 0,

                            Number(
                                item.start.y
                            ) || 0,

                            Number(
                                item.start.z
                            ) || 0
                        );


                    const end =
                        new THREE.Vector3(
                            Number(
                                item.end.x
                            ) || 0,

                            Number(
                                item.end.y
                            ) || 0,

                            Number(
                                item.end.z
                            ) || 0
                        );


                    const distance =
                        start.distanceTo(
                            end
                        ) *
                        MODEL_UNITS_TO_METERS;


                    const firstMarker =
                        createPoint(
                            start
                        );


                    const secondMarker =
                        createPoint(
                            end
                        );


                    const line =
                        createLine(
                            start,
                            end
                        );


                    const label =
                        createLabel(
                            start,
                            end,
                            distance
                        );


                    measurements.push({

                        id:
                            item.id ||
                            Date.now() +
                            Math.random(),

                        number:
                            measurements.length +
                            1,

                        start,

                        end,

                        distance,

                        firstMarker,

                        secondMarker,

                        line,

                        label
                    });
                }
            );


            renderMeasurementManager();


        } catch (
            error
        ) {

            console.error(
                'Error cargando mediciones:',
                error
            );
        }
    }


    /*
     * Grupo general de mediciones
     */
    const group =
        new THREE.Group();

    group.name =
        'MeasurementTool';

    viewer.scene.add(
        group
    );


    /* =====================================================
       DOM
    ====================================================== */

    const panel =
        document.getElementById(
            'measurementPanel'
        );

    const value =
        document.getElementById(
            'measurementValue'
        );

    const status =
        document.getElementById(
            'measurementStatus'
        );

    const closeButton =
        document.getElementById(
            'measurementClose'
        );

    const manager =
        document.getElementById(
            'measurementManager'
        );

    const measurementList =
        document.getElementById(
            'measurementList'
        );

    const deleteAllButton =
        document.getElementById(
            'measurementDeleteAll'
        );


    /* =====================================================
       PANEL DE MEDICIÓN
    ====================================================== */

    function openPanel() {

        if (!panel) {
            return;
        }


        panel.classList.add(
            'visible'
        );


        panel.setAttribute(
            'aria-hidden',
            'false'
        );
    }


    function closePanel() {

        if (!panel) {
            return;
        }


        panel.classList.remove(
            'visible'
        );


        panel.setAttribute(
            'aria-hidden',
            'true'
        );
    }


    /* =====================================================
       ADMINISTRADOR DE MEDICIONES
    ====================================================== */

    function openManager() {

        if (!manager) {
            return;
        }


        if (
            measurements.length === 0
        ) {

            manager.classList.remove(
                'visible'
            );

            manager.setAttribute(
                'aria-hidden',
                'true'
            );

            return;
        }


        manager.classList.add(
            'visible'
        );


        manager.setAttribute(
            'aria-hidden',
            'false'
        );
    }


    function closeManager() {

        if (!manager) {
            return;
        }


        manager.classList.remove(
            'visible'
        );


        manager.setAttribute(
            'aria-hidden',
            'true'
        );
    }


    /* =====================================================
       LIBERAR OBJETOS
    ====================================================== */

    function disposeObject(
        object
    ) {

        if (!object) {
            return;
        }


        group.remove(
            object
        );


        if (object.geometry) {

            object.geometry.dispose();
        }


        if (object.material) {

            if (
                Array.isArray(
                    object.material
                )
            ) {

                object.material.forEach(
                    material => {

                        material.dispose();
                    }
                );

            } else {

                object.material.dispose();
            }
        }
    }


    /* =====================================================
       CREAR PUNTO
    ====================================================== */

    function createPoint(
        position
    ) {

        const geometry =
            new THREE.SphereGeometry(
                0.055,
                16,
                16
            );


        const material =
            new THREE.MeshBasicMaterial({

                color:
                    0xffffff,

                depthTest:
                    false
            });


        const marker =
            new THREE.Mesh(
                geometry,
                material
            );


        marker.position.copy(
            position
        );


        marker.renderOrder =
            1000;


        group.add(
            marker
        );


        return marker;
    }


    /* =====================================================
       CREAR LÍNEA
    ====================================================== */

    function createLine(
        start,
        end
    ) {

        const geometry =
            new THREE.BufferGeometry()
                .setFromPoints([
                    start,
                    end
                ]);


        const material =
            new THREE.LineBasicMaterial({

                color:
                    0xffffff,

                transparent:
                    true,

                opacity:
                    .95,

                depthTest:
                    false
            });


        const line =
            new THREE.Line(
                geometry,
                material
            );


        line.renderOrder =
            999;


        group.add(
            line
        );


        return line;
    }


    /* =====================================================
       CREAR ETIQUETA
    ====================================================== */

    function createLabel(
        start,
        end,
        distance
    ) {

        const middle =
            start.clone()
                .add(
                    end
                )
                .multiplyScalar(
                    .5
                );


        const label =
            viewer.createLabel(
                `${distance.toFixed(2)} m`,
                'measurement-label'
            );


        label.object.position.copy(
            middle
        );


        group.add(
            label.object
        );


        return label.object;
    }


    /* =====================================================
       CREAR MEDICIÓN
    ====================================================== */

    function createMeasurement(
        start,
        end
    ) {

        const distance =
            start.distanceTo(
                end
            ) *
            MODEL_UNITS_TO_METERS;


        const firstMarker =
            createPoint(
                start
            );


        const secondMarker =
            createPoint(
                end
            );


        const line =
            createLine(
                start,
                end
            );


        const label =
            createLabel(
                start,
                end,
                distance
            );


        const measurement = {

            id:
                Date.now() +
                Math.random(),

            number:
                measurements.length +
                1,

            start:
                start.clone(),

            end:
                end.clone(),

            distance,

            firstMarker,

            secondMarker,

            line,

            label
        };


        measurements.push(
            measurement
        );


        saveMeasurements();


        renderMeasurementManager();

        openManager();


        if (value) {

            value.textContent =
                `${distance.toFixed(2)} m`;
        }


        if (status) {

            status.textContent =
                `Medición ${measurement.number} guardada. Seleccioná el primer punto de otra medición.`;
        }


        return measurement;
    }


    /* =====================================================
       ELIMINAR UNA MEDICIÓN
    ====================================================== */

    function removeMeasurement(
        id
    ) {

        const index =
            measurements.findIndex(
                measurement =>
                    measurement.id ===
                    id
            );


        if (
            index === -1
        ) {

            return;
        }


        const measurement =
            measurements[
                index
            ];


        disposeObject(
            measurement.firstMarker
        );


        disposeObject(
            measurement.secondMarker
        );


        disposeObject(
            measurement.line
        );


        if (
            measurement.label
        ) {

            group.remove(
                measurement.label
            );

            measurement.label =
                null;
        }


        measurements.splice(
            index,
            1
        );


        /*
         * Renumerar
         */
        measurements.forEach(
            (
                measurement,
                measurementIndex
            ) => {

                measurement.number =
                    measurementIndex +
                    1;
            }
        );


        saveMeasurements();


        renderMeasurementManager();


        if (
            measurements.length ===
            0
        ) {

            closeManager();


            if (value) {

                value.textContent =
                    '0.00 m';
            }


            if (status) {

                status.textContent =
                    'Seleccioná el primer punto.';
            }

        } else {

            openManager();


            const last =
                measurements[
                    measurements.length -
                    1
                ];


            if (value) {

                value.textContent =
                    `${last.distance.toFixed(2)} m`;
            }


            if (status) {

                status.textContent =
                    'Seleccioná el primer punto de otra medición.';
            }
        }
    }


    /* =====================================================
       ELIMINAR TODAS
    ====================================================== */

    function removeAllMeasurements() {

        /*
         * Copia para evitar problemas
         * mientras se eliminan objetos.
         */
        const copy =
            [
                ...measurements
            ];


        copy.forEach(
            measurement => {

                disposeObject(
                    measurement.firstMarker
                );


                disposeObject(
                    measurement.secondMarker
                );


                disposeObject(
                    measurement.line
                );


                if (
                    measurement.label
                ) {

                    group.remove(
                        measurement.label
                    );

                    measurement.label =
                        null;
                }
            }
        );


        measurements.length =
            0;


        saveMeasurements();


        firstPoint =
            null;


        renderMeasurementManager();

        closeManager();


        if (value) {

            value.textContent =
                '0.00 m';
        }


        if (status) {

            status.textContent =
                'Seleccioná el primer punto.';
        }
    }


    /* =====================================================
       LISTA DE MEDICIONES
    ====================================================== */

    function renderMeasurementManager() {

        if (!measurementList) {
            return;
        }


        measurementList.innerHTML =
            '';


        measurements.forEach(
            measurement => {

                const item =
                    document.createElement(
                        'div'
                    );


                item.className =
                    'measurement-item';


                const information =
                    document.createElement(
                        'div'
                    );


                information.className =
                    'measurement-item-info';


                const number =
                    document.createElement(
                        'span'
                    );


                number.className =
                    'measurement-item-number';


                number.textContent =
                    String(
                        measurement.number
                    ).padStart(
                        2,
                        '0'
                    );


                const title =
                    document.createElement(
                        'div'
                    );


                title.className =
                    'measurement-item-title';


                title.textContent =
                    `Medición ${measurement.number}`;


                const distance =
                    document.createElement(
                        'small'
                    );


                distance.className =
                    'measurement-item-distance';


                distance.textContent =
                    `${measurement.distance.toFixed(2)} m`;


                information.appendChild(
                    number
                );


                const text =
                    document.createElement(
                        'div'
                    );


                text.appendChild(
                    title
                );


                text.appendChild(
                    distance
                );


                information.appendChild(
                    text
                );


                const remove =
                    document.createElement(
                        'button'
                    );


                remove.type =
                    'button';


                remove.className =
                    'measurement-item-delete';


                remove.title =
                    'Eliminar medición';


                remove.setAttribute(
                    'aria-label',
                    'Eliminar medición'
                );


                remove.textContent =
                    '×';


                remove.addEventListener(
                    'click',
                    () => {

                        removeMeasurement(
                            measurement.id
                        );
                    }
                );


                item.appendChild(
                    information
                );


                item.appendChild(
                    remove
                );


                measurementList.appendChild(
                    item
                );
            }
        );


        openManager();
    }


    /* =====================================================
       CLICK SOBRE MODELO
    ====================================================== */

    function handleClick(
        event
    ) {

        if (!enabled) {
            return;
        }


        const hit =
            viewer.raycast(
                event
            );


        if (!hit) {
            return;
        }


        const point =
            hit.point.clone();


        /*
         * Primer clic
         */
        if (!firstPoint) {

            firstPoint =
                point;


            createTemporaryFirstPoint(
                firstPoint
            );


            if (status) {

                status.textContent =
                    'Primer punto seleccionado. Hacé clic en el segundo punto.';
            }


            return;
        }


        /*
         * Segundo clic
         */
        const secondPoint =
            point;


        removeTemporaryFirstPoint();


        createMeasurement(
            firstPoint,
            secondPoint
        );


        firstPoint =
            null;
    }


    /* =====================================================
       PUNTO TEMPORAL
    ====================================================== */

    let temporaryMarker =
        null;


    function createTemporaryFirstPoint(
        position
    ) {

        removeTemporaryFirstPoint();


        temporaryMarker =
            createPoint(
                position
            );
    }


    function removeTemporaryFirstPoint() {

        if (!temporaryMarker) {
            return;
        }


        disposeObject(
            temporaryMarker
        );


        temporaryMarker =
            null;
    }


    /* =====================================================
       ACTIVAR
    ====================================================== */

    function enable() {

        if (enabled) {
            return;
        }


        enabled =
            true;


        firstPoint =
            null;


        removeTemporaryFirstPoint();


        openPanel();


        viewer.controls.enabled =
            false;


        viewer.renderer.domElement.style.cursor =
            'crosshair';


        if (status) {

            status.textContent =
                'Seleccioná el primer punto.';
        }


        viewer.renderer.domElement.addEventListener(
            'click',
            handleClick
        );
    }


    /* =====================================================
       DESACTIVAR
    ====================================================== */

    function disable() {

        if (!enabled) {
            return;
        }


        enabled =
            false;


        firstPoint =
            null;


        removeTemporaryFirstPoint();


        viewer.controls.enabled =
            true;


        viewer.renderer.domElement.style.cursor =
            'default';


        viewer.renderer.domElement.removeEventListener(
            'click',
            handleClick
        );


        closePanel();


        /*
         * Las mediciones terminadas NO se eliminan.
         */
        if (
            measurements.length > 0
        ) {

            openManager();
        }
    }


    /* =====================================================
       BOTÓN CERRAR
    ====================================================== */

    if (closeButton) {

        closeButton.addEventListener(
            'click',
            disable
        );
    }


    /* =====================================================
       ELIMINAR TODAS
    ====================================================== */

    if (deleteAllButton) {

        deleteAllButton.addEventListener(
            'click',
            removeAllMeasurements
        );
    }


    loadMeasurements();


    /* =====================================================
       API
    ====================================================== */

    return {

        enable,

        disable,

        reset() {

            firstPoint =
                null;

            removeTemporaryFirstPoint();
        },

        removeMeasurement,

        removeAllMeasurements,

        get active() {

            return enabled;
        },

        get count() {

            return measurements.length;
        },

        get measurements() {

            return measurements;
        },

        destroy() {

            disable();

            removeAllMeasurements();

            viewer.scene.remove(
                group
            );
        }
    };
}