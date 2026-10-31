import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { requirePage } from "@/lib/auth/guards";
import { assignableRoles, can, PERMISSIONS, ROLE_LABELS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { formatInZone } from "@/lib/time";
import { CreateUserForm, EditUserForm } from "./user-forms";

export const metadata = { title: "Users & roles" };

export default async function UsersPage() {
  const actor = await requirePage("users:manage");
  const settings = await getSiteSettings();
  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, _count: { select: { assignments: { where: { isActive: true } } } } },
  });
  const roles = assignableRoles(actor.role);
  const allRoles = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "SALES_REPRESENTATIVE"] as const;

  return (
    <>
      <PageHeader title="Users & roles" description={`${users.filter((u) => u.isActive).length} active staff accounts`} />
      <div className="grid gap-6 2xl:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          {users.map((u) => (
            <Card key={u.id}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-semibold">{u.name} {u.id === actor.id ? <span className="text-xs text-ink-muted">(you)</span> : null}</span>
                  <span className="text-sm text-ink-muted">{u.email}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <Badge tone={u.isActive ? "dark" : "muted"}>{u.isActive ? ROLE_LABELS[u.role] : "Deactivated"}</Badge>
                  <span>{u._count.assignments} open leads</span>
                  <span>· last sign-in {u.lastLoginAt ? formatInZone(u.lastLoginAt, settings.timezone, settings.locale, { dateStyle: "medium", timeStyle: "short" }) : "never"}</span>
                </div>
              </div>
              {u.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN" ? (
                <p className="text-sm text-ink-muted">Only a super admin can edit this account.</p>
              ) : (
                <EditUserForm user={{ id: u.id, name: u.name, role: u.role, isActive: u.isActive }} roles={Array.from(new Set([...roles, u.role]))} isSelf={u.id === actor.id} />
              )}
            </Card>
          ))}
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Add staff member">
            <CreateUserForm roles={roles} />
          </Card>
          <Card title="What each role can do">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="py-2 text-left">Permission</th>
                    {allRoles.map((r) => <th key={r} className="px-1 py-2 text-center">{ROLE_LABELS[r].split(" ")[0]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSIONS.map((p) => (
                    <tr key={p} className="border-t border-ivory-soft">
                      <td className="py-1.5 font-mono">{p}</td>
                      {allRoles.map((r) => (
                        <td key={r} className="text-center">{can(r, p) ? <span aria-label="yes">●</span> : <span aria-label="no" className="text-ink-muted">–</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-ink-muted">Sales representatives see only the enquiries and appointments assigned to them.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
