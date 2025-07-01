import React from "react";

/**
 * Affiche récursivement les clés/valeurs d'un objet en filtrant tout champ strictement égal à true ou false.
 */
export default function FilteredObjectListView({ data, level = 0 }: { data: any; level?: number }) {
  // Ne rien afficher pour les booléens purs
  if (typeof data === "boolean") return null;
  if (data === null || data === undefined) return null;
  if (typeof data !== "object") return <span>{String(data)}</span>;
  if (Array.isArray(data)) {
    // On filtre les éléments non pertinents du tableau (ex : booléens)
    const filtered = data.filter(item => typeof item !== "boolean");
    if (filtered.length === 0) return null;
    return (
      <ul>
        {filtered.map((item, idx) =>
          <li key={idx}><FilteredObjectListView data={item} level={level + 1} /></li>
        )}
      </ul>
    );
  }
  // Pour les objets
  const entries = Object.entries(data).filter(([_, v]) => typeof v !== "boolean");
  if (entries.length === 0) return null;
  return (
    <ul>
      {entries.map(([k, v]) => (
        <li key={k}>
          <strong style={{ color: "var(--cm-accent)" }}>{prettifyKey(k)}:</strong>{" "}
          <FilteredObjectListView data={v} level={level + 1} />
        </li>
      ))}
    </ul>
  );
}

// Optionnel : améliore l’affichage des clés pour plus de lisibilité
function prettifyKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}
