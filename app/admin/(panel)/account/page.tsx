import { Card, PageHeader } from "@/components/admin/ui";
import { requirePage } from "@/lib/auth/guards";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { PasswordForm } from "./password-form";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requirePage();
  return (
    <>
      <PageHeader title="My account" description={`${user.name} · ${user.email} · ${ROLE_LABELS[user.role]}`} />
      <Card title="Change password" className="max-w-xl">
        <PasswordForm />
      </Card>
    </>
  );
}
