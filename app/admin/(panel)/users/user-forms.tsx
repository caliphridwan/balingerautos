"use client";

import { useState } from "react";
import { createUser, resetUserPassword, updateUser } from "@/app/admin/actions/users";
import { AdminForm, aInput, AField } from "@/components/admin/admin-form";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  SALES_MANAGER: "Sales manager",
  SALES_REPRESENTATIVE: "Sales representative",
};

export function CreateUserForm({ roles }: { roles: string[] }) {
  return (
    <AdminForm action={createUser} submitLabel="Create account" resetOnSuccess>
      {(e) => (
        <>
          <AField label="Full name" error={e.name}><input name="name" className={aInput} /></AField>
          <AField label="Email" error={e.email}><input name="email" type="email" autoComplete="off" className={aInput} /></AField>
          <AField label="Phone" error={e.phone}><input name="phone" className={aInput} /></AField>
          <AField label="Role" error={e.role}>
            <select name="role" defaultValue="SALES_REPRESENTATIVE" className={aInput}>
              {roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </AField>
          <AField label="Temporary password" error={e.password} hint="At least 12 characters. Ask them to change it after signing in.">
            <input name="password" type="text" autoComplete="new-password" className={aInput} />
          </AField>
        </>
      )}
    </AdminForm>
  );
}

export function EditUserForm({ user, roles, isSelf }: { user: { id: string; name: string; role: string; isActive: boolean }; roles: string[]; isSelf: boolean }) {
  const [showReset, setShowReset] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <AdminForm action={(fd) => updateUser(user.id, fd)}>
        {(e) => (
          <div className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <AField label="Name" error={e.name}><input name="name" defaultValue={user.name} className={aInput} /></AField>
            <AField label="Role" error={e.role}>
              <select name="role" defaultValue={user.role} disabled={isSelf} className={aInput}>
                {roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              {isSelf ? <input type="hidden" name="role" value={user.role} /> : null}
            </AField>
            <label className="flex h-10 items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={user.isActive} disabled={isSelf} className="h-4 w-4 accent-obsidian" />
              Active
              {isSelf ? <input type="hidden" name="isActive" value="on" /> : null}
            </label>
          </div>
        )}
      </AdminForm>
      {!isSelf ? (
        showReset ? (
          <AdminForm action={(fd) => resetUserPassword(user.id, fd)} submitLabel="Set new password" resetOnSuccess>
            {(e) => (
              <AField label="New password" error={e.password} hint="At least 12 characters.">
                <input name="password" type="text" autoComplete="new-password" className={aInput} />
              </AField>
            )}
          </AdminForm>
        ) : (
          <button type="button" onClick={() => setShowReset(true)} className="self-start text-xs font-bold uppercase tracking-[0.08em] text-deepgold">
            Reset password
          </button>
        )
      ) : null}
    </div>
  );
}
