'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button, useToast } from '@/components/ui';
import { generateContractAction } from '@/app/admin/kontrak/actions';

/** Membuat kontrak dari satu lead yang dimenangkan (I1). */
export function GenerateContractButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <Button
      size="sm"
      disabled={pending || done}
      isLoading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await generateContractAction(leadId);
          toast({
            title: result.ok ? 'Kontrak dibuat' : 'Kontrak gagal dibuat',
            description: result.message,
            tone: result.ok ? 'success' : 'danger',
          });
          if (result.ok) {
            setDone(true);
            router.refresh();
            if (result.contractId) router.push(`/admin/kontrak/${result.contractId}`);
          }
        })
      }
    >
      Buat kontrak
    </Button>
  );
}
