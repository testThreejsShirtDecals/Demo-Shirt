import {
    CubeTexture,
    LightProbe,
    WebGLRenderer,
    WebGLRenderTargetCube,
} from 'three';

export namespace LightProbeGenerator {

    export function fromCubeTexture(cubeTexture: CubeTexture): LightProbe;
    export function fromCubeRenderTarget(renderer: WebGLRenderer, cubeRenderTarget: WebGLRenderTargetCube): LightProbe;

}