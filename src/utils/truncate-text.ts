const MAX_DESCRIPTION_LENGTH = 80;

export const truncateText = (value: string, maxLength = MAX_DESCRIPTION_LENGTH) =>
  value.length > maxLength ? `${value.slice(0, maxLength).trimEnd()}...` : value;
