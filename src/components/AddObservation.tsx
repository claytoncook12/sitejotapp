import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState, useRef } from "react";
import { toast } from "sonner";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Auto-detect type based on file
      if (file.type.startsWith("image/")) {
        setFormData(prev => ({ ...prev, type: "photo" }));
      } else if (file.type.startsWith("video/")) {
        setFormData(prev => ({ ...prev, type: "video" }));
      }
    }
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

      await createObservation({
        visitId,
        description: formData.description,
        type: formData.type,
        fileId,
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
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                File Upload
              </label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept={formData.type === "photo" ? "image/*" : "video/*"}
                  className="hidden"
                />
                {selectedFile ? (
                  <div>
                    <p className="text-slate-900 dark:text-white font-medium">{selectedFile.name}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 text-amber-400 hover:text-amber-300 text-sm"
                    >
                      Change file
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-slate-400 dark:text-slate-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mb-2">
                      Click to upload {formData.type}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-900 dark:text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Choose File
                    </button>
                  </div>
                )}
              </div>
            </div>
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
