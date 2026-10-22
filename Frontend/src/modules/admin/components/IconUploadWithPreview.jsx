import React, { useState } from "react";
import {
  FiUpload,
  FiX,
  FiCheck,
  FiLink,
  FiImage,
  FiAlertCircle,
  FiScissors,
  FiGrid,
  FiCircle,
  FiSquare,
  FiZap
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import { serviceService } from "../../../services/catalogService";
import { toAssetUrl } from "../pages/UserCategories/utils";

/**
 * Client-side Canvas Image Processor:
 * - Normalizes aspect ratio to standard 1:1 square canvas (512x512)
 * - Auto-fits and centers icon with transparent margins
 * - Optional white background detection & removal (feathered alpha transparency)
 */
const processImageCanvas = (source, options = { removeWhite: false, squareFit: true }) => {
  return new Promise((resolve, reject) => {
    const handleLoadedImage = (img) => {
      try {
        const size = 512;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          reject(new Error("Unable to create canvas context"));
          return;
        }

        ctx.clearRect(0, 0, size, size);

        // 8% safe-padding around the 1:1 squircle boundary like Urban Company
        const padding = size * 0.08;
        const availWidth = size - padding * 2;
        const availHeight = size - padding * 2;
        const scale = Math.min(availWidth / img.width, availHeight / img.height);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const dx = (size - drawWidth) / 2;
        const dy = (size - drawHeight) / 2;

        ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

        // Smart White / Off-White pixel removal
        if (options.removeWhite) {
          const imgData = ctx.getImageData(0, 0, size, size);
          const data = imgData.data;
          const threshold = 238; // Detect white/near-white backgrounds
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r >= threshold && g >= threshold && b >= threshold) {
              data[i + 3] = 0; // Make transparent
            } else if (r >= 220 && g >= 220 && b >= 220) {
              // Soft feather edge
              const diff = Math.min(r, g, b) - 220;
              data[i + 3] = Math.max(0, Math.round(255 - (diff / 18) * 255));
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Canvas export failed"));
            return;
          }
          const cleanName = `icon-${Date.now()}.png`;
          const processedFile = new File([blob], cleanName, { type: "image/png" });
          resolve(processedFile);
        }, "image/png");
      } catch (err) {
        reject(err);
      }
    };

    if (source instanceof File || source instanceof Blob) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => handleLoadedImage(img);
        img.onerror = () => reject(new Error("Failed to load uploaded image"));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(source);
    } else if (typeof source === "string") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => handleLoadedImage(img);
      img.onerror = () => reject(new Error("Failed to load remote image (CORS)"));
      img.src = toAssetUrl(source);
    } else {
      reject(new Error("Unsupported image source"));
    }
  });
};

/**
 * Premium Category Icon Uploader with:
 * 1. 1:1 Urban Company style Squircle & Circular preview
 * 2. Transparent background checkerboard toggle (Alpha / Light / Dark)
 * 3. Auto-crop / Fit ratio to standard 1:1 format
 * 4. "Remove White Background" feature to strip solid white squares from icons
 * 5. Instant Cloudinary upload + URL fallback
 */
const IconUploadWithPreview = ({
  value,
  onChange,
  folder = "categories",
  label = "Category Icon",
  helperText = "Recommended: Transparent PNG or SVG with 1:1 square ratio.",
  compact = false,
}) => {
  const [bgMode, setBgMode] = useState("checkerboard"); // 'checkerboard' | 'light' | 'dark'
  const [shapeMode, setShapeMode] = useState("squircle"); // 'squircle' | 'circle' | 'square'
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [imageError, setImageError] = useState(false);

  const handleFileUpload = async (e, shouldRemoveWhite = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, SVG, WEBP, or JPG)");
      return;
    }

    try {
      setUploading(true);
      setImageError(false);

      // Auto-fit to 1:1 square canvas to prevent distorted aspect ratios
      let fileToUpload = file;
      if (file.type !== "image/svg+xml") {
        try {
          fileToUpload = await processImageCanvas(file, {
            removeWhite: shouldRemoveWhite,
            squareFit: true,
          });
        } catch (procErr) {
          console.warn("Canvas auto-fit skipped, uploading raw:", procErr);
          fileToUpload = file;
        }
      }

      const res = await serviceService.uploadImage(fileToUpload, folder);
      if (res?.success && res.imageUrl) {
        onChange(res.imageUrl);
        toast.success(
          shouldRemoveWhite
            ? "Icon processed (white BG removed) & uploaded!"
            : "1:1 Squircle icon uploaded successfully!"
        );
      } else {
        toast.error(res?.message || "Upload failed");
      }
    } catch (err) {
      console.error("Icon upload error:", err);
      toast.error(err?.response?.data?.message || "Failed to upload icon");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Convert existing image to transparent (strip white background)
  const handleRemoveWhiteBg = async () => {
    if (!value) return;
    try {
      setProcessing(true);
      const processedFile = await processImageCanvas(value, {
        removeWhite: true,
        squareFit: true,
      });
      const res = await serviceService.uploadImage(processedFile, folder);
      if (res?.success && res.imageUrl) {
        onChange(res.imageUrl);
        setImageError(false);
        toast.success("White background removed! Transparent icon saved.");
      } else {
        toast.error("Failed to upload transparent icon");
      }
    } catch (err) {
      console.error("White background removal error:", err);
      toast.error("Could not remove background automatically (CORS or invalid format). Please upload a transparent PNG.");
    } finally {
      setProcessing(false);
    }
  };

  const handleUrlSubmit = () => {
    if (!urlDraft.trim()) return;
    setImageError(false);
    onChange(urlDraft.trim());
    setShowUrlInput(false);
    setUrlDraft("");
    toast.success("Icon URL applied");
  };

  const handleClear = () => {
    onChange("");
    setImageError(false);
  };

  // Background styling for preview squircle
  const getBgStyle = () => {
    switch (bgMode) {
      case "dark":
        return "bg-slate-900 border-slate-700";
      case "light":
        return "bg-white border-gray-200";
      case "checkerboard":
      default:
        return "bg-slate-50 border-gray-300";
    }
  };

  const getShapeRadius = () => {
    switch (shapeMode) {
      case "circle":
        return "rounded-full";
      case "square":
        return "rounded-lg";
      case "squircle":
      default:
        return "rounded-[22px]";
    }
  };

  const isCheckerboard = bgMode === "checkerboard";

  return (
    <div className="space-y-2">
      {/* Label and Info */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
          {label}
        </label>
        {value && (
          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-100">
            <FiCheck className="w-2.5 h-2.5" /> 1:1 Urban Company Fit
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-gray-50/80 rounded-2xl border border-gray-200">
        {/* 1:1 Icon Preview Container */}
        <div className="relative shrink-0">
          <div
            className={`w-20 h-20 sm:w-24 sm:h-24 ${getShapeRadius()} border-2 flex items-center justify-center overflow-hidden transition-all shadow-xs relative ${getBgStyle()}`}
            style={
              isCheckerboard
                ? {
                    backgroundImage: `linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)`,
                    backgroundSize: "14px 14px",
                    backgroundPosition: "0 0, 0 7px, 7px -7px, -7px 0px",
                  }
                : undefined
            }
          >
            {value && !imageError ? (
              <img
                src={toAssetUrl(value)}
                alt="Icon Preview"
                onError={() => setImageError(true)}
                className="w-full h-full object-contain p-2 select-none pointer-events-none drop-shadow-[0_2px_5px_rgba(0,0,0,0.06)]"
              />
            ) : imageError ? (
              <div className="flex flex-col items-center justify-center text-center p-1 text-rose-500">
                <FiAlertCircle className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-bold leading-tight">Broken URL</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-gray-400 p-2">
                <FiImage className="w-6 h-6 mb-1 text-gray-300" />
                <span className="text-[10px] font-medium leading-none">No Icon</span>
              </div>
            )}

            {(uploading || processing) && (
              <div className="absolute inset-0 bg-white/85 backdrop-blur-xs flex flex-col items-center justify-center gap-1 z-10">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-[9px] font-bold text-blue-700">
                  {processing ? "Removing BG..." : "Uploading..."}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Controls & Background Mode Toggle */}
        <div className="flex-1 min-w-0 space-y-2 w-full">
          {/* Transparency & Shape inspection toggles */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Background Mode */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Preview BG:
              </span>
              <div className="inline-flex items-center rounded-lg bg-white border border-gray-200 p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setBgMode("checkerboard")}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                    bgMode === "checkerboard"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="Checkerboard pattern to test transparent alpha channel"
                >
                  🏁 Alpha
                </button>
                <button
                  type="button"
                  onClick={() => setBgMode("light")}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                    bgMode === "light"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="Light background preview"
                >
                  ⚪ Light
                </button>
                <button
                  type="button"
                  onClick={() => setBgMode("dark")}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                    bgMode === "dark"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="Dark background preview to test for unwanted white border artifacts"
                >
                  ⚫ Dark
                </button>
              </div>
            </div>

            {/* Shape Mask */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Shape:
              </span>
              <div className="inline-flex items-center rounded-lg bg-white border border-gray-200 p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setShapeMode("squircle")}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                    shapeMode === "squircle"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="Urban Company style squircle"
                >
                  Squircle
                </button>
                <button
                  type="button"
                  onClick={() => setShapeMode("circle")}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                    shapeMode === "circle"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="Circle badge preview"
                >
                  Circle
                </button>
              </div>
            </div>
          </div>

          {/* Upload Button, URL Action & Remove White BG Action */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all">
              <FiUpload className="w-3.5 h-3.5" />
              {uploading ? "Processing..." : value ? "Change Icon" : "Upload Icon"}
              <input
                type="file"
                accept="image/*"
                disabled={uploading || processing}
                onChange={(e) => handleFileUpload(e, false)}
                className="hidden"
              />
            </label>

            {/* Remove White Background Button */}
            {value && (
              <button
                type="button"
                onClick={handleRemoveWhiteBg}
                disabled={processing || uploading}
                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
                title="Automatically remove white box background and save transparent PNG"
              >
                <FiScissors className="w-3.5 h-3.5 text-amber-600" />
                <span>Remove White BG</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="px-2.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <FiLink className="w-3 h-3 text-gray-500" />
              {showUrlInput ? "Hide URL" : "Paste URL"}
            </button>

            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg text-xs transition-colors"
                title="Remove Icon"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* URL Input Form (conditional) */}
          {showUrlInput && (
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                placeholder="https://res.cloudinary.com/..."
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                className="flex-1 px-2.5 py-1 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleUrlSubmit}
                className="px-2.5 py-1 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold"
              >
                Apply
              </button>
            </div>
          )}

          {/* Helper Text */}
          <p className="text-[11px] text-gray-500 leading-tight">
            {helperText}
          </p>
        </div>
      </div>
    </div>
  );
};

export default IconUploadWithPreview;
