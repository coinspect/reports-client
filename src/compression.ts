import * as zlib from 'zlib'

export const decompressArrayBuffer = (buffer: ArrayBuffer): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    // Decompress the Buffer using 'zlib'
    zlib.gunzip(buffer, (err, decompressedBuffer) => {
      if (err) {
        reject(err)
      } else {
        // Convert the decompressed Buffer back to ArrayBuffer and return it
        resolve(Uint8Array.from(decompressedBuffer).buffer)
      }
    })
  })
}

export const compressArrayBuffer = (buffer: ArrayBuffer): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    // Compress the Buffer using 'zlib'
    zlib.gzip(buffer, (err, compressedBuffer) => {
      if (err) {
        reject(err)
      } else {
        // Convert the compressed Buffer back to ArrayBuffer and return it
        resolve(Uint8Array.from(compressedBuffer))
      }
    })
  })
}