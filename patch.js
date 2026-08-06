const fs = require('fs');
const reportsTab = fs.readFileSync('src/tabs/ReportsTab.tsx', 'utf-8');
const extracted = fs.readFileSync('extracted_report.tsx', 'utf-8');

const updated = reportsTab.replace('<>\r\n\r\n    </>', extracted).replace('<>\n\n    </>', extracted);
fs.writeFileSync('src/tabs/ReportsTab.tsx', updated);
console.log('patched');
