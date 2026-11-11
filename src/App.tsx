import { useEffect, useRef, useState } from "react";
import { Dropzone } from "./components/Dropzone/Dropzone";
import { Preview } from "./components/Preview/Preview";
import { compressImage, CompressImageError } from "./lib/compressImage";
import type { CompressResult, OutputFormat } from "./lib/compressImage";
import { formatBytes } from "./lib/formatBytes";
import "./App.css";

type SourceImage = { file: File; url: string };
type ProcessedImage = { data: CompressResult; url: string; filename: string };

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function getResultMessage(result: CompressResult): string {
  if (result.returnedOriginal) {
    return "Новый файл не стал меньше. Можно скачать оригинал.";
  }
  if (result.compressed) {
    const saved = result.originalSize - result.outputSize;
    const percent = ((saved / result.originalSize) * 100).toFixed(1);
    return `Готово. Файл меньше на ${formatBytes(saved)} (${percent}%).`;
  }
  return result.outputSize > result.originalSize
    ? "Преобразование выполнено. Итоговый файл больше исходного."
    : "Преобразование выполнено. Размер файла не изменился.";
}

export default function App() {
  const [source, setSource] = useState<SourceImage | null>(null);
  const [result, setResult] = useState<ProcessedImage | null>(null);
  const [format, setFormat] = useState<OutputFormat>("image/webp");
  const [quality, setQuality] = useState(80);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    return () => {
      if (source) URL.revokeObjectURL(source.url);
    };
  }, [source]);

  useEffect(() => {
    if (!source) return;

    let cancelled = false;
    let previewUrl: string | undefined;
    const currentRequest = requestId.current;
    const isCurrentRequest = () =>
      !cancelled && currentRequest === requestId.current;

    const timer = window.setTimeout(async () => {
      try {
        const data = await compressImage(source.file, {
          mimeType: format,
          quality: quality / 100,
          maxWidth: 1920,
          maxHeight: 1920,
        });

        if (!isCurrentRequest()) return;

        const baseName = source.file.name.replace(/\.[^.]+$/, "") || "image";
        const filename = data.returnedOriginal
          ? source.file.name
          : `${baseName}-processed.${EXTENSIONS[data.mimeType]}`;

        previewUrl = URL.createObjectURL(data.blob);
        setResult({ data, url: previewUrl, filename });
      } catch (cause) {
        if (!isCurrentRequest()) return;
        setError(
          cause instanceof CompressImageError
            ? cause.message
            : "Не удалось обработать изображение. Попробуйте ещё раз.",
        );
      } finally {
        if (isCurrentRequest()) setIsProcessing(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [source, format, quality, retryKey]);

  function invalidatePreview(hasSource: boolean) {
    requestId.current += 1;
    setResult(null);
    setError("");
    setIsProcessing(hasSource);
  }

  function handleFileSelect(file: File) {
    invalidatePreview(true);
    setSource({ file, url: URL.createObjectURL(file) });
  }

  function handleFormatChange(nextFormat: OutputFormat) {
    if (nextFormat === format) return;
    invalidatePreview(source !== null);
    setFormat(nextFormat);
  }

  function handleQualityChange(nextQuality: number) {
    if (nextQuality === quality) return;
    invalidatePreview(source !== null);
    setQuality(nextQuality);
  }

  function handleRetry() {
    invalidatePreview(source !== null);
    setRetryKey((value) => value + 1);
  }

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">Сжать изображение</h1>
        <p className="app__intro">
          Выберите изображение и настройте формат. Предпросмотр и размер файла
          обновятся автоматически. Всё обрабатывается в вашем браузере.
        </p>
      </header>

      <div className="app__workspace">
        <div className="app__sidebar">
          <Dropzone onFile={handleFileSelect} />

          {source && (
            <p className="app__selection">
              {source.file.name} · {formatBytes(source.file.size)}
            </p>
          )}

          <fieldset className="app__settings">
            <legend className="app__legend">Параметры изображения</legend>
            <div className="app__controls">
              <div className="app__field">
                <label className="app__label" htmlFor="output-format">
                  Формат результата
                </label>
                <select
                  id="output-format"
                  className="app__select"
                  value={format}
                  aria-describedby="format-hint"
                  onChange={(event) =>
                    handleFormatChange(
                      event.currentTarget.value as OutputFormat,
                    )
                  }
                >
                  <option value="image/webp">WebP</option>
                  <option value="image/jpeg">JPEG</option>
                  <option value="image/png">PNG</option>
                </select>
                <p id="format-hint" className="app__hint">
                  {format === "image/jpeg"
                    ? "Прозрачные области станут белыми."
                    : format === "image/png"
                      ? "Без потерь. Вес файла может увеличиться."
                      : "Поддерживает прозрачный фон."}
                </p>
              </div>

              {format !== "image/png" && (
                <div className="app__field">
                  <label className="app__label" htmlFor="image-quality">
                    Качество: {quality}%
                  </label>
                  <input
                    id="image-quality"
                    className="app__range"
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={quality}
                    aria-valuetext={`${quality}%`}
                    aria-describedby="quality-hint"
                    onChange={(event) =>
                      handleQualityChange(event.currentTarget.valueAsNumber)
                    }
                  />
                  <p id="quality-hint" className="app__hint">
                    Ниже качество — обычно меньше файл.
                  </p>
                </div>
              )}
            </div>
            <p className="app__hint">
              Изображение впишется в 1920 × 1920 пикселей без увеличения.
              Анимация не сохраняется.
            </p>
          </fieldset>

          <p className="app__status" role="status">
            {isProcessing
              ? "Обновляем предпросмотр и рассчитываем размер…"
              : result
                ? getResultMessage(result.data)
                : ""}
          </p>
          <p className="app__error" role="alert">
            {error}
          </p>
          {error && (
            <button className="app__retry" type="button" onClick={handleRetry}>
              Повторить обработку
            </button>
          )}
        </div>

        <Preview
          source={source}
          result={result}
          isProcessing={isProcessing}
          error={error}
        />
      </div>
    </main>
  );
}
