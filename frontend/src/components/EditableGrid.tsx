type RowObject = Record<string, string | number | null>;

type Props = {
  headers: string[];
  rows: RowObject[];
  onEdit: (rowIndex: number, key: string, value: string) => void;
};

export function EditableGrid({ headers, rows, onEdit }: Props) {
  return (
    <section className="card p-4 overflow-auto">
      <div className="min-w-[900px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-neutral-200 dark:border-neutral-800">
              {headers.map(h => (
                <th key={h} className="py-2 pr-4 font-semibold text-neutral-700 dark:text-neutral-300">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-neutral-100 dark:border-neutral-800/60 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40">
                {headers.map(h => (
                  <td key={h} className="py-1 pr-4">
                    <input
                      className="input px-2 py-1 text-sm"
                      value={String(row[h] ?? '')}
                      onChange={e => onEdit(rIdx, h, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


