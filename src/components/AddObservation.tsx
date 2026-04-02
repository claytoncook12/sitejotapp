import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { CameraCapture, GpsData } from "./CameraCapture";

type Screen = 
  | { type: "dashboard" }
  | { type: "site-detail"; siteId: Id<"sites"> }
  | { type: "add-observation"; siteId: Id<"sites">; visitId: Id<"visits"> }
  | { type: "report"; siteId: Id<"sites"> };

interface AddObservationProps {
  siteId: Id<"sites">;
  visitId: Id<"visits">;
  onNavigate: (screen: Screen) => void;
}

export function AddObservation({ siteId, visitId, onNavigate }: AddObservationProps) {
  const createObservation = useMutation(api.observations.create);
  const generateUploadUrl = useMutation(api.observations.generateUploadUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<{
    description: string;
    type: "note" | "photo" | "video";
  }>({
    description: "",
    type: "note",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [gpsData, setGpsData] = useState<GpsData | null>(null);
  const [includeGps, setIncludeGps] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      setShowCamera(false);
      
      // Auto-detect type based on file
      if (file.type.startsWith("image/")) {
        setFormData(prev => ({ ...prev, type: "photo" }));
      } else if (file.type.startsWith("video/")) {
        setFormData(prev => ({ ...prev, type: "video" }));
      }
    }
  };

  const handleCameraCapture = (file: File, gps: GpsData | null) => {
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setGpsData(gps);
    setShowCamera(false);
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setGpsData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let fileId: Id<"_storage"> | undefined;

      if (selectedFile && (formData.type === "photo" || formData.type === "video")) {
        // Upload file first
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });

        if (!result.ok) {
          throw new Error("Failed to upload file");
        }

        const json = await result.json();
        fileId = json.storageId;
      }

      const shouldIncludeGps = includeGps && (formData.type === "photo" || formData.type === "video");

      await createObservation({
        visitId,
        description: formData.description,
        type: formData.type,
        fileId,
        latitude: shouldIncludeGps ? gpsData?.latitude : undefined,
        longitude: shouldIncludeGps ? gpsData?.longitude : undefined,
        gpsAccuracy: shouldIncludeGps ? gpsData?.accuracy : undefined,
      });

      toast.success("Observation added successfully");
      onNavigate({ type: "site-detail", siteId });
    } catch (error) {
      console.error("Error creating observation:", error);
      toast.error("Failed to add observation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Add Observation</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
              Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "note", label: "Note", icon: "📝" },
                { value: "photo", label: "Photo", icon: "📷" },
                { value: "video", label: "Video", icon: "🎥" },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.value as any })}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    formData.type === type.value
                      ? "border-amber-400 bg-amber-400/10 text-amber-400"
                      : "border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500"
                  }`}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-sm font-medium">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {(formData.type === "photo" || formData.type === "video") && (
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                {formData.type === "photo" ? "Photo" : "Video"}
              </label>

              {showCamera ? (
                <CameraCapture
                  mode={formData.type}
                  onCapture={handleCameraCapture}
                  onCancel={() => setShowCamera(false)}
                />
              ) : selectedFile && previewUrl ? (
                <div className="border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
                  {formData.type === "photo" ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full max-h-64 object-contain bg-black"
                    />
                  ) : (
                    <video
                      src={previewUrl}
                      controls
                      playsInline
                      className="w-full max-h-64 bg-black"
                    />
                  )}
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between">
                    <div>
                      <p className="text-slate-900 dark:text-white text-sm font-medium truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-amber-400 hover:bg-amber-400/5 transition-colors"
                  >
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      {formData.type === "photo" ? "Take Photo" : "Record Video"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-amber-400 hover:bg-amber-400/5 transition-colors"
                  >
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Choose File
                    </span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    accept={formData.type === "photo" ? "image/*" : "video/*"}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              placeholder="Describe your observation (optional)..."
            />
          </div>

          {(formData.type === "photo" || formData.type === "video") && (
            <label className="flex items-center gap-2 cursor-pointer justify-end">
              {includeGps && gpsData && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  ({Math.abs(gpsData.latitude).toFixed(4)}° {gpsData.latitude >= 0 ? "N" : "S"}, {Math.abs(gpsData.longitude).toFixed(4)}° {gpsData.longitude >= 0 ? "E" : "W"})
                </span>
              )}
              <span className="text-sm text-slate-600 dark:text-slate-300">Include Current GPS Coordinates</span>
              <input
                type="checkbox"
                checked={includeGps}
                onChange={(e) => setIncludeGps(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-amber-400 focus:ring-amber-400 bg-slate-100 dark:bg-slate-700"
              />
            </label>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-amber-400 hover:bg-amber-500 disabled:bg-amber-600 text-slate-900 py-3 rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? "Adding..." : "Add Observation"}
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ type: "site-detail", siteId })}
              className="px-6 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-900 dark:text-white py-3 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
