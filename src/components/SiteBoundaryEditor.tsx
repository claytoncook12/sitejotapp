import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Polygon, useMapEvents, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

interface SiteBoundaryEditorProps {
  siteId: Id<"sites">;
  siteName: string;
}

// Component to handle map clicks for adding points
function MapClickHandler({
  onMapClick,
  isDrawing,
}: {
  onMapClick: (lat: number, lng: number) => void;
  isDrawing: boolean;
}) {
  useMapEvents({
    click: (e) => {
      if (isDrawing) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Component to fit map to bounds
function FitBounds({ coordinates, onlyOnce = false }: { coordinates: number[][]; onlyOnce?: boolean }) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (onlyOnce && hasFitted.current) return;
    if (coordinates.length > 0) {
      const latLngs = coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
      const bounds = latLngs.reduce(
        (acc, [lat, lng]) => {
          return {
            minLat: Math.min(acc.minLat, lat),
            maxLat: Math.max(acc.maxLat, lat),
            minLng: Math.min(acc.minLng, lng),
            maxLng: Math.max(acc.maxLng, lng),
          };
        },
        { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 }
      );
      map.fitBounds([
        [bounds.minLat, bounds.minLng],
        [bounds.maxLat, bounds.maxLng],
      ], { padding: [40, 40], maxZoom: 16 });
      hasFitted.current = true;
    }
  }, [coordinates, map, onlyOnce]);

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

export function SiteBoundaryEditor({ siteId, siteName }: SiteBoundaryEditorProps) {
  const boundary = useQuery(api.sitePolylines.getBySite, { siteId });
  const createBoundary = useMutation(api.sitePolylines.create);
  const updateBoundary = useMutation(api.sitePolylines.update);
  const deleteBoundary = useMutation(api.sitePolylines.remove);

  const [showEditor, setShowEditor] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [editCoordinates, setEditCoordinates] = useState<number[][]>([]); // [[lng, lat], ...]
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Zoom to location state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [flyLat, setFlyLat] = useState(0);
  const [flyLng, setFlyLng] = useState(0);
  const [flyTrigger, setFlyTrigger] = useState(0);
  
  // Tile layer state
  const [tileLayer, setTileLayer] = useState<"osm" | "usgs" | "esri">("osm");

  // User's current location as default center
  const [userLocation, setUserLocation] = useState<LatLngExpression | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          // Fallback if geolocation denied/unavailable
          setUserLocation([38.0, -84.5]);
        }
      );
    }
  }, []);

  // Convert GeoJSON coordinates [lng, lat] to Leaflet [lat, lng]
  const toLeafletCoords = (coords: number[][]): LatLngExpression[] => {
    return coords.map(([lng, lat]) => [lat, lng] as [number, number]);
  };

  const defaultCenter: LatLngExpression = userLocation ?? [38.0, -84.5];

  const handleMapClick = (lat: number, lng: number) => {
    setEditCoordinates((prev) => [...prev, [lng, lat]]);
  };

  const handleUndo = () => {
    setEditCoordinates((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setEditCoordinates([]);
    setIsDrawing(true);
  };

  const handleZoomToLocation = async () => {
    const query = searchQuery.trim();
    if (!query) {
      toast.error("Please enter an address or coordinates");
      return;
    }

    // Check if input looks like coordinates (two numbers separated by comma)
    const coordMatch = query.match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (lat < -90 || lat > 90) {
        toast.error("Latitude must be between -90 and 90");
        return;
      }
      if (lng < -180 || lng > 180) {
        toast.error("Longitude must be between -180 and 180");
        return;
      }
      setFlyLat(lat);
      setFlyLng(lng);
      setFlyTrigger((prev) => prev + 1);
      return;
    }

    // Otherwise, geocode as an address via Nominatim
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { "Accept": "application/json" } }
      );
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        toast.error("No results found for that address");
        return;
      }
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      setFlyLat(lat);
      setFlyLng(lng);
      setFlyTrigger((prev) => prev + 1);
    } catch {
      toast.error("Failed to search for address");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async () => {
    if (editCoordinates.length < 3) {
      toast.error("Please add at least 3 points to create a boundary");
      return;
    }

    try {
      if (boundary) {
        await updateBoundary({
          polylineId: boundary._id,
          coordinates: editCoordinates,
        });
        toast.success("Boundary updated");
      } else {
        await createBoundary({
          siteId,
          name: "Site Boundary",
          coordinates: editCoordinates,
        });
        toast.success("Boundary created");
      }
      setShowEditor(false);
      setIsDrawing(false);
    } catch (error) {
      toast.error("Failed to save boundary");
    }
  };

  const handleDelete = async () => {
    if (!boundary) return;
    if (!confirm("Are you sure you want to delete this site boundary?")) return;

    try {
      await deleteBoundary({ polylineId: boundary._id });
      toast.success("Boundary deleted");
    } catch (error) {
      toast.error("Failed to delete boundary");
    }
  };

  const handleExport = () => {
    if (!boundary) return;

    // Ensure coordinates form a closed ring for GeoJSON Polygon
    const coords = [...boundary.coordinates];
    if (coords.length > 0) {
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coords.push([...first]);
      }
    }

    const geojson = {
      type: "Feature",
      properties: {
        name: boundary.name,
        description: boundary.description || null,
        siteId,
        siteName,
      },
      geometry: {
        type: "Polygon",
        coordinates: [coords],
      },
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: "application/geo+json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${siteName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-boundary.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Boundary exported");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const geojson = JSON.parse(content);

        let coordinates: number[][] = [];

        // Handle different GeoJSON structures
        if (geojson.type === "Feature") {
          if (geojson.geometry.type === "LineString") {
            coordinates = geojson.geometry.coordinates;
          } else if (geojson.geometry.type === "Polygon") {
            // Use the outer ring of the polygon
            coordinates = geojson.geometry.coordinates[0];
          } else {
            throw new Error("Unsupported geometry type. Use LineString or Polygon.");
          }
        } else if (geojson.type === "LineString") {
          coordinates = geojson.coordinates;
        } else if (geojson.type === "Polygon") {
          coordinates = geojson.coordinates[0];
        } else if (geojson.type === "FeatureCollection" && geojson.features.length > 0) {
          const firstFeature = geojson.features[0];
          if (firstFeature.geometry.type === "LineString") {
            coordinates = firstFeature.geometry.coordinates;
          } else if (firstFeature.geometry.type === "Polygon") {
            coordinates = firstFeature.geometry.coordinates[0];
          } else {
            throw new Error("Unsupported geometry type in FeatureCollection.");
          }
        } else {
          throw new Error("Unsupported GeoJSON format");
        }

        // Validate coordinates
        if (!Array.isArray(coordinates) || coordinates.length < 2) {
          throw new Error("Invalid or insufficient coordinates");
        }

        for (const coord of coordinates) {
          if (!Array.isArray(coord) || coord.length < 2 || typeof coord[0] !== "number" || typeof coord[1] !== "number") {
            throw new Error("Invalid coordinate format");
          }
        }

        setEditCoordinates(coordinates);
        setShowEditor(true);
        setIsDrawing(false);
        toast.success(`Imported ${coordinates.length} points. Review and save.`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to parse GeoJSON file");
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openEditor = (startDrawing: boolean = false) => {
    if (boundary) {
      setEditCoordinates([...boundary.coordinates]);
    } else {
      setEditCoordinates([]);
    }
    setIsDrawing(startDrawing);
    setShowEditor(true);
  };

  // Loading state
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

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Site Boundary</h4>

        {!boundary ? (
          // No boundary exists
          <div className="flex flex-col sm:flex-row gap-2">
            <p className="text-slate-500 dark:text-slate-400 text-sm flex-1">No boundary defined</p>
            <div className="flex gap-2">
              <button
                onClick={() => openEditor(true)}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-lg text-sm font-medium transition-colors"
              >
                + Draw Boundary
              </button>
              <label className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".geojson,.json"
                  onChange={handleImport}
                  className="hidden"
                />
                Import GeoJSON
              </label>
            </div>
          </div>
        ) : (
          // Boundary exists
          <div className="space-y-3">
            {/* Mini map preview */}
            <div className="h-32 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 relative z-0">
              <MapContainer
                center={defaultCenter}
                zoom={13}
                scrollWheelZoom={false}
                dragging={false}
                zoomControl={false}
                attributionControl={false}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Polygon
                  positions={toLeafletCoords(boundary.coordinates)}
                  pathOptions={{ color: boundary.color || "#f59e0b", weight: boundary.strokeWidth || 3 }}
                />
                <FitBounds coordinates={boundary.coordinates} />
              </MapContainer>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                ✓ {boundary.coordinates.length} points
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => openEditor(false)}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleExport}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors"
                >
                  Export
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {boundary ? "Edit Site Boundary" : "Draw Site Boundary"}
              </h3>
              <button
                onClick={() => {
                  setShowEditor(false);
                  setIsDrawing(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Point count and drawing status */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {editCoordinates.length} points
              </span>
              {isDrawing ? (
                <span className="text-sm text-amber-500 font-medium">
                  Click on map to add points
                </span>
              ) : (
                <button
                  onClick={() => setIsDrawing(true)}
                  className="text-sm text-amber-400 hover:text-amber-500 font-medium"
                >
                  Start Drawing
                </button>
              )}
            </div>

            {/* Search Location */}
            <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleZoomToLocation(); }}
                  placeholder="Enter address or lat, lng"
                  className="flex-1 min-w-0 px-2 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <button
                  onClick={handleZoomToLocation}
                  disabled={isSearching}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? "Searching..." : "Search"}
                </button>
              </div>
            </div>

            {/* Map */}
            <div className="h-[400px] sm:h-[500px]">
              <MapContainer
                center={defaultCenter}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
              >
                {tileLayer === "osm" && (
                  <TileLayer
                    key="osm"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                )}
                {tileLayer === "usgs" && (
                  <TileLayer
                    key="usgs"
                    url="https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}"
                    attribution='USGS The National Map'
                  />
                )}
                {tileLayer === "esri" && (
                  <TileLayer
                    key="esri"
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution='Tiles &copy; Esri'
                  />
                )}
                <MapClickHandler onMapClick={handleMapClick} isDrawing={isDrawing} />
                <FlyToLocation lat={flyLat} lng={flyLng} trigger={flyTrigger} />
                <FitBounds coordinates={editCoordinates} onlyOnce />
                {editCoordinates.length > 0 && (
                  <Polygon
                    positions={toLeafletCoords(editCoordinates)}
                    pathOptions={{ color: "#f59e0b", weight: 3 }}
                  />
                )}
              </MapContainer>
            </div>

            {/* Controls */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
              {/* Tile Layer Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-300">Map:</span>
                <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600">
                  <button
                    onClick={() => setTileLayer("osm")}
                    className={`px-3 py-1 text-sm font-medium transition-colors ${
                      tileLayer === "osm"
                        ? "bg-amber-400 text-slate-900"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    OpenStreetMap
                  </button>
                  <button
                    onClick={() => setTileLayer("usgs")}
                    className={`px-3 py-1 text-sm font-medium transition-colors ${
                      tileLayer === "usgs"
                        ? "bg-amber-400 text-slate-900"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    USGS Imagery
                  </button>
                  <button
                    onClick={() => setTileLayer("esri")}
                    className={`px-3 py-1 text-sm font-medium transition-colors ${
                      tileLayer === "esri"
                        ? "bg-amber-400 text-slate-900"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    ESRI Satellite
                  </button>
                </div>
              </div>

              {/* Drawing Controls */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleUndo}
                    disabled={editCoordinates.length === 0}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Undo
                  </button>
                  <button
                    onClick={handleClear}
                    disabled={editCoordinates.length === 0}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>
                  <label className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept=".geojson,.json"
                      onChange={handleImport}
                      className="hidden"
                    />
                    Import
                  </label>
                  <button
                    onClick={() => {
                      setShowEditor(false);
                      setIsDrawing(false);
                    }}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={editCoordinates.length < 2}
                    className="px-4 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
