'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, X, FileText, Image, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UploadedFile {
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: string;
  format: string;
  originalFilename: string;
  size: number;
  uploadedBy?: string;
  uploadedAt?: string;
}

interface FileUploadProps {
  folder: 'unit' | 'tenant' | 'payment' | 'electricity' | 'gas' | 'expense' | 'agreement' | 'misc';
  onUpload: (file: UploadedFile) => void;
  label?: string;
  accept?: string;
  className?: string;
  disabled?: boolean;
}

export default function FileUpload({
  folder,
  onUpload,
  label = 'Upload File',
  accept = 'image/*,application/pdf',
  className,
  disabled,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Max 10MB.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Use JPEG, PNG, or PDF.');
      return;
    }

    setUploading(true);
    try {
      // Show local preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      toast.success('File uploaded successfully');
      onUpload(data.file);
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
        disabled={disabled || uploading}
      />

      <div
        onClick={() => !uploading && !disabled && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all',
          'hover:border-indigo-400 hover:bg-indigo-50/30',
          uploading || disabled
            ? 'opacity-50 cursor-not-allowed border-slate-200'
            : 'border-slate-200',
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            <p className="text-xs text-slate-500">Uploading...</p>
          </div>
        ) : preview ? (
          <div className="relative">
            <img src={preview} alt="Preview" className="w-full max-h-32 object-cover rounded-lg" />
            <button
              onClick={(e) => { e.stopPropagation(); setPreview(null); }}
              className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-2">
            <Upload className="w-6 h-6 text-slate-400" />
            <p className="text-sm font-medium text-slate-600">{label}</p>
            <p className="text-xs text-slate-400">Click or drag & drop · Max 10MB</p>
            <p className="text-xs text-slate-400">JPEG, PNG, PDF</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Display a list of uploaded files with links */
export function FileList({
  files,
  onRemove,
}: {
  files: UploadedFile[];
  onRemove?: (publicId: string) => void;
}) {
  if (!files?.length) return null;

  return (
    <div className="space-y-1.5 mt-2">
      {files.map((file) => (
        <div
          key={file.publicId}
          className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200"
        >
          <div className="flex items-center gap-2 min-w-0">
            {file.resourceType === 'image' ? (
              <Image className="w-4 h-4 text-blue-500 flex-shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
            )}
            <a
              href={file.secureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 hover:underline truncate"
            >
              {file.originalFilename || 'View file'}
            </a>
          </div>
          {onRemove && (
            <button
              onClick={() => onRemove(file.publicId)}
              className="p-0.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 flex-shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
