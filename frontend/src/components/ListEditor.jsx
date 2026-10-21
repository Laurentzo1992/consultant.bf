/**
 * Edits a list of small records (experiences, diplomas, certifications).
 *
 * `fields`: [{ name, label, type?: "text"|"number"|"textarea", placeholder?,
 *              required?, wide? }] -- `wide` fields take a full row.
 * `blank`: the record added by the "+" button.
 */
export default function ListEditor({ items, onChange, fields, blank, addLabel, emptyHint }) {
  const update = (index, name, value) =>
    onChange(items.map((item, i) => (i === index ? { ...item, [name]: value } : item)));
  const remove = (index) => onChange(items.filter((_, i) => i !== index));
  const add = () => onChange([...items, { ...blank }]);

  return (
    <div className="list-editor">
      {items.length === 0 && emptyHint && <p className="meta">{emptyHint}</p>}
      {items.map((item, index) => (
        <fieldset className="list-editor-item" key={index}>
          <div className="list-editor-grid">
            {fields.map((f) => (
              <label key={f.name} className={f.wide ? "wide" : ""}>
                {f.label}
                {f.type === "textarea" ? (
                  <textarea
                    rows={2}
                    value={item[f.name] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => update(index, f.name, e.target.value)}
                  />
                ) : (
                  <input
                    type={f.type || "text"}
                    value={item[f.name] ?? ""}
                    placeholder={f.placeholder}
                    required={f.required}
                    min={f.type === "number" ? 1950 : undefined}
                    max={f.type === "number" ? 2100 : undefined}
                    onChange={(e) => update(index, f.name, e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
          <button type="button" className="link-btn list-editor-remove" onClick={() => remove(index)}>
            Retirer
          </button>
        </fieldset>
      ))}
      <button type="button" className="btn-outline btn-sm" onClick={add}>
        + {addLabel}
      </button>
    </div>
  );
}

/** Form values (strings) -> API payload: numbers for years, null for blanks,
 *  rows without their required field dropped. */
export function cleanItems(items, { required, years = [] }) {
  return items
    .filter((item) => String(item[required] ?? "").trim())
    .map((item) => {
      const out = {};
      for (const [key, value] of Object.entries(item)) {
        const v = typeof value === "string" ? value.trim() : value;
        if (years.includes(key)) out[key] = v === "" || v == null ? null : Number(v);
        else out[key] = v === "" ? null : v;
      }
      return out;
    });
}
