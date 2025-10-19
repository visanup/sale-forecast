type RowObject = Record<string, string | number | null | undefined>;

type Props = {
  headers: string[];
  rows: RowObject[];
  onEdit: (rowIndex: number, key: string, value: string) => void;
};

export function EditableGrid({ headers, rows, onEdit }: Props) {
  return (
    <section className="overflow-auto rounded-xl border border-slate-300 bg-white shadow-inner dark:border-slate-700 dark:bg-slate-900">
      <table className="min-w-[900px] border-collapse text-sm">
        <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <tr className="border-b border-slate-300 dark:border-slate-700">
            <th className="sticky left-0 top-0 z-20 border border-slate-300 bg-slate-200 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide dark:border-slate-600 dark:bg-slate-700">
              #
            </th>
            {headers.map(h => (
              <th
                key={h}
                className="border border-slate-300 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide dark:border-slate-600"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className="border-b border-slate-200 bg-white odd:bg-white even:bg-slate-50 hover:bg-emerald-50/60 dark:border-slate-700 dark:bg-slate-900 dark:even:bg-slate-900/40 dark:hover:bg-slate-800"
            >
              <th className="sticky left-0 z-10 border border-slate-300 bg-slate-100 px-4 py-2 text-center text-xs font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                {rIdx + 1}
              </th>
              {headers.map(h => (
                <td key={`${rIdx}-${h}`} className="border border-slate-200 px-0 dark:border-slate-700">
                  <input
                    className="w-full border-none bg-transparent px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/70 dark:text-slate-200 dark:focus:ring-emerald-400/60"
                    value={row[h] === null || row[h] === undefined ? '' : String(row[h])}
                    onChange={e => onEdit(rIdx, h, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

