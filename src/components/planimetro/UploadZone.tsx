'use client';

import { useCallback, useState } from 'react';
import { Upload, FileImage, FileText, FileCode2, X } from 'lucide-react';

interface UploadZoneProps {
  onFile: (file: File) => void;
  loading: boolean;
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ACCEPTED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.dxf'];
const MAX_MB = 20;

export function UploadZone({ onFile, loading }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<{ name: string; type: string; url?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const esDxf = file.name.toLowerCase().endsWith('.dxf');
      if (!esDxf && !ACCEPTED.includes(file.type)) {
        setError('Formato no soportado. Usa JPG, PNG, WebP, PDF o DXF.');
        return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`El archivo supera los ${MAX_MB} MB.`);
        return;
      }
      const isImage = file.type.startsWith('image/');
      const isDxf = file.name.toLowerCase().endsWith('.dxf');
      const url = isImage ? URL.createObjectURL(file) : undefined;
      setPreview({ name: file.name, type: isDxf ? 'dxf' : file.type, url });
      onFile(file);
    },
    [onFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearFile = () => {
    setPreview(null);
    setError(null);
  };

  if (preview) {
    return (
      <div className="relative rounded-2xl border-2 border-gray-200 bg-white overflow-hidden">
        {preview.url ? (
          <img src={preview.url} alt="Plano" className="w-full max-h-80 object-contain bg-gray-50" />
        ) : (
          <div className="flex items-center justify-center gap-3 bg-gray-50 py-16">
            {preview.type === 'dxf'
              ? <FileCode2 className="h-10 w-10 text-[#007AFF]" />
              : <FileText className="h-10 w-10 text-gray-400" />}
            <div>
              <p className="font-medium text-gray-700 text-sm">{preview.name}</p>
              <p className="text-xs text-gray-400">{preview.type === 'dxf' ? 'AutoCAD DXF — geometría exacta' : 'PDF'}</p>
            </div>
          </div>
        )}
        {!loading && (
          <button
            onClick={clearFile}
            className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 shadow-sm hover:bg-white"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        )}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/85 backdrop-blur-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#007AFF] border-t-transparent" />
            <p className="text-sm font-medium text-gray-700">Analizando plano con IA...</p>
            <p className="text-xs text-gray-400">Puede tomar 15-30 segundos</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed py-16 transition-all ${
          dragging
            ? 'border-[#007AFF] bg-[#007AFF]/5'
            : 'border-gray-200 bg-gray-50 hover:border-[#007AFF]/50 hover:bg-[#007AFF]/5'
        }`}
      >
        <input
          type="file"
          accept={ACCEPTED_EXT.join(',')}
          className="sr-only"
          onChange={onInputChange}
        />
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <FileImage className="h-6 w-6 text-[#007AFF]" />
          </div>
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <FileText className="h-6 w-6 text-[#007AFF]" />
          </div>
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <FileCode2 className="h-6 w-6 text-[#007AFF]" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-medium text-gray-800">
            Arrastra el plano aquí o{' '}
            <span className="text-[#007AFF]">selecciona archivo</span>
          </p>
          <p className="mt-1 text-sm text-gray-500">JPG, PNG, WebP, PDF o DXF — máx. {MAX_MB} MB</p>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
            <Upload className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-500">DXF = geometría exacta de AutoCAD</span>
          </div>
          <span className="text-xs text-gray-400">PDF/foto = análisis con IA (Claude Vision)</span>
        </div>
      </label>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
