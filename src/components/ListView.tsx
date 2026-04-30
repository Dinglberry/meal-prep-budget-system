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
      category: "Custom",
    });

    setNewItem("");
  }

  return (
    <div style={{ padding: 18, paddingBottom: 120 }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: "#5A3827" }}>
        Shopping List 🧺
      </div>

      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add grocery item..."
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: 18,
            border: "1.5px solid #E8CFA3",
            background: "#FFF9EA",
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            border: "none",
            borderRadius: 18,
            background: "#7c8a64",
            color: "#fff8ea",
            padding: "0 16px",
            fontWeight: 800,
          }}
        >
          Add
        </button>
      </div>

      <Section title="To Buy" items={toBuy} toggleBought={toggleBought} removeItem={removeItem} />
      <Section title="In Cart" items={bought} toggleBought={toggleBought} removeItem={removeItem} bought />
    </div>
  );
}

function Section({ title, items, toggleBought, removeItem, bought = false }: any) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: "#5A3827", marginBottom: 10 }}>
        {title}
      </div>

      {items.length === 0 ? (
        <div style={{
          background: "#FFF9EA",
          border: "1.5px solid #E8CFA3",
          borderRadius: 22,
          padding: 16,
          color: "#9A7A5A",
        }}>
          Nothing here yet.
        </div>
      ) : (
        items.map((item: any) => (
          <div key={item.id} style={{
            background: "#FFF9EA",
            border: "1.5px solid #E8CFA3",
            borderRadius: 22,
            padding: 14,
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 10px 22px rgba(90,56,39,0.08)",
          }}>
            <button onClick={() => toggleBought(item.id)} style={{
              width: 30,
              height: 30,
              borderRadius: 12,
              border: "1.5px solid #E8CFA3",
              background: bought ? "#7c8a64" : "#FFF6DF",
              color: bought ? "#fff8ea" : "#5A3827",
            }}>
              {bought ? "✓" : ""}
            </button>

            <div style={{ flex: 1 }}>
              <div style={{
                fontWeight: 900,
                color: "#5A3827",
                textDecoration: bought ? "line-through" : "none",
              }}>
                {item.name}
              </div>
              <div style={{ fontSize: 11, color: "#9A7A5A" }}>
                {item.category || "Custom"}
              </div>
            </div>

            <button onClick={() => removeItem(item.id)} style={{
              border: "none",
              background: "#F8C8B8",
              borderRadius: 12,
              padding: "7px 9px",
            }}>
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  );
}