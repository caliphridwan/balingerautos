"use client";

import { changeOwnPassword } from "@/app/admin/actions/users";
import { AdminForm, aInput, AField } from "@/components/admin/admin-form";

export function PasswordForm() {
  return (
    <AdminForm action={changeOwnPassword} submitLabel="Change password" resetOnSuccess>
      {(e) => (
        <>
          <AField label="Current password" error={e.current}><input name="current" type="password" autoComplete="current-password" className={aInput} /></AField>
          <AField label="New password" error={e.next} hint="At least 12 characters."><input name="next" type="password" autoComplete="new-password" className={aInput} /></AField>
          <AField label="Confirm new password" error={e.confirm}><input name="confirm" type="password" autoComplete="new-password" className={aInput} /></AField>
        </>
      )}
    </AdminForm>
  );
}
