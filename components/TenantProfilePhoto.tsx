"use client";

/**
 * TenantProfilePhoto.tsx
 *
 * Self-contained component that renders a tenant's profile photo
 * with an upload/change button. Uses your existing /api/upload endpoint.
 *
 * Usage in your TenantsClient or tenant detail page:
 *
 *   <TenantProfilePhoto
 *     tenantId={tenant._id}
 *     currentPhoto={tenant.profilePhoto}
 *     tenantName={tenant.name}
 *     onPhotoUpdated={(newPhoto) => {
 *       // Refresh tenant data in parent state
 *     }}
 *   />
 */

import { useState, useRef } from "react";
import { useI18n } from "@/components/providers/LanguageProvider";

interface CloudinaryFile {
  url: string;
  secureUrl: string;
  publicId: string;
  originalFilename?: string;
  size?: number;
  uploadedBy?: string;
  uploadedAt?: string;
}

interface TenantProfilePhotoProps {
  tenantId: string;
  currentPhoto?: CloudinaryFile | null;
  tenantName: string;
  onPhotoUpdated?: (photo: CloudinaryFile) => void;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
}

const sizeMap = {
  sm: {
    container: "w-10 h-10",
    text: "text-sm",
    btn: "text-[10px] px-1.5 py-0.5",
  },
  md: { container: "w-16 h-16", text: "text-lg", btn: "text-xs px-2 py-1" },
  lg: { container: "w-24 h-24", text: "text-2xl", btn: "text-xs px-3 py-1.5" },
};

/** Returns initials from a name */
function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Deterministic background color from name */
function getAvatarColor(name: string): string {
  const colors = [
    "bg-indigo-500",
    "bg-violet-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-pink-500",
    "bg-teal-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function TenantProfilePhoto({
  tenantId,
  currentPhoto,
  tenantName,
  onPhotoUpdated,
  size = "md",
  editable = true,
}: TenantProfilePhotoProps) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPhoto, setLocalPhoto] = useState<CloudinaryFile | null>(
    currentPhoto ?? null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const sz = sizeMap[size];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError(t('Only JPEG, PNG, or WebP images are allowed.'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t('Image must be under 5MB.'));
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Step 1: Upload to Cloudinary via your /api/upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "tenant");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const d = await uploadRes.json().catch(() => ({}));
        throw new Error(d?.error || "Upload failed");
      }

      const uploadData = await uploadRes.json();
      const newPhoto: CloudinaryFile = uploadData.file;

      // Step 2: Save profilePhoto on the tenant via PATCH /api/tenants/:id
      const patchRes = await fetch(`/api/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePhoto: newPhoto }),
      });

      if (!patchRes.ok) {
        const d = await patchRes.json().catch(() => ({}));
        throw new Error(d?.error || "Failed to save photo");
      }

      setLocalPhoto(newPhoto);
      onPhotoUpdated?.(newPhoto);
    } catch (err: any) {
      setError(t(err.message || 'Upload failed'));
    } finally {
      setUploading(false);
      // Reset file input
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const avatarColor = getAvatarColor(tenantName);
  const initials = getInitials(tenantName);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Photo / Avatar */}
      <div
        className={`relative ${sz.container} rounded-full overflow-hidden ring-2 ring-white shadow-md`}
      >
        {localPhoto?.secureUrl ? (
          <img
            src={localPhoto.secureUrl}
            alt={tenantName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full ${avatarColor} flex items-center justify-center`}
          >
            <span className={`text-white font-bold ${sz.text}`}>
              {initials}
            </span>
          </div>
        )}

        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
            <svg
              className="w-5 h-5 text-white animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Upload button */}
      {editable && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={`
              ${sz.btn} rounded-md border border-slate-300 text-slate-600
              hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium
            `}
          >
            {t(uploading
              ? 'Uploading…'
              : localPhoto
                ? 'Change Photo'
                : 'Upload Photo')}
          </button>
        </>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 text-center max-w-[120px]">
          {error}
        </p>
      )}
    </div>
  );
}
