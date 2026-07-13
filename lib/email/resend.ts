import "server-only";

import { Resend } from "resend";

import { requireEnv } from "@/lib/env";

let resendClient: Resend | undefined;

export function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(requireEnv("RESEND_API_KEY"));
  }

  return resendClient;
}
