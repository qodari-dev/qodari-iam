'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function RolesToolbar({
  searchValue,
  onSearchChange,
  onCreate,
}: {
  searchValue: string;
  onSearchChange(value: string): void;
  onCreate(): void;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <Input
        placeholder="Search roles..."
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className="md:max-w-xs"
      />
      <Button type="button" onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" />
        New Role
      </Button>
    </div>
  );
}
