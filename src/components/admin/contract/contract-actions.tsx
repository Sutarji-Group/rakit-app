'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Field,
  Input,
  useToast,
} from '@/components/ui';
import { signContractAction, updateContractStatusAction } from '@/app/admin/kontrak/actions';
import type { ContractStatus } from '@/lib/domain/enums';

/** Tindakan atas satu kontrak: terbitkan, tandai ditandatangani, batalkan (I3). */
export function ContractActions({
  contractId,
  status,
  defaultSignerName,
  defaultSignerEmail,
  signedAt,
}: {
  contractId: string;
  status: ContractStatus;
  defaultSignerName: string;
  defaultSignerEmail: string;
  signedAt: string | null;
  signerName?: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signerEmail, setSignerEmail] = useState(defaultSignerEmail);
  const [showSign, setShowSign] = useState(false);

  if (signedAt) return null;

  const run = (action: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      const result = await action();
      toast({
        title: result.ok ? 'Tersimpan' : 'Gagal',
        description: result.message,
        tone: result.ok ? 'success' : 'danger',
      });
      if (result.ok) router.refresh();
    });

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {status === 'DRAFT' && (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(() => updateContractStatusAction(contractId, 'SENT'))}
            >
              Tandai sudah dikirim ke klien
            </Button>
          )}
          {status !== 'CANCELLED' && (
            <Button
              size="sm"
              variant={showSign ? 'secondary' : 'primary'}
              disabled={pending}
              onClick={() => setShowSign((prev) => !prev)}
            >
              {showSign ? 'Batal' : 'Catat penandatanganan'}
            </Button>
          )}
          {status !== 'CANCELLED' && (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => run(() => updateContractStatusAction(contractId, 'CANCELLED'))}
            >
              Batalkan kontrak
            </Button>
          )}
        </div>

        {showSign && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-sunken/50 p-4">
            <Alert tone="warning" title="Ini pencatatan manual, bukan tanda tangan elektronik">
              Isi nama dan email orang yang benar-benar menandatangani dokumen fisik atau PDF.
              Pencatatan ini masuk audit log beserta pelakunya.
            </Alert>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nama penandatangan" required htmlFor="signer-name">
                <Input
                  id="signer-name"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                />
              </Field>
              <Field label="Email penandatangan" required htmlFor="signer-email">
                <Input
                  id="signer-email"
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                />
              </Field>
            </div>
            <Button
              size="sm"
              className="self-start"
              isLoading={pending}
              disabled={!signerName.trim() || !signerEmail.trim()}
              onClick={() => run(() => signContractAction(contractId, signerName, signerEmail))}
            >
              Simpan penandatanganan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
