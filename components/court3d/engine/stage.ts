import {
  BackSide,
  Color,
  DirectionalLight,
  EquirectangularReflectionMapping,
  Fog,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  TextureLoader,
  type Texture,
  type WebGLRenderer,
} from "three";
import { buildCourt } from "./court";
import { skyTexture } from "./textures";

export type Detail = "high" | "low";

/** "Spruit sunrise" by Greg Zaal (Poly Haven, CC0), see scripts/build-3d-assets.ts. */
export const SKY_URL = { high: "/3d/cer-4k-v1.jpg", low: "/3d/cer-v1.jpg" };
/** Where the sun is in that photograph (degrees), so the light and shadows agree with it. */
const SKY_SUN = { azimuth: 35.5, elevation: 8.1 };
/** Turns the photograph around the court: the low sun sits behind the broadcast cameras. */
const SKY_TURN = -0.35;

export async function loadSky(detail: Detail): Promise<Texture> {
  const texture = await new TextureLoader().loadAsync(SKY_URL[detail]);
  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * The lit scene. With the photographed surroundings: a real field at sunrise all around the
 * club, image-based light and reflections from the same photograph, and the sun's direct
 * light coming from where the sun is in it. Without it (if it could not load): a painted sky
 * and a plain fill.
 */
export function createStage(renderer: WebGLRenderer, detail: Detail, sky: Texture | null) {
  const scene = new Scene();
  const court = buildCourt(renderer.capabilities.getMaxAnisotropy(), detail, Boolean(sky));
  scene.add(court.group);
  const textures: Texture[] = [...court.textures];

  // The sun: the photograph's azimuth, a little higher than at sunrise so the players stay lit.
  const az = (SKY_SUN.azimuth * Math.PI) / 180 - SKY_TURN;
  const el = (Math.max(SKY_SUN.elevation, 26) * Math.PI) / 180;
  const sun = new DirectionalLight(0xffe2c0, sky ? 3.3 : 3.1);
  const distance = 26;
  // Equirectangular maps put azimuth φ at (cos φ, ·, sin φ); a turn of the sky by θ about y
  // moves it to φ − θ in the scene.
  sun.position.set(
    Math.cos(az) * Math.cos(el) * distance,
    Math.sin(el) * distance,
    Math.sin(az) * Math.cos(el) * distance,
  );
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  const size = detail === "high" ? 2048 : 1024;
  sun.shadow.mapSize.set(size, size);
  const cam = sun.shadow.camera;
  cam.left = -24;
  cam.right = 24;
  cam.top = 24;
  cam.bottom = -24;
  cam.near = 2;
  cam.far = 70;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  const pmrem = new PMREMGenerator(renderer);
  if (sky) {
    // The photograph as a panorama at infinity: sharp from every camera height, horizon at eye
    // level like a real photograph; the fences hide where the club's paths meet the field.
    scene.background = sky;
    scene.backgroundRotation.set(0, SKY_TURN, 0);
    scene.backgroundIntensity = 0.92;
    const env = pmrem.fromEquirectangular(sky);
    scene.environment = env.texture;
    scene.environmentRotation.set(0, SKY_TURN, 0);
    scene.environmentIntensity = 0.9;
    scene.fog = new Fog(0xd8d4cc, 90, 260);
    // A little sky-and-clay bounce in the shadows, which the photograph alone underplays.
    scene.add(new HemisphereLight(0xdfe7ee, 0xb86b43, 0.28));
    textures.push(sky, env.texture);
  } else {
    scene.background = new Color(0xe8d2b4);
    scene.fog = new Fog(0xe6cfae, 38, 105);
    scene.add(new HemisphereLight(0xe4ecf2, 0xc7774b, 0.55));
    const painted = skyTexture();
    const envScene = new Scene();
    envScene.add(
      new Mesh(
        new SphereGeometry(10, 32, 16),
        new MeshBasicMaterial({ map: painted, side: BackSide }),
      ),
    );
    const dome = new Mesh(
      new SphereGeometry(120, 32, 16),
      new MeshBasicMaterial({ map: painted, side: BackSide, fog: false, depthWrite: false }),
    );
    dome.renderOrder = -1;
    scene.add(dome);
    const env = pmrem.fromScene(envScene, 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.75;
    textures.push(painted, env.texture);
  }
  pmrem.dispose();

  return { scene, sun, textures };
}
