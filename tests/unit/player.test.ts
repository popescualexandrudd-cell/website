import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type Bone, SkinnedMesh, Texture, Vector3 } from "three";
import { parseHuman, HUMAN_MATERIALS } from "@/components/court3d/engine/humanAsset";
import { Player } from "@/components/court3d/engine/player";
import { CHANNELS, sample } from "@/components/court3d/engine/pose";
import { STROKES, readyClip, splitStepClip } from "@/components/court3d/engine/strokes";
import { RACKET } from "@/components/court3d/engine/racket";

const file = readFileSync(join(process.cwd(), "public", "3d", "jucator-v1.bin"));
const human = parseHuman(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
const textures = { strings: new Texture(), grip: new Texture() };

function makePlayer() {
  const player = new Player({ shirt: 0xffffff, shorts: 0x222222, shoe: 0xffffff }, textures, human);
  const body = player.root.children.find((o): o is SkinnedMesh => o instanceof SkinnedMesh);
  if (!body) throw new Error("no body");
  const bone = (name: string) => body.skeleton.bones.find((b) => b.name === name) as Bone;
  return { player, body, bone };
}

const clips = [readyClip, splitStepClip, ...Object.values(STROKES)];

describe("player model", () => {
  it("is a complete, dressed human with valid skinning", () => {
    const { geometry, bones } = human;
    const position = geometry.getAttribute("position");
    const weight = geometry.getAttribute("skinWeight");
    const index = geometry.getAttribute("skinIndex");
    expect(position.count).toBeGreaterThan(10_000);
    expect(bones).toHaveLength(17);
    expect(geometry.groups.map((g) => HUMAN_MATERIALS[g.materialIndex ?? -1])).toEqual([
      ...HUMAN_MATERIALS,
    ]);
    for (let i = 0; i < position.count; i += 7) {
      const sum = weight.getX(i) + weight.getY(i) + weight.getZ(i) + weight.getW(i);
      expect(sum).toBeCloseTo(1, 2);
      expect(index.getX(i)).toBeLessThan(bones.length);
    }
    // Standing on the ground, about 1.8 m tall.
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    expect(box.min.y).toBeGreaterThanOrEqual(-0.005);
    expect(box.max.y).toBeCloseTo(1.83, 1);
  });

  it("binds without moving: at rest every vertex stays where it was modelled", () => {
    const { player, body } = makePlayer();
    player.root.updateMatrixWorld(true);
    body.skeleton.update();
    const position = human.geometry.getAttribute("position");
    const v = new Vector3();
    for (let i = 0; i < position.count; i += 97) {
      v.fromBufferAttribute(position, i);
      const rest = v.clone();
      body.applyBoneTransform(i, v);
      expect(v.distanceTo(rest)).toBeLessThan(1e-4);
    }
  });
});

describe("player posing", () => {
  it("holds the racket exactly where every stroke puts the hand, with no broken joints", () => {
    const { player, body, bone } = makePlayer();
    const pose = new Float32Array(CHANNELS);
    const position = human.geometry.getAttribute("position");
    const v = new Vector3();
    let checked = 0;
    for (const clip of clips) {
      const times = Array.from({ length: 13 }, (_, k) => (clip.duration * k) / 12);
      if (clip.contact !== null) times.push(clip.contact);
      for (const t of times) {
        sample(clip, t, pose);
        player.apply(pose, 0);
        player.root.updateMatrixWorld(true);
        const hand = new Vector3(pose[9], pose[10], pose[11]);
        const grip = bone("rHand").position;
        // The racket sits in the hand: its grip point is the hand bone's origin.
        const dir = new Vector3(pose[12], pose[13], pose[14]).normalize();
        expect(
          player.racket.position.clone().addScaledVector(dir, RACKET.gripAt).distanceTo(grip),
        ).toBeLessThan(1e-4);
        // At ball contact the hand is where the stroke puts it; mid-swing, a key slightly out of
        // this body's reach lets the racket follow the arm instead (never far).
        const atContact = clip.contact !== null && Math.abs(t - clip.contact) < 1e-6;
        expect(grip.distanceTo(hand)).toBeLessThan(atContact ? 0.03 : 0.2);
        // The skinned body stays a body: every sampled vertex near the player, none lost.
        body.skeleton.update();
        for (let i = 0; i < position.count; i += 151) {
          v.fromBufferAttribute(position, i);
          body.applyBoneTransform(i, v);
          expect(Number.isFinite(v.x + v.y + v.z)).toBe(true);
          expect(v.y).toBeGreaterThan(-0.05);
          expect(Math.hypot(v.x, v.z)).toBeLessThan(1.6);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(40);
  });

  it("keeps the feet on the clay and the sweet spot on the strings", () => {
    const { player, bone } = makePlayer();
    const pose = new Float32Array(CHANNELS);
    sample(readyClip, 0, pose);
    player.apply(pose, 0);
    for (const side of ["lFoot", "rFoot"]) expect(bone(side).position.y).toBeCloseTo(0.075, 2);
    const forehand = STROKES.forehand;
    sample(forehand, forehand.contact ?? 0, pose);
    player.apply(pose, 0);
    player.root.updateMatrixWorld(true);
    const sweet = player.sweetSpot(pose, new Vector3());
    const dir = new Vector3(pose[12], pose[13], pose[14]).normalize();
    const onStrings = player.racket.position.clone().addScaledVector(dir, RACKET.headCentre - 0.02);
    expect(sweet.distanceTo(onStrings)).toBeLessThan(1e-3);
  });
});
