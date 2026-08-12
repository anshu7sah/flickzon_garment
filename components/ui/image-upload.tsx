"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Image as ImageIcon, Loader2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export function ImageUpload({ value = [], onChange, disabled, maxFiles = 10 }: ImageUploadProps) {
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (value.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} images allowed`);
      return;
    }

    if (!cloudName || cloudName === "your_cloud_name" || !uploadPreset || uploadPreset === "your_upload_preset") {
      toast.error("Cloudinary parameters not configured in .env. Please click 'Add Image URL' to paste image link.");
      setShowUrlInput(true);
      return;
    }

    setLoading(true);
    const newUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.secure_url) {
          newUrls.push(data.secure_url);
        } else {
          toast.error(`Failed to upload ${file.name}: ${data.error?.message || "Upload error"}`);
        }
      } catch (error) {
        toast.error(`Error uploading ${file.name}`);
      }
    }

    setLoading(false);
    if (newUrls.length > 0) {
      onChange([...value, ...newUrls]);
      toast.success(`${newUrls.length} image(s) uploaded`);
    }
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    onChange([...value, urlInput.trim()]);
    setUrlInput("");
    toast.success("Image URL added");
  };

  const handleRemove = (urlToRemove: string) => {
    onChange(value.filter((url) => url !== urlToRemove));
  };

  return (
    <div className="space-y-3">
      {/* Upload Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-700 cursor-pointer transition-colors ${disabled || loading ? "opacity-50 pointer-events-none" : ""}`}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> : <Upload className="h-4 w-4 text-indigo-600" />}
          <span>{loading ? "Uploading to Cloudinary..." : "Upload Photos"}</span>
          <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={disabled || loading} />
        </label>

        <Button type="button" variant="outline" size="sm" onClick={() => setShowUrlInput(!showUrlInput)} className="gap-1.5 text-xs">
          <LinkIcon className="h-3.5 w-3.5" />
          {showUrlInput ? "Hide URL Input" : "Add Image URL"}
        </Button>
      </div>

      {/* Manual URL Input */}
      {showUrlInput && (
        <div className="flex items-center gap-2">
          <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://example.com/photo.jpg" className="text-xs" />
          <Button type="button" size="sm" onClick={handleAddUrl}>Add</Button>
        </div>
      )}

      {/* Image Preview Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
          {value.map((url, idx) => (
            <div key={idx} className="relative group aspect-square rounded-lg border border-gray-200 overflow-hidden bg-gray-100">
              <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-600 text-white flex items-center justify-center opacity-90 group-hover:opacity-100 hover:scale-110 transition-all shadow-md"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
