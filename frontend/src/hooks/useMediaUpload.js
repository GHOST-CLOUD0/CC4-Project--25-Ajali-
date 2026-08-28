// frontend/src/hooks/useMediaUpload.js
import { useCallback, useEffect, useRef, useState } from "react";

import api from "../api/client";

const DEFAULT_MAX_SIZE_MB = 25;

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

/**
 * useMediaUpload
 * --------------
 * File selection, validation, preview and upload of image/video evidence
 * for an incident (POST /incidents/:incidentId/media, multipart field
 * name: `file`).
 *
 * Usage:
 *   const { file, preview, uploading, progress, error, selectFile, upload } =
 *     useMediaUpload();
 *   <input type="file" onChange={(e) => selectFile(e.target.files[0])} />
 *   await upload(incidentId, { caption: "Scene of the accident" });
 */
const useMediaUpload = ({ maxSizeMb = DEFAULT_MAX_SIZE_MB } = {}) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const previewRef = useRef(null);

  const releasePreview = useCallback(() => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
  }, []);

  /** Validates and stores the picked file; builds a preview for images. */
  const selectFile = useCallback(
    (nextFile) => {
      releasePreview();
      setFile(null);
      setPreview(null);
      setProgress(0);
      setError(null);

      if (!nextFile) {
        return;
      }
      const isImage = nextFile.type.startsWith("image/");
      const isVideo = nextFile.type.startsWith("video/");
      if (!isImage && !isVideo) {
        setError("Only image or video files are allowed.");
        return;
      }
      if (nextFile.size > maxSizeMb * 1024 * 1024) {
        setError(`File is too large. Maximum size is ${maxSizeMb}MB.`);
        return;
      }

      setFile(nextFile);
      if (isImage) {
        const url = URL.createObjectURL(nextFile);
        previewRef.current = url;
        setPreview(url);
      }
    },
    [maxSizeMb, releasePreview],
  );

  /** Drops the selected file and any preview/error state. */
  const clearFile = useCallback(() => {
    releasePreview();
    setFile(null);
    setPreview(null);
    setProgress(0);
    setError(null);
  }, [releasePreview]);

  // Revoke the object URL when the component unmounts.
  useEffect(() => releasePreview, [releasePreview]);

  /**
   * Uploads the selected file for `incidentId`.
   * Resolves with the created media record.
   */
  const upload = useCallback(
    async (incidentId, { caption } = {}) => {
      if (!file) {
        const message = "Select a file to upload first.";
        setError(message);
        throw new Error(message);
      }
      setUploading(true);
      setProgress(0);
      setError(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (caption) {
          formData.append("caption", caption);
        }
        const { data } = await api.post(
          `/incidents/${incidentId}/media`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (event) => {
              if (!event.total) return;
              setProgress(Math.round((event.loaded / event.total) * 100));
            },
          },
        );
        setProgress(100);
        return data.data.media;
      } catch (err) {
        setError(getErrorMessage(err, "Unable to upload the file."));
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [file],
  );

  return {
    file,
    preview,
    uploading,
    progress, // 0–100
    error,
    selectFile,
    clearFile,
    upload,
  };
};

export default useMediaUpload;
