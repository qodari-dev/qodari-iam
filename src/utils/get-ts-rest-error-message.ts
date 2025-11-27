import { isErrorResponse } from "@ts-rest/core";

export function getTsRestErrorMessage(error: unknown | null | undefined) {
  if (error && isErrorResponse(error) && error.body?.message) {
    return error.body.message;
  }

  return "Ocurrió un error inesperado";
}
