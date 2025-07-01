import React from "react";
import CarteAdresse from "./CarteAdresse";

type Etab = {
  siret: string;
  denomination: string;
  adresse: string;
  code_ape: string;
  libelle_ape: string;
  forme_juridique: string;
  date_creation: string;
  unite_legale: {
    siren: string;
    denomination: string;
    forme_juridique: string;
  };
  etablissements_secondaires: {
    siret: string;
    denomination: string;
    adresse: string;
  }[];
  representants?: {
    nom: string; prenom: string; qualite?: string;
  }[];
  geo?: { lat: number; lon: number };
  tva?: { numero: string; valide: boolean };
};

export default function EtablissementView({ etab }: { etab: Etab }) {
  return (
    <div className="etab-card info-widget">
      <header>
        <h1 className="info-title">{etab.denomination}</h1>
        <span className="siret">{etab.siret}</span>
        <div style={{ margin: "0.3em 0 1em 0" }}>
          <a
            className="btn"
            href={`https://annuaire-entreprises.data.gouv.fr/entreprise/${etab.unite_legale?.siren}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Voir l’unité légale
          </a>
        </div>
      </header>
      <CarteAdresse
        lat={etab.geo?.lat || null}
        lon={etab.geo?.lon || null}
        label={etab.adresse}
      />
      <ul>
        <li><strong>Adresse :</strong> {etab.adresse}</li>
        <li><strong>Activité principale :</strong> {etab.code_ape} – {etab.libelle_ape}</li>
        <li><strong>Forme juridique :</strong> {etab.forme_juridique}</li>
        <li><strong>Date de création :</strong> {etab.date_creation}</li>
        {etab.tva && (
          <li>
            <strong>Numéro TVA :</strong> {etab.tva.numero}{" "}
            {etab.tva.valide === true ? "✅" : etab.tva.valide === false ? "❌" : ""}
          </li>
        )}
      </ul>
      {etab.representants && etab.representants.length > 0 && (
        <>
          <h2>Représentants</h2>
          <ul>
            {etab.representants.map((r, i) => (
              <li key={i}>
                {r.nom} {r.prenom} {r.qualite ? `— ${r.qualite}` : ""}
              </li>
            ))}
          </ul>
        </>
      )}
      {etab.etablissements_secondaires?.length > 0 && (
        <>
          <h2>Autres établissements</h2>
          <ul>
            {etab.etablissements_secondaires.map(e => (
              <li key={e.siret}>
                <a
                  href={`https://annuaire-entreprises.data.gouv.fr/etablissement/${e.siret}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {e.siret} – {e.denomination}
                </a>
                <br />
                <span style={{ fontSize: "0.96em", color: "#777" }}>{e.adresse}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
