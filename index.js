'use strict';

const EventEmitter = require('events');
const Speech = require('@google-cloud/speech');
const util = require('util');

function GoogleSpeech(config, settings) {
  const speechClient = Speech({
    projectId: config.projectId,
  });

  const request = {
    config: {
      encoding: 'LINEAR16',
      sampleRate: 16000,
      maxAlternatives: 1,
      // https://cloud.google.com/speech/docs/languages
      languageCode: config.languageCode || 'en-US',
    },
    interimResults: true,
    singleUtterance: true,
    verbose: true,
  };

  let recognizeStream = undefined;

  this.init = () => {
    this.emit('subscribe', {
      'audio-input': {
        start: this.start,
        data: this.write,
      },
    });
  };

  this.start = () => {
    recognizeStream = speechClient.createRecognizeStream(request)
      .on('error', error => this.emit('error', error))
      .on('data', (data) => {
        if (data && data.results && data.endpointerType === 'ENDPOINTER_EVENT_UNSPECIFIED') {
          let isFinal = false;
          let transcription = '';

          data.results.forEach((result) => {
            isFinal = result.isFinal;
            transcription += result.transcript;
          });

          this.emit(isFinal ? 'transcription-complete' : 'transcription-update', transcription);
          if (isFinal) {
            recognizeStream.end();
            recognizeStream = undefined;
          }
        }
      });
    this.emit('listening');
  };

  this.write = (data) => {
    if (recognizeStream !== undefined) recognizeStream.write(data);
  };

  return this;
}

util.inherits(GoogleSpeech, EventEmitter);
module.exports = GoogleSpeech;
