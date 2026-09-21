export type UniversalBlockType = "richText" | "table" | "media";

export interface UniversalRichTextBlockData {
  blockType: "richText";
  content: unknown;
}

export interface UniversalTableRow {
  label: string;
  value: string;
}

export interface UniversalTableBlockData {
  blockType: "table";
  rows: UniversalTableRow[];
  title?: string;
}

export interface UniversalMediaBlockData {
  blockType: "media";
  caption?: string;
  media: unknown;
}

export type UniversalBlockData =
  | UniversalRichTextBlockData
  | UniversalTableBlockData
  | UniversalMediaBlockData;
