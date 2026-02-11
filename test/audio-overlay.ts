import { overlayAudioFiles } from '../src/utils/audio.utils';
import path from 'path';

const file1 = 'https://d1lq91nbxprxl1.cloudfront.net/recordings/1770720908926-g80asnkr-recording-148F4187-EA0F-4C5E-A1B3-5220D0A0AE98.m4a';
const file2 = 'https://d1lq91nbxprxl1.cloudfront.net/recordings/1770720907899-exzuz346-recording-31758fa3-d2a5-4a0e-a243-5f21edc56b17.m4a';
const outputFile = path.join(__dirname, 'merged_test.m4a');

import fs from 'fs';

console.log('Starting audio overlay test...');

overlayAudioFiles([file1, file2])
  .then((buffer) => {
    console.log('Test passed: Audio files overlaid successfully.');
    fs.writeFileSync(outputFile, buffer);
    console.log('Output file saved to:', outputFile);
  })
  .catch((err) => {
    console.error('Test failed:', err);
  });
