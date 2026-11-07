import { FileText, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatFileSize } from '@/lib/formatFileSize';

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
  disabled?: boolean;
}

/**
 * Miniatura, nome e tamanho do arquivo escolhido.
 * A URL da miniatura (`blob:`) ocupa memória até ser liberada, por isso o efeito
 * a revoga quando o arquivo muda ou o componente sai da tela.
 */
export function FilePreview({ file, onRemove, disabled = false }: FilePreviewProps) {
  const isImage = file.type.startsWith('image/');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-3">
      <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="size-full object-cover" />
        ) : (
          <FileText aria-hidden className="size-6 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{file.name}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{formatFileSize(file.size)}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remover ${file.name}`}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
      >
        <X aria-hidden className="size-[18px]" />
      </button>
    </div>
  );
}
