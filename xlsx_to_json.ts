import * as XLSX from 'xlsx';
import * as fs from 'fs';

interface DataRow {
  Time: string;
  Temperature: number;
  DO: number;
  pH: number;
  Ammonia: number;
}

function excelTimeToHHMMSS(excelDecimal: number): string {
  const totalSeconds = excelDecimal * 86400; // 24*60*60
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function processExcelFile(filePath: string): DataRow[] {
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  const data: DataRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    data.push({
      Time: excelTimeToHHMMSS(row[0]), // Convert Excel decimal to time string
      Temperature: row[1],
      DO: row[5],
      pH: row[9],
      Ammonia: row[13]
    });
  }

  return data;
}

const jsonData = processExcelFile('DO,PH,TEMP,AMMONIA DATA.xlsx');
fs.writeFileSync('output.json', JSON.stringify(jsonData, null, 2));
console.log('Data processed and saved to output.json');