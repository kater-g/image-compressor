export type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

export type CompressOptions = {
  maxWidth?: number;
  maxHeight?: number;
  /* Качество JPEG/WebP от 0 до 1. Для PNG не применяется. */
  quality?: number;
  mimeType?: OutputFormat;
};

export type CompressResult = {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  outputSize: number;
  mimeType: string;
  /* true, только если итоговый файл меньше исходного */
  compressed: boolean;
  /* true, если вместо перекодированного файла возвращён оригинал */
  returnedOriginal: boolean;
};

export type CompressErrorCode =
  | "INVALID_OPTIONS"
  | "DECODE_FAILED"
  | "RENDER_FAILED"
  | "ENCODE_FAILED"
  | "UNSUPPORTED_FORMAT";

export class CompressImageError extends Error {
  readonly code: CompressErrorCode;

  constructor(
    code: CompressErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CompressImageError";
    this.code = code;
  }
}

function getTargetDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
) {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);

  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function drawToCanvas(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  mimeType: OutputFormat,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D недоступен.");

  if (mimeType === "image/jpeg") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: OutputFormat,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Браузер не создал изображение."));
      },
      mimeType,
      mimeType === "image/png" ? undefined : quality,
    );
  });
}

export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<CompressResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    mimeType = "image/webp",
  } = options;

  if (
    !Number.isSafeInteger(maxWidth) ||
    maxWidth <= 0 ||
    !Number.isSafeInteger(maxHeight) ||
    maxHeight <= 0
  ) {
    throw new CompressImageError(
      "INVALID_OPTIONS",
      "Максимальные размеры должны быть положительными целыми числами.",
    );
  }

  if (!Number.isFinite(quality) || quality < 0 || quality > 1) {
    throw new CompressImageError(
      "INVALID_OPTIONS",
      "Качество должно быть числом от 0 до 1.",
    );
  }

  if (
    mimeType !== "image/jpeg" &&
    mimeType !== "image/png" &&
    mimeType !== "image/webp"
  ) {
    throw new CompressImageError(
      "INVALID_OPTIONS",
      "Выберите JPEG, PNG или WebP.",
    );
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (cause) {
    throw new CompressImageError(
      "DECODE_FAILED",
      "Не удалось открыть изображение. Файл может быть повреждён или его формат не поддерживается.",
      { cause },
    );
  }

  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;
  let canvas: HTMLCanvasElement;
  let target: { width: number; height: number };

  try {
    target = getTargetDimensions(
      originalWidth,
      originalHeight,
      maxWidth,
      maxHeight,
    );
    canvas = drawToCanvas(bitmap, target.width, target.height, mimeType);
  } catch (cause) {
    throw new CompressImageError(
      "RENDER_FAILED",
      "Не удалось обработать изображение. Возможно, оно слишком большое для этого устройства.",
      { cause },
    );
  } finally {
    bitmap.close();
  }

  let encoded: Blob;
  try {
    encoded = await canvasToBlob(canvas, mimeType, quality);
  } catch (cause) {
    throw new CompressImageError(
      "ENCODE_FAILED",
      "Не удалось сохранить обработанное изображение.",
      { cause },
    );
  }

  if (encoded.type !== mimeType) {
    throw new CompressImageError(
      "UNSUPPORTED_FORMAT",
      "Браузер не поддерживает сохранение в выбранном формате. Попробуйте другой формат.",
    );
  }

  const resized =
    target.width !== originalWidth || target.height !== originalHeight;

  const returnedOriginal =
    encoded.size >= file.size && !resized && file.type === encoded.type;

  const output = returnedOriginal ? file : encoded;

  return {
    blob: output,
    width: target.width,
    height: target.height,
    originalSize: file.size,
    outputSize: output.size,
    mimeType: output.type,
    compressed: output.size < file.size,
    returnedOriginal,
  };
}
