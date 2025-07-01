import axios from "axios";

// APIs (adapter les URLs si besoin)
const API_SIRENE = "https://api.insee.fr/entreprises/sirene/V3.11";
const API_GEO = "https://api-adresse.data.gouv.fr/search/";
const API_INPI = import.meta.env.VITE_API_URL + "/inpi/entreprise/"; // backend proxy INPI attendu
const API_VIES = import.meta.env.VITE_VAT_API_URL + "/check-vat";    // backend proxy VIES attendu

/**
 * Récupère et normalise les données pour l'affichage à la Annuaire-Entreprises.
 */
export async function fetchEtablissementData(siretOrSiren: string) {
  let etab, uniteLegale, secondaires, geo, tvaInfo, inpiInfo;
  let siret = siretOrSiren, siren = "";

  const SIRENE_API_KEY = import.meta.env.VITE_SIRENE_API_KEY;

  // 1. Recherche SIRENE
  if (/^\d{14}$/.test(siretOrSiren)) {
    const { data } = await axios.get(`${API_SIRENE}/siret/${siretOrSiren}`, {
      headers: { Authorization: `Bearer ${SIRENE_API_KEY}` }
    });
    etab = data.etablissement;
    siren = etab.siren;
  } else if (/^\d{9}$/.test(siretOrSiren)) {
    const { data } = await axios.get(`${API_SIRENE}/siren/${siretOrSiren}`, {
      headers: { Authorization: `Bearer ${SIRENE_API_KEY}` }
    });
    uniteLegale = data.uniteLegale;
    siren = uniteLegale.siren;
    // On va chercher l’établissement principal
    const { data: dataEtab } = await axios.get(`${API_SIRENE}/siren/${siren}/etablissements`, {
      headers: { Authorization: `Bearer ${SIRENE_API_KEY}` },
      params: { etatAdministratifEtablissement: "A", limit: 1 }
    });
    etab = dataEtab.etablissements[0];
  } else {
    throw new Error("Merci de fournir un SIRET ou SIREN valide.");
  }

  // 2. Unité légale si manquante
  if (!uniteLegale) {
    const { data } = await axios.get(`${API_SIRENE}/siren/${siren}`, {
      headers: { Authorization: `Bearer ${SIRENE_API_KEY}` }
    });
    uniteLegale = data.uniteLegale;
  }

  // 3. Établissements secondaires (autres que le principal)
  const { data: dataSec } = await axios.get(`${API_SIRENE}/siren/${siren}/etablissements`, {
    headers: { Authorization: `Bearer ${SIRENE_API_KEY}` },
    params: { etatAdministratifEtablissement: "A", limit: 20 }
  });
  secondaires = (dataSec.etablissements || [])
    .filter((e: any) => e.siret !== etab.siret)
    .map((e: any) => ({
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

  // 4. Géocodage adresse principale
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
    } catch (e) {/* ignore géocodage */}
  }

  // 5. Numéro TVA (VIES)
  tvaInfo = null;
  if (siren) {
    const tvaNum = calculateTvaKey(siren);
    try {
      const { data: vies } = await axios.get(`${API_VIES}?countryCode=FR&vatNumber=${tvaNum.slice(2)}`);
      tvaInfo = { numero: tvaNum, valide: vies.valid };
    } catch (e) {
      tvaInfo = { numero: tvaNum, valide: null };
    }
  }

  // 6. INPI (formalités, dirigeants, historique)
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
  } catch (e) {
    inpiInfo = { dirigeants: [], formalites: [], historique: [] };
  }

  // 7. Mapping final pour EtablissementView
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
