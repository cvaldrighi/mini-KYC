import { CircleAlert, Lock } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { VerificationsApi } from '@/api/types';
import { useUpload } from '@/hooks/useUpload';
import { Dropzone } from './Dropzone';
import { Progress } from './ui/progress';

interface UploadPanelProps {
  api: VerificationsApi;
  /** Chamado depois que o arquivo foi enviado, para atualizar a lista. */
  onUploaded: () => void;
}

export function UploadPanel({ api, onUploaded }: UploadPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const { state, upload, reset } = useUpload(api, {
    onUploaded: () => {
      toast.success('Documento enviado');
      setFile(null);
      onUploaded();
    },
  });
  const isUploading = state.phase === 'uploading';

  function selectFile(selected: File) {
    setFile(selected);
    reset();
  }

  function clearFile() {
    setFile(null);
    reset();
  }

  return (
    <div className="flex flex-col gap-4">
      <Dropzone file={file} onFileSelect={selectFile} onClear={clearFile} disabled={isUploading} />

      {state.phase === 'uploading' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[13px] text-muted-foreground">
            <span>Enviando</span>
            <span>{state.progress}%</span>
          </div>
          <Progress value={state.progress} label="Progresso do envio" />
        </div>
      )}

      {state.phase === 'error' && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-4">
          <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
          <p className="text-[15px]">{state.message}</p>
        </div>
      )}

      <button
        type="button"
        disabled={!file || isUploading}
        onClick={() => file && upload(file)}
        className="h-12 rounded-lg bg-primary text-base font-semibold text-primary-foreground transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUploading ? 'Enviando…' : state.phase === 'error' ? 'Tentar de novo' : 'Enviar documento'}
      </button>

      <p className="flex items-start gap-2 text-[13px] leading-normal text-muted-foreground">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
        O arquivo vai direto para um armazenamento privado e é apagado após 7 dias.
      </p>
    </div>
  );
}
