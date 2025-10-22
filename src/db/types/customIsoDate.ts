import { customType } from "drizzle-orm/sqlite-core";

export const customIsoDate = customType<{ data: Date }>({
  dataType() {
    return "text";
  },
  toDriver(value) {
    return value.toISOString();
  },
  fromDriver(value) {
    return new Date(value as string);
  },
});
