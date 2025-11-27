"use client";

import type { MeResponse } from "@/schemas/auth";
import {
  AuthStoreProvider,
  useAuthUser,
  useHasPermission,
} from "@/stores/auth-store-provider";
import { api } from "@/clients/api";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getTsRestErrorMessage } from "@/utils/get-ts-rest-error-message";
import Link from "next/link";

type Props = {
  auth: MeResponse;
  children: React.ReactNode;
};

export default function AdminShell({ auth, children }: Props) {
  return (
    <AuthStoreProvider initialAuth={auth}>
      <AdminContent>{children}</AdminContent>
    </AuthStoreProvider>
  );
}

function AdminContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthUser();
  const canSeeUsers = useHasPermission("users:read");
  const canSeeRoles = useHasPermission("roles:read");
  const canSeePermissions = useHasPermission("permissions:read");
  const canSeeApps = useHasPermission("apps:read");

  const { mutateAsync: logout, isPending } = api.auth.logout.useMutation({
    onError(error) {
      toast.error("Error al cerrar sesión", {
        description: getTsRestErrorMessage(error),
      });
    },
    onSuccess() {
      router.push("/auth/login");
    },
  });

  async function handleLogout() {
    await logout({});
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-background px-4 py-6">
        <div className="mb-6">
          <p className="text-xs uppercase text-muted-foreground">Qodari IAM</p>
          <p className="text-sm font-medium">Admin</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 text-sm">
          <Link href="/admin" className="rounded px-2 py-1 hover:bg-muted">
            Dashboard
          </Link>

          {canSeeUsers && (
            <Link
              href="/admin/users"
              className="rounded px-2 py-1 hover:bg-muted"
            >
              Usuarios
            </Link>
          )}

          {canSeeRoles && (
            <Link
              href="/admin/roles"
              className="rounded px-2 py-1 hover:bg-muted"
            >
              Roles
            </Link>
          )}

          {canSeePermissions && (
            <Link
              href="/admin/permissions"
              className="rounded px-2 py-1 hover:bg-muted"
            >
              Permisos
            </Link>
          )}

          {canSeeApps && (
            <Link
              href="/admin/apps"
              className="rounded px-2 py-1 hover:bg-muted"
            >
              Aplicaciones
            </Link>
          )}
        </nav>

        <Button
          size="sm"
          variant="outline"
          className="mt-4"
          onClick={handleLogout}
          disabled={isPending}
        >
          {isPending ? "Cerrando..." : "Cerrar sesión"}
        </Button>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <div>
            <p className="text-sm font-medium">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
