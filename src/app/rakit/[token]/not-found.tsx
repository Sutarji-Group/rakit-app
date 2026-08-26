import Link from 'next/link';
import { Button, EmptyState } from '@/components/ui';

export default function RakitNotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
      <EmptyState
        className="w-full"
        title="Rakitan ini tidak ditemukan"
        description="Tautannya mungkin salah ketik, atau rakitan tersebut sudah dihapus. Anda selalu bisa memulai rakitan baru dari katalog aplikasi kami."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/aplikasi">Lihat katalog aplikasi</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/konsultasi">Bicara dengan konsultan</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
