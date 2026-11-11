import { useId, useRef, useState } from "react";
import styles from "./Dropzone.module.css";

type DropzoneProps = {
  onFile: (file: File) => void;
  disabled?: boolean;
};

const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function Dropzone({ onFile, disabled = false }: DropzoneProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const [isOver, setIsOver] = useState(false);
  const [error, setError] = useState("");

  function pick(files: File[]) {
    if (disabled || files.length === 0) return;

    if (files.length !== 1) {
      setError("Выберите одно изображение за раз.");
      return;
    }

    const file = files[0];

    const supported = file.type
      ? SUPPORTED_TYPES.includes(file.type.toLowerCase())
      : /\.(jpe?g|png|webp)$/i.test(file.name);

    if (!supported) {
      setError("Выберите изображение в формате JPEG, PNG или WebP.");
      return;
    }

    if (file.size === 0) {
      setError("Файл пуст. Выберите другое изображение.");
      return;
    }

    setError("");
    onFile(file);
  }

  const className = [
    styles.dropzone,
    isOver && !disabled && styles["dropzone--over"],
    disabled && styles["dropzone--disabled"],
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      onDragEnter={(event) => {
        if (disabled || !event.dataTransfer.types.includes("Files")) return;

        dragDepth.current += 1;
        setIsOver(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();

        event.dataTransfer.dropEffect =
          !disabled && event.dataTransfer.types.includes("Files")
            ? "copy"
            : "none";
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);

        if (dragDepth.current === 0) setIsOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setIsOver(false);

        pick(Array.from(event.dataTransfer.files));
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        disabled={disabled}
        hidden
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);

          event.currentTarget.value = "";
          pick(files);
        }}
      />

      <button
        type="button"
        className={styles.dropzone__button}
        disabled={disabled}
        aria-labelledby={id + "-action"}
        aria-describedby={id + "-hint " + id + "-error"}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
      >
        <span className={styles.dropzone__title}>
          Перетащите изображение сюда
        </span>

        <span id={id + "-action"} className={styles.dropzone__action}>
          Выбрать файл
        </span>
      </button>

      <p id={id + "-hint"} className={styles.dropzone__hint}>
        JPEG, PNG или WebP. Одно изображение за раз.
      </p>

      <p id={id + "-error"} className={styles.dropzone__error} role="alert">
        {error}
      </p>
    </div>
  );
}
