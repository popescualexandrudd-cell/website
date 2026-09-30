import { describe, expect, it } from "vitest";
import { motionLevel } from "./effects";

describe("the level of motion (ADR-0023)", () => {
  it("respects reduced motion before anything else (WCAG 2.3.3)", () => {
    expect(motionLevel({ reducedMotion: true, cores: 16, memoryGb: 16 })).toBe("reduced");
    expect(motionLevel({ reducedMotion: true, saveData: true })).toBe("reduced");
  });

  it("keeps weak phones and slow or metered connections to simple fades", () => {
    expect(motionLevel({ reducedMotion: false, saveData: true, cores: 8 })).toBe("lite");
    expect(motionLevel({ reducedMotion: false, effectiveType: "3g" })).toBe("lite");
    expect(motionLevel({ reducedMotion: false, effectiveType: "slow-2g" })).toBe("lite");
    expect(motionLevel({ reducedMotion: false, cores: 4 })).toBe("lite");
    expect(motionLevel({ reducedMotion: false, memoryGb: 2 })).toBe("lite");
  });

  it("gives the full effects otherwise, also when the browser says nothing about itself", () => {
    expect(motionLevel({ reducedMotion: false, effectiveType: "4g", cores: 8, memoryGb: 8 })).toBe("on");
    expect(motionLevel({ reducedMotion: false })).toBe("on");
  });
});
