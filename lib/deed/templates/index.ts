import type { DeedType } from "../schema";
import { shopTemplate } from "./shop";
import type { DeedTemplate } from "./types";

// Room / flat deed template is added in the next chunk.
const roomTemplate: DeedTemplate = {
  title: "ফ্ল্যাট / রুম ভাড়ার চুক্তিপত্র",
  complete: false,
  blocks: [],
};

export function getTemplate(type: DeedType): DeedTemplate {
  return type === "shop" ? shopTemplate : roomTemplate;
}
