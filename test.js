const record = require('node-record-lpcm16');
const speech = new GoogleSpeech({projectId: ''}); // your google project id

const mic = record.start({
  sampleRate: 16000,
  threshold: 0,
});
mic.on('data', speech.write);

speech.start();
console.log('Say some stuff');
speech.on('transcription-update', console.log);
speech.on('transcription-complete', data => console.log('ALL DONE!', data));
