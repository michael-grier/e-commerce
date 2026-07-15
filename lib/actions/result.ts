import type { z } from "zod";

export type ActionFailure = {
  success: false;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export type ActionResult<T = undefined> =
  | {
      success: true;
      data: T;
    }
  | ActionFailure;

export function validationFailure(error: z.ZodError): ActionFailure {
  return {
    success: false,
    message: "Please correct the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors,
  };
}
