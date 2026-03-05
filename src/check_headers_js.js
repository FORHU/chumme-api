const https = require('https');

const url = 'https://d1lq91nbxprxl1.cloudfront.net/uploads/1772171685943-6089fbd3481e16ad.mp3';

https.request(url, { method: 'GET' }, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  res.on('data', (chunk) => {
    console.log('Received chunk of size:', chunk.length);
    res.destroy(); // Just one chunk is enough
  });
}).on('error', (e) => {
  console.error(e);
}).end();
