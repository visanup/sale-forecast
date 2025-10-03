// src/components/FileUpload.tsx

type Props = {
  accept?: string;
  onFile: (file: File) => void | Promise<void>; // เผื่อกรณี onFile เป็น async
  label?: string;
  className?: string;                             // ✅ เพิ่ม
};

export function FileUpload({
  accept = '.xlsx,.xls',
  onFile,
  label = 'Select Excel File',
  className,                                      // ✅ รับเข้ามา
}: Props) {
  const base = 'btn-primary cursor-pointer w-fit'; // ค่าดั้งเดิมคงไว้

  return (
    <label className={`${base}${className ? ` ${className}` : ''}`}> {/* ✅ รวมคลาส */}
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.currentTarget.value = ''; // reset ให้เลือกไฟล์เดิมซ้ำได้
        }}
      />
      {label}
    </label>
  );
}
