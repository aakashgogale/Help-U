import React from "react";
import { FiPlus, FiTrash2, FiChevronUp, FiChevronDown } from "react-icons/fi";

const MAX_FIELDS = 10;

const TYPE_OPTIONS = [
  { value: "select", label: "Dropdown" },
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Yes / No" },
];

const slugKey = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

// Dropdown options are edited as one option per line and stored as a list
const optionsToText = (options) => (Array.isArray(options) ? options.join("\n") : "");
const textToOptions = (text) => String(text || "").split("\n").map((o) => o.trim());

/**
 * Edits the questions a customer answers in the cart for a category's services.
 * A field's key is fixed the first time it gets a label, so renaming a label later
 * does not orphan answers already saved on carts and bookings.
 */
const DetailFieldsEditor = ({ value = [], onChange }) => {
  const fields = Array.isArray(value) ? value : [];

  const update = (index, patch) => {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const setLabel = (index, label) => {
    const field = fields[index];
    // Only a field that has never been saved gets its key from the label
    const patch = { label };
    if (!field.keyLocked) patch.key = slugKey(label);
    update(index, patch);
  };

  const move = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = (index) => onChange(fields.filter((_, i) => i !== index));

  const add = () =>
    onChange([
      ...fields,
      { key: "", label: "", type: "select", options: ["", ""], required: false, placeholder: "", helpText: "" },
    ]);

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <p className="text-[11px] text-gray-500">
          No questions yet. Customers will not be asked for any extra details for this category.
        </p>
      )}

      {fields.map((field, index) => (
        <div key={index} className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Question</label>
              <input
                type="text"
                value={field.label || ""}
                maxLength={60}
                placeholder="e.g. Appliance brand"
                onChange={(e) => setLabel(index, e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs"
              />
            </div>
            <div className="w-32 shrink-0">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Answer type</label>
              <select
                value={field.type || "text"}
                onChange={(e) => update(index, { type: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs bg-white"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {field.type === "select" && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Options (one per line, at least 2)
              </label>
              <textarea
                rows={4}
                value={optionsToText(field.options)}
                onChange={(e) => update(index, { options: textToOptions(e.target.value) })}
                placeholder={"LG\nSamsung\nOther"}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs"
              />
            </div>
          )}

          {(field.type === "text" || field.type === "number") && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Placeholder (optional)</label>
              <input
                type="text"
                value={field.placeholder || ""}
                maxLength={80}
                onChange={(e) => update(index, { placeholder: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Help text (optional)</label>
            <input
              type="text"
              value={field.helpText || ""}
              maxLength={120}
              onChange={(e) => update(index, { helpText: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!field.required}
                onChange={(e) => update(index, { required: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-gray-700">Required before checkout</span>
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className="p-1.5 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-30"
                aria-label="Move up"
              >
                <FiChevronUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === fields.length - 1}
                className="p-1.5 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-30"
                aria-label="Move down"
              >
                <FiChevronDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => remove(index)}
                className="p-1.5 rounded hover:bg-red-100 text-red-600"
                aria-label="Remove question"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {fields.length < MAX_FIELDS && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-blue-400 text-blue-600 text-xs font-semibold hover:bg-blue-50"
        >
          <FiPlus className="w-3.5 h-3.5" /> Add question
        </button>
      )}
    </div>
  );
};

export default DetailFieldsEditor;
