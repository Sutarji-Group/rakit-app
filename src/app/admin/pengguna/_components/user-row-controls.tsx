'use client';

import { Button, Select } from '@/components/ui';
import { USER_ROLE_LABEL, type UserRole } from '@/lib/domain/enums';
import { setUserActive, setUserRole } from '../actions';
import { ASSIGNABLE_ROLES } from '../_lib/shared';
import { useUserAction } from './use-user-action';

/**
 * Kontrol peran dan status aktif untuk satu baris pengguna.
 *
 * Baris milik pengguna yang sedang masuk dikunci di sisi klien juga — server
 * tetap menolaknya, tetapi mengunci di sini menghemat satu putaran bolak-balik
 * dan, lebih penting, tidak menawarkan tindakan yang memang tidak boleh.
 */
export function UserRowControls({
  userId,
  userName,
  role,
  isActive,
  isSelf,
}: {
  userId: string;
  userName: string;
  role: UserRole;
  isActive: boolean;
  isSelf: boolean;
}) {
  const { pending, run } = useUserAction();

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Select
        aria-label={`Peran untuk ${userName}`}
        value={role}
        disabled={pending || isSelf}
        onChange={(event) => {
          const next = event.target.value as UserRole;
          if (next === role) return;
          run(() => setUserRole(userId, next));
        }}
        className="h-8 w-48 text-[13px]"
      >
        {ASSIGNABLE_ROLES.map((option) => (
          <option key={option} value={option}>
            {USER_ROLE_LABEL[option]}
          </option>
        ))}
      </Select>

      <Button
        size="sm"
        variant={isActive ? 'outline' : 'primary'}
        disabled={isSelf}
        isLoading={pending}
        onClick={() => run(() => setUserActive(userId, !isActive))}
      >
        {isActive ? 'Nonaktifkan' : 'Aktifkan'}
        <span className="sr-only"> {userName}</span>
      </Button>
    </div>
  );
}
