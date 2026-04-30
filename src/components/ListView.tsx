import { useState } from "react";
import { useShoppingList } from "../lib/shoppingList";

export default function ListView() {
  const { items, addItem, removeItem, toggleBought } = useShoppingList();
  const [newItem, setNewItem] = useState("");

  const toBuy = items.filter((i) => !i.bought);
  const bought = items.filter((i) => i.bought);

  function handleAdd() {
    if (!newItem.trim()) return;

    addItem({
      id: newItem.toLowerCase().replace(/\s+/g, "-"),
      name: newItem,
    });

    setNewItem("");
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Shopping List 🛒</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add grocery item..."
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 10,
            border: "1px solid #ccc",
          }}
        />

        <button onClick={handleAdd}>Add</button>
      </div>

      <h3>To Buy</h3>
      {toBuy.map((item) => (
        <div key={item.id} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button onClick={() => toggleBought(item.id)}>⬜</button>
          <span>{item.name}</span>
          <button onClick={() => removeItem(item.id)}>🗑</button>
        </div>
      ))}

      <h3 style={{ marginTop: 20 }}>In Cart</h3>
      {bought.map((item) => (
        <div key={item.id} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button onClick={() => toggleBought(item.id)}>✅</button>
          <span style={{ textDecoration: "line-through" }}>{item.name}</span>
          <button onClick={() => removeItem(item.id)}>🗑</button>
        </div>
      ))}
    </div>
  );
}