type RowObject = Record<string, string | number | null | undefined>;

type Props = {
  headers: string[];
  rows: RowObject[];
};

export function ReadOnlyGrid({ headers, rows }: Props) {
  return (
    <section className="overflow-auto rounded-xl border border-slate-300 bg-white shadow-inner dark:border-slate-700 dark:bg-slate-900">
      <table className="min-w-[900px] border-collapse text-sm">
        <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <tr className="border-b border-slate-300 dark:border-slate-700">
            <th className="sticky left-0 top-0 z-20 border border-slate-300 bg-slate-200 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide dark:border-slate-600 dark:bg-slate-700">
              #
            </th>
            {headers.map((header) => (
              <th
                key={header}
                className="border border-slate-300 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide dark:border-slate-600"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                className="border border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300"
                colSpan={headers.length + 1}
              >
                No data to display
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-slate-200 bg-white odd:bg-white even:bg-slate-50 hover:bg-emerald-50/60 dark:border-slate-700 dark:bg-slate-900 dark:even:bg-slate-900/40 dark:hover:bg-slate-800"
              >
                <th className="sticky left-0 z-10 border border-slate-300 bg-slate-100 px-4 py-2 text-center text-xs font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  {rowIndex + 1}
                </th>
                {headers.map((header) => {
                  const value = row[header];
                  return (
                    <td key={`${rowIndex}-${header}`} className="border border-slate-200 px-4 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                      {value === null || value === undefined || value === '' ? '-' : String(value)}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
