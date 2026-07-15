import "server-only";

import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env, requireEnv } from "@/lib/env";
import { buildR2PublicUrl, type ProductImageContentType } from "@/lib/r2/upload-contract";

const uploadUrlLifetimeSeconds = 5 * 60;

let r2Client: S3Client | undefined;

export function isR2Configured(): boolean {
  return Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET &&
      env.R2_PUBLIC_URL,
  );
}

function getR2Client(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
  }

  return r2Client;
}

function getBucket(): string {
  return requireEnv("R2_BUCKET");
}

export function getProductImagePublicUrl(objectKey: string): string {
  return buildR2PublicUrl(requireEnv("R2_PUBLIC_URL"), objectKey);
}

export async function createProductImageUploadUrl(input: {
  objectKey: string;
  contentType: ProductImageContentType;
}): Promise<string> {
  return getSignedUrl(
    getR2Client(),
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: input.objectKey,
      ContentType: input.contentType,
    }),
    { expiresIn: uploadUrlLifetimeSeconds },
  );
}

export async function getProductImageObjectMetadata(objectKey: string): Promise<{
  contentType: string | undefined;
  size: number | undefined;
} | null> {
  try {
    const result = await getR2Client().send(
      new HeadObjectCommand({
        Bucket: getBucket(),
        Key: objectKey,
      }),
    );

    return {
      contentType: result.ContentType,
      size: result.ContentLength,
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "$metadata" in error &&
      typeof error.$metadata === "object" &&
      error.$metadata !== null &&
      "httpStatusCode" in error.$metadata &&
      error.$metadata.httpStatusCode === 404
    ) {
      return null;
    }

    throw error;
  }
}

export async function deleteProductImageObject(objectKey: string): Promise<void> {
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: objectKey,
    }),
  );
}
