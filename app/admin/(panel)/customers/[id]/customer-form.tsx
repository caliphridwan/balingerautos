"use client";

import { updateCustomer } from "@/app/admin/actions/leads";
import { AdminForm, aInput, aTextarea, AField } from "@/components/admin/admin-form";

export function CustomerForm({ id, fullName, phone, notes, email }: { id: string; fullName: string; phone: string; notes: string; email: string }) {
  return (
    <AdminForm action={(fd) => updateCustomer(id, fd)} submitLabel="Save customer">
      {(errors) => (
        <>
          <AField label="Email" hint="Customers are matched by email, so it can't be changed here.">
            <input value={email} readOnly className={`${aInput} bg-ivory`} />
          </AField>
          <AField label="Full name" error={errors.fullName}>
            <input name="fullName" defaultValue={fullName} className={aInput} />
          </AField>
          <AField label="Phone" error={errors.phone}>
            <input name="phone" defaultValue={phone} className={aInput} />
          </AField>
          <AField label="Internal notes" error={errors.notes}>
            <textarea name="notes" rows={6} defaultValue={notes} className={aTextarea} />
          </AField>
        </>
      )}
    </AdminForm>
  );
}
