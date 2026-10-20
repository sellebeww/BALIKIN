/** Quote CSV and neutralize spreadsheet formula injection in user-provided labels. */
export function csv(rows: (string | number | null | undefined)[][]): string {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = value == null ? "" : String(value);
            if (typeof value === "string" && /^[\s]*[=+@-]/.test(text))
              text = "'" + text;
            return `"${text.replaceAll('"', '""')}"`;
          })
          .join(","),
      )
      .join("\r\n")
  );
}
