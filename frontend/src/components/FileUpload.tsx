type Props = {
  accept?: string;
  onFile: (file: File) => void;
  label?: string;
};

export function FileUpload({ accept = '.xlsx,.xls', onFile, label = 'Select Excel File' }: Props) {
  return (
    <label className="btn-primary cursor-pointer w-fit">
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.currentTarget.value = '';
        }}
      />
      {label}
    </label>
  );
}


