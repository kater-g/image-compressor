import { useId } from "react";
import type { CompressResult } from "../../lib/compressImage";
import { formatBytes } from "../../lib/formatBytes";
import styles from "./Preview.module.css";

type PreviewProps = {
  source: {
    file: File;
    url: string;
  } | null;
  result: {
    data: CompressResult;
    url: string;
    filename: string;
  } | null;
  isProcessing: boolean;
  error: string;
};

const FORMAT_LABELS: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WEBP",
};

export function Preview({ source, result, isProcessing, error }: PreviewProps) {
  const titleId = useId();

  return (
    <section className={styles.preview} aria-labelledby={titleId}>
      <div className={styles.preview__header}>
        <h2 id={titleId} className={styles.preview__title}>
          Предпросмотр
        </h2>
      </div>

      {!source ? (
        <div className={styles.preview__empty}>
          <p>Выберите изображение для обработки.</p>
          <p>Здесь появятся оригинал и результат с точным размером файла.</p>
        </div>
      ) : (
        <>
          <div className={styles.preview__images}>
            <figure className={styles.preview__image}>
              <figcaption className={styles.preview__caption}>
                <span>Оригинал</span>
                <span>{formatBytes(source.file.size)}</span>
              </figcaption>
              <div className={styles.preview__frame}>
                <img
                  src={source.url}
                  alt={`Исходное изображение: ${source.file.name}`}
                />
              </div>
            </figure>

            <figure className={styles.preview__image}>
              <figcaption className={styles.preview__caption}>
                <span>
                  {result?.data.returnedOriginal
                    ? "Без изменений"
                    : "Результат"}
                </span>
                <span>
                  {result
                    ? formatBytes(result.data.outputSize)
                    : isProcessing
                      ? "Расчёт размера…"
                      : "Не рассчитан"}
                </span>
              </figcaption>
              <div className={styles.preview__frame} aria-busy={isProcessing}>
                {result ? (
                  <img src={result.url} alt="Изображение после обработки" />
                ) : (
                  <p className={styles.preview__placeholder}>
                    {isProcessing
                      ? "Готовим предпросмотр…"
                      : error
                        ? "Не удалось создать предпросмотр. Повторите обработку или измените параметры."
                        : "Здесь появится обработанное изображение."}
                  </p>
                )}
              </div>
              {result && (
                <p className={styles.preview__details}>
                  {result.data.width} × {result.data.height} пикселей
                  {" · "}
                  {FORMAT_LABELS[result.data.mimeType] ?? result.data.mimeType}
                </p>
              )}
            </figure>
          </div>

          {result && (
            <a
              className={styles.preview__download}
              href={result.url}
              download={result.filename}
            >
              {result.data.returnedOriginal
                ? "Скачать оригинал"
                : "Скачать результат"}
            </a>
          )}
        </>
      )}
    </section>
  );
}
