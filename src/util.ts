import fs from "node:fs";

export function getChar() {
  let buffer = Buffer.alloc(1);
  fs.readSync(0, buffer, 0, 1, null);
  return buffer.readUInt8(0);
}
