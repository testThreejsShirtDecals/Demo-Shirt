import { Component, OnInit } from '@angular/core';
import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { OrbitControls } from '../../../assets/orbitControl/OrbitControls';
import { LightProbeGenerator } from '../../../app/core/LightProbeGenerator';
import { MeshStandardMaterial } from 'three';

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.scss']
})

export class ViewerComponent implements OnInit {

  scene: any;
  dracoLoader: any;
  loading: boolean;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  container: HTMLElement;
  composer: any;
  renderPass: RenderPass;
  orbitControls: any;
  lightProbe: THREE.LightProbe;
  lightProbeIntensity: any;
  directionalLight: THREE.DirectionalLight;
  geometry: THREE.SphereBufferGeometry;
  hdr_ok: THREE.CubeTexture;

  constructor() {
    this.dracoLoader = new DRACOLoader();

    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({
      preserveDrawingBuffer: true,
      antialias: true,
      alpha: true
    });
  }

  ngOnInit(): void {

    const that = this;

    this.container = document.getElementById('viewer');
    this.camera = new THREE.PerspectiveCamera(15, this.container.clientWidth / this.container.clientHeight, 0.1, 800);
    this.camera.position.set(0, 0, 2);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();

    this.renderer.setClearColor(0xFFFFFF, 0.5);

    this.camera.aspect = this.container.clientWidth /
      this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth,
      this.container.clientHeight);
    this.renderer.gammaFactor = 2.2;
    const pixelRatio = this.renderer.getPixelRatio();

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement, this.composer);
    this.orbitControls.rotateSpeed = 0.4;
    this.orbitControls.zoomSpeed = 0.6;
    this.orbitControls.enablePan = false;

    this.container.appendChild(this.renderer.domElement);

    const asset = 'assets/demo3D/shirt/scene.gltf';
    this.loadGltfModel(asset);

    this.initLight();

  }

  loadGltfModel(asset: string) {
    const that = this;
    const manager = new THREE.LoadingManager();
    const loader = new GLTFLoader(manager);
    this.dracoLoader.setDecoderPath('assets/decoder/draco/');
    this.dracoLoader.setDecoderConfig({ type: 'js' });
    loader.setDRACOLoader(this.dracoLoader);
    manager.itemStart('foo');
    loader.load(asset, (gltf) => {
      manager.itemEnd('foo');
      this.scene.add(gltf.scene);

      var bb = new THREE.Box3()
      bb.setFromObject(gltf.scene);
      bb.center(this.orbitControls.target);

      this.scene.traverse(function (child: any) {
        if (child.isMesh) {
          // const m = new MeshStandardMaterial({
          //   color: 0x000000
          // });
          // child.material = m;
        }
      });

    }, undefined, (e) => console.error(e));

    manager.onLoad = function () {
      console.log('3D model loaded succesfully');

      this.loading = false;
      that.composer.render();

    };

  }

  initLight() {
    const that = this;
    this.lightProbe = new THREE.LightProbe();
    this.scene.add(this.lightProbe);
    if (this.lightProbeIntensity) {
      this.lightProbe.intensity = this.lightProbeIntensity;
    }

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.directionalLight.position.set(10, 10, 10);
    this.scene.add(this.directionalLight);


    const genCubeUrls = function (prefix, postfix) {
      return [
        prefix + 'px' + postfix, prefix + 'nx' + postfix,
        prefix + 'py' + postfix, prefix + 'ny' + postfix,
        prefix + 'pz' + postfix, prefix + 'nz' + postfix
      ];
    };

    const urls = genCubeUrls('assets/hdr/Pisa/', '.png');

    new THREE.CubeTextureLoader().load(urls, function (cubeTexture) {

      cubeTexture.encoding = THREE.sRGBEncoding;

      that.lightProbe.copy(LightProbeGenerator.fromCubeTexture(cubeTexture));

      that.geometry = new THREE.SphereBufferGeometry(10, 32, 32);

      that.hdr_ok = cubeTexture;
      console.log(that.hdr_ok);

      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        envMap: cubeTexture,
        envMapIntensity: 1,
      });

    });
  }
}
