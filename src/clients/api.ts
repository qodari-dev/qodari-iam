import { initTsrReactQuery } from "@ts-rest/react-query/v5";
import { contract } from "@/server/api/contracts";
import { env } from "@/env";
import { tsRestFetchApi } from "@ts-rest/core";

export const api = initTsrReactQuery(contract, {
  baseUrl: env.NEXT_PUBLIC_API_URL,
  baseHeaders: {
    "x-app-source": "ts-rest",
  },
  jsonQuery: true,
  responseValidation: true,
  credentials: "include",
  api: async ({ headers, ...args }) => {
    // usamos el fetch de ts-rest pero respetando credentials
    return tsRestFetchApi({
      ...args,
      headers: { ...headers },
      credentials: "include",
    });
  },
});
