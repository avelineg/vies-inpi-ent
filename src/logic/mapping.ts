import axios from "axios";

const API_SIRENE = "https://api.insee.fr/api-sirene/3.11";
const API_GEO = "https://api-adresse.data.gouv.fr/search/";
const API_INPI = import.meta.env.VITE_API_URL + "/inpi/entreprise/";
const API_VIES = import.meta.env.VITE_VAT_API_URL + "/check-vat";

export async function fetchEtablissementData(siretOrSiren: string) {
  let etab = null, uniteLegale = null, secondaires = [], geo = null, tvaInfo = null, inpiInfo = {};
  let siret = siretOrSiren, siren = "";

  const SIRENE_API_KEY = import.meta.env.VITE_SIRENE_API_KEY;

  // Recherche SIRET ou SIREN selon format
  if (/^\d{14}$/.test(siretOrSiren)) {
    // Recherche établissement par SIRET
    try {
      const { data } = await axios.get(
        `${API_SIRENE}/etablissements`,
        {
          headers: { "X-INSEE-Api-Key-Integration": SIRENE_API_KEY },
          params: { siret: siretOrSiren }
        }
      );
      etab = data.etablissements?.[0] || null;
      if (!etab) throw new Error("Aucun établissement trouvé pour ce SIRET.");
      siren = etab.siren;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        throw new Error("Aucun établissement trouvé pour ce SIRET.");
      }
      throw error;
    }
  } else if (/^\d{9}$/.test(siretOrSiren)) {
    // Recherche unité légale par SIREN
    try {
      const { data } = await axios.get(
        `${API_SIRENE}/unites_legales`,
        {
          headers: { "X-INSEE-Api-Key-Integration": SIRENE_API_KEY },
          params: { siren: siretOrSiren }
        }
      );
      uniteLegale = data.unites_legales?.[0] || null;
      if (!uniteLegale) throw new Error("Aucune unité légale trouvée pour ce SIREN.");
      siren = uniteLegale.siren;

      // Recherche l’établissement principal
      const { data: dataEtab } = await axios.get(
        `${API_SIRENE}/etablissements`,
        {
          headers: { "X-INSEE-Api-Key-Integration": SIRENE_API_KEY },
          params: {
            siren,
            etatAdministratifEtablissement: "A",
            typeEtablissement: "P",
            nombre: 1
          }
        }
      );
      etab = dataEtab.etablissements?.[0] || null;
      if (!etab) throw new Error("Aucun établissement principal trouvé pour ce SIREN.");
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        throw new Error("Aucune unité légale trouvée pour ce SIREN.");
      }
      throw error;
    }
  } else {
    throw new Error("Merci de fournir un SIRET ou SIREN valide.");
  }

  // Si on a l'établissement, on récupère l'unité légale associée si besoin
  if (!uniteLegale && siren) {
    try {
      const { data } = await axios.get(
        `${API_SIRENE}/unites_legales`,
        {
          headers: { "X-INSEE-Api-Key-Integration": SIRENE_API_KEY },
          params: { siren }
        }
      );
      uniteLegale = data.unites_legales?.[0] || null;
      if (!uniteLegale) throw new Error("Unité légale absente.");
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        throw new Error("Unité légale absente.");
      }
      throw error;
    }
  }

  // Recherche établissements secondaires
  if (siren) {
    try {
      const { data: dataSec } = await axios.get(
        `${API_SIRENE}/etablissements`,
        {
          headers: { "X-INSEE-Api-Key-Integration": SIRENE_API_KEY },
          params: {
            siren,
            etatAdministratifEtablissement: "A",
            typeEtablissement: "S",
            nombre: 20
          }
        }
      );
      secondaires = (dataSec.etablissements || []).map((e: any) => ({
        siret: e.siret,
        denomination: e.denominationEtablissement || e.uniteLegale?.denominationUniteLegale || "",
        adresse: [
          e.numeroVoieEtablissement,
          e.typeVoieEtablissement,
          e.libelleVoieEtablissement,
          e.complementAdresseEtablissement,
          e.codePostalEtablissement,
          e.libelleCommuneEtablissement
        ].filter(Boolean).join(" ")
      }));
    } catch {
      secondaires = [];
    }
  }

  // Géocodage adresse principale
  let adresse = [
    etab.numeroVoieEtablissement,
    etab.typeVoieEtablissement,
    etab.libelleVoieEtablissement,
    etab.complementAdresseEtablissement,
    etab.codePostalEtablissement,
    etab.libelleCommuneEtablissement
  ].filter(Boolean).join(" ");
  geo = null;
  if (adresse) {
    try {
      const { data: geoData } = await axios.get(API_GEO, { params: { q: adresse, limit: 1 } });
      if (geoData.features?.[0]?.geometry?.coordinates) {
        geo = {
          lon: geoData.features[0].geometry.coordinates[0],
          lat: geoData.features[0].geometry.coordinates[1]
        };
      }
    } catch { /* ignore géocodage si erreur */ }
  }

  // Numéro TVA (VIES)
  tvaInfo = null;
  if (siren) {
    const tvaNum = calculateTvaKey(siren);
    try {
      const { data: vies } = await axios.get(`${API_VIES}?countryCode=FR&vatNumber=${tvaNum.slice(2)}`);
      tvaInfo = { numero: tvaNum, valide: vies.valid };
    } catch {
      tvaInfo = { numero: tvaNum, valide: null };
    }
  }

  // INPI (formalités, dirigeants, historique)
  inpiInfo = {};
  try {
    const { data: inpi } = await axios.get(`${API_INPI}${siren}`);
    inpiInfo = {
      dirigeants: (inpi.representants || []).map((dir: any) => ({
        nom: dir.nom,
        prenom: dir.prenom,
        qualite: dir.qualite
      })),
      formalites: inpi.formalites || [],
      historique: inpi.historique || []
    };
  } catch {
    inpiInfo = { dirigeants: [], formalites: [], historique: [] };
  }

  // Résultat final
  return {
    siret: etab.siret,
    denomination: etab.denominationEtablissement || uniteLegale.denominationUniteLegale,
    adresse,
    code_ape: etab.activitePrincipaleEtablissement,
    libelle_ape: etab.libelleActivitePrincipaleEtablissement,
    forme_juridique: uniteLegale?.categorieJuridiqueUniteLegale,
    date_creation: etab.dateCreationEtablissement,
    unite_legale: {
      siren: uniteLegale.siren,
      denomination: uniteLegale.denominationUniteLegale,
      forme_juridique: uniteLegale.categorieJuridiqueUniteLegale
    },
    etablissements_secondaires: secondaires,
    geo,
    tva: tvaInfo,
    representants: inpiInfo.dirigeants || [],
    formalites: inpiInfo.formalites || [],
    historique: inpiInfo.historique || []
  };
}

// Calcul clé TVA à partir du SIREN
function calculateTvaKey(siren: string): string {
  const key = (12 + 3 * (Number(siren) % 97)) % 97;
  return `FR${key.toString().padStart(2, "0")}${siren}`;
}
