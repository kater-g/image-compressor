import { useId } from "react";
import type { OutputFormat } from "../../lib/compressImage";
import styles from "./CompressionSettings.module.css";

type CompressionSettingsProps = {
  format: OutputFormat;
  quality: number;
  onFormatChange: (format: OutputFormat) => void;
  onQualityChange: (quality: number) => void;
};

export function CompressionSettings({
  format,
  quality,
  onFormatChange,
  onQualityChange,
}: CompressionSettingsProps) {
  const id = useId();
  const formatId = id + "-format";
  const formatHintId = id + "-format-hint";
  const qualityId = id + "-quality";
  const qualityHintId = id + "-quality-hint";

  return (
    <fieldset className={styles["compression-settings"]}>
      <legend className={styles["compression-settings__legend"]}>
        Параметры изображения
      </legend>
      <div className={styles["compression-settings__controls"]}>
        <div className={styles["compression-settings__field"]}>
          <label
            className={styles["compression-settings__label"]}
            htmlFor={formatId}
          >
            Формат результата
          </label>
          <select
            id={formatId}
            name="format"
            className={styles["compression-settings__select"]}
            value={format}
            aria-describedby={formatHintId}
            onChange={(event) =>
              onFormatChange(event.currentTarget.value as OutputFormat)
            }
          >
            <option value="image/webp">WebP</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/png">PNG</option>
          </select>
          <p id={formatHintId} className={styles["compression-settings__hint"]}>
            {format === "image/jpeg"
              ? "Прозрачные области станут белыми."
              : format === "image/png"
                ? "Без потерь. Вес файла может увеличиться."
                : "Поддерживает прозрачный фон."}
          </p>
        </div>

        {format !== "image/png" && (
          <div className={styles["compression-settings__field"]}>
            <label
              className={styles["compression-settings__label"]}
              htmlFor={qualityId}
            >
              Качество: {quality}%
            </label>
            <input
              id={qualityId}
              name="quality"
              className={styles["compression-settings__range"]}
              type="range"
              min="10"
              max="100"
              step="1"
              value={quality}
              aria-valuetext={`${quality}%`}
              aria-describedby={qualityHintId}
              onChange={(event) =>
                onQualityChange(event.currentTarget.valueAsNumber)
              }
            />
            <p
              id={qualityHintId}
              className={styles["compression-settings__hint"]}
            >
              Ниже качество — обычно меньше файл.
            </p>
          </div>
        )}
      </div>
      <p className={styles["compression-settings__hint"]}>
        Изображение впишется в 1920 × 1920 пикселей без увеличения. Анимация не
        сохраняется.
      </p>
    </fieldset>
  );
}
