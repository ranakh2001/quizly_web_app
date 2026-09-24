import ExcelJS from 'exceljs';
import { parse } from 'csv-parse/sync';
import { badRequest } from '../../shared/errors.js';

// Parses a .csv or .xlsx file buffer into { headers, rows }, where each row is a plain
// object keyed by the (trimmed, lowercased) header - so callers never deal with the file
// format directly. Handles UTF-8 CSV with or without a BOM, and the first worksheet of an
// .xlsx workbook. Row objects only cover the header row's columns.
export async function parseSpreadsheet(buffer, filename) {
  const extension = filename.split('.').pop()?.toLowerCase();

  if (extension === 'csv') return parseCsv(buffer);
  if (extension === 'xlsx') return parseXlsx(buffer);
  throw badRequest('File must be a .csv or .xlsx file');
}

function parseCsv(buffer) {
  let rawRows;
  try {
    rawRows = parse(buffer, { bom: true, trim: true, skip_empty_lines: true });
  } catch (error) {
    throw badRequest(`Could not parse CSV file: ${error.message}`);
  }
  if (rawRows.length === 0) return { headers: [], rows: [] };

  const headers = rawRows[0].map((header) => header.trim().toLowerCase());
  const rows = rawRows.slice(1).map((line) => toRecord(headers, (index) => line[index]));
  return { headers, rows };
}

async function parseXlsx(buffer) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch (error) {
    throw badRequest(`Could not parse Excel file: ${error.message}`);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw badRequest('The workbook has no worksheets');

  const headers = [];
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? '')
      .trim()
      .toLowerCase();
  });

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = toRecord(headers, (colNumber) => row.getCell(colNumber).value);
    if (Object.values(record).some((value) => value !== '')) rows.push(record);
  });

  return { headers: headers.filter(Boolean), rows };
}

// headers is a sparse array here (xlsx columns are 1-indexed); getValue receives the same
// index used to build headers so both callers can share this.
function toRecord(headers, getValue) {
  const record = {};
  headers.forEach((header, index) => {
    if (!header) return;
    const raw = getValue(index);
    record[header] = raw == null ? '' : String(raw).trim();
  });
  return record;
}
