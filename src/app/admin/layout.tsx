import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api } from "@/clients/api";
import AdminShell from "./admin-shell";
import { env } from "@/env";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const result = await api.auth.me.query({
    query: { appSlug: env.IAM_APP_SLUG },
    headers: { cookie: cookieHeader },
  });

  if (result.status === 401) {
    redirect(`/auth/login?next=${encodeURIComponent("/admin")}`);
  }

  if (result.status !== 200) {
    throw new Error("Failed to load auth context");
  }

  const auth = result.body;

  const canAccessAdmin =
    auth.user.isAdmin || auth.permissions?.includes("admin:access");
  if (!canAccessAdmin) {
    redirect("/portal");
  }

  return <AdminShell auth={auth}>{children}</AdminShell>;
}
