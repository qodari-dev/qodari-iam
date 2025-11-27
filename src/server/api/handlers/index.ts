import { contract } from "@/server/api/contracts";
import { createNextHandler } from "@ts-rest/serverless/next";
import { auth } from "./auth";

export const handler = createNextHandler(
  contract,
  { auth },
  {
    jsonQuery: true,
    responseValidation: true,
    handlerType: "app-router",
  },
);
