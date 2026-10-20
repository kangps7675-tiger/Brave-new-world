import { describe, expect, it } from "vitest";
import {
  isEnergySupplyChainFlash,
  isLiveuaEnergySupplyFlash,
} from "@/lib/news/energySupplyFlash";

describe("isEnergySupplyChainFlash", () => {
  it("matches Hormuz / oil shipping", () => {
    expect(
      isEnergySupplyChainFlash("Tanker attacked near Strait of Hormuz"),
    ).toBe(true);
  });

  it("matches Bab el-Mandeb / Red Sea", () => {
    expect(
      isEnergySupplyChainFlash("Houthi drone hit vessel in Bab el-Mandeb"),
    ).toBe(true);
  });

  it("matches Ukraine drone strike on Russian refinery", () => {
    expect(
      isEnergySupplyChainFlash(
        "Ukrainian drones struck a Russian oil refinery in Ryazan",
      ),
    ).toBe(true);
  });

  it("rejects routine frontline shelling without energy", () => {
    expect(
      isEnergySupplyChainFlash("Artillery duel near Bakhmut overnight"),
    ).toBe(false);
  });
});

describe("isLiveuaEnergySupplyFlash", () => {
  it("matches by coordinates near Hormuz even without oil words", () => {
    expect(
      isLiveuaEnergySupplyFlash({
        title: "Naval incident reported",
        body: "Activity offshore",
        tags: [],
        theater: "middle-east",
        lat: 26.6,
        lng: 56.3,
      }),
    ).toBe(true);
  });
});
