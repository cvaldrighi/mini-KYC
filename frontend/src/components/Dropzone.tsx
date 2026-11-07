import { Camera, Upload } from 'lucide-react';
import { useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ACCEPTED_CONTENT_TYPES } from '@/domain/verification';
import { cn } from '@/lib/utils';
import { validateFile } from '@/lib/validateFile';
import { FilePreview } from './FilePreview';
import { GuillochePattern } from './GuillochePattern';

interface DropzoneProps {
  file: File | null;
  /** Chamado só com arquivos válidos (tipo e tamanho). */
  onFileSelect: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}

const ACCEPT = ACCEPTED_CONTENT_TYPES.join(',');

const buttonBase =
  'inline-flex h-11 items-center gap-2 rounded-lg px-3.5 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50';

/**
 * Área de envio com a proporção de um cartão de identidade (ISO ID-1, 85,6 × 54 mm).
 * No desktop: arrastar e soltar ou "escolha um arquivo". Em telas pequenas: "Tirar foto",
 * que abre a câmera traseira, e "Escolher arquivo". São dois inputs porque, em alguns
 * navegadores, o atributo `capture` esconde a opção de escolher um arquivo existente.
 */
export function Dropzone({ file, onFileSelect, onClear, disabled = false }: DropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  function handleFile(candidate: File | undefined) {
    if (!candidate) return;
    const result = validateFile(candidate);
    if (!result.valid) {
      setError(result.message);
      return;
    }
    setError(null);
    onFileSelect(candidate);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleFile(event.target.files?.[0]);
    // Limpa o input para que escolher o mesmo arquivo de novo dispare `change`.
    event.target.value = '';
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!disabled) setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    // Ignora quando o cursor só passa para um elemento filho da área.
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFile(event.dataTransfer.files[0]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label="Área de envio do documento"
        aria-describedby={error ? errorId : undefined}
        data-dragging={isDragging || undefined}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative aspect-[85.6/54] overflow-hidden rounded-2xl border-[1.5px] border-dashed border-primary bg-dropzone transition-colors',
          'data-[dragging]:border-solid data-[dragging]:bg-secondary',
          error && 'border-destructive',
          disabled && 'opacity-60',
        )}
      >
        <GuillochePattern className="text-primary" />
        <div className="relative flex h-full flex-col justify-between p-5 sm:p-7">
          <div className="hidden size-11 items-center justify-center rounded-xl bg-secondary text-primary sm:flex">
            <Upload aria-hidden className="size-[22px]" />
          </div>

          <div className="flex flex-col gap-1">
            <p className="max-w-60 text-[17px] leading-snug font-semibold sm:text-[19px]">
              <span className="hidden sm:inline">
                {isDragging ? 'Solte o arquivo aqui' : 'Arraste a foto do documento para cá'}
              </span>
              <span className="sm:hidden">Foto da frente do documento</span>
            </p>
            <p className="hidden text-[15px] text-muted-foreground sm:block">
              ou{' '}
              <button
                type="button"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-sm font-semibold text-primary underline underline-offset-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none"
              >
                escolha um arquivo
              </button>
            </p>
            <div className="mt-2 flex flex-wrap gap-2 sm:hidden">
              <button
                type="button"
                disabled={disabled}
                onClick={() => cameraInputRef.current?.click()}
                className={cn(buttonBase, 'bg-primary text-primary-foreground')}
              >
                <Camera aria-hidden className="size-[18px]" />
                Tirar foto
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                className={cn(buttonBase, 'border border-border bg-background')}
              >
                Escolher arquivo
              </button>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          tabIndex={-1}
          aria-label="Escolher arquivo do documento"
          className="sr-only"
          onChange={handleInputChange}
          disabled={disabled}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          tabIndex={-1}
          aria-label="Tirar foto do documento"
          className="sr-only"
          onChange={handleInputChange}
          disabled={disabled}
        />
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      {file && <FilePreview file={file} onRemove={onClear} disabled={disabled} />}
    </div>
  );
}
