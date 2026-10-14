
"use client";

import { useState } from "react";
import { PageHeading } from "@/components/ui";

type InventoryItem = {
  id: number;
  name: string;
  category: string;
  quantity: string;
  description: string;
  returned: boolean;
};

const settlementItems = [
  {
    id: "alimony",
    title: "Permanent alimony and maintenance",
    description: "Record the agreed terms, amount, and payment arrangements.",
  },
  {
    id: "custody",
    title: "Child custody and arrangements",
    description: "Record applicable custody, visitation, and child-support terms.",
  },
  {
    id: "stridhan",
    title: "Stridhan and personal belongings",
    description: "List items and document their return or outstanding status.",
  },
  {
    id: "property",
    title: "Property and other financial matters",
    description: "Record any applicable property division or financial settlement.",
  },
];

export function SettlementChecklistView() {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Gold / jewellery");
  const [quantity, setQuantity] = useState("1");
  const [description, setDescription] = useState("");

  const completedCount = settlementItems.filter(
    (item) => completed[item.id],
  ).length;

  function addItem() {
    if (!name.trim()) return;

    setItems((previous) => [
      ...previous,
      {
        id: Date.now(),
        name: name.trim(),
        category,
        quantity: quantity.trim() || "Not specified",
        description: description.trim(),
        returned: false,
      },
    ]);

    setName("");
    setQuantity("1");
    setDescription("");
  }

  function toggleReturned(id: number) {
    setItems((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, returned: !item.returned } : item,
      ),
    );
  }

  return (
    <div className="cooling-view">
      <PageHeading
        eyebrow="MUTUAL CONSENT DIVORCE"
        title="Settlement checklist"
        description="Organize settlement topics and track listed belongings for legal review."
      />

      <section className="panel waiver-panel">
        <h2>Settlement progress</h2>
        <p>
          {completedCount} of {settlementItems.length} topics marked reviewed
        </p>

        <div
          role="progressbar"
          aria-label="Settlement review progress"
          aria-valuemin={0}
          aria-valuemax={settlementItems.length}
          aria-valuenow={completedCount}
          className="settlement-progress"
        >
          <div
            className="settlement-progress-fill"
            style={{
              width: `${(completedCount / settlementItems.length) * 100}%`,
            }}
          />
        </div>

        <div className="waiver-checklist">
          {settlementItems.map((item) => (
            <label className="waiver-check" key={item.id}>
              <input
                type="checkbox"
                checked={Boolean(completed[item.id])}
                onChange={(event) =>
                  setCompleted((previous) => ({
                    ...previous,
                    [item.id]: event.target.checked,
                  }))
                }
              />
              <span>
                <strong>{item.title}</strong>
                <br />
                {item.description}
              </span>
            </label>
          ))}
        </div>

        <p className="waiver-notice">
          This checklist helps organize information. It does not determine
          whether a settlement is legally sufficient or whether a court will
          approve the petition.
        </p>
      </section>

      <section className="panel waiver-panel">
        <h2>Stridhan and belongings inventory</h2>
        <p>
          Add gold, jewellery, gifts, documents, and other personal
          belongings. Mark an item returned only when appropriate.
        </p>

        <div className="cooling-fields">
          <label className="field">
            Item name *
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Gold necklace"
            />
          </label>

          <label className="field">
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option>Gold / jewellery</option>
              <option>Gifts</option>
              <option>Clothing / personal belongings</option>
              <option>Documents</option>
              <option>Other</option>
            </select>
          </label>

          <label className="field">
            Quantity
            <input
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="e.g. 1 necklace"
            />
          </label>

          <label className="field">
            Description or identifying details
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional details"
            />
          </label>
        </div>

        <button className="button" type="button" onClick={addItem}>
          Add inventory item
        </button>

        {items.length === 0 ? (
          <p>No inventory items added yet.</p>
        ) : (
          <div className="settlement-inventory">
            {items.map((item) => (
              <div className="settlement-inventory-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    {item.category} · Quantity: {item.quantity}
                  </p>
                  {item.description && <p>{item.description}</p>}
                </div>

                <label className="waiver-check">
                  <input
                    type="checkbox"
                    checked={item.returned}
                    onChange={() => toggleReturned(item.id)}
                  />
                  <span>Returned</span>
                </label>
              </div>
            ))}
          </div>
        )}

        <p className="waiver-notice">
          Inventory entries remain in this page's current session; this
          prototype does not save them to a database. Avoid entering
          sensitive personal details during testing.
        </p>
      </section>
    </div>
  );
}
