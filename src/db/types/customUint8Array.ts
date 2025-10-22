import { customType } from "drizzle-orm/sqlite-core";
import { Buffer } from "node:buffer";

const customUint8Array = customType<{ data: Uint8Array }>({
  dataType() {
    return "blob";
  },
  fromDriver(value) {
    const typedValue = value as Buffer<ArrayBufferLike>;
    return new Uint8Array(typedValue);
  },
  toDriver(value) {
    return Buffer.from(value);
  },
});

export default customUint8Array;
