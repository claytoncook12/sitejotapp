import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect } from "react";
import { MapContainer, TileLayer, Polygon, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

interface SiteReportProps {
  siteId: Id<"sites">;
  onBack: () => void;
}

// Component to fit map to polygon bounds
function FitToBounds({ coordinates }: { coordinates: number[][] }) {
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

// Sub-component to fetch observations for a visit
function VisitObservationsSection({ visitId, visitDate, visitIndex }: { visitId: Id<"visits">; visitDate: string; visitIndex: number }) {
  const observations = useQuery(api.observations.listByVisit, { visitId }) || [];

  const formattedDate = new Date(visitDate + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mb-8 print:mb-6">
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
                        className="max-w-full max-h-[768px] w-auto h-auto rounded border border-gray-300 print:max-h-64"
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

// Sub-component to render a site plan with numbered markers and legend
function SitePlanSection({ planId, planName, planImageUrl, planIndex }: { 
  planId: Id<"sitePlans">; 
  planName: string; 
  planImageUrl: string | null;
  planIndex: number;
}) {
  const markers = useQuery(api.planMarkers.list, { planId }) || [];

  return (
    <div className="mb-8 print:mb-6 print:break-before-page">
      <h3 className="text-lg font-semibold text-black mb-4 print:text-base border-b-2 border-amber-400 pb-2">
        Plan {planIndex + 1}: {planName}
      </h3>

      {/* Plan Image with Numbered Markers */}
      {planImageUrl && (
        <div className="mb-6 print:mb-4">
          <div className="relative inline-block w-full max-w-3xl">
            <img
              src={planImageUrl}
              alt={planName}
              className="w-full h-auto rounded border border-gray-300"
            />
            {/* Overlay numbered markers */}
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

      {/* Marker Legend */}
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
                {/* Marker Number */}
                <div className="flex-shrink-0 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold print:bg-amber-600">
                  {index + 1}
                </div>
                
                {/* Marker Details */}
                <div className="flex-1 min-w-0">
                  {/* Label */}
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-600">Label: </span>
                    <span className="text-black">
                      {marker.label || <span className="italic text-gray-500">No label</span>}
                    </span>
                  </div>
                  
                  {/* Linked Observation */}
                  {marker.observation ? (
                    <div className="bg-gray-50 rounded p-3 print:p-2 print:bg-white print:border print:border-gray-200">
                      <div className="flex gap-3">
                        {/* Observation Thumbnail */}
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

export function SiteReport({ siteId, onBack }: SiteReportProps) {
  const site = useQuery(api.sites.get, { siteId });
  const visits = useQuery(api.visits.list, { siteId }) || [];
  const sitePlans = useQuery(api.sitePlans.list, { siteId }) || [];
  const siteBoundary = useQuery(api.sitePolylines.getBySite, { siteId });

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
        <p className="text-slate-400">The site you're looking for doesn't exist or you don't have access to it.</p>
      </div>
    );
  }

  return (
    <div className="print:bg-white print:text-black">
      {/* Print styles */}
      <style>{`
        @page { margin: 0.5in; }
        @media print {
          html, body { height: auto !important; overflow: visible !important; }
          body { background: white !important; color: black !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          [data-sonner-toaster] { display: none !important; }
          .bg-slate-800 { background: white !important; border: 1px solid #ccc !important; }
          .text-white { color: black !important; }
          .text-slate-300 { color: #333 !important; }
          .text-slate-400 { color: #666 !important; }
          .text-amber-400 { color: #d97706 !important; }
          .border-slate-700 { border-color: #ccc !important; }
          .border-slate-600 { border-color: #ccc !important; }
        }
      `}</style>
      
      {/* Report Header */}
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

      {/* Report Content */}
      <div className="bg-white text-black p-8 rounded-lg print:shadow-none print:p-0">
        <div className="text-center mb-8 print:mb-6">
          <h1 className="text-3xl font-bold text-black mb-2 print:text-2xl">Site Visit Report</h1>
          <div className="w-16 h-1 bg-amber-400 mx-auto"></div>
        </div>

        {/* Site Information */}
        <div className="mb-8 print:mb-6">
          <h2 className="text-xl font-semibold text-black mb-4 print:text-lg">Site Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
              <p className="text-black font-medium">{site.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Site ID</label>
              <p className="text-black font-medium">{site._id}</p>
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
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Created By</label>
              <p className="text-black">{site.createdBy}</p>
            </div>
          </div>
        </div>

        {/* Site Boundary Map */}
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
                <TileLayer url="https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}" />
                <Polygon
                  positions={siteBoundary.coordinates.map(([lng, lat]: number[]) => [lat, lng] as [number, number])}
                  pathOptions={{ color: "#f59e0b", weight: 3, fillOpacity: 0.2 }}
                />
                <FitToBounds coordinates={siteBoundary.coordinates} />
              </MapContainer>
            </div>
          </div>
        )}

        {/* Visits with Observations */}
        <div className="mb-8 print:mb-0">
          <h2 className="text-xl font-semibold text-black mb-4 print:text-lg">
            Visits & Observations
          </h2>
          
          {visits.length === 0 ? (
            <p className="text-gray-600 italic">No visits recorded for this site.</p>
          ) : (
            visits.map((visit, index) => (
              <VisitObservationsSection
                key={visit._id}
                visitId={visit._id}
                visitDate={visit.visitDate}
                visitIndex={index}
              />
            ))
          )}
        </div>

        {/* Site Plans Section */}
        {sitePlans.length > 0 && (
          <div className="mb-8 print:mb-0">
            <h2 className="text-xl font-semibold text-black mb-4 print:text-lg">
              Site Plans ({sitePlans.length})
            </h2>
            
            {sitePlans.map((plan, index) => (
              <SitePlanSection
                key={plan._id}
                planId={plan._id}
                planName={plan.name}
                planImageUrl={plan.imageUrl}
                planIndex={index}
              />
            ))}
          </div>
        )}

        {/* Report Footer */}
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
