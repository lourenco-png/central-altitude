'use client';
import { useRef, useState } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface PdfUploadButtonProps {
  onUploaded: (url: string, originalname?: string) => void;
  currentUrl?: string;
  onClear?: () => void;
  label?: string;
}

export function PdfUploadButton({ onUploaded, currentUrl, onClear, label = 'Anexar PDF' }: PdfUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Apenas arquivos PDF são aceitos');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/uploads', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // data.url é URL absoluta do Cloudinary (https://res.cloudinary.com/...)
      onUploaded(data.url, data.filename ?? data.originalname);
      toast.success('Arquivo enviado!');
    } catch {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  if (currentUrl) {
    return (
      <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
        <FileText size={15} className="text-green-600 flex-shrink-0" />
        <span className="text-xs text-green-700 font-medium flex-1 truncate">PDF anexado</span>
        {onClear && (
          <button type="button" onClick={onClear} className="p-0.5 rounded hover:bg-green-100">
            <X size={13} className="text-green-600" />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 text-xs text-primary-700 border border-primary-300 bg-primary-50 hover:bg-primary-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        {uploading ? 'Enviando...' : label}
      </button>
    </>
  );
}
