import client from "src/external/client";
import { create } from "zustand";

type IdolsCatalogState = {
  items: Record<string, FortniteApiResult>;
  load: () => Promise<void>;
  find: (id: string) => FortniteApiResult | null;
};

export const useIdolsCatalog = create<IdolsCatalogState>((set, get) => ({
  items: {},
  load: async () => {
    const items = await client.catalog_items();
    if (items && typeof items === "object") {
      set({ items });
    }
  },
  find: (id) => get().items[id] || null,
}));
