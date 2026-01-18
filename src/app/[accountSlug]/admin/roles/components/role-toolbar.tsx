'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';

export function RolesToolbar({
  searchValue,
  onSearchChange,
  onCreate,
  onRefresh,
  isRefreshing = false,
}: {
  searchValue: string;
  onSearchChange(value: string): void;
  onCreate(): void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <Input
        placeholder="Search roles..."
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className="md:max-w-xs"
      />
      <div className="flex items-center space-x-2">
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-9"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
        <Button type="button" size="sm" onClick={onCreate} className="h-9">
          <Plus className="mr-2 h-4 w-4" />
          New Role
        </Button>
      </div>
    </div>
  );
}
