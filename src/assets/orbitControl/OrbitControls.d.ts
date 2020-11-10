
/** @module controls */
import { Camera, MOUSE, Object3D, Vector3, Quaternion, Vector2, Spherical } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';

/**
 * This class is responsible for the navigation controls, it allows the camera to orbit around a target.
 * https://threejs.org/docs/#examples/en/controls/OrbitControls
*/

export class OrbitControls {
	constructor(object: Camera, domElement: HTMLElement, renderManager: any);

	object: Camera;
	domElement: HTMLElement | HTMLDocument;

	// API
	enabled: boolean;
	target: Vector3;

	// deprecated
	center: Vector3;

	minDistance: number;
	maxDistance: number;

	minZoom: number;
	maxZoom: number;

	minPolarAngle: number;
	maxPolarAngle: number;

	minAzimuthAngle: number;
	maxAzimuthAngle: number;

	enableDamping: boolean;
	dampingFactor: number;

	enableZoom: boolean;
	zoomSpeed: number;

	enableRotate: boolean;
	rotateSpeed: number;

	enablePan: boolean;
	panSpeed: number;
	screenSpacePanning: boolean;
	keyPanSpeed: number;

	autoRotate: boolean;
	autoRotateSpeed: number;

	enableKeys: boolean;
	keys: { LEFT: number; UP: number; RIGHT: number; BOTTOM: number; };
	mouseButtons: { ORBIT: MOUSE; ZOOM: MOUSE; PAN: MOUSE; };

	rotateLeft(angle?: number): void;

	rotateUp(angle?: number): void;

	panLeft(distance?: number): void;

	panUp(distance?: number): void;

	pan(deltaX: number, deltaY: number): void;

	dollyIn(): void;

	dollyOut(): void;

	update(forceUpdate?: boolean): boolean;

	reset(): void;

	dispose(): void;

	getPolarAngle(): number;

	getAzimuthalAngle(): number;

	// EventDispatcher mixins
	addEventListener(type: string, listener: (event: any) => void): void;

	hasEventListener(type: string, listener: (event: any) => void): boolean;

	removeEventListener(type: string, listener: (event: any) => void): void;

	dispatchEvent(event: { type: string; target: any; }): void;

	//Utility
	getRotationY(): number;

	getRotationX(): number;

	getRotation(): Vector2;

	getSpherical(): Spherical;

	setRotationY(angle: number): void;

	setRotationX(angle: number): void;

	setRotation(rot: Vector2): void;

	setSpherical(sph: Spherical): void;

	safeDisable(): void;

	safeEnable(): void;

	getState(): number;

	setZoomChanged(state: boolean): void;

	setBoundings(bounds: Quaternion): void;

	getBoundings(): Quaternion;

	stop(): void;
}
