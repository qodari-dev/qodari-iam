import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { User } from '@/schemas/user';

export function UserInfo({
  user,
  opened,
  onOpened,
}: {
  user: User | undefined;
  opened: boolean;
  onOpened(opened: boolean): void;
}) {
  return (
    <Sheet open={opened} onOpenChange={(open) => onOpened(open)}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Are you absolutely sure {user?.email}?</SheetTitle>
          <SheetDescription>
            This action cannot be undone. This will permanently delete your account and remove your
            data from our servers.
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
