import React from "react";
import ObjectListView from "./ObjectListView";

const CompanyDetails = ({ companyData }) => {
  if (!companyData) return null;
  return (
    <div>
      <h2>Fiche entreprise</h2>
      <ObjectListView data={companyData} />
    </div>
  );
};

export default CompanyDetails;