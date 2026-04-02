import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

type Screen = 
  | { type: "dashboard" }
  | { type: "site-detail"; siteId: Id<"sites"> }
  | { type: "add-observation"; siteId: Id<"sites">; visitId: Id<"visits"> }
  | { type: "report"; siteId: Id<"sites"> }
  | { type: "plan-viewer"; siteId: Id<"sites">; planId: Id<"sitePlans"> };

interface SitePlanViewerProps {
  siteId: Id<"sites">;
  planId: Id<"sitePlans">;
  onNavigate: (screen: Screen) => void;
}

interface MarkerData {
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

export function SitePlanViewer({ siteId, planId, onNavigate }: SitePlanViewerProps) {
  const plan = useQuery(api.sitePlans.get, { planId });
  const markers = useQuery(api.planMarkers.list, { planId }) as MarkerData[] | undefined;
  const visits = useQuery(api.visits.list, { siteId }) || [];
  
  const createMarker = useMutation(api.planMarkers.create);
  const updateMarker = useMutation(api.planMarkers.update);
  const deleteMarker = useMutation(api.planMarkers.remove);
  const unlinkObservation = useMutation(api.planMarkers.unlinkObservation);
  
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelText, setLabelText] = useState("");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<Id<"visits"> | null>(null);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  // Get observations for selected visit in link modal
  const observationsForLinking = useQuery(
    api.observations.listByVisit,
    selectedVisitId ? { visitId: selectedVisitId } : "skip"
  );

  const handleImageClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingMarker || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Ensure click is within image bounds
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    
    // Convert to percentage of image dimensions
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    try {
      await createMarker({
        planId,
        xPercent,
        yPercent,
      });
      toast.success("Marker added");
      setIsAddingMarker(false);
    } catch (error) {
      toast.error("Failed to add marker");
    }
  }, [isAddingMarker, planId, createMarker]);

  const handleMarkerClick = (marker: MarkerData, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMarker(marker);
    setLabelText(marker.label || "");
  };

  const handleDeleteMarker = async () => {
    if (!selectedMarker) return;
    try {
      await deleteMarker({ markerId: selectedMarker._id });
      toast.success("Marker deleted");
      setSelectedMarker(null);
    } catch (error) {
      toast.error("Failed to delete marker");
    }
  };

  const handleSaveLabel = async () => {
    if (!selectedMarker) return;
    try {
      await updateMarker({
        markerId: selectedMarker._id,
        label: labelText || undefined,
      });
      toast.success("Label saved");
      setEditingLabel(false);
    } catch (error) {
      toast.error("Failed to save label");
    }
  };

  const handleUnlinkObservation = async () => {
    if (!selectedMarker) return;
    try {
      await unlinkObservation({ markerId: selectedMarker._id });
      toast.success("Observation unlinked");
    } catch (error) {
      toast.error("Failed to unlink observation");
    }
  };

  const handleLinkObservation = async (observationId: Id<"observations">) => {
    if (!selectedMarker) return;
    try {
      await updateMarker({
        markerId: selectedMarker._id,
        observationId,
      });
      toast.success("Observation linked");
      setShowLinkModal(false);
      setSelectedVisitId(null);
    } catch (error) {
      toast.error("Failed to link observation");
    }
  };

  if (plan === undefined || markers === undefined) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Plan not found</h2>
        <p className="text-slate-500 dark:text-slate-400">The plan you're looking for doesn't exist or you don't have access to it.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-100 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate({ type: "site-detail", siteId })}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-amber-400 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{plan.name}</h1>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            ({markers.length} markers)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden lg:hidden text-xs text-slate-500 dark:text-slate-400"></span>
          <button
            onClick={() => setIsAddingMarker(!isAddingMarker)}
            className={`hidden lg:block px-4 py-2 rounded-lg font-medium transition-colors ${
              isAddingMarker
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-amber-400 hover:bg-amber-500 text-slate-900"
            }`}
          >
            {isAddingMarker ? "Cancel" : "+ Add Marker"}
          </button>
        </div>
      </div>

      {/* Desktop-only editing notice for mobile */}
      <div className="lg:hidden bg-slate-100 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600 px-4 py-2 flex items-center justify-center gap-2">
        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span className="text-xs text-slate-500 dark:text-slate-400">Marker editing is available on desktop</span>
      </div>

      {/* Add Marker Instructions */}
      {isAddingMarker && (
        <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-300 dark:border-amber-700 px-4 py-2 text-center">
          <span className="text-amber-800 dark:text-amber-200 font-medium">
            Click anywhere on the plan to place a marker
          </span>
        </div>
      )}

      {/* Plan View with Markers */}
      <div className="flex-1 relative overflow-hidden">
        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={0.5}
          maxScale={5}
          centerOnInit={true}
          panning={{ disabled: isAddingMarker }}
          pinch={{ disabled: isAddingMarker }}
          wheel={{ disabled: isAddingMarker }}
          doubleClick={{ disabled: isAddingMarker }}
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
                <div 
                  className="relative inline-block"
                  onMouseUp={handleImageClick}
                  style={{ cursor: isAddingMarker ? "crosshair" : "default" }}
                >
                  <img
                    ref={imageRef}
                    src={plan.imageUrl || ""}
                    alt={plan.name}
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

      {/* Selected Marker Slide-Out Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 z-30 bg-white dark:bg-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          selectedMarker ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedMarker && (
          <div className="h-full flex flex-col">
            {/* Panel Header */}
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

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Label Section */}
              <div>
                <label className="text-sm font-medium text-slate-500 dark:text-slate-400 block mb-2">Label</label>
                {editingLabel ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={labelText}
                      onChange={(e) => setLabelText(e.target.value)}
                      placeholder="Enter label..."
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveLabel}
                        className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-lg text-sm font-medium transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingLabel(false)}
                        className="px-4 py-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg text-slate-900 dark:text-white">
                      {selectedMarker.label || <span className="text-slate-400 italic">No label</span>}
                    </span>
                    <button
                      onClick={() => {
                        setLabelText(selectedMarker.label || "");
                        setEditingLabel(true);
                      }}
                      className="hidden lg:block p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Linked Observation Section */}
              <div>
                <label className="text-sm font-medium text-slate-500 dark:text-slate-400 block mb-2">Linked Observation</label>
                {selectedMarker.observation ? (
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                    {/* Observation Image - Full Width */}
                    {selectedMarker.observation.imageUrl && (
                      <div className="w-full aspect-video bg-slate-200 dark:bg-slate-600">
                        <img
                          src={selectedMarker.observation.imageUrl}
                          alt="Observation"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    {/* Observation Details */}
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
                    
                    {/* Unlink Button */}
                    <div className="hidden lg:block px-4 pb-4">
                      <button
                        onClick={handleUnlinkObservation}
                        className="text-sm text-red-500 hover:text-red-600 font-medium"
                      >
                        Unlink observation
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowLinkModal(true);
                      if (visits.length > 0) {
                        setSelectedVisitId(visits[0]._id);
                      }
                    }}
                    className="hidden lg:block w-full px-4 py-8 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 rounded-lg text-sm transition-colors border-2 border-dashed border-slate-300 dark:border-slate-600"
                  >
                    <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Click to link an observation
                  </button>
                )}
              </div>

              {/* Position Info */}
              <div>
                <label className="text-sm font-medium text-slate-500 dark:text-slate-400 block mb-2">Position</label>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  X: {selectedMarker.xPercent.toFixed(1)}%, Y: {selectedMarker.yPercent.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Panel Footer */}
            <div className="hidden lg:block p-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleDeleteMarker}
                className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                Delete Marker
              </button>
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

      {/* Link Observation Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 dark:text-white">Link to Observation</h3>
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setSelectedVisitId(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <label className="text-sm text-slate-500 dark:text-slate-400 block mb-2">Select Visit</label>
              <select
                value={selectedVisitId || ""}
                onChange={(e) => setSelectedVisitId(e.target.value as Id<"visits">)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              >
                {visits.map((visit) => (
                  <option key={visit._id} value={visit._id}>
                    {new Date(visit.visitDate + "T00:00:00").toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {observationsForLinking === undefined ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400"></div>
                </div>
              ) : observationsForLinking.length === 0 ? (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                  No observations in this visit
                </p>
              ) : (
                <div className="space-y-2">
                  {observationsForLinking.map((obs) => (
                    <button
                      key={obs._id}
                      onClick={() => handleLinkObservation(obs._id)}
                      className="w-full flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left transition-colors"
                    >
                      {obs.fileUrl && obs.type === "photo" && (
                        <img
                          src={obs.fileUrl}
                          alt=""
                          className="w-12 h-12 object-cover rounded flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-amber-400 capitalize">{obs.type}</span>
                        <p className="text-sm text-slate-900 dark:text-white truncate">
                          {obs.description || "No description"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
