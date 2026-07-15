"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProductImage, deleteProductImage, updateProductImage } from "@/lib/actions/images";
import type { ActionFailure } from "@/lib/actions/result";
import {
  allowedProductImageTypes,
  MAX_PRODUCT_IMAGE_BYTES,
  productImageUploadRequestSchema,
  productImageUploadResponseSchema,
} from "@/lib/r2/upload-contract";
import {
  type AdminImageUploadFormInput,
  type AdminProductImageFormInput,
  adminImageUploadFormSchema,
  adminProductImageFormSchema,
} from "@/lib/validators/product";

type ManagedProductImage = {
  id: string;
  url: string;
  alt: string | null;
  position: number;
};

type ProductImageManagerProps = {
  images: ManagedProductImage[];
  productId: string;
  productName: string;
  r2Configured: boolean;
};

export function ProductImageManager({
  images,
  productId,
  productName,
  r2Configured,
}: ProductImageManagerProps) {
  return (
    <div className="space-y-6">
      <ImageUploader productId={productId} r2Configured={r2Configured} />

      {images.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {images.map((image) => (
            <ProductImageEditor
              image={image}
              key={image.id}
              productId={productId}
              productName={productName}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-background px-6 py-10 text-center">
          <p className="font-semibold">No product images yet.</p>
          <p className="mt-1 text-muted-foreground text-sm">
            Upload an image to replace the storefront placeholder.
          </p>
        </div>
      )}
    </div>
  );
}

function ImageUploader({ productId, r2Configured }: { productId: string; r2Configured: boolean }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<AdminImageUploadFormInput>({
    defaultValues: { alt: "" },
    resolver: zodResolver(adminImageUploadFormSchema),
  });

  async function onSubmit(values: AdminImageUploadFormInput) {
    setActionError(null);
    setSuccessMessage(null);

    if (!selectedFile) {
      setActionError("Choose an image to upload.");
      return;
    }

    const uploadRequest = productImageUploadRequestSchema.safeParse({
      productId,
      fileName: selectedFile.name,
      contentType: selectedFile.type,
      size: selectedFile.size,
    });

    if (!uploadRequest.success) {
      setActionError("Use a JPEG, PNG, WebP, or AVIF image no larger than 5 MB.");
      return;
    }

    try {
      const presignResponse = await fetch("/api/admin/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uploadRequest.data),
      });
      const presignBody: unknown = await presignResponse.json();

      if (!presignResponse.ok) {
        setActionError(getApiError(presignBody, "Unable to prepare the image upload."));
        return;
      }

      const presignedUpload = productImageUploadResponseSchema.safeParse(presignBody);

      if (!presignedUpload.success) {
        setActionError("The upload service returned an invalid response.");
        return;
      }

      const uploadResponse = await fetch(presignedUpload.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": uploadRequest.data.contentType },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        setActionError("The browser could not upload the image to R2.");
        return;
      }

      const result = await createProductImage({
        productId,
        objectKey: presignedUpload.data.objectKey,
        alt: values.alt,
      });

      if (!result.success) {
        showFormFailure(result, form.setError, ["alt"]);
        setActionError(result.message);
        return;
      }

      form.reset({ alt: "" });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSuccessMessage("Image uploaded.");
      router.refresh();
    } catch {
      setActionError("Image upload failed. Check the R2 configuration and try again.");
    }
  }

  return (
    <form
      className="rounded-lg border bg-background p-5"
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div>
          <label className="mb-2 block font-semibold text-sm" htmlFor="product-image-file">
            Image file
          </label>
          <Input
            accept={allowedProductImageTypes.join(",")}
            disabled={!r2Configured || form.formState.isSubmitting}
            id="product-image-file"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            ref={fileInputRef}
            type="file"
          />
          <p className="mt-1 text-muted-foreground text-xs">
            JPEG, PNG, WebP, or AVIF. Maximum {MAX_PRODUCT_IMAGE_BYTES / 1024 / 1024} MB.
          </p>
        </div>
        <FormField error={form.formState.errors.alt?.message} id="new-image-alt" label="Alt text">
          <Input
            aria-describedby={form.formState.errors.alt ? "new-image-alt-error" : undefined}
            aria-invalid={Boolean(form.formState.errors.alt)}
            disabled={!r2Configured || form.formState.isSubmitting}
            id="new-image-alt"
            placeholder="Describe the product image"
            {...form.register("alt")}
          />
        </FormField>
        <Button disabled={!r2Configured || form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? "Uploading…" : "Upload image"}
        </Button>
      </div>

      {!r2Configured ? (
        <p className="mt-4 text-amber-800 text-sm" role="status">
          Configure all R2 environment values and restart the dev server to enable uploads.
        </p>
      ) : null}
      {actionError ? (
        <p className="mt-4 text-destructive text-sm" role="alert">
          {actionError}
        </p>
      ) : null}
      {successMessage ? (
        <p className="mt-4 text-sm" role="status">
          {successMessage}
        </p>
      ) : null}
    </form>
  );
}

function ProductImageEditor({
  image,
  productId,
  productName,
}: {
  image: ManagedProductImage;
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const form = useForm<AdminProductImageFormInput>({
    defaultValues: {
      alt: image.alt ?? "",
      position: String(image.position),
    },
    resolver: zodResolver(adminProductImageFormSchema),
  });

  async function onSubmit(values: AdminProductImageFormInput) {
    setActionError(null);
    setSuccessMessage(null);

    const result = await updateProductImage({
      productId,
      imageId: image.id,
      ...values,
    });

    if (!result.success) {
      showFormFailure(result, form.setError, ["alt", "position"]);
      setActionError(result.message);
      return;
    }

    form.reset(values);
    setSuccessMessage("Image details saved.");
    router.refresh();
  }

  async function onDelete() {
    if (!window.confirm("Delete this product image? This cannot be undone.")) {
      return;
    }

    setActionError(null);
    setSuccessMessage(null);
    setIsDeleting(true);

    try {
      const result = await deleteProductImage({ productId, imageId: image.id });

      if (!result.success) {
        setActionError(result.message);
        return;
      }

      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  const busy = form.formState.isSubmitting || isDeleting;

  return (
    <form
      className="grid gap-4 rounded-lg border bg-background p-4 sm:grid-cols-[9rem_1fr]"
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
        <Image
          alt={image.alt ?? productName}
          className="object-cover"
          fill
          sizes="144px"
          src={image.url}
          unoptimized
        />
      </div>
      <div className="space-y-4">
        <FormField
          error={form.formState.errors.alt?.message}
          id={`${image.id}-alt`}
          label="Alt text"
        >
          <Input
            aria-describedby={form.formState.errors.alt ? `${image.id}-alt-error` : undefined}
            aria-invalid={Boolean(form.formState.errors.alt)}
            disabled={busy}
            id={`${image.id}-alt`}
            {...form.register("alt")}
          />
        </FormField>
        <FormField
          error={form.formState.errors.position?.message}
          id={`${image.id}-position`}
          label="Position"
        >
          <Input
            aria-describedby={
              form.formState.errors.position ? `${image.id}-position-error` : undefined
            }
            aria-invalid={Boolean(form.formState.errors.position)}
            disabled={busy}
            id={`${image.id}-position`}
            inputMode="numeric"
            {...form.register("position")}
          />
        </FormField>

        {actionError ? (
          <p className="text-destructive text-sm" role="alert">
            {actionError}
          </p>
        ) : null}
        {successMessage ? (
          <p className="text-sm" role="status">
            {successMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-between gap-3 border-t pt-4">
          <Button disabled={busy} onClick={onDelete} size="sm" type="button" variant="destructive">
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
          <Button disabled={busy} size="sm" type="submit">
            {form.formState.isSubmitting ? "Saving…" : "Save image"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function showFormFailure<TField extends string>(
  result: ActionFailure,
  setError: (field: TField, error: { message: string; type: "server" }) => void,
  fields: readonly TField[],
) {
  for (const field of fields) {
    const message = result.fieldErrors?.[field]?.[0];

    if (message) {
      setError(field, { message, type: "server" });
    }
  }
}

function getApiError(input: unknown, fallback: string): string {
  if (typeof input === "object" && input !== null && "error" in input) {
    const error = input.error;
    return typeof error === "string" ? error : fallback;
  }

  return fallback;
}

function FormField({
  children,
  error,
  id,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  id: string;
  label: string;
}) {
  return (
    <div>
      <label className="mb-2 block font-semibold text-sm" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-destructive text-xs" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
