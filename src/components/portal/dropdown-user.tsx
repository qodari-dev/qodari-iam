'use client';

import { LogOut, LockKeyholeOpen } from 'lucide-react';

import { api } from '@/clients/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAuthUser } from '@/stores/auth-store-provider';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Spinner } from '../ui/spinner';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { ChangePasswordDialog } from './change-password-dialog';

export const title = 'Profile Dropdown with Avatar';

export function DropdownUser() {
  const router = useRouter();
  const user = useAuthUser();
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);

  const { mutateAsync: logout, isPending } = api.auth.logout.useMutation({
    onError(error) {
      toast.error('Error', {
        description: getTsRestErrorMessage(error),
      });
    },
    onSuccess() {
      router.push('/auth/login');
    },
  });

  const handleLogout = useCallback(async () => {
    await logout({});
  }, [logout]);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="relative h-10 w-10 rounded-full" variant="ghost">
            <Avatar>
              <AvatarFallback className="text-xl">
                {user?.firstName.substring(0, 1)}
                {user?.lastName.substring(0, 1)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm leading-none font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-muted-foreground text-xs leading-none">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setShowChangePasswordDialog(true)}>
            <LockKeyholeOpen />
            Change Password
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleLogout}>
            <LogOut />
            {isPending ? (
              <span className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                Logging Out
              </span>
            ) : (
              'Log out'
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog
        opened={showChangePasswordDialog}
        onOpened={setShowChangePasswordDialog}
      />
    </>
  );
}
