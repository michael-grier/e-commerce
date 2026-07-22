export type JsonRequestFailure = {
  success: false;
  error: string;
  status: 400 | 413 | 415;
};

export type JsonRequestResult = JsonRequestFailure | { success: true; data: unknown };

function isJsonContentType(contentType: string | null): boolean {
  return contentType?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

function isDeclaredBodyTooLarge(contentLength: string | null, maxBytes: number): boolean {
  if (!contentLength || !/^\d+$/.test(contentLength)) {
    return false;
  }

  return Number(contentLength) > maxBytes;
}

export async function readJsonRequest(
  request: Request,
  maxBytes: number,
): Promise<JsonRequestResult> {
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return {
      success: false,
      error: "Request body must use application/json.",
      status: 415,
    };
  }

  if (isDeclaredBodyTooLarge(request.headers.get("content-length"), maxBytes)) {
    return {
      success: false,
      error: "Request body is too large.",
      status: 413,
    };
  }

  if (!request.body) {
    return {
      success: false,
      error: "Request body must be valid JSON.",
      status: 400,
    };
  }

  const decoder = new TextDecoder();
  const reader = request.body.getReader();
  let byteLength = 0;
  let body = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    byteLength += value.byteLength;

    if (byteLength > maxBytes) {
      await reader.cancel().catch(() => undefined);

      return {
        success: false,
        error: "Request body is too large.",
        status: 413,
      };
    }

    body += decoder.decode(value, { stream: true });
  }

  body += decoder.decode();

  try {
    return { success: true, data: JSON.parse(body) };
  } catch {
    return {
      success: false,
      error: "Request body must be valid JSON.",
      status: 400,
    };
  }
}
