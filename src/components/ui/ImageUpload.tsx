import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { storageService } from '../../services/storageService';
import { cn } from '../../lib/utils';

interface ImageUploadProps {
  label?: string;
  required?: boolean;
  value?: string | null;
  onChange: (url: string | null) => void;
  userId?: string;
  className?: string;
  helperText?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label = 'Photograph of Item',
  required = false,
  value,
  onChange,
  userId = 'anonymous',
  className,
  helperText = 'JPG, PNG or WebP up to 5MB',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    const validation = storageService.validateImage(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    try {
      setIsUploading(true);
      const res = await storageService.uploadItemImage(file, userId);
      if (res.error) {
        setError(res.error);
      } else {
        onChange(res.url);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}

      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900/5 group h-48 sm:h-56">
          <img
            src={value}
            alt="Uploaded item preview"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white/90 hover:bg-white text-slate-900 text-xs font-semibold rounded-lg shadow-sm backdrop-blur-xs transition"
            >
              Change Photo
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 text-center',
            dragOver
              ? 'border-navy-600 bg-navy-50/50'
              : 'border-slate-300 hover:border-navy-400 bg-slate-50/60 hover:bg-slate-50',
            isUploading && 'opacity-60 cursor-wait'
          )}
        >
          <div className="w-12 h-12 rounded-full bg-navy-50 text-navy-700 flex items-center justify-center mb-3">
            {isUploading ? (
              <UploadCloud className="w-6 h-6 animate-pulse text-navy-600" />
            ) : (
              <ImageIcon className="w-6 h-6" />
            )}
          </div>
          <p className="text-sm font-medium text-slate-700">
            {isUploading ? 'Uploading photograph...' : 'Click to upload or drag & drop'}
          </p>
          <p className="text-xs text-slate-500 mt-1">{helperText}</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {error && (
        <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-rose-600">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
