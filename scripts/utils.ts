const ST = "(?:\\u0007|\\u001B\\u005C|\\u009C)";
const OSC = `(?:(?:\\u001B\\]|\\u009D)[^\\u0007\\u001B\\u009C\\u009D]*${ST})`;
const CSI =
  "[\\u001B\\u009B][[\\]()#;?]*(?:\\d{1,4}(?:[;:]\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]";

export const ANSI_REGEX = new RegExp(`${OSC}|${CSI}`, "gu");
