/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */

import {
    EventDispatcher,
    MOUSE,
    Quaternion,
    Spherical,
    Vector2,
    Vector3,
    Clock
} from "three";


// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one-finger move
//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
//    Pan - right mouse, or left mouse + ctrl/meta/shiftKey, or arrow keys / touch: two-finger move

var OrbitControls = function(object, domElement, renderManager) {

    this.object = object;

    this.domElement = (domElement !== undefined) ? domElement : document;

    this.renderManager = renderManager;

    // Set to false to disable this control
    this.enabled = true;

    // "target" sets the location of focus, where the object orbits around
    this.target = new Vector3();

    // How far you can dolly in and out ( PerspectiveCamera only )
    this.minDistance = 0;
    this.maxDistance = Infinity;

    // How far you can zoom in and out ( OrthographicCamera only )
    this.minZoom = 0;
    this.maxZoom = Infinity;

    // How far you can orbit vertically, upper and lower limits.
    // Range is 0 to Math.PI radians.
    this.minPolarAngle = 0; // radians
    this.maxPolarAngle = Math.PI; // radians

    // How far you can orbit horizontally, upper and lower limits.
    // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
    this.minAzimuthAngle = -Infinity; // radians
    this.maxAzimuthAngle = Infinity; // radians

    // Set to true to enable damping (inertia)
    // If damping is enabled, you must call controls.update() in your animation loop
    this.enableDamping = false;
    this.dampingFactor = 0.25;

    // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
    // Set to false to disable zooming
    this.enableZoom = true;
    this.zoomSpeed = 1.0;
    //this.zoomSpeed = 1.0;

    // Set to false to disable rotating
    this.enableRotate = true;
    this.rotateSpeed = 1.0;

    // Set to false to disable panning
    this.enablePan = true;
    this.panSpeed = 1.0;
    this.screenSpacePanning = false; // if true, pan in screen-space
    this.keyPanSpeed = 7.0; // pixels moved per arrow key push

    // Set to true to automatically rotate around the target
    // If auto-rotate is enabled, you must call controls.update() in your animation loop
    this.autoRotate = false;
    this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

    // Set to false to disable use of the keys
    this.enableKeys = true;

    // The four arrow keys
    //this.keys = { LEFT: 65, UP: 87, RIGHT: 68, BOTTOM: 83 };
    this.keys = { 
        // LEFT: 37, 
        // UP: 38, 
        // RIGHT: 39, 
        // BOTTOM: 40, 
        PAGEUP: 33, 
        PAGEDOWN: 34, 
        PLUS: 107, 
        MINUS: 109, 
        INS: 45 };

    // Mouse buttons
    this.mouseButtons = { LEFT: MOUSE.LEFT, MIDDLE: MOUSE.MIDDLE, RIGHT: MOUSE.RIGHT };
    //this.mouseButtons = { LEFT: MOUSE.LEFT, MIDDLE: MOUSE.MIDDLE, RIGHT: MOUSE.RIGHT };

    // for reset
    this.target0 = this.target.clone();
    this.position0 = this.object.position.clone();
    this.zoom0 = this.object.zoom;

    //
    this.keyMap = {};

    //
    this.pendingDisable = false;

    //
    // public methods
    //

    this.getCameraDataAsObservable = function() {
        return this.subject.asObservable();
    }

    this.setBoundings = function(bounds) {
        boundings = bounds;
    }

    this.getBoundings = function() {
        return boundings;
    }

    this.getPolarAngle = function() {

        return spherical.phi;

    };

    this.getAzimuthalAngle = function() {

        return spherical.theta;

    };

    this.saveState = function() {

        scope.target0.copy(scope.target);
        scope.position0.copy(scope.object.position);
        scope.zoom0 = scope.object.zoom;

    };

    this.reset = function() {

        scope.target.copy(scope.target0);
        scope.object.position.copy(scope.position0);
        scope.object.zoom = scope.zoom0;

        scope.object.updateProjectionMatrix();
        scope.dispatchEvent(changeEvent);

        scope.update();

        setState(STATE.NONE);

    };

    this.stop = function() {
        sphericalDelta.theta = 0;
        sphericalDelta.phi = 0;
    }

    var alreadyRenderedWithAA = false;

    // this method is exposed, but perhaps it would be better if we can make it private...
    this.update = function() {

        var offset = new Vector3();

        // so camera.up is the orbit axis
        var quat = new Quaternion().setFromUnitVectors(object.up, new Vector3(0, 1, 0));
        var quatInverse = quat.clone().inverse();

        var clock = new Clock(true);

        return function update(forceUpdate) {

            if (sphericalDelta.phi === 0 && sphericalDelta.theta === 0 && !zoomChanged && dollyDelta.lengthSq() === 0 && !forceUpdate) {
                return false;
            }

            //console.log("doing orbitcontrol update");

            if (zoomChanged) {
                zoomChanged = false;
            }

            var position = scope.object.position;

            offset.copy(position).sub(scope.target);

            // rotate offset to "y-axis-is-up" space
            offset.applyQuaternion(quat);

            // angle from z-axis around y-axis
            spherical.setFromVector3(offset);

            if (scope.autoRotate && state === STATE.NONE) {
                rotateLeft(getAutoRotationAngle());
            }

            // const deltaTimeMovement = Math.min(clock.getDelta(), 1);

            // spherical.theta += Math.abs(sphericalDelta.theta) > 0 ? sphericalDelta.theta + (deltaTimeMovement * (sphericalDelta.theta / Math.abs(sphericalDelta.theta))) : 0;
            // spherical.phi += Math.abs(sphericalDelta.phi) > 0 ? sphericalDelta.phi + (deltaTimeMovement * (sphericalDelta.phi / Math.abs(sphericalDelta.phi))): 0;

            spherical.theta += sphericalDelta.theta;
            spherical.phi += sphericalDelta.phi;


            // restrict theta to be between desired limits
            spherical.theta = Math.max(scope.minAzimuthAngle, Math.min(scope.maxAzimuthAngle, spherical.theta));

            // restrict phi to be between desired limits
            spherical.phi = Math.max(scope.minPolarAngle, Math.min(scope.maxPolarAngle, spherical.phi));

            spherical.makeSafe();


            spherical.radius *= scale;

            // restrict radius to be between desired limits
            spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius));

            // move target to panned location
            var xDelta = new Vector3(panOffset.x, 0, 0);
            var zDelta = new Vector3(0, 0, panOffset.z);
            if (boundings !== null) {


                if (((scope.target.x + xDelta.x) > boundings.x && (scope.target.x + xDelta.x) < (boundings.x + boundings.z)) || (false)) {
                    scope.target.add(xDelta);
                }

                if (((scope.target.z + zDelta.z) > boundings.y && (scope.target.z + zDelta.z) < (boundings.y + boundings.w)) || (false)) {
                    scope.target.add(zDelta);
                }

            } else {
                scope.target.add(xDelta);
                scope.target.add(zDelta);
            }

            offset.setFromSpherical(spherical);

            // rotate offset back to "camera-up-vector-is-up" space
            offset.applyQuaternion(quatInverse);

            position.copy(scope.target).add(offset);

            scope.object.lookAt(scope.target);

            if (scope.enableDamping === true) {

                // sphericalDelta.theta *= Math.abs(sphericalDelta.theta) > 0.005 ? ( 1 - scope.dampingFactor ) : ( 1 - scope.dampingFactor )/1.5;
                // sphericalDelta.phi *= Math.abs(sphericalDelta.phi) > 0.005 ? ( 1 - scope.dampingFactor ) : ( 1 - scope.dampingFactor )/1.5;
                const deltaTimeDamping = clock.getDelta() < 0.03 ? 1 : Math.max(1 - clock.getDelta(), 0);
                sphericalDelta.theta *= (1 - scope.dampingFactor) * deltaTimeDamping;
                sphericalDelta.phi *= (1 - scope.dampingFactor) * deltaTimeDamping;

                panOffset.multiplyScalar(1 - scope.dampingFactor);

            } else {

                sphericalDelta.set(0, 0, 0);

                panOffset.set(0, 0, 0);

            }

            if (Math.abs(sphericalDelta.theta) > EPS || Math.abs(sphericalDelta.phi) > EPS || dollyDelta.lengthSq() > EPS) {
                alreadyRenderedWithAA = false;
                if (timeout !== null) {
                    clearTimeout(timeout);
                }
                scope.renderManager.render();
            } else {
                sphericalDelta.phi = 0;
                sphericalDelta.theta = 0;

                if (!alreadyRenderedWithAA) {
                    if (scope.renderManager) {
                        scope.renderManager.render();
                        alreadyRenderedWithAA = true;
                    }
                }
            }

            scale = 1;
            dollyDelta.x = 0;
            dollyDelta.y = 0;

            return true;

        };

    }();

    this.dispose = function() {

        scope.domElement.removeEventListener('contextmenu', onContextMenu, false);
        scope.domElement.removeEventListener('mousedown', onMouseDown, false);
        scope.domElement.removeEventListener('wheel', onMouseWheel, false);

        scope.domElement.removeEventListener('touchstart', onTouchStart, false);
        scope.domElement.removeEventListener('touchend', onTouchEnd, false);
        scope.domElement.removeEventListener('touchmove', onTouchMove, false);

        document.removeEventListener('mousemove', onMouseMove, false);
        document.removeEventListener('mouseup', onMouseUp, false);

        //window.removeEventListener( 'keydown', onKeyDown, false );
        window.removeEventListener('keydown', onKey, false);
        window.removeEventListener('keyup', onKey, false);

        //scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?

    };

    this.getRotationY = function() {
        return spherical.theta;
    };

    this.getRotationX = function() {
        return spherical.phi;
    };

    this.getRotation = function() {
        return new Vector2(spherical.theta, spherical.phi);
    };

    this.getSpherical = function() {
        return spherical;
    }

    this.getRotationX = function() {
        return spherical.phi;
    };

    this.setRotationY = function(angle) {
        spherical.theta = angle;
        scope.update(true);
    };

    this.setRotationX = function(angle) {
        spherical.phi = angle;
        scope.update(true);
    };

    this.setRotation = function(rot) {
        spherical.theta = rot.x;
        spherical.phi = rot.y;
        scope.update(true);
    }

    this.setSpherical = function(sph) {
        spherical = sph;
        scope.update(true);
    }

    this.safeDisable = function() {
        if (state < 0) {
            scope.enabled = false;
        } else {
            scope.pendingDisable = true;
        }
    };

    this.safeEnable = function() {
        scope.pendingDisable = false;
        scope.enabled = true;
    };

    this.getState = function() {

        if (pendingUpdate) {
            pendingUpdate = false;
            return 0;
        }

        return state;

    };

    this.setZoomChanged = function(status) {
        zoomChanged = status;
    };

    this.dollyIn = function() {
        if (this.enabled) {
            dollyIn(getZoomScale());
            scope.renderManager.render();
        }

    };

    this.dollyOut = function() {
        if (this.enabled) {
            dollyOut(getZoomScale());
            scope.renderManager.render();
        }
    };


    //
    // internals
    //

    var scope = this;

    var changeEvent = { type: 'change' };
    var startEvent = { type: 'start' };
    var endEvent = { type: 'end' };

    var STATE = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_DOLLY_PAN: 4, UPDATING: 5 };

    var state = STATE.NONE;

    var pendingUpdate = false;

    var updating = 0;

    var EPS = 0.0001;

    // current position in spherical coordinates
    var spherical = new Spherical();
    var sphericalDelta = new Spherical();

    var scale = 1;
    var panOffset = new Vector3();
    var zoomChanged = false;

    var rotateStart = new Vector2();
    var rotateEnd = new Vector2();
    var rotateDelta = new Vector2();

    var panStart = new Vector2();
    var panEnd = new Vector2();
    var panDelta = new Vector2();

    var dollyStart = new Vector2();
    var dollyEnd = new Vector2();
    var dollyDelta = new Vector2();

    var boundings = null;


    function setState(newState) {

        if (newState === STATE.NONE && scope.pendingDisable === true) {
            scope.enabled = false;
            scope.pendingDisable = false;
        }

        state = newState;
    }

    function getAutoRotationAngle() {

        return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

    }

    function getZoomScale() {

        return Math.pow(0.95, scope.zoomSpeed);

    }

    function rotateLeft(angle) {

        sphericalDelta.theta -= angle;

    }

    function rotateUp(angle) {

        sphericalDelta.phi -= angle;

    }

    var panLeft = function() {

        var v = new Vector3();

        return function panLeft(distance, objectMatrix) {

            v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
            v.multiplyScalar(-distance);

            panOffset.add(v);

        };

    }();

    var panUp = function() {

        var v = new Vector3();

        return function panUp(distance, objectMatrix) {

            if (scope.screenSpacePanning === true) {

                v.setFromMatrixColumn(objectMatrix, 1);

            } else {

                v.setFromMatrixColumn(objectMatrix, 0);
                v.crossVectors(scope.object.up, v);

            }

            v.multiplyScalar(distance);

            panOffset.add(v);

        };

    }();

    // deltaX and deltaY are in pixels; right and down are positive
    var pan = function() {

        var offset = new Vector3();

        return function pan(deltaX, deltaY) {

            var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

            if (scope.object.isPerspectiveCamera) {

                // perspective
                var position = scope.object.position;
                offset.copy(position).sub(scope.target);
                var targetDistance = offset.length();

                // half of the fov is center to top of screen
                targetDistance *= Math.tan((scope.object.fov / 2) * Math.PI / 180.0);

                // we use only clientHeight here so aspect ratio does not distort speed
                panLeft(2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix);
                panUp(2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix);

            } else if (scope.object.isOrthographicCamera) {

                // orthographic
                panLeft(deltaX * (scope.object.right - scope.object.left) / scope.object.zoom / element.clientWidth, scope.object.matrix);
                panUp(deltaY * (scope.object.top - scope.object.bottom) / scope.object.zoom / element.clientHeight, scope.object.matrix);

            } else {

                // camera neither orthographic nor perspective
                console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
                scope.enablePan = false;

            }

        };

    }();

    function dollyIn(dollyScale) {

        if (scope.object.isPerspectiveCamera) {

            scale /= dollyScale;
            zoomChanged = true;

        } else if (scope.object.isOrthographicCamera) {

            scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom * dollyScale));
            scope.object.updateProjectionMatrix();
            zoomChanged = true;

        } else {

            console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
            scope.enableZoom = false;

        }

    }

    function dollyOut(dollyScale) {

        if (scope.object.isPerspectiveCamera) {

            scale *= dollyScale;
            zoomChanged = true;

        } else if (scope.object.isOrthographicCamera) {

            scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom / dollyScale));
            scope.object.updateProjectionMatrix();
            zoomChanged = true;

        } else {

            console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
            scope.enableZoom = false;

        }

    }

    //
    // event callbacks - update the object state
    //

    function handleMouseDownRotate(event) {

        //console.log( 'handleMouseDownRotate' );

        rotateStart.set(event.clientX, event.clientY);

    }

    function handleMouseDownDolly(event) {

        //console.log( 'handleMouseDownDolly' );

        dollyStart.set(event.clientX, event.clientY);

    }

    function handleMouseDownPan(event) {

        //console.log( 'handleMouseDownPan' );

        panStart.set(event.clientX, event.clientY);

    }

    function handleMouseMoveRotate(event) {

        //console.log( 'handleMouseMoveRotate' );

        rotateEnd.set(event.clientX, event.clientY);

        rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);

        var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

        rotateLeft(2 * Math.PI * rotateDelta.x / element.clientHeight); // yes, height

        rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight);

        rotateStart.copy(rotateEnd);

        scope.update();

    }

    function handleMouseMoveDolly(event) {

        //console.log( 'handleMouseMoveDolly' );

        dollyEnd.set(event.clientX, event.clientY);

        dollyDelta.subVectors(dollyEnd, dollyStart);

        if (dollyDelta.y > 0) {

            dollyIn(getZoomScale());

        } else if (dollyDelta.y < 0) {

            dollyOut(getZoomScale());

        }

        dollyStart.copy(dollyEnd);

        scope.update();

        if (timeout !== null) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            scope.renderManager.render();
            timeout = null;
        }, 500);

    }

    function handleMouseMovePan(event) {

        //console.log( 'handleMouseMovePan' );

        panEnd.set(event.clientX, event.clientY);

        panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);

        pan(panDelta.x, panDelta.y);

        panStart.copy(panEnd);

        scope.update();

    }

    function handleMouseUp(event) {

        // console.log( 'handleMouseUp' );

    }

    var timeout;

    function handleMouseWheel(event) {

        // console.log( 'handleMouseWheel' );

        if (event.deltaY < 0) {

            dollyOut(getZoomScale());

        } else if (event.deltaY > 0) {

            dollyIn(getZoomScale());

        }

        scope.update();

        scope.renderManager.render();


        if (timeout !== null) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            scope.renderManager.render();
            timeout = null;
        }, 500);
    }

    function handleKeyDown(event) {

        // console.log( 'handleKeyDown' );

        var needsUpdate = false;

        switch (event.keyCode) {

            case scope.keys.UP:
                pan(0, scope.keyPanSpeed);
                needsUpdate = true;
                break;

            case scope.keys.BOTTOM:
                pan(0, -scope.keyPanSpeed);
                needsUpdate = true;
                break;

            case scope.keys.LEFT:
                //pan( scope.keyPanSpeed, 0 );
                rotateLeft(-Math.PI / 64);
                needsUpdate = true;
                break;

            case scope.keys.RIGHT:
                //pan( - scope.keyPanSpeed, 0 );
                rotateLeft(Math.PI / 64);
                needsUpdate = true;
                break;

            case scope.keys.PAGEUP:
                rotateUp(Math.PI / 128);
                break;

            case scope.keys.PAGEDOWN:
                rotateUp(-Math.PI / 128);
                break;

        }



        if (needsUpdate) {

            // prevent the browser from scrolling on cursor keys
            event.preventDefault();

            scope.update();

        }


    }

    function handleKeys(event) {

        // shift   16
        // ctrl    17
        // alt     18

        // console.log( 'handleKeyDown' );

        var needsUpdate = false;

        if (scope.keyMap[17]) { //IF CONTROL PRESSED

            switch (event.keyCode) {

                case scope.keys.UP:
                    dollyOut(getZoomScale());
                    needsUpdate = true;
                    break;

                case scope.keys.BOTTOM:
                    dollyIn(getZoomScale());
                    needsUpdate = true;
                    break;

                case scope.keys.PLUS:
                    dollyOut(getZoomScale());
                    needsUpdate = true;
                    break;

                case scope.keys.MINUS:
                    dollyIn(getZoomScale());
                    needsUpdate = true;
                    break;

                case scope.keys.LEFT:
                    pan(scope.keyPanSpeed, 0);
                    needsUpdate = true;
                    break;

                case scope.keys.RIGHT:
                    pan(-scope.keyPanSpeed, 0);
                    needsUpdate = true;
                    break;

                case scope.keys.PAGEUP:
                    rotateUp(Math.PI / 256);
                    needsUpdate = true;
                    break;

                case scope.keys.PAGEDOWN:
                    rotateUp(-Math.PI / 256);
                    needsUpdate = true;
                    break;

            }

        } else { //IF NOT CONTROL PRESSED

            switch (event.keyCode) {

                case scope.keys.UP:
                    pan(0, scope.keyPanSpeed);
                    needsUpdate = true;
                    break;

                case scope.keys.BOTTOM:
                    pan(0, -scope.keyPanSpeed);
                    needsUpdate = true;
                    break;

                case scope.keys.LEFT:
                    rotateLeft(-Math.PI / 64);
                    needsUpdate = true;
                    break;

                case scope.keys.RIGHT:
                    rotateLeft(Math.PI / 64);
                    needsUpdate = true;
                    break;

                case scope.keys.PAGEUP:
                    rotateUp(Math.PI / 256);
                    needsUpdate = true;
                    break;

                case scope.keys.PAGEDOWN:
                    rotateUp(-Math.PI / 256);
                    needsUpdate = true;
                    break;

                case scope.keys.PLUS:
                    dollyOut(getZoomScale());
                    needsUpdate = true;
                    break;

                case scope.keys.MINUS:
                    dollyIn(getZoomScale());
                    needsUpdate = true;
                    break;

                case scope.keys.INS:
                    spherical.theta = 0;
                    needsUpdate = true;
                    break;

            }
        }





        if (needsUpdate) {

            // prevent the browser from scrolling on cursor keys
            event.preventDefault();

            scope.update();

        }


    }

    function handleTouchStartRotate(event) {

        //console.log( 'handleTouchStartRotate' );

        rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);

    }

    function handleTouchStartDollyPan(event) {

        //console.log( 'handleTouchStartDollyPan' );

        if (scope.enableZoom) {

            var dx = event.touches[0].pageX - event.touches[1].pageX;
            var dy = event.touches[0].pageY - event.touches[1].pageY;

            var distance = Math.sqrt(dx * dx + dy * dy);

            dollyStart.set(0, distance);

        }

        if (scope.enablePan) {

            var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
            var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);

            panStart.set(x, y);

        }

    }

    function handleTouchMoveRotate(event) {

        //console.log( 'handleTouchMoveRotate' );

        rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);

        rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);

        var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

        rotateLeft(2 * Math.PI * rotateDelta.x / element.clientHeight); // yes, height

        rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight);

        rotateStart.copy(rotateEnd);

        scope.update();

    }

    function handleTouchMoveDollyPan(event) {

        //console.log( 'handleTouchMoveDollyPan' );

        if (scope.enableZoom) {

            var dx = event.touches[0].pageX - event.touches[1].pageX;
            var dy = event.touches[0].pageY - event.touches[1].pageY;

            var distance = Math.sqrt(dx * dx + dy * dy);

            dollyEnd.set(0, distance);

            dollyDelta.set(0, Math.pow(dollyEnd.y / dollyStart.y, scope.zoomSpeed));

            dollyIn(dollyDelta.y);

            dollyStart.copy(dollyEnd);

            if (timeout !== null) {
                clearTimeout(timeout);
            }

            timeout = setTimeout(() => {
                scope.renderManager.render();
                timeout = null;
            }, 500);

        }

        if (scope.enablePan) {

            var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
            var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);

            panEnd.set(x, y);

            panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);

            pan(panDelta.x, panDelta.y);

            panStart.copy(panEnd);

        }

        scope.update();

    }

    function handleTouchEnd(event) {

        //console.log( 'handleTouchEnd' );

    }

    //
    // event handlers - FSM: listen for events and reset state
    //

    function onMouseDown(event) {

        if (scope.enabled === false) return;

        // Prevent the browser from scrolling.

        event.preventDefault();

        // Manually set the focus since calling preventDefault above
        // prevents the browser from setting it automatically.

        scope.domElement.focus ? scope.domElement.focus() : window.focus();

        switch (event.button) {

            case scope.mouseButtons.LEFT:

                if (event.ctrlKey || event.metaKey || event.shiftKey) {

                    if (scope.enablePan === false) return;

                    handleMouseDownPan(event);

                    state = STATE.PAN;

                } else {

                    if (scope.enableRotate === false) return;

                    handleMouseDownRotate(event);

                    state = STATE.ROTATE;

                }

                break;

            case scope.mouseButtons.MIDDLE:

                if (scope.enableZoom === false) return;

                handleMouseDownDolly(event);

                state = STATE.DOLLY;

                break;

            case scope.mouseButtons.RIGHT:

                if (scope.enablePan === false) return;

                handleMouseDownPan(event);

                state = STATE.PAN;

                break;

        }

        if (state !== STATE.NONE) {

            document.addEventListener('mousemove', onMouseMove, false);
            document.addEventListener('mouseup', onMouseUp, false);

            scope.dispatchEvent(startEvent);

        }

    }

    function onMouseMove(event) {

        if (scope.enabled === false) return;

        event.preventDefault();
        scope.renderManager.render();
        switch (state) {

            case STATE.ROTATE:

                if (scope.enableRotate === false) return;

                handleMouseMoveRotate(event);

                break;

            case STATE.DOLLY:

                if (scope.enableZoom === false) return;

                handleMouseMoveDolly(event);

                break;

            case STATE.PAN:

                if (scope.enablePan === false) return;

                handleMouseMovePan(event);

                break;

        }

    }

    function onMouseUp(event) {

        //console.log("mouseUp");

        if (scope.enabled === false) return;

        handleMouseUp(event);

        document.removeEventListener('mousemove', onMouseMove, false);
        document.removeEventListener('mouseup', onMouseUp, false);

        scope.dispatchEvent(endEvent);

        setState(STATE.NONE);

    }

    function onMouseWheel(event) {

        if (scope.enabled === false || scope.enableZoom === false || (state !== STATE.NONE && state !== STATE.ROTATE)) return;

        event.preventDefault();
        event.stopPropagation();

        scope.dispatchEvent(startEvent);

        handleMouseWheel(event);

        scope.dispatchEvent(endEvent);

    }

    function onKeyDown(event) {

        if (scope.enabled === false || scope.enableKeys === false || scope.enablePan === false) return;

        handleKeyDown(event);

    }

    function onKey(event) {

        if (scope.enabled === false || scope.enableKeys === false || scope.enablePan === false) return;

        scope.keyMap[event.keyCode] = event.type == 'keydown';

        if (event.type == 'keydown') {
            handleKeys(event);
        }

    }

    function onTouchStart(event) {


        if (scope.enabled === false) return;

        //event.preventDefault();



        switch (event.touches.length) {

            case 1: // one-fingered touch: rotate

                if (scope.enableRotate === false) return;

                handleTouchStartRotate(event);

                state = STATE.TOUCH_ROTATE;
                scope.renderManager.render();

                break;

            case 2: // two-fingered touch: dolly-pan

                if (scope.enableZoom === false && scope.enablePan === false) return;

                handleTouchStartDollyPan(event);

                state = STATE.TOUCH_DOLLY_PAN;
                scope.renderManager.render();

                break;

            default:

                setState(STATE.NONE);

        }

        if (state !== STATE.NONE) {

            scope.dispatchEvent(startEvent);

        }

    }

    function onTouchMove(event) {

        //console.log("touchMove");

        if (scope.enabled === false) return;

        event.preventDefault();
        //event.stopPropagation();
        // scope.renderManager.render();

        switch (event.touches.length) {

            case 1: // one-fingered touch: rotate

                if (scope.enableRotate === false) return;
                if (state !== STATE.TOUCH_ROTATE) return; // is this needed?

                handleTouchMoveRotate(event);
                // scope.renderManager.render();

                break;

            case 2: // two-fingered touch: dolly-pan

                if (scope.enableZoom === false && scope.enablePan === false) return;
                if (state !== STATE.TOUCH_DOLLY_PAN) return; // is this needed?

                handleTouchMoveDollyPan(event);
                // scope.renderManager.render();

                break;

            default:

                setState(STATE.NONE);

        }
        scope.renderManager.render();

    }

    function onTouchEnd(event) {

        if (scope.enabled === false) return;

        handleTouchEnd(event);

        scope.dispatchEvent(endEvent);

        setState(STATE.NONE);

    }

    function onContextMenu(event) {

        if (scope.enabled === false) return;

        //event.preventDefault();

    }

    //

    scope.domElement.addEventListener('contextmenu', onContextMenu, false);

    scope.domElement.addEventListener('mousedown', onMouseDown, false);
    scope.domElement.addEventListener('wheel', onMouseWheel, false);

    scope.domElement.addEventListener('touchstart', onTouchStart, false);
    scope.domElement.addEventListener('touchend', onTouchEnd, false);
    scope.domElement.addEventListener('touchmove', onTouchMove, false);

    //window.addEventListener( 'keydown', onKeyDown, false );
    window.addEventListener('keydown', onKey, false);
    window.addEventListener('keyup', onKey, false);

    // force an update at start

    this.update();

};

OrbitControls.prototype = Object.create(EventDispatcher.prototype);
OrbitControls.prototype.constructor = OrbitControls;

Object.defineProperties(OrbitControls.prototype, {

    center: {

        get: function() {

            console.warn('THREE.OrbitControls: .center has been renamed to .target');
            return this.target;

        }

    },

    // backward compatibility

    noZoom: {

        get: function() {

            console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
            return !this.enableZoom;

        },

        set: function(value) {

            console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
            this.enableZoom = !value;

        }

    },

    noRotate: {

        get: function() {

            console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
            return !this.enableRotate;

        },

        set: function(value) {

            console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
            this.enableRotate = !value;

        }

    },

    noPan: {

        get: function() {

            console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
            return !this.enablePan;

        },

        set: function(value) {

            console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
            this.enablePan = !value;

        }

    },

    noKeys: {

        get: function() {

            console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
            return !this.enableKeys;

        },

        set: function(value) {

            console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
            this.enableKeys = !value;

        }

    },

    staticMoving: {

        get: function() {

            console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
            return !this.enableDamping;

        },

        set: function(value) {

            console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
            this.enableDamping = !value;

        }

    },

    dynamicDampingFactor: {

        get: function() {

            console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
            return this.dampingFactor;

        },

        set: function(value) {

            console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
            this.dampingFactor = value;

        }

    }

});

export { OrbitControls };