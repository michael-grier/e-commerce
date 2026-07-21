export type ServerErrorArea = "admin" | "checkout" | "email" | "r2" | "webhook";

export type ServerExceptionContext = {
  area: ServerErrorArea;
  /** A stable code label such as `checkout.create-session`; never include customer input. */
  operation: string;
};

export function getServerExceptionTags(context: ServerExceptionContext): Record<string, string> {
  return {
    "app.area": context.area,
    "app.operation": context.operation,
  };
}

export function normalizeServerException(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error("A non-Error value was thrown.");
}
