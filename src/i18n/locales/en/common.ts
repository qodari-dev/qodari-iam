export const common = {
  error: 'Error',
  cancel: 'Cancel',
  save: 'Save',
  close: 'Close',
  generate: 'Generate',
  openMenu: 'Open menu',
  validationErrors: 'Validation errors',
  moreErrors: (count: number) => `+${count} more errors`,
  copiedToClipboard: 'Copied to clipboard',
  copyToClipboardFailed: 'Could not copy to clipboard',
  imageUpload: {
    previewAlt: 'Preview',
    clickOrDrop: 'Click or drop',
  },
  dataTable: {
    actions: 'Actions',
    sortAsc: 'Asc',
    sortDesc: 'Desc',
    hide: 'Hide',
    noResults: 'No results found.',
    clearFilter: 'Clear filter',
    clearFilters: 'Clear filters',
    pickDate: 'Pick a date',
    selectedRows: (selectedCount: number, rowCount: number) =>
      `${selectedCount} of ${rowCount} row(s) selected`,
    showingResults: (startRow: number, endRow: number, totalCount: number) =>
      `Showing ${startRow} to ${endRow} of ${totalCount} results`,
    rowsPerPage: 'Rows per page',
    page: (pageIndex: number, pageCount: number) => `Page ${pageIndex} of ${pageCount}`,
    firstPage: 'Go to first page',
    previousPage: 'Go to previous page',
    nextPage: 'Go to next page',
    lastPage: 'Go to last page',
  },
} as const;

export type CommonMessages = typeof common;
