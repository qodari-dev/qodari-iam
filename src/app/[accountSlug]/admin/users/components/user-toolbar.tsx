'use client';

import { Plus, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableFacetedFilter, SimpleSelectFilter } from '@/components/data-table';
import { userStatusOptions } from '@/schemas/user';
import { useHasPermission } from '@/stores/auth-store-provider';

// ============================================================================
// Props Interface
// ============================================================================

interface UsersToolbarProps {
  // Search
  searchValue: string;
  onSearchChange: (value: string) => void;

  // Status filter (multi-select)
  statusFilter: string[];
  onStatusFilterChange: (values: string[]) => void;

  // Is Admin filter (single-select)
  isAdminFilter?: string;
  onIsAdminFilterChange: (value: string | undefined) => void;

  // Lock filter (single-select)
  lockFilter?: string;
  onLockFilterChange: (value: string | undefined) => void;

  // Actions
  onReset: () => void;
  onRefresh?: () => void;
  onCreate?: () => void;

  // Loading states
  isRefreshing?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function UsersToolbar({
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  isAdminFilter,
  onIsAdminFilterChange,
  lockFilter,
  onLockFilterChange,
  onReset,
  onRefresh,
  onCreate,
  isRefreshing = false,
}: UsersToolbarProps) {
  const isFiltered = searchValue || statusFilter.length > 0 || isAdminFilter || lockFilter;
  const canCreateUsers = useHasPermission('users:create');
  const adminOptions = [
    { label: 'Si', value: 'true' },
    { label: 'No', value: 'false' },
  ] as const;
  const lockOptions = [{ label: 'Bloqueados', value: 'locked' }] as const;

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col-reverse items-start gap-2 space-x-2 lg:flex-row lg:items-center">
        {/* Search Input */}
        <Input
          placeholder="Buscar por correo, nombre o apellido..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="md:max-w-xs"
        />

        {/* Status Filter (Multi-select) */}
        <DataTableFacetedFilter
          title="Estado"
          options={[...userStatusOptions]}
          value={statusFilter}
          onValueChange={onStatusFilterChange}
        />

        {/* Is Admin Filter (Single-select) */}
        <SimpleSelectFilter
          title="Administrador"
          options={[...adminOptions]}
          value={isAdminFilter}
          onValueChange={onIsAdminFilterChange}
        />

        {/* Lock Filter (Single-select) */}
        <SimpleSelectFilter
          title="Bloqueo"
          options={[...lockOptions]}
          value={lockFilter}
          onValueChange={onLockFilterChange}
        />

        {/* Reset Button */}
        {isFiltered && (
          <Button variant="ghost" onClick={onReset} className="h-9 px-2 lg:px-3">
            Limpiar
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

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
            Actualizar
          </Button>
        )}

        {/* Create Button */}
        {onCreate && canCreateUsers && (
          <Button type="button" size="sm" onClick={onCreate} className="h-9">
            <Plus className="mr-2 h-4 w-4" />
            Agregar usuario
          </Button>
        )}
      </div>
    </div>
  );
}
