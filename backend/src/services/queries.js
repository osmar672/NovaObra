export {
  validDate,
  dates,
  readSnapshot,
  listRecords,
  exportColumns,
} from "../models/shared/queries.js";

export function csvContent(rows, columns = Object.keys(rows[0] || {})) {
  const cell = (value) => {
    let string = value == null ? "" : String(value);
    if (
      typeof value === "string" &&
      (/^[\s]*[=+\-@]/.test(string) || /^[\t\r\n]/.test(string))
    )
      string = "'" + string;
    return '"' + string.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      columns.map(cell).join(","),
      ...rows.map((row) =>
        columns.map((column) => cell(row[column])).join(","),
      ),
    ].join("\r\n") +
    "\r\n"
  );
}
export function sendCSV(res, filename, rows, columns) {
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", `attachment; filename="${filename}.csv"`);
  res.send(csvContent(rows, columns));
}
