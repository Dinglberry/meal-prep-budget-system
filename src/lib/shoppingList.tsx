import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type ShoppingItem = {
  id: string;
  name: string;
  category?: string;
  bought: boolean;
};

type ShoppingListContextType = {
  items: ShoppingItem[];
  addItem: (item: Omit<ShoppingItem, "bought">) => void;
  removeItem: (id: string) => void;
  toggleBought: (id: string) => void;
};

const ShoppingListContext = createContext<ShoppingListContextType | null>(null);

const STORAGE_KEY = "glow-kitchen.shopping-list.v1";

function loadInitial(): ShoppingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function ShoppingListProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ShoppingItem[]>(loadInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: Omit<ShoppingItem, "bought">) => {
    setItems((prev) =>
      prev.some((i) => i.id === item.id) ? prev : [{ ...item, bought: false }, ...prev]
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toggleBought = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, bought: !i.bought } : i))
    );
  }, []);

  const value = useMemo(
    () => ({ items, addItem, removeItem, toggleBought }),
    [items, addItem, removeItem, toggleBought]
  );

  return (
    <ShoppingListContext.Provider value={value}>
      {children}
    </ShoppingListContext.Provider>
  );
}

export function useShoppingList() {
  const ctx = useContext(ShoppingListContext);
  if (!ctx) throw new Error("useShoppingList must be used inside provider");
  return ctx;
}