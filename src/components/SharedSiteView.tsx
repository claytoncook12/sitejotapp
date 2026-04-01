import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useRef, useEffect } from "react";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { MapContainer, TileLayer, Polygon, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

interface SharedSiteViewProps {
  slug: string;
}

// Component to fit map to bounds
function FitBoundsPublic({ coordinates }: { coordinates: number[][] }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length > 0) {
      const latLngs = coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
      const bounds = latLngs.reduce(
        (acc, [lat, lng]) => ({
          minLat: Math.min(acc.minLat, lat),
          maxLat: Math.max(acc.maxLat, lat),
          minLng: Math.min(acc.minLng, lng),
          maxLng: Math.max(acc.maxLng, lng),
        }),
        { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 }
      );
      map.fitBounds(
        [
          [bounds.minLat, bounds.minLng],
          [bounds.maxLat, bounds.maxLng],
        ],
        { padding: [40, 40], maxZoom: 16 }
      );
    }
  }, [coordinates, map]);

  return null;
}

function SharedSiteBoundary({ slug }: { slug: string }) {
  const boundary = useQuery(api.sitePolylines.getBySitePublic, { slug });

  const toLeafletCoords = (coords: number[][]): LatLngExpression[] =>
    coords.map(([lng, lat]) => [lat, lng] as [number, number]);

  const defaultCenter: LatLngExpression = [38.0, -84.5];

  if (boundary === undefined) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-400"></div>
          <span className="text-slate-500 dark:text-slate-400 text-sm">Loading boundary...</span>
        </div>
      </div>
    );
  }

  if (!boundary) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Site Boundary</h4>
      <div className="space-y-3">
        <div className="h-64 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 relative z-0">
          <MapContainer
            center={defaultCenter}
            zoom={13}
            scrollWheelZoom={true}
            dragging={true}
            zoomControl={false}
            attributionControl={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}"
              attribution="USGS The National Map"
            />
            <Polygon
              positions={toLeafletCoords(boundary.coordinates)}
              pathOptions={{ color: boundary.color || "#f59e0b", weight: boundary.strokeWidth || 3 }}
            />
            <FitBoundsPublic coordinates={boundary.coordinates} />
          </MapContainer>
        </div>
        <p className="text-slate-600 dark:text-slate-300 text-sm">
          ✓ {boundary.coordinates.length} points
        </p>
      </div>
    </div>
  );
}

interface SharedMarkerData {
  _id: Id<"planMarkers">;
  xPercent: number;
  yPercent: number;
  label?: string;
  observationId?: Id<"observations">;
  observation: {
    _id: Id<"observations">;
    description?: string;
    type: string;
    fileId?: Id<"_storage">;
    imageUrl?: string | null;
  } | null;
}

// --- Shared Site Report (read-only, public queries) ---

function SharedReportVisitObservations({ visitId, visitDate, visitIndex, slug }: { visitId: Id<"visits">; visitDate: string; visitIndex: number; slug: string }) {
  const observations = useQuery(api.observations.listByVisitPublic, { slug, visitId }) || [];

  const formattedDate = new Date(visitDate + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mb-8 print:mb-6 print:break-inside-avoid-page">
      <h3 className="text-lg font-semibold text-black mb-4 print:text-base border-b-2 border-amber-400 pb-2">
        Visit {visitIndex + 1}: {formattedDate}
      </h3>

      {observations.length === 0 ? (
        <p className="text-gray-600 italic">No observations recorded for this visit.</p>
      ) : (
        <div className="space-y-6 print:space-y-4">
          {observations.map((observation, index) => (
            <div key={observation._id} className="border border-gray-300 rounded-lg p-4 print:break-inside-avoid">
              <div className="flex justify-between items-start mb-3 print:mb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-sm font-medium capitalize print:bg-gray-100 print:text-gray-800">
                    {observation.type}
                  </span>
                  <span className="text-gray-600 text-sm">#{index + 1}</span>
                </div>
                <span className="text-gray-500 text-sm">
                  {new Date(observation._creationTime).toLocaleString()}
                </span>
              </div>

              <div className="mb-3">
                <h4 className="font-medium text-black mb-2">Description</h4>
                <p className="text-gray-800 leading-relaxed">{observation.description || <span className="italic text-gray-500">No description</span>}</p>
              </div>

              {observation.fileUrl && (
                <div className="mt-4">
                  <h4 className="font-medium text-black mb-2">Attachment</h4>
                  {observation.type === "photo" && (
                    <div className="print:max-w-md">
                      <img
                        src={observation.fileUrl}
                        alt={`Observation ${index + 1}`}
                        className="max-w-full h-auto rounded border border-gray-300 print:max-h-64"
                      />
                    </div>
                  )}
                  {observation.type === "video" && (
                    <div className="bg-gray-100 p-4 rounded border border-gray-300 flex flex-col items-center">
                      <p className="text-gray-600 text-sm mb-2">📹 Video attachment</p>
                      <a href={observation.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                        {observation.fileUrl}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SharedReportPlanSection({ planId, planName, planImageUrl, planIndex, slug }: {
  planId: Id<"sitePlans">;
  planName: string;
  planImageUrl: string | null;
  planIndex: number;
  slug: string;
}) {
  const markers = useQuery(api.planMarkers.listPublic, { slug, planId }) || [];

  return (
    <div className="mb-8 print:mb-6 print:break-before-page">
      <h3 className="text-lg font-semibold text-black mb-4 print:text-base border-b-2 border-amber-400 pb-2">
        Plan {planIndex + 1}: {planName}
      </h3>

      {planImageUrl && (
        <div className="mb-6 print:mb-4">
          <div className="relative inline-block w-full max-w-3xl">
            <img
              src={planImageUrl}
              alt={planName}
              className="w-full h-auto rounded border border-gray-300"
            />
            {markers.map((marker, index) => (
              <div
                key={marker._id}
                className="absolute w-6 h-6 -ml-3 -mt-3 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white print:bg-amber-600"
                style={{
                  left: `${marker.xPercent}%`,
                  top: `${marker.yPercent}%`,
                }}
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {markers.length === 0 ? (
        <p className="text-gray-600 italic">No markers on this plan.</p>
      ) : (
        <div className="space-y-4 print:space-y-3">
          <h4 className="font-medium text-black">Marker Legend ({markers.length} markers)</h4>
          <div className="grid gap-3 print:gap-2">
            {markers.map((marker, index) => (
              <div
                key={marker._id}
                className="border border-gray-300 rounded-lg p-3 print:p-2 print:break-inside-avoid flex gap-4"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold print:bg-amber-600">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-600">Label: </span>
                    <span className="text-black">
                      {marker.label || <span className="italic text-gray-500">No label</span>}
                    </span>
                  </div>
                  {marker.observation ? (
                    <div className="bg-gray-50 rounded p-3 print:p-2 print:bg-white print:border print:border-gray-200">
                      <div className="flex gap-3">
                        {marker.observation.imageUrl && (
                          <img
                            src={marker.observation.imageUrl}
                            alt="Observation"
                            className="w-20 h-20 object-cover rounded border border-gray-300 flex-shrink-0 print:w-16 print:h-16"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="inline-block bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-medium capitalize mb-1 print:bg-gray-100 print:text-gray-800">
                            {marker.observation.type}
                          </span>
                          <p className="text-sm text-gray-800 leading-relaxed">
                            {marker.observation.description || <span className="italic text-gray-500">No description</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No observation linked</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SharedSiteReport({ slug, onBack }: { slug: string; onBack: () => void }) {
  const site = useQuery(api.sites.getByShareSlug, { slug });
  const visits = useQuery(api.visits.listByShareSlug, { slug }) || [];
  const sitePlans = useQuery(api.sitePlans.listByShareSlug, { slug }) || [];
  const siteBoundary = useQuery(api.sitePolylines.getBySitePublic, { slug });

  const handlePrint = () => {
    window.print();
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "Active";
      case "complete": return "Complete";
      case "in_review": return "In Review";
      default: return status;
    }
  };

  if (site === undefined) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-white mb-2">Site not found</h2>
        <p className="text-slate-400">This shared link is invalid or sharing has been disabled.</p>
      </div>
    );
  }

  return (
    <div className="print:bg-white print:text-black">
      <style>{`
        @page { margin: 0.5in; }
        @media print {
          html, body { height: auto !important; overflow: visible !important; }
          body { background: white !important; color: black !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .bg-slate-800 { background: white !important; border: 1px solid #ccc !important; }
          .text-white { color: black !important; }
          .text-slate-300 { color: #333 !important; }
          .text-slate-400 { color: #666 !important; }
          .text-amber-400 { color: #d97706 !important; }
          .border-slate-700 { border-color: #ccc !important; }
          .border-slate-600 { border-color: #ccc !important; }
        }
      `}</style>

      <div className="no-print mb-6 flex justify-between items-center">
        <button
          onClick={onBack}
          className="text-amber-400 hover:text-amber-300 font-medium"
        >
          ← Back to Site Details
        </button>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🖨️ Print Report
          </button>
        </div>
      </div>

      <div className="bg-white text-black p-8 rounded-lg print:shadow-none print:p-0">
        <div className="text-center mb-8 print:mb-6">
          <h1 className="text-3xl font-bold text-black mb-2 print:text-2xl">Site Visit Report</h1>
          <div className="w-16 h-1 bg-amber-400 mx-auto"></div>
        </div>

        <div className="mb-8 print:mb-6">
          <h2 className="text-xl font-semibold text-black mb-4 print:text-lg">Site Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
              <p className="text-black font-medium">{site.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
              <p className="text-black font-medium capitalize">{getStatusText(site.status)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Location</label>
              <p className="text-black">{site.location}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Total Visits</label>
              <p className="text-black">{visits.length}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Site Plans</label>
              <p className="text-black">{sitePlans.length}</p>
            </div>
          </div>
        </div>

        {siteBoundary && siteBoundary.coordinates && siteBoundary.coordinates.length > 0 && (
          <div className="mb-8 print:mb-6 print:break-inside-avoid">
            <h2 className="text-xl font-semibold text-black mb-4 print:text-lg">Site Boundary</h2>
            <div className="h-64 rounded-lg overflow-hidden border border-gray-300 print:h-48">
              <MapContainer
                center={[38.0, -84.5] as LatLngExpression}
                zoom={13}
                scrollWheelZoom={false}
                dragging={false}
                zoomControl={false}
                attributionControl={false}
                preferCanvas={true}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}"
                  attribution="USGS The National Map"
                />
                <Polygon
                  positions={siteBoundary.coordinates.map(([lng, lat]: number[]) => [lat, lng] as [number, number])}
                  pathOptions={{ color: "#f59e0b", weight: 3, fillOpacity: 0.2 }}
                />
                <FitBoundsPublic coordinates={siteBoundary.coordinates} />
              </MapContainer>
            </div>
          </div>
        )}

        <div className="mb-8 print:mb-0">
          <h2 className="text-xl font-semibold text-black mb-4 print:text-lg">
            Visits & Observations
          </h2>

          {visits.length === 0 ? (
            <p className="text-gray-600 italic">No visits recorded for this site.</p>
          ) : (
            visits.map((visit, index) => (
              <SharedReportVisitObservations
                key={visit._id}
                visitId={visit._id}
                visitDate={visit.visitDate}
                visitIndex={index}
                slug={slug}
              />
            ))
          )}
        </div>

        {sitePlans.length > 0 && (
          <div className="mb-8 print:mb-0">
            <h2 className="text-xl font-semibold text-black mb-4 print:text-lg">
              Site Plans ({sitePlans.length})
            </h2>

            {sitePlans.map((plan, index) => (
              <SharedReportPlanSection
                key={plan._id}
                planId={plan._id}
                planName={plan.name}
                planImageUrl={plan.imageUrl}
                planIndex={index}
                slug={slug}
              />
            ))}
          </div>
        )}

        <div className="border-t border-gray-300 pt-4 print:pt-2 print:mt-0 print:pb-0">
          <div className="text-center text-gray-500 text-sm">
            <p>Report generated on {new Date().toLocaleString()}</p>
            <p className="mt-1 print:mb-0">SiteJot Documentation System</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SharedPlanViewer({
  planId,
  planName,
  planImageUrl,
  slug,
  onClose,
}: {
  planId: Id<"sitePlans">;
  planName: string;
  planImageUrl: string | null;
  slug: string;
  onClose: () => void;
}) {
  const markers = useQuery(api.planMarkers.listPublic, { planId, slug }) as SharedMarkerData[] | undefined;
  const [selectedMarker, setSelectedMarker] = useState<SharedMarkerData | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  const handleMarkerClick = (marker: SharedMarkerData, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMarker(marker);
  };

  if (markers === undefined) {
    return (
      <div className="fixed inset-0 z-40 bg-slate-100 dark:bg-slate-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-100 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-amber-400 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{planName}</h1>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            ({markers.length} markers)
          </span>
        </div>
      </div>

      {/* Plan View with Markers */}
      <div className="flex-1 relative overflow-hidden">
        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={0.5}
          maxScale={5}
          centerOnInit={true}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Zoom Controls */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2 bg-slate-800/90 rounded-lg p-2">
                <button
                  onClick={() => zoomOut()}
                  className="p-2 hover:bg-slate-700 text-white rounded transition-colors"
                  title="Zoom out"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                  </svg>
                </button>
                <button
                  onClick={() => resetTransform()}
                  className="p-2 hover:bg-slate-700 text-white rounded transition-colors"
                  title="Reset zoom"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
                <button
                  onClick={() => zoomIn()}
                  className="p-2 hover:bg-slate-700 text-white rounded transition-colors"
                  title="Zoom in"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                  </svg>
                </button>
              </div>

              <TransformComponent
                wrapperStyle={{ width: "100%", height: "100%" }}
                contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <div className="relative inline-block">
                  <img
                    ref={imageRef}
                    src={planImageUrl || ""}
                    alt={planName}
                    className="max-w-full max-h-[80vh] object-contain pointer-events-none select-none"
                    draggable={false}
                  />

                  {/* Render Markers */}
                  {markers.map((marker) => (
                    <button
                      key={marker._id}
                      onClick={(e) => handleMarkerClick(marker, e)}
                      className={`absolute w-8 h-8 -ml-4 -mt-8 transition-all hover:scale-110 ${
                        selectedMarker?._id === marker._id ? "scale-125 z-20" : "z-10"
                      }`}
                      style={{
                        left: `${marker.xPercent}%`,
                        top: `${marker.yPercent}%`,
                      }}
                    >
                      <svg
                        className={`w-8 h-8 drop-shadow-lg ${
                          marker.observationId
                            ? "text-green-500"
                            : "text-amber-400"
                        } ${selectedMarker?._id === marker._id ? "text-blue-500" : ""}`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                      {marker.label && (
                        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-0.5 bg-slate-800 text-white text-xs rounded whitespace-nowrap">
                          {marker.label}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>

      {/* Read-Only Marker Detail Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 z-30 bg-white dark:bg-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          selectedMarker ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedMarker && (
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Marker Details
              </h3>
              <button
                onClick={() => setSelectedMarker(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Label */}
              <div>
                <label className="text-sm font-medium text-slate-500 dark:text-slate-400 block mb-2">Label</label>
                <span className="text-lg text-slate-900 dark:text-white">
                  {selectedMarker.label || <span className="text-slate-400 italic">No label</span>}
                </span>
              </div>

              {/* Linked Observation */}
              <div>
                <label className="text-sm font-medium text-slate-500 dark:text-slate-400 block mb-2">Linked Observation</label>
                {selectedMarker.observation ? (
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                    {selectedMarker.observation.imageUrl && (
                      <div className="w-full aspect-video bg-slate-200 dark:bg-slate-600">
                        <img
                          src={selectedMarker.observation.imageUrl}
                          alt="Observation"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-amber-400/20 text-amber-600 dark:text-amber-400 text-xs font-medium rounded capitalize">
                          {selectedMarker.observation.type}
                        </span>
                      </div>
                      <p className="text-slate-900 dark:text-white leading-relaxed">
                        {selectedMarker.observation.description || <span className="text-slate-400 italic">No description</span>}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 italic text-sm">No linked observation</p>
                )}
              </div>

              {/* Position */}
              <div>
                <label className="text-sm font-medium text-slate-500 dark:text-slate-400 block mb-2">Position</label>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  X: {selectedMarker.xPercent.toFixed(1)}%, Y: {selectedMarker.yPercent.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay when panel is open on mobile */}
      {selectedMarker && (
        <div
          className="fixed inset-0 bg-black/30 z-20 sm:hidden"
          onClick={() => setSelectedMarker(null)}
        />
      )}
    </div>
  );
}

function SharedVisitObservations({
  visitId,
  slug,
  isExpanded,
}: {
  visitId: Id<"visits">;
  slug: string;
  isExpanded: boolean;
}) {
  const observations = useQuery(api.observations.listByVisitPublic, { visitId, slug }) || [];
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "note":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case "photo":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case "video":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (!isExpanded) return null;

  return (
    <div className="mt-4">
      <div className="space-y-4">
        {observations.map((observation) => (
          <div
            key={observation._id}
            className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <div className="text-amber-400 mt-1">
                {getTypeIcon(observation.type)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-amber-400 capitalize">
                    {observation.type}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(observation._creationTime).toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  {observation.type === "photo" && observation.fileUrl && (
                    <div className="flex-shrink-0">
                      <img
                        src={observation.fileUrl}
                        alt="Observation thumbnail"
                        className="w-full sm:w-56 h-48 sm:h-56 object-cover rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          if (observation.fileUrl) {
                            setModalImageUrl(observation.fileUrl);
                          }
                        }}
                      />
                    </div>
                  )}

                  {observation.type === "video" && observation.fileUrl && (
                    <div className="flex-shrink-0 relative">
                      <video
                        src={observation.fileUrl}
                        controls
                        controlsList="nofullscreen"
                        className="w-full sm:w-56 h-48 sm:h-56 object-cover rounded-lg border border-slate-300 dark:border-slate-600"
                        preload="metadata"
                      />
                      <button
                        onClick={() => setModalVideoUrl(observation.fileUrl)}
                        className="absolute top-2 right-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full p-2 transition-colors z-10"
                        title="View fullscreen"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h7V2H2v9h2V4zm16 0h-7V2h9v9h-2V4zm0 16h-7v2h9v-9h-2v7zm-16 0h7v2H2v-9h2v7z" />
                        </svg>
                      </button>
                    </div>
                  )}

                  <div className="flex-1">
                    <p className="text-slate-900 dark:text-white">
                      {observation.description || <span className="text-slate-400 dark:text-slate-500 italic">No description</span>}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {observations.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-500 dark:text-slate-400">No observations for this visit</p>
        </div>
      )}

      {/* Image Modal */}
      {modalImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          onClick={() => setModalImageUrl(null)}
        >
          <div className="relative w-full h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setModalImageUrl(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <TransformWrapper initialScale={1} minScale={0.5} maxScale={10} centerOnInit={true}>
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2 bg-slate-800/90 rounded-lg p-2">
                    <button onClick={() => zoomOut()} className="p-2 hover:bg-slate-700 text-white rounded transition-colors" title="Zoom out">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                      </svg>
                    </button>
                    <button onClick={() => resetTransform()} className="p-2 hover:bg-slate-700 text-white rounded transition-colors" title="Reset zoom">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                    <button onClick={() => zoomIn()} className="p-2 hover:bg-slate-700 text-white rounded transition-colors" title="Zoom in">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </button>
                  </div>
                  <TransformComponent
                    wrapperStyle={{ width: "100%", height: "100%" }}
                    contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <img src={modalImageUrl} alt="Observation" className="max-w-[95vw] max-h-[95vh] object-contain" />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {modalVideoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          onClick={() => setModalVideoUrl(null)}
        >
          <div className="relative w-full h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setModalVideoUrl(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <video
              src={modalVideoUrl}
              controls
              autoPlay
              className="max-w-[95vw] max-h-[95vh] bg-black rounded-lg"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function SharedSiteView({ slug }: SharedSiteViewProps) {
  const site = useQuery(api.sites.getByShareSlug, { slug });
  const visits = useQuery(api.visits.listByShareSlug, { slug }) || [];
  const sitePlans = useQuery(api.sitePlans.listByShareSlug, { slug }) || [];
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());
  const [activePlan, setActivePlan] = useState<{ id: Id<"sitePlans">; name: string; imageUrl: string | null } | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [isDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true;
  });

  // Expand most recent visit by default
  if (visits.length > 0 && expandedVisits.size === 0) {
    setExpandedVisits(new Set([visits[0]._id]));
  }

  const toggleVisitExpanded = (visitId: string) => {
    const newExpanded = new Set(expandedVisits);
    if (newExpanded.has(visitId)) {
      newExpanded.delete(visitId);
    } else {
      newExpanded.add(visitId);
    }
    setExpandedVisits(newExpanded);
  };

  if (site === undefined) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Site not found</h2>
            <p className="text-slate-500 dark:text-slate-400">This shared link is invalid or sharing has been disabled.</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "complete": return "bg-blue-500";
      case "in_review": return "bg-amber-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "Active";
      case "complete": return "Complete";
      case "in_review": return "In Review";
      default: return status;
    }
  };

  return (
    <div className={`min-h-screen bg-slate-100 dark:bg-slate-900 ${isDarkMode ? "dark" : ""}`}>
      {/* Full-screen Plan Viewer */}
      {activePlan && (
        <SharedPlanViewer
          planId={activePlan.id}
          planName={activePlan.name}
          planImageUrl={activePlan.imageUrl}
          slug={slug}
          onClose={() => setActivePlan(null)}
        />
      )}

      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 sm:py-4 print:hidden">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <svg className="w-8 h-8" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <rect x="15" y="10" width="70" height="80" rx="8" fill="#334155"/>
                <rect x="25" y="5" width="20" height="15" rx="3" fill="#fbbf24"/>
                <rect x="55" y="5" width="20" height="15" rx="3" fill="#fbbf24"/>
                <rect x="25" y="30" width="50" height="6" rx="2" fill="#fbbf24"/>
                <rect x="25" y="45" width="40" height="5" rx="2" fill="#94a3b8"/>
                <rect x="25" y="58" width="45" height="5" rx="2" fill="#94a3b8"/>
                <rect x="25" y="71" width="35" height="5" rx="2" fill="#94a3b8"/>
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">SiteJot</h1>
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400">Shared View</span>
        </div>
      </header>

      {showReport ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 print:px-0 print:py-0 print:max-w-none">
          <SharedSiteReport slug={slug} onBack={() => setShowReport(false)} />
        </main>
      ) : (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Site Header Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 sm:p-6 mb-6 border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">{site.name}</h2>
              <p className="text-slate-600 dark:text-slate-300 mb-1">{site.location}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getStatusColor(site.status)}`}>
                {getStatusText(site.status)}
              </span>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setShowReport(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              📄 Generate Report
            </button>
          </div>
        </div>

        {/* Site Boundary */}
        <div className="mb-6">
          <SharedSiteBoundary slug={slug} />
        </div>

        {/* Visits */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Visits ({visits.length})</h3>
        </div>

        <div className="space-y-4">
          {visits.map((visit) => (
            <div
              key={visit._id}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={() => toggleVisitExpanded(visit._id)}
              >
                <div className="flex items-center gap-3">
                  <button
                    className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                    aria-label={expandedVisits.has(visit._id) ? "Collapse" : "Expand"}
                  >
                    <svg
                      className={`w-5 h-5 transition-transform ${expandedVisits.has(visit._id) ? "rotate-90" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {new Date(visit.visitDate + "T00:00:00").toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </h4>
                </div>
              </div>

              {expandedVisits.has(visit._id) && (
                <div className="border-t border-slate-200 dark:border-slate-700 p-4">
                  <SharedVisitObservations
                    visitId={visit._id}
                    slug={slug}
                    isExpanded={expandedVisits.has(visit._id)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {visits.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No visits yet</h3>
            <p className="text-slate-500 dark:text-slate-400">This site doesn't have any visits recorded.</p>
          </div>
        )}

        {/* Site Plans */}
        {sitePlans.length > 0 && (
          <div className="mt-10">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Site Plans ({sitePlans.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sitePlans.map((plan) => (
                <div
                  key={plan._id}
                  className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer hover:ring-2 hover:ring-amber-400 transition-all"
                  onClick={() => setActivePlan({ id: plan._id, name: plan.name, imageUrl: plan.imageUrl })}
                >
                  <div className="aspect-video bg-slate-100 dark:bg-slate-700">
                    {plan.imageUrl && (
                      <img
                        src={plan.imageUrl}
                        alt={plan.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="font-medium text-slate-900 dark:text-white truncate">{plan.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{plan.markerCount} markers · Click to view</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      )}
    </div>
  );
}
