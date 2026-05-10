/* global globalThis */

const getRandomValues =
  globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function'
    ? globalThis.crypto.getRandomValues.bind(globalThis.crypto)
    : null;

function randomBytes(size) {
  const bytes = new Uint8Array(size);

  if (getRandomValues) {
    return getRandomValues(bytes);
  }

  for (let i = 0; i < size; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }

  return bytes;
}

module.exports = {randomBytes};
module.exports.default = module.exports;
