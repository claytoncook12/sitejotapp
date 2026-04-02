import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { MapContainer, TileLayer, Polygon, Popup, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

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

// Component to fit map to all site boundaries
function FitToAllBounds({ sites }: { sites: { boundaryCoordinates: number[][] | null }[] }) {
  const map = useMap();

  useEffect(() => {
    const allCoords: number[][] = [];
    sites.forEach((site) => {
      if (site.boundaryCoordinates && site.boundaryCoordinates.length > 0) {
        allCoords.push(...site.boundaryCoordinates);
      }
    });

    if (allCoords.length > 0) {
      const bounds = allCoords.reduce(
        (acc, [lng, lat]) => ({
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
  }, [sites, map]);

  return null;
}

// Component to track map zoom level
function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
}

// Component to fly to a specific location
function FlyToLocation({ lat, lng, trigger }: { lat: number; lng: number; trigger: number }) {
  const map = useMap();

  useEffect(() => {
    if (trigger > 0 && !isNaN(lat) && !isNaN(lng)) {
      map.flyTo([lat, lng], 16, { duration: 1 });
    }
  }, [trigger, lat, lng, map]);

  return null;
}

// Component to invalidate map size when container changes
function InvalidateSize({ trigger }: { trigger: boolean }) {
  const map = useMap();

  useEffect(() => {
    // Small delay to allow container to resize first
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timeout);
  }, [trigger, map]);

  return null;
}

type Screen = 
  | { type: "dashboard" }
  | { type: "site-detail"; siteId: Id<"sites"> }
  | { type: "add-observation"; siteId: Id<"sites">; visitId: Id<"visits"> }
  | { type: "report"; siteId: Id<"sites"> }
  | { type: "plan-viewer"; siteId: Id<"sites">; planId: Id<"sitePlans"> };

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const sites = useQuery(api.sites.list) || [];
  const createSite = useMutation(api.sites.create);
  const deleteSite = useMutation(api.sites.remove);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [mapTileLayer, setMapTileLayer] = useState<"osm" | "usgs" | "esri">("osm");
  const [mapZoom, setMapZoom] = useState(8);
  
  // Zoom to location state
  const [zoomLat, setZoomLat] = useState("");
  const [zoomLng, setZoomLng] = useState("");
  const [flyTrigger, setFlyTrigger] = useState(0);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const handleZoomToLocation = () => {
    const lat = parseFloat(zoomLat);
    const lng = parseFloat(zoomLng);
    if (isNaN(lat) || isNaN(lng)) {
      toast.error("Please enter valid latitude and longitude");
      return;
    }
    if (lat < -90 || lat > 90) {
      toast.error("Latitude must be between -90 and 90");
      return;
    }
    if (lng < -180 || lng > 180) {
      toast.error("Longitude must be between -180 and 180");
      return;
    }
    setFlyTrigger((prev) => prev + 1);
  };
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    visitDate: "",
    status: "active" as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSite(formData);
      setFormData({ name: "", location: "", visitDate: "", status: "active" });
      setShowCreateForm(false);
      toast.success("Site visit created successfully");
    } catch (error) {
      toast.error("Failed to create site visit");
    }
  };

  const handleDelete = async (siteId: Id<"sites">, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this site visit? This will also delete all observations.")) {
      return;
    }
    try {
      await deleteSite({ siteId });
      toast.success("Site visit deleted successfully");
    } catch (error) {
      toast.error("Failed to delete site visit");
    }
  };

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
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Site Visits</h2>
          <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 self-start">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === "list"
                  ? "bg-amber-400 text-slate-900"
                  : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              List
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === "map"
                  ? "bg-amber-400 text-slate-900"
                  : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Map
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors self-start sm:self-auto"
        >
          + New Site Visit
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Create New Site Visit</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Site Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Location/Address
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Initial Visit Date
              </label>
              <input
                type="date"
                value={formData.visitDate}
                onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="active">Active</option>
                <option value="complete">Complete</option>
                <option value="in_review">In Review</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Create Site Visit
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-900 dark:text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {viewMode === "map" && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Map:</span>
            <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600">
              <button
                onClick={() => setMapTileLayer("osm")}
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  mapTileLayer === "osm"
                    ? "bg-amber-400 text-slate-900"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                OpenStreetMap
              </button>
              <button
                onClick={() => setMapTileLayer("usgs")}
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  mapTileLayer === "usgs"
                    ? "bg-amber-400 text-slate-900"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                USGS Imagery
              </button>
              <button
                onClick={() => setMapTileLayer("esri")}
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  mapTileLayer === "esri"
                    ? "bg-amber-400 text-slate-900"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                ESRI Satellite
              </button>
            </div>
          </div>

          {/* Zoom to Location */}
          <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center mb-3">
            <div className="flex gap-2 flex-1">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Latitude</label>
                <input
                  type="text"
                  value={zoomLat}
                  onChange={(e) => setZoomLat(e.target.value)}
                  placeholder="e.g., 38.0406"
                  className="w-full px-2 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Longitude</label>
                <input
                  type="text"
                  value={zoomLng}
                  onChange={(e) => setZoomLng(e.target.value)}
                  placeholder="e.g., -84.5037"
                  className="w-full px-2 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>
            <button
              onClick={handleZoomToLocation}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors whitespace-nowrap"
            >
              Zoom to Location
            </button>
          </div>

          <div 
            className={isMapFullscreen 
              ? "fixed inset-0 z-50 overflow-hidden" 
              : "h-[500px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0"
            }
          >
            {/* Fullscreen Toggle Button */}
            <button
              onClick={() => setIsMapFullscreen(!isMapFullscreen)}
              className="absolute top-3 right-3 z-[1000] p-2 bg-white dark:bg-slate-800 rounded-lg shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600"
              title={isMapFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isMapFullscreen ? (
                <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
            <MapContainer
              center={[38.0, -84.5] as LatLngExpression}
              zoom={8}
              preferCanvas={true}
              style={{ height: "100%", width: "100%" }}
            >
              <InvalidateSize trigger={isMapFullscreen} />
              <ZoomTracker onZoomChange={setMapZoom} />
              <FlyToLocation lat={parseFloat(zoomLat)} lng={parseFloat(zoomLng)} trigger={flyTrigger} />
              {mapTileLayer === "osm" && (
                <TileLayer
                  key="osm"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
              )}
              {mapTileLayer === "usgs" && (
                <TileLayer
                  key="usgs"
                  url="https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}"
                  attribution="USGS The National Map"
                />
              )}
              {mapTileLayer === "esri" && (
                <TileLayer
                  key="esri"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution="Tiles &copy; Esri"
                />
              )}
              {sites.map((site) =>
                site.boundaryCoordinates && site.boundaryCoordinates.length > 0 ? (
                  <Polygon
                    key={site._id}
                    positions={site.boundaryCoordinates.map(([lng, lat]: number[]) => [lat, lng] as [number, number])}
                    pathOptions={{
                      color: site.status === "active" ? "#22c55e" : site.status === "complete" ? "#3b82f6" : "#f59e0b",
                      weight: 3,
                      fillOpacity: 0.2,
                    }}
                  >
                    {mapZoom >= 13 && (
                      <Tooltip permanent direction="top" offset={[0, -20]} className="polygon-label">
                        {site.name}
                      </Tooltip>
                    )}
                    <Popup>
                      <div className="min-w-[200px]">
                        <h4 className="font-semibold text-slate-900 mb-1">{site.name}</h4>
                        <p className="text-sm text-slate-600 mb-2">{site.location}</p>
                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${
                              site.status === "active"
                                ? "bg-green-500"
                                : site.status === "complete"
                                ? "bg-blue-500"
                                : "bg-amber-500"
                            }`}
                          >
                            {site.status === "active" ? "Active" : site.status === "complete" ? "Complete" : "In Review"}
                          </span>
                        </div>
                        <button
                          onClick={() => onNavigate({ type: "site-detail", siteId: site._id })}
                          className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 py-1.5 rounded font-medium text-sm transition-colors"
                        >
                          Open Site
                        </button>
                      </div>
                    </Popup>
                  </Polygon>
                ) : null
              )}
              <FitToAllBounds sites={sites} />
            </MapContainer>
          </div>
        </div>
      )}

      {viewMode === "list" && (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => (
          <div
            key={site._id}
            className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{site.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(site.status)}`}>
                {getStatusText(site.status)}
              </span>
            </div>
            {site.boundaryCoordinates && site.boundaryCoordinates.length > 0 && (
              <div className="h-32 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 mb-3 relative z-0">
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
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Polygon
                    positions={site.boundaryCoordinates.map(([lng, lat]: number[]) => [lat, lng] as [number, number])}
                    pathOptions={{ color: "#f59e0b", weight: 2, fillOpacity: 0.2 }}
                  />
                  <FitToBounds coordinates={site.boundaryCoordinates} />
                </MapContainer>
              </div>
            )}
            <p className="text-slate-600 dark:text-slate-300 text-sm">{site.location}</p>
            {site.oldestVisitDate && site.newestVisitDate && (
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                Visit Dates from {new Date(site.oldestVisitDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} to {new Date(site.newestVisitDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
            {(!site.oldestVisitDate || !site.newestVisitDate) && (
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                No visits recorded
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => onNavigate({ type: "site-detail", siteId: site._id })}
                className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-900 py-2 rounded-lg font-medium transition-colors"
              >
                Open Site
              </button>
              <button
                onClick={(e) => handleDelete(site._id, e)}
                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                title="Delete site"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {sites.length === 0 && !showCreateForm && (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No site visits yet</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">Create your first site visit to get started</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Create Site Visit
          </button>
        </div>
      )}
    </div>
  );
}
