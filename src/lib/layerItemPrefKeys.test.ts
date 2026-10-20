import { describe, expect, it } from "vitest";
import { LAYER_ITEM_PREF_KEYS } from "@/lib/layerItemPrefKeys";

describe("LAYER_ITEM_PREF_KEYS panel coverage", () => {
  it("maps allied/geoecon/csto and corridor/ses keys", () => {
    expect(LAYER_ITEM_PREF_KEYS["allied-blocs"]).toBe("showAlliedBlocs");
    expect(LAYER_ITEM_PREF_KEYS["csto-bloc"]).toBe("showCstoBloc");
    expect(LAYER_ITEM_PREF_KEYS["geoecon-blocs"]).toBe("showGeoEconBlocs");
    expect(LAYER_ITEM_PREF_KEYS["europe-drone-incidents"]).toBe("showEuropeDroneIncidents");
    expect(LAYER_ITEM_PREF_KEYS["conflict-events"]).toBe("showConflictEvents");
    expect(LAYER_ITEM_PREF_KEYS["allied-logistics-corridors"]).toBe("showAlliedLogisticsCorridors");
    expect(LAYER_ITEM_PREF_KEYS["sanctions-evasion-corridors"]).toBe(
      "showSanctionsEvasionCorridors",
    );
    expect(LAYER_ITEM_PREF_KEYS["ses-gauge"]).toBe("showSesChip");
    expect(LAYER_ITEM_PREF_KEYS["crink-rail"]).toBe("showCrinkInfraRail");
  });
});
