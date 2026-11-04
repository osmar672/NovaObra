import React from "react";
import RecordsPage from "../components/records/RecordsPage.jsx";

// Entity schemas drive the shared list and editor without duplicating CRUD UI.
export function defineEntityPage(definition) {
  function EntityPage({ controller }) {
    return <RecordsPage controller={controller} />;
  }
  EntityPage.displayName = `${definition.resource}Page`;
  return { ...definition, Component: EntityPage };
}
