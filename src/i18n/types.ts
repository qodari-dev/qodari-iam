export type TranslationValue = string | ((...args: never[]) => string);

export type TranslationTree = {
  [key: string]: TranslationValue | TranslationTree;
};

export type LocaleShape<T> = T extends string
  ? string
  : T extends (...args: infer Args) => infer Result
    ? (...args: Args) => Result
    : T extends Record<string, unknown>
      ? { [Key in keyof T]: LocaleShape<T[Key]> }
      : T;
