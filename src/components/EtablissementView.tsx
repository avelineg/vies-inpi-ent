import React from "react";
import CarteAdresse from "./CarteAdresse";

export default function EtablissementView({ etab }: { etab: any }) {
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
            {etab.representants.map((r: any, i: number) => (
              <li key={i}>
                {r.nom} {r.prenom} {r.qualite ? `— ${r.qualite}` : ""}
              </li>
            ))}
          </ul>
        </>
      )}
      {etab.formalites && etab.formalites.length > 0 && (
        <>
          <h2>Formalités récentes</h2>
          <ul>
            {etab.formalites.map((f: any, i: number) => (
              <li key={i}>
                {f.type} – {f.date} {f.description ? `: ${f.description}` : ""}
              </li>
            ))}
          </ul>
        </>
      )}
      {etab.historique && etab.historique.length > 0 && (
        <>
          <h2>Historique</h2>
          <ul>
            {etab.historique.map((h: any, i: number) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </>
      )}
      {etab.etablissements_secondaires?.length > 0 && (
        <>
          <h2>Autres établissements</h2>
          <ul>
            {etab.etablissements_secondaires.map((e: any) => (
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
