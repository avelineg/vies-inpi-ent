import * as React from "react";
import { useState } from "react";
import "./styles.css";

import nafNomenclatureRaw from './naf.json';
import formeJuridiqueRaw from './formeJuridique.json';

const nafNomenclature: Record<string, string> = nafNomenclatureRaw;
const formeJuridique: Record<string, string> = formeJuridiqueRaw;

// Vite‐exposées dans .env* (préfixe VITE_)
const BACKEND_URL   = import.meta.env.VITE_API_URL as string;
const VIES_API_URL  = import.meta.env.VITE_VAT_API_URL as string;
const SIRENE_API_KEY = import.meta.env.VITE_SIRENE_API_KEY as string | undefined;

function getApeLabel(code: string) {
  return nafNomenclature[code] || "";
}
function getFormeJuridiqueLabel(code: string) {
  return formeJuridique[code] || code || "Non renseigné";
}
function formatAdresse(adresse: any) {
  if (!adresse) return "Adresse non renseignée";
  const champs = [
    "numeroVoieEtablissement",
    "indiceRepetitionEtablissement",
    "typeVoieEtablissement",
    "libelleVoieEtablissement",
    "complementAdresseEtablissement",
    "distributionSpecialeEtablissement",
    "codePostalEtablissement",
    "libelleCommuneEtablissement",
    "libellePaysEtrangerEtablissement"
  ];
  return champs
    .map(champ => adresse[champ])
    .filter(v => v && String(v).trim())
    .join(" ");
}

function prettifyKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}
function formatValue(value: any) {
  if (value === null || value === undefined || value === "") return "Non renseigné";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return value;
}

const calculateTvaKey = (siren: string): string => {
  if (!siren || siren.length !== 9) return "";
  const key = (12 + 3 * (Number(siren) % 97)) % 97;
  return `FR${key.toString().padStart(2, "0")}${siren}`;
};

// --- Nouveau composant récursif filtrant les booléens purs ---
function FilteredObjectListView({ data, level = 0 }: { data: any; level?: number }) {
  if (typeof data === "boolean") return null;
  if (data === null || data === undefined) return null;
  if (typeof data !== "object") return <span>{String(data)}</span>;
  if (Array.isArray(data)) {
    const filtered = data.filter(item => typeof item !== "boolean");
    if (filtered.length === 0) return null;
    return (
      <ul style={{ marginLeft: (level + 1) * 16 }}>
        {filtered.map((item, idx) =>
          <li key={idx}><FilteredObjectListView data={item} level={level + 1} /></li>
        )}
      </ul>
    );
  }
  const entries = Object.entries(data).filter(([_, v]) => typeof v !== "boolean");
  if (entries.length === 0) return null;
  return (
    <ul style={{ marginLeft: (level + 1) * 16 }}>
      {entries.map(([k, v]) => (
        <li key={k}>
          <strong style={{ color: "var(--cm-accent)" }}>{prettifyKey(k)}:</strong>{" "}
          <FilteredObjectListView data={v} level={level + 1} />
        </li>
      ))}
    </ul>
  );
}

// --- Appel API SIRENE 3.11 direct si pas de BACKEND_URL ---
async function fetchSireneDirect(sirenOrSiret: string) {
  if (!SIRENE_API_KEY) throw new Error("Clé API SIRENE manquante");
  let endpoint = "";
  if (/^\d{9}$/.test(sirenOrSiret)) {
    endpoint = `https://api.insee.fr/entreprises/sirene/V3.11/siren/${sirenOrSiret}`;
  } else if (/^\d{14}$/.test(sirenOrSiret)) {
    endpoint = `https://api.insee.fr/entreprises/sirene/V3.11/siret/${sirenOrSiret}`;
  } else {
    throw new Error("Entrée non valide (SIREN ou SIRET attendu)");
  }
  const resp = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${SIRENE_API_KEY}`,
      Accept: "application/json"
    }
  });
  if (!resp.ok) throw new Error("Erreur API SIRENE");
  return resp.json();
}

export default function App() {
  const [input, setInput] = useState("");
  const [infos, setInfos] = useState<any | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState<string | null>(null);

  const getType = (val: string) => {
    if (/^\d{9}$/.test(val))  return "siren";
    if (/^\d{14}$/.test(val)) return "siret";
    return "texte";
  };

  const handleSearch = async (preset?: string) => {
    const searchInput = (preset || input).trim();
    setInput(searchInput);
    setInfos(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setErreur(null);
    setVerification(null);
    setLoading(true);

    try {
      if (!searchInput) {
        throw new Error("Merci de saisir un SIREN, un SIRET ou un texte.");
      }
      const type = getType(searchInput);

      if (type === "siren" || type === "siret") {
        if (BACKEND_URL) {
          const url = `${BACKEND_URL}/inpi/entreprise/${searchInput}`;
          const resp = await fetch(url);
          if (!resp.ok) throw new Error("Entreprise non trouvée via INPI");
          const data = await resp.json();
          setInfos(data);
        } else {
          // Appel direct API SIRENE 3.11
          const data = await fetchSireneDirect(searchInput);
          setInfos(data);
        }
        setLoading(false);
        return;
      }

      // 2) Texte libre → recherche floue via INPI backend uniquement
      if (BACKEND_URL) {
        const urlFuzzy = `${BACKEND_URL}/inpi/entreprises?raisonSociale=${encodeURIComponent(searchInput)}`;
        const respFuzzy = await fetch(urlFuzzy);
        if (!respFuzzy.ok) throw new Error("Aucun résultat INPI");
        const entreprises = await respFuzzy.json();
        if (!entreprises.length) throw new Error("Aucun résultat INPI");
        setSuggestions(entreprises);
        setShowSuggestions(true);
      } else {
        throw new Error("Recherche texte non supportée sans backend.");
      }

    } catch (err: any) {
      setErreur(err.message || "Erreur de recherche");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (siren: string) => {
    setShowSuggestions(false);
    handleSearch(siren);
  };

  const handleVerifyTva = async () => {
    setVerification(null);
    // SIREN/SIRET peut être imbriqué selon structure
    const siren = infos?.siren ?? infos?.header?.siren ?? "";
    if (!siren) {
      setVerification("Aucun SIREN pour vérifier la TVA");
      return;
    }
    const tva = calculateTvaKey(siren);
    if (!tva) {
      setVerification("SIREN invalide pour TVA");
      return;
    }
    const country = tva.slice(0, 2);
    const number = tva.slice(2);
    const url = `${VIES_API_URL}/check-vat?countryCode=${country}&vatNumber=${number}`;

    try {
      const resp = await fetch(url);
      const json = await resp.json();
      setVerification(
        json.valid
          ? `✅ TVA valide : ${json.name || "–"} • ${json.address || "–"}`
          : "❌ TVA invalide"
      );
    } catch (e) {
      setVerification("⚠️ Service TVA indisponible");
    }
  };

  return (
    <div className="container">
      <h2>🔍 Recherche (SIREN, SIRET ou raison sociale)</h2>
      <div className="controls">
        <input
          placeholder="Entrez SIREN/SIRET/texte"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button onClick={() => handleSearch()} disabled={loading}>
          {loading ? "..." : "Rechercher"}
        </button>
        <button onClick={handleVerifyTva} disabled={!infos}>
          Vérifier TVA
        </button>
        {erreur && <p className="error">{erreur}</p>}
      </div>

      {showSuggestions && (
        <ul className="suggestions">
          {suggestions.map(ent => (
            <li key={ent.siren} onClick={() => handleSuggestionClick(ent.siren)}>
              {ent.denomination || ent.nom || ent.raisonSociale || ent.siren}
            </li>
          ))}
        </ul>
      )}

      {infos && (
        <div className="results">
          <h3>Fiche entreprise</h3>
          <FilteredObjectListView data={infos} />
          {verification && <p className="vat">{verification}</p>}
        </div>
      )}
    </div>
  );
}
