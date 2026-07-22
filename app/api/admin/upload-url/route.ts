import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getDb } from "@/lib/db/client";
import { readJsonRequest } from "@/lib/http/read-json-request";
import { captureServerException } from "@/lib/observability/server";
import { createProductImageUploadUrl, getProductImagePublicUrl, isR2Configured } from "@/lib/r2";
import {
  createProductImageObjectKey,
  productImageUploadRequestSchema,
} from "@/lib/r2/upload-contract";

export const runtime = "nodejs";

const maxUploadRequestBytes = 4 * 1024;

export async function POST(request: Request) {
  await requireAdmin();

  if (!isR2Configured()) {
    return NextResponse.json({ error: "R2 image uploads are not configured." }, { status: 503 });
  }

  const body = await readJsonRequest(request, maxUploadRequestBytes);

  if (!body.success) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  const parsed = productImageUploadRequestSchema.safeParse(body.data);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid image upload request." }, { status: 400 });
  }

  try {
    const product = await getDb().query.products.findFirst({
      columns: { id: true },
      where: (products, { eq }) => eq(products.id, parsed.data.productId),
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const objectKey = createProductImageObjectKey(parsed.data);
    const uploadUrl = await createProductImageUploadUrl({
      objectKey,
      contentType: parsed.data.contentType,
    });

    return NextResponse.json(
      {
        uploadUrl,
        objectKey,
        publicUrl: getProductImagePublicUrl(objectKey),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    captureServerException(error, {
      area: "r2",
      operation: "r2.create-upload-url",
    });

    return NextResponse.json({ error: "Unable to prepare the image upload." }, { status: 500 });
  }
}
