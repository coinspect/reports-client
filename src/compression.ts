import * as pako from 'pako'

export const decompressArrayBuffer = (arrayBuffer: ArrayBuffer): ArrayBuffer => {
  // Convert ArrayBuffer to Uint8Array
  const uint8Array = new Uint8Array(arrayBuffer)

  // Decompress the Uint8Array using 'pako'
  const decompressedData = pako.ungzip(uint8Array)

  // Convert the decompressed Uint8Array back to ArrayBuffer and return it
  return decompressedData.buffer
}

export const compressArrayBuffer = (arrayBuffer: ArrayBuffer): Uint8Array => {
  // Convert ArrayBuffer to Uint8Array
  const uint8Array = new Uint8Array(arrayBuffer)

  // Compress the Uint8Array using 'pako'
  const compressedData = pako.gzip(uint8Array)

  // Return the compressed Uint8Array
  return compressedData
}