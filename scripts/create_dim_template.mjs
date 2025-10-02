import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create workbook
const workbook = XLSX.utils.book_new();

// Define the schema structure based on dim-service schema
const schemas = {
  'dim_company': {
    headers: ['company_code', 'company_desc'],
    description: 'Company Master Data',
    sampleData: [
      ['COMP001', 'Sample Company 1'],
      ['COMP002', 'Sample Company 2'],
      ['COMP003', 'Sample Company 3']
    ]
  },
  'dim_dept': {
    headers: ['dept_code'],
    description: 'Department Master Data',
    sampleData: [
      ['DEPT001'],
      ['DEPT002'],
      ['DEPT003']
    ]
  },
  'dim_distribution_channel': {
    headers: ['dc_code', 'dc_desc'],
    description: 'Distribution Channel Master Data',
    sampleData: [
      ['DC001', 'Direct Sales'],
      ['DC002', 'Retail Channel'],
      ['DC003', 'Online Channel']
    ]
  },
  'dim_material': {
    headers: ['material_code', 'material_desc'],
    description: 'Material Master Data',
    sampleData: [
      ['MAT001', 'Product A'],
      ['MAT002', 'Product B'],
      ['MAT003', 'Product C']
    ]
  },
  'dim_uom': {
    headers: ['uom_code'],
    description: 'Unit of Measure Master Data',
    sampleData: [
      ['PCS'],
      ['KG'],
      ['L'],
      ['M']
    ]
  },
  'dim_sku': {
    headers: ['material_code', 'pack_size', 'uom_code'],
    description: 'SKU Master Data (Note: material_code and uom_code must exist in respective tables)',
    sampleData: [
      ['MAT001', '1', 'PCS'],
      ['MAT001', '10', 'PCS'],
      ['MAT002', '500', 'KG'],
      ['MAT003', '1', 'L']
    ]
  },
  'dim_sales_org': {
    headers: ['division', 'sales_organization', 'sales_office', 'sales_group', 'sales_representative'],
    description: 'Sales Organization Master Data',
    sampleData: [
      ['DIV001', 'SO001', 'OFF001', 'GRP001', 'REP001'],
      ['DIV001', 'SO001', 'OFF001', 'GRP002', 'REP002'],
      ['DIV002', 'SO002', 'OFF002', 'GRP003', 'REP003']
    ]
  },
  'dim_month': {
    headers: ['month_id', 'yyyy_mm'],
    description: 'Month Master Data (month_id format: YYYY-MM-DD, yyyy_mm format: YYYY-MM)',
    sampleData: [
      ['2024-01-01', '2024-01'],
      ['2024-02-01', '2024-02'],
      ['2024-03-01', '2024-03']
    ]
  }
};

// Create worksheets for each schema
Object.entries(schemas).forEach(([tableName, config]) => {
  // Create data array with headers and sample data
  const data = [
    [`${config.description} - ${tableName}`],
    [''],
    config.headers,
    ...config.sampleData
  ];

  // Convert to worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  const colWidths = config.headers.map(header => ({
    wch: Math.max(header.length + 5, 15)
  }));
  worksheet['!cols'] = colWidths;

  // Style the header row (row 2, 0-indexed)
  const headerRow = 2;
  config.headers.forEach((header, colIndex) => {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: colIndex });
    if (!worksheet[cellAddress]) worksheet[cellAddress] = { v: header };
    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "366092" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
  });

  // Style the title row (row 0)
  const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (!worksheet[titleCell]) worksheet[titleCell] = { v: data[0][0] };
  worksheet[titleCell].s = {
    font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1F4E79" } },
    alignment: { horizontal: "center", vertical: "center" }
  };

  // Add the worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, tableName);
});

// Create instructions sheet
const instructionsData = [
  ['DIM SERVICE IMPORT TEMPLATE - INSTRUCTIONS'],
  [''],
  ['This template contains all the master data tables for the dim-service:'],
  [''],
  ['1. dim_company - Company master data'],
  ['2. dim_dept - Department master data'],
  ['3. dim_distribution_channel - Distribution channel master data'],
  ['4. dim_material - Material master data'],
  ['5. dim_uom - Unit of measure master data'],
  ['6. dim_sku - SKU master data (requires material_code and uom_code to exist)'],
  ['7. dim_sales_org - Sales organization master data'],
  ['8. dim_month - Month master data'],
  [''],
  ['IMPORTANT NOTES:'],
  ['- Each table is on a separate worksheet'],
  ['- Sample data is provided for reference'],
  ['- Remove sample data and add your actual data'],
  ['- For dim_sku: material_code and uom_code must exist in respective tables'],
  ['- For dim_month: month_id should be the first day of the month (YYYY-MM-DD)'],
  ['- yyyy_mm should be in YYYY-MM format'],
  ['- All codes should be unique within their respective tables'],
  [''],
  ['UPLOAD INSTRUCTIONS:'],
  ['1. Fill in your data in the appropriate worksheets'],
  ['2. Save the file as .xlsx format'],
  ['3. Upload through the Admin Import page'],
  ['4. The system will validate and import the data']
];

const instructionsWorksheet = XLSX.utils.aoa_to_sheet(instructionsData);
instructionsWorksheet['!cols'] = [{ wch: 80 }];

// Style the title
const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
instructionsWorksheet[titleCell].s = {
  font: { bold: true, size: 16, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "1F4E79" } },
  alignment: { horizontal: "center", vertical: "center" }
};

XLSX.utils.book_append_sheet(workbook, instructionsWorksheet, 'Instructions');

// Write the file
const outputPath = path.join(__dirname, '..', 'frontend', 'public', 'templates', 'dim-service-template.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log('✅ Excel template created successfully!');
console.log(`📁 Location: ${outputPath}`);
console.log('📋 Template includes all dim-service master data tables with sample data');
