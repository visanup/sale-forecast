import xlsx from 'xlsx';

const rows = [
  {
    company_code: 'ACME',
    dept_code: 'D01',
    dc_code: 'DC1',
    Division: 'DIV',
    'Sales Organization': 'SO',
    'Sales Office': 'SOFF',
    'Sales Group': 'SG',
    'Sales Representative': 'SR',
    'SAP Code': 'MAT001',
    material_desc: 'Product A',
    'Pack Size': '1L',
    uom_code: 'EA',
    n: 100,
    Price: 9.99
  }
];

const ws = xlsx.utils.json_to_sheet(rows);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
xlsx.writeFile(wb, 'sample_upload.xlsx');
console.log('Wrote sample_upload.xlsx');


