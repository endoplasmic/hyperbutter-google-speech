'use strict';

const EventEmitter = require('events');
const Speech = require('@google-cloud/speech');
const util = require('util');
const path = require('path');
const fs = require('fs');

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
    verbose: false,
  };

  let recognizeStream;

  this.init = () => {
    this.emit('subscribe', {
      start: this.start,
      write: this.write,
      'audio-input': {
        started: this.start,
        data: this.write,
      },
    });
  };

  this.start = (callback) => {
    // make sure we don't have another one going
    if (recognizeStream) {
      this.stop();
      this.emit('abort');
      return;
    }

    let isFinal = false;

    recognizeStream = speechClient.createRecognizeStream(request)
      .on('error', (error) => {
        this.emit('error', error);
        if (callback) callback(error);
      })
      .on('data', (data) => {
        if (data && data.results && data.endpointerType === 'ENDPOINTER_EVENT_UNSPECIFIED') {
          let transcription = '';

          if (Array.isArray(data.results)) {
            data.results.forEach((result) => {
              isFinal = result.isFinal;
              transcription += result.transcript;
            });
          } else {
            transcription = data.results;
          }

          if (isFinal) this.emit('transcription-complete', transcription);
          else this.emit('transcription-update', transcription);

          if (isFinal) {
            this.stop();
            this.emit('status', `Heard: ${transcription}`);
          }

          if (callback) callback(null, { transcription, isFinal });
        } else if (data.endpointerType === 'END_OF_AUDIO') {
          isFinal = true;
        }
      });

    this.emit('listening');
  };

  this.write = (data) => {
    if (recognizeStream !== undefined) {
      recognizeStream.write(data);
    }
  };

  this.stop = () => {
    this.emit('audio-input.stop');

    if (recognizeStream !== undefined) {
      recognizeStream.end();
      recognizeStream = undefined;
    }
  };

  return this;
}

util.inherits(GoogleSpeech, EventEmitter);
module.exports = GoogleSpeech;
