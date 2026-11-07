const KB = 1024;
const MB = 1024 * KB;

const megabytes = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** Tamanho legível: "850 bytes", "214 KB", "1,8 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes < KB) return `${bytes} bytes`;
  if (bytes < MB) return `${Math.round(bytes / KB)} KB`;
  return `${megabytes.format(bytes / MB)} MB`;
}
