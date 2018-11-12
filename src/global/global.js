/** Polyfill**/
import {Buffer} from 'buffer'

if(!window.global)
  window.global = window;

window.global.Buffer = Buffer;
// if(!window.global.Bufferuffer)
//    window.global.Buffer = global.Buffer || require('buffer').Buffer;

