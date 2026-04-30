import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ShoppingListProvider } from "./lib/shoppingList";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
 <React.StrictMode>
  <ShoppingListProvider>
    <App />
  </ShoppingListProvider>
</React.StrictMode>
);