import { useEffect, useRef, useState } from 'react';
import type { Verification, VerificationStatus } from '@/domain/verification';
import { STATUS_LABELS } from './StatusBadge';

/**
 * Anuncia para leitores de tela quando uma verificação sai de "Em análise".
 * Guarda os status da renderização anterior num `useRef` (que não causa nova renderização)
 * e compara com os atuais a cada atualização da lista.
 */
export function StatusAnnouncer({ verifications }: { verifications: Verification[] }) {
  const previousStatuses = useRef<Map<string, VerificationStatus> | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const previous = previousStatuses.current;
    if (previous) {
      const finished = verifications.filter(
        (verification) =>
          previous.get(verification.verificationId) === 'PENDING' && verification.status !== 'PENDING',
      );
      if (finished.length > 0) {
        setMessage(
          finished
            .map((verification) => `${verification.fileName}: ${STATUS_LABELS[verification.status]}`)
            .join('. '),
        );
      }
    }
    previousStatuses.current = new Map(
      verifications.map((verification) => [verification.verificationId, verification.status]),
    );
  }, [verifications]);

  return (
    <div role="status" aria-live="polite" className="sr-only">
      {message}
    </div>
  );
}
