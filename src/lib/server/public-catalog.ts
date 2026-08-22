import { createServerFn } from "@tanstack/react-start";
import { fileCatalog } from "./file-catalog";

/** Public menu — no DB import, cannot take the site down. */
export const getPublicCatalog = createServerFn({ method: "GET" }).handler(async () => {
  return fileCatalog(false);
});
