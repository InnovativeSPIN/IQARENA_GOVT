const fs = require('fs');
const http = require('http');

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const filePath = '../socila.csv';
const fileContent = fs.readFileSync(filePath);

let postData = '--' + boundary + '\r\n';
postData += 'Content-Disposition: form-data; name="file"; filename="socila.csv"\r\n';
postData += 'Content-Type: text/csv\r\n\r\n';

let postDataEnd = '\r\n--' + boundary + '--\r\n';

const options = {
  hostname: 'localhost',
  port: 3010,
  path: '/api/admin/questions/bulk-upload',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': Buffer.byteLength(postData) + fileContent.length + Buffer.byteLength(postDataEnd)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
  process.exit(1);
});

req.write(postData);
req.write(fileContent);
req.write(postDataEnd);
req.end();
