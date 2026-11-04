import React from "react";
import ApplicationShell from "./components/layout/ApplicationShell.jsx";
import Receipt from "./components/sales/Receipt.jsx";
import DashboardPage from "./pages/dashboard/DashboardPage.jsx";
import ReportesPage from "./pages/reportes/ReportesPage.jsx";
import useAdministration from "./hooks/useAdministration.js";

export default function App() {
  const controller = useAdministration();
  const {
    page,
    definition,
    dashboard,
    lowStock,
    navigate,
    exportFile,
    report,
    reportRange,
    setReportRange,
    loading,
    busy,
    reportQuery,
    receipt,
    setReceipt,
  } = controller;
  const EntityPage = definition?.Component;
  return (
    <ApplicationShell controller={controller}>
      {page === "dashboard" ? (
        <DashboardPage
          dashboard={dashboard}
          lowStock={lowStock}
          busy={busy}
          navigate={navigate}
          exportFile={exportFile}
        />
      ) : page === "reportes" ? (
        <ReportesPage
          data={report}
          range={reportRange}
          onRangeChange={setReportRange}
          loading={loading}
          busy={busy}
          onExport={() =>
            exportFile(
              `reportes/exportar.csv?${reportQuery}`,
              "NovaObra_Reportes.csv",
            )
          }
        />
      ) : EntityPage ? (
        <EntityPage controller={controller} />
      ) : null}
      {receipt && <Receipt data={receipt} onClose={() => setReceipt(null)} />}
    </ApplicationShell>
  );
}
