import { DescriptionList, DescriptionSection } from '@/components/description-list';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { User } from '@/schemas/user';
import { formatDate } from '@/utils/formatters';
import { format } from 'date-fns';

export function UserInfo({
  user,
  opened,
  onOpened,
}: {
  user: User | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  if (!user) return null;
  const lockedUntil = user.lockedUntil ? new Date(user.lockedUntil) : null;
  const isLocked = Boolean(user.lockedUntil);
  const statusLabel = user.status === 'active' ? 'Activo' : 'Suspendido';

  const sections: DescriptionSection[] = [
    {
      title: 'Informacion basica',
      columns: 2,
      items: [
        { label: 'Nombre', value: user.firstName },
        { label: 'Apellido', value: user.lastName },
        { label: 'Correo', value: user.email },
        { label: 'Telefono', value: user.phone },
      ],
    },
    {
      title: 'Estado de cuenta',
      columns: 2,
      items: [
        {
          label: 'Estado',
          value: (
            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
              {statusLabel}
            </Badge>
          ),
        },
        {
          label: 'Administrador',
          value: (
            <Badge variant={user.isAdmin ? 'default' : 'outline'}>
              {user.isAdmin ? 'Si' : 'No'}
            </Badge>
          ),
        },
        {
          label: 'Bloqueado',
          value: (
            <Badge variant={isLocked ? 'destructive' : 'secondary'}>
              {isLocked ? 'Si' : 'No'}
            </Badge>
          ),
        },
        {
          label: 'Intentos fallidos',
          value: user.failedLoginAttempts,
        },
        {
          label: 'Bloqueado hasta',
          value: lockedUntil ? format(lockedUntil, 'PPP p') : null,
        },
      ],
    },
    {
      title: 'Roles',
      items: [
        {
          label: 'Roles asignados',
          value: user.userRoles?.length ? (
            <div className="flex flex-wrap gap-1">
              {user.userRoles.map(({ role }) => (
                <Badge key={role?.id} variant="outline">
                  {role?.name}
                </Badge>
              ))}
            </div>
          ) : null,
          hidden: !user.userRoles?.length,
        },
      ],
    },
    {
      title: 'Actividad',
      columns: 2,
      items: [
        {
          label: 'Creado',
          value: formatDate(user.createdAt),
        },
        {
          label: 'Actualizado',
          value: formatDate(user.updatedAt),
        },
        {
          label: 'Ultimo acceso',
          value: user.lastLoginAt ? format(new Date(user.lastLoginAt), 'PPP p') : null,
        },
      ],
    },
  ];

  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent className="overflow-y-scroll sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Informacion</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <DescriptionList sections={sections} columns={2} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
