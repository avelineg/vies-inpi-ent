import React, { useState } from "react";
import "./styles.css";
import EtablissementView from "./components/EtablissementView";
import { fetchEtablissementData } from "./logic/mapping";

export default function App() {
  const [input, setInput] = useState("");
  const [etabData, setEtabData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setErreur(null);
    setEtabData(null);
    try {
      const data = await fetchEtablissementData(input);
      setEtabData(data);
    } catch (e: any) {
      setErreur(e.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2 className="titre">🔍 Recherche (SIRET ou SIREN)</h2>
      <div className="controls">
        <input
          className="input"
          placeholder="SIRET/SIREN"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button className="btn" onClick={handleSearch} disabled={loading}>
          {loading ? "..." : "Rechercher"}
        </button>
      </div>
      {erreur && <div className="error">{erreur}</div>}
      {etabData && <EtablissementView etab={etabData} />}
    </div>
  );
}
