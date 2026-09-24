import {
  BackSide,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  Scene,
  SphereGeometry,
  type Texture,
  type WebGLRenderer,
} from "three";
import { buildCourt } from "./court";
import { skyTexture } from "./textures";

export type Detail = "high" | "low";

/**
 * The lit scene: late-afternoon sun low over the court (long, warm shadows on the clay), a
 * sky/ground hemisphere fill and an environment map baked from the same sky, so rackets and
 * shoes pick up soft reflections without any downloaded HDR.
 */
export function createStage(renderer: WebGLRenderer, detail: Detail) {
  const scene = new Scene();
  scene.background = new Color(0xe8d2b4);
  scene.fog = new Fog(0xe6cfae, 38, 105);

  const court = buildCourt(renderer.capabilities.getMaxAnisotropy(), detail);
  scene.add(court.group);

  const hemi = new HemisphereLight(0xe4ecf2, 0xc7774b, 0.55);
  scene.add(hemi);

  const sun = new DirectionalLight(0xffe4c4, 3.1);
  sun.position.set(-15, 17, 9);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  const size = detail === "high" ? 2048 : 1024;
  sun.shadow.mapSize.set(size, size);
  const cam = sun.shadow.camera;
  cam.left = -21;
  cam.right = 21;
  cam.top = 21;
  cam.bottom = -21;
  cam.near = 2;
  cam.far = 60;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  // Environment lighting from a small sky-only scene.
  const envScene = new Scene();
  const sky = skyTexture();
  envScene.add(
    new Mesh(new SphereGeometry(10, 32, 16), new MeshBasicMaterial({ map: sky, side: BackSide })),
  );
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(envScene, 0.04);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.75;
  pmrem.dispose();

  const textures: Texture[] = [...court.textures, sky, env.texture];
  return { scene, sun, textures };
}
