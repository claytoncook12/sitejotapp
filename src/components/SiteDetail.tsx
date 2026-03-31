import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect, useRef } from "react";
import { SiteReport } from "./SiteReport";
import { SiteBoundaryEditor } from "./SiteBoundaryEditor";
import { toast } from "sonner";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

type Screen = 
  | { type: "dashboard" }
  | { type: "site-detail"; siteId: Id<"sites"> }
  | { type: "add-observation"; siteId: Id<"sites">; visitId: Id<"visits"> }
  | { type: "report"; siteId: Id<"sites"> }
  | { type: "plan-viewer"; siteId: Id<"sites">; planId: Id<"sitePlans"> };

interface SiteDetailProps {
  siteId: Id<"sites">;
  onNavigate: (screen: Screen) => void;
}

// Sub-component for observation list within a visit
function VisitObservations({
  visitId,
  siteId,
  onNavigate,
  isExpanded,
}: {
  visitId: Id<"visits">;
  siteId: Id<"sites">;
  onNavigate: (screen: Screen) => void;
  isExpanded: boolean;
}) {
  const observations = useQuery(api.observations.listByVisit, { visitId }) || [];
  const updateObservation = useMutation(api.observations.update);
  const deleteObservation = useMutation(api.observations.remove);
  const reorderObservations = useMutation(api.observations.reorder);

  const [editingId, setEditingId] = useState<Id<"observations"> | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
    const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null);

  // Drag-to-reorder state
  type ObservationType = typeof observations[number];
  const [localObservations, setLocalObservations] = useState<ObservationType[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const draggedItemRef = useRef<ObservationType | null>(null);

  // Sync local state with server data
  useEffect(() => {
    if (observations.length > 0) {
      setLocalObservations(observations);
    } else {
      setLocalObservations([]);
    }
  }, [observations]);

  const startEditing = (observationId: Id<"observations">, currentDescription: string | undefined) => {
    setEditingId(observationId);
    setEditDescription(currentDescription || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDescription("");
  };

  const saveEdit = async () => {
    if (editingId) {
      try {
        await updateObservation({
          observationId: editingId,
          description: editDescription || undefined,
        });
        toast.success("Observation updated");
        setEditingId(null);
        setEditDescription("");
      } catch (error) {
        toast.error("Failed to update observation");
      }
    }
  };

  const handleDelete = async () => {
    if (editingId) {
      try {
        await deleteObservation({ observationId: editingId });
        toast.success("Observation deleted");
        setEditingId(null);
        setEditDescription("");
      } catch (error) {
        toast.error("Failed to delete observation");
      }
    }
  };

  // Drag-to-reorder handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    draggedItemRef.current = localObservations[index];
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
    setTimeout(() => {
      (e.target as HTMLElement).style.opacity = "0.5";
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = "1";
    setDraggedIndex(null);
    draggedItemRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newObservations = [...localObservations];
    const draggedItem = newObservations[draggedIndex];
    newObservations.splice(draggedIndex, 1);
    newObservations.splice(index, 0, draggedItem);
    setLocalObservations(newObservations);
    setDraggedIndex(index);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    
    try {
      await reorderObservations({
        visitId,
        observationIds: localObservations.map((o) => o._id),
      });
    } catch (error) {
      toast.error("Failed to reorder observations");
      setLocalObservations(observations);
    }
  };

  const moveToTop = async (index: number) => {
    if (index === 0) return;
    
    const newObservations = [...localObservations];
    const item = newObservations.splice(index, 1)[0];
    newObservations.unshift(item);
    setLocalObservations(newObservations);
    
    try {
      await reorderObservations({
        visitId,
        observationIds: newObservations.map((o) => o._id),
      });
    } catch (error) {
      toast.error("Failed to move observation");
      setLocalObservations(observations);
    }
  };

  const moveToBottom = async (index: number) => {
    if (index === localObservations.length - 1) return;
    
    const newObservations = [...localObservations];
    const item = newObservations.splice(index, 1)[0];
    newObservations.push(item);
    setLocalObservations(newObservations);
    
    try {
      await reorderObservations({
        visitId,
        observationIds: newObservations.map((o) => o._id),
      });
    } catch (error) {
      toast.error("Failed to move observation");
      setLocalObservations(observations);
    }
  };

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

  if (!isExpanded) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => onNavigate({ type: "add-observation", siteId, visitId })}
          className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
        >
          + Add Observation
        </button>
      </div>

      <div className="space-y-4">
        {localObservations.map((observation, index) => (
          <div
            key={observation._id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={handleDrop}
            className={`bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 cursor-grab active:cursor-grabbing transition-all ${
              draggedIndex === index ? "ring-2 ring-amber-400" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Move buttons and drag handle */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => moveToTop(index)}
                  disabled={index === 0}
                  className="p-1 text-slate-400 dark:text-slate-500 hover:text-amber-400 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                  title="Move to top"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                  </svg>
                </button>
                <div className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-grab">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                  </svg>
                </div>
                <button
                  onClick={() => moveToBottom(index)}
                  disabled={index === localObservations.length - 1}
                  className="p-1 text-slate-400 dark:text-slate-500 hover:text-amber-400 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                  title="Move to bottom"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7-7-7M19 5l-7 7-7-7" />
                  </svg>
                </button>
              </div>
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
                  {/* Inline media display */}
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
                    {editingId === observation._id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                          placeholder="Description (optional)..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            className="px-3 py-1 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded text-sm font-medium transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-3 py-1 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-900 dark:text-white rounded text-sm font-medium transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleDelete}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <p className="text-slate-900 dark:text-white mb-3">{observation.description || <span className="text-slate-400 dark:text-slate-500 italic">No description</span>}</p>
                        <button
                          onClick={() => startEditing(observation._id, observation.description)}
                          className="ml-2 p-1 text-slate-400 hover:text-amber-400 transition-colors"
                          title="Edit observation"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {observations.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-500 dark:text-slate-400 mb-4">No observations for this visit yet</p>
          <button
            onClick={() => onNavigate({ type: "add-observation", siteId, visitId })}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
          >
            Add First Observation
          </button>
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
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={10}
              centerOnInit={true}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
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
                    <img
                      src={modalImageUrl}
                      alt="Observation"
                      className="max-w-[95vw] max-h-[95vh] object-contain"
                    />
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

export function SiteDetail({ siteId, onNavigate }: SiteDetailProps) {
  const site = useQuery(api.sites.get, { siteId });
  const visits = useQuery(api.visits.list, { siteId }) || [];
  const sitePlans = useQuery(api.sitePlans.list, { siteId }) || [];
  const updateSite = useMutation(api.sites.update);
  const createVisit = useMutation(api.visits.create);
  const updateVisit = useMutation(api.visits.update);
  const deleteVisit = useMutation(api.visits.remove);
  const generateUploadUrl = useMutation(api.sitePlans.generateUploadUrl);
  const createSitePlan = useMutation(api.sitePlans.create);
  const deleteSitePlan = useMutation(api.sitePlans.remove);
  const [showReport, setShowReport] = useState(false);
  
  // Track expanded visits (most recent expanded by default)
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());
  
  // Site editing state
  const [isEditingSite, setIsEditingSite] = useState(false);
  const [editSiteName, setEditSiteName] = useState("");
  const [editSiteLocation, setEditSiteLocation] = useState("");
  
  // Visit editing state
  const [editingVisitId, setEditingVisitId] = useState<Id<"visits"> | null>(null);
  const [editVisitDate, setEditVisitDate] = useState("");
  
  // New visit state
  const [showNewVisitForm, setShowNewVisitForm] = useState(false);
  const [newVisitDate, setNewVisitDate] = useState(() => new Date().toISOString().split("T")[0]);
  
  // Site plan state
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [planImageFile, setPlanImageFile] = useState<File | null>(null);
  const [isUploadingPlan, setIsUploadingPlan] = useState(false);
  const planFileInputRef = useRef<HTMLInputElement>(null);

  // Expand most recent visit by default when visits load
  useEffect(() => {
    if (visits.length > 0 && expandedVisits.size === 0) {
      setExpandedVisits(new Set([visits[0]._id]));
    }
  }, [visits]);

  const toggleVisitExpanded = (visitId: string) => {
    const newExpanded = new Set(expandedVisits);
    if (newExpanded.has(visitId)) {
      newExpanded.delete(visitId);
    } else {
      newExpanded.add(visitId);
    }
    setExpandedVisits(newExpanded);
  };

  const handleStatusChange = async (newStatus: "active" | "in_review" | "complete") => {
    try {
      await updateSite({ siteId, status: newStatus });
      toast.success("Status updated successfully");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const startEditingSite = () => {
    if (site) {
      setEditSiteName(site.name);
      setEditSiteLocation(site.location);
      setIsEditingSite(true);
    }
  };

  const cancelEditingSite = () => {
    setIsEditingSite(false);
    setEditSiteName("");
    setEditSiteLocation("");
  };

  const saveSiteEdit = async () => {
    try {
      await updateSite({
        siteId,
        name: editSiteName,
        location: editSiteLocation,
      });
      toast.success("Site updated successfully");
      setIsEditingSite(false);
    } catch (error) {
      toast.error("Failed to update site");
    }
  };

  const handleCreateVisit = async () => {
    try {
      const visitId = await createVisit({
        siteId,
        visitDate: newVisitDate,
      });
      toast.success("Visit created successfully");
      setShowNewVisitForm(false);
      setNewVisitDate(new Date().toISOString().split("T")[0]);
      // Expand the new visit
      setExpandedVisits(new Set([...expandedVisits, visitId]));
    } catch (error) {
      toast.error("Failed to create visit");
    }
  };

  const handleDeleteVisit = async (visitId: Id<"visits">) => {
    if (!confirm("Are you sure you want to delete this visit? All observations in this visit will also be deleted.")) {
      return;
    }
    try {
      await deleteVisit({ visitId });
      toast.success("Visit deleted successfully");
    } catch (error) {
      toast.error("Failed to delete visit");
    }
  };

  const startEditingVisit = (visitId: Id<"visits">, currentDate: string) => {
    setEditingVisitId(visitId);
    setEditVisitDate(currentDate);
  };

  const cancelEditingVisit = () => {
    setEditingVisitId(null);
    setEditVisitDate("");
  };

  const saveVisitEdit = async () => {
    if (editingVisitId) {
      try {
        await updateVisit({
          visitId: editingVisitId,
          visitDate: editVisitDate,
        });
        toast.success("Visit updated successfully");
        setEditingVisitId(null);
        setEditVisitDate("");
      } catch (error) {
        toast.error("Failed to update visit");
      }
    }
  };

  const handleAddPlan = async () => {
    if (!planImageFile || !newPlanName.trim()) {
      toast.error("Please provide a name and image");
      return;
    }

    setIsUploadingPlan(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": planImageFile.type },
        body: planImageFile,
      });
      const { storageId } = await response.json();

      await createSitePlan({
        siteId,
        name: newPlanName.trim(),
        imageFileId: storageId,
      });

      toast.success("Site plan added");
      setShowAddPlanModal(false);
      setNewPlanName("");
      setPlanImageFile(null);
      if (planFileInputRef.current) {
        planFileInputRef.current.value = "";
      }
    } catch (error) {
      toast.error("Failed to add site plan");
    } finally {
      setIsUploadingPlan(false);
    }
  };

  const handleDeletePlan = async (planId: Id<"sitePlans">) => {
    if (!confirm("Are you sure you want to delete this site plan? All markers will also be deleted.")) {
      return;
    }
    try {
      await deleteSitePlan({ planId });
      toast.success("Site plan deleted");
    } catch (error) {
      toast.error("Failed to delete site plan");
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

  if (showReport) {
    return <SiteReport siteId={siteId} onBack={() => setShowReport(false)} />;
  }

  return (
    <div>
      {/* Site Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 sm:p-6 mb-6 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
          <div className="flex-1">
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Site ID: <span className="font-medium text-slate-700 dark:text-slate-300">{site._id}</span></p>
            {isEditingSite ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={editSiteName}
                    onChange={(e) => setEditSiteName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Location</label>
                  <input
                    type="text"
                    value={editSiteLocation}
                    onChange={(e) => setEditSiteLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={saveSiteEdit}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-lg text-sm font-medium transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEditingSite}
                    className="px-4 py-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{site.name}</h2>
                  <button
                    onClick={startEditingSite}
                    className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                    title="Edit site details"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
                <p className="text-slate-600 dark:text-slate-300 mb-1">{site.location}</p>
              </div>
            )}
          </div>
          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getStatusColor(site.status)}`}>
              {getStatusText(site.status)}
            </span>
            <select
              value={site.status}
              onChange={(e) => handleStatusChange(e.target.value as "active" | "in_review" | "complete")}
              className="px-3 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="active">Active</option>
              <option value="in_review">In Review</option>
              <option value="complete">Complete</option>
            </select>
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
        <SiteBoundaryEditor siteId={siteId} siteName={site.name} />
      </div>

      {/* Visits Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Visits ({visits.length})</h3>
        <button
          onClick={() => setShowNewVisitForm(true)}
          className="w-full sm:w-auto bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + New Visit
        </button>
      </div>

      {/* New Visit Form */}
      {showNewVisitForm && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-6 border border-slate-200 dark:border-slate-700">
          <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Create New Visit</h4>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Visit Date
              </label>
              <input
                type="date"
                value={newVisitDate}
                onChange={(e) => setNewVisitDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateVisit}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-lg font-medium transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => setShowNewVisitForm(false)}
                className="px-4 py-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visits List - Collapsible Sections */}
      <div className="space-y-4">
        {visits.map((visit) => (
          <div
            key={visit._id}
            className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            {/* Visit Header - Clickable to expand/collapse */}
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
                {editingVisitId === visit._id ? (
                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="date"
                      value={editVisitDate}
                      onChange={(e) => setEditVisitDate(e.target.value)}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <button
                      onClick={saveVisitEdit}
                      className="px-3 py-1 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-lg text-sm font-medium transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEditingVisit}
                      className="px-3 py-1 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {new Date(visit.visitDate + "T00:00:00").toLocaleDateString(undefined, {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Visit ID: {visit._id}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditingVisit(visit._id, visit.visitDate);
                      }}
                      className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                      title="Edit visit date"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteVisit(visit._id);
                }}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                title="Delete visit"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* Visit Content - Observations */}
            {expandedVisits.has(visit._id) && (
              <div className="border-t border-slate-200 dark:border-slate-700 p-4">
                <VisitObservations
                  visitId={visit._id}
                  siteId={siteId}
                  onNavigate={onNavigate}
                  isExpanded={expandedVisits.has(visit._id)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {visits.length === 0 && (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No visits yet</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">Create your first visit to start documenting observations</p>
          <button
            onClick={() => setShowNewVisitForm(true)}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Create First Visit
          </button>
        </div>
      )}

      {/* Site Plans Section */}
      <div className="mt-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Site Plans ({sitePlans.length})</h3>
          <button
            onClick={() => setShowAddPlanModal(true)}
            className="w-full sm:w-auto bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Add Site Plan
          </button>
        </div>

        {sitePlans.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-slate-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No site plans yet</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">Upload floor plans or site maps to mark observation locations</p>
            <button
              onClick={() => setShowAddPlanModal(true)}
              className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Add First Site Plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sitePlans.map((plan) => (
              <div
                key={plan._id}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden group"
              >
                <div
                  className="aspect-video bg-slate-100 dark:bg-slate-700 cursor-pointer relative"
                  onClick={() => onNavigate({ type: "plan-viewer", siteId, planId: plan._id })}
                >
                  {plan.imageUrl && (
                    <img
                      src={plan.imageUrl}
                      alt={plan.name}
                      className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <span className="px-3 py-1 bg-white/90 dark:bg-slate-800/90 rounded-lg text-sm font-medium text-slate-900 dark:text-white">
                      View Plan
                    </span>
                  </div>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white truncate">{plan.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{plan.markerCount} markers</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlan(plan._id);
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete plan"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Site Plan Modal */}
      {showAddPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 dark:text-white">Add Site Plan</h3>
              <button
                onClick={() => {
                  setShowAddPlanModal(false);
                  setNewPlanName("");
                  setPlanImageFile(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                  Plan Name
                </label>
                <input
                  type="text"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="e.g., Floor 1, Kitchen Area"
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                  Plan Image
                </label>
                <input
                  ref={planFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPlanImageFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-amber-400 file:text-slate-900 file:font-medium"
                />
                {planImageFile && (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Selected: {planImageFile.name}
                  </p>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddPlanModal(false);
                  setNewPlanName("");
                  setPlanImageFile(null);
                }}
                className="px-4 py-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPlan}
                disabled={isUploadingPlan || !newPlanName.trim() || !planImageFile}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 disabled:bg-amber-200 dark:disabled:bg-amber-800 text-slate-900 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
              >
                {isUploadingPlan ? "Uploading..." : "Add Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
