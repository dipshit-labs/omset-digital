import { http, HttpResponse } from "msw";

export const resendHandlers = [
  http.post("https://api.resend.com/emails", () => {
    const id = `re_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    return HttpResponse.json({ id }, { status: 200 });
  }),
];
