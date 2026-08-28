import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const OsmPmtilesMap = nextDynamic(
  () =>
    import("@/components/OsmPmtilesMap").then((m) => m.OsmPmtilesMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "100vh",
          background: "#0b0c10",
          color: "#94a3b8",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Loading MapLibre…
      </div>
    ),
  },
);

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

/**
 * Local OSM PMTiles preview — bake with `npm run osm:tiles:bake`.
 * /internal/osm-tiles?region=antarctica
 */
export default function OsmTilesPreviewPage({ searchParams }: PageProps) {
  const raw = searchParams?.region;
  const regionId = typeof raw === "string" ? raw : undefined;

  return (
    <main style={{ margin: 0, height: "100vh", width: "100vw", background: "#0b0c10" }}>
      <OsmPmtilesMap initialRegionId={regionId} />
    </main>
  );
}
