const fs = require('fs');
const buf = fs.readFileSync('Buildverse.pdf');
const str = buf.toString('latin1');
// Extract readable text runs from PDF binary
const matches = str.match(/[\x20-\x7E\n\r]{15,}/g) || [];
const text = matches.filter(m => m.trim().length > 10).join('\n');
fs.writeFileSync('extracted_pdf.txt', text, 'utf8');
console.log('Done, length:', text.length);
