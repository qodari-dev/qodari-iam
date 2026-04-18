import type { LocaleShape } from '@/i18n/types';
import type { CommonMessages } from '../en/common';

export const common: LocaleShape<CommonMessages> = {
  error: 'Error',
  cancel: 'Cancelar',
  save: 'Guardar',
  close: 'Cerrar',
  generate: 'Generar',
  openMenu: 'Abrir menú',
  validationErrors: 'Errores de validación',
  moreErrors: (count: number) => `+${count} errores más`,
  copiedToClipboard: 'Copiado al portapapeles',
  copyToClipboardFailed: 'No se pudo copiar al portapapeles',
  imageUpload: {
    previewAlt: 'Vista previa',
    clickOrDrop: 'Haz clic o arrastra',
  },
  dataTable: {
    actions: 'Acciones',
    sortAsc: 'Asc',
    sortDesc: 'Desc',
    hide: 'Ocultar',
    noResults: 'No se encontraron resultados.',
    clearFilter: 'Limpiar filtro',
    clearFilters: 'Limpiar filtros',
    pickDate: 'Selecciona una fecha',
    selectedRows: (selectedCount: number, rowCount: number) =>
      `${selectedCount} de ${rowCount} fila(s) seleccionadas`,
    showingResults: (startRow: number, endRow: number, totalCount: number) =>
      `Mostrando ${startRow} a ${endRow} de ${totalCount} resultados`,
    rowsPerPage: 'Filas por página',
    page: (pageIndex: number, pageCount: number) => `Página ${pageIndex} de ${pageCount}`,
    firstPage: 'Ir a la primera página',
    previousPage: 'Ir a la página anterior',
    nextPage: 'Ir a la página siguiente',
    lastPage: 'Ir a la última página',
  },
};
