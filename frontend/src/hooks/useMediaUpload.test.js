import { act, renderHook } from "@testing-library/react";

import api from "../api/client";
import useMediaUpload from "./useMediaUpload";

jest.mock("../api/client", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => "blob:preview-url");
  global.URL.revokeObjectURL = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
});

const imageFile = () => new File(["image-bytes"], "scene.png", { type: "image/png" });
const videoFile = () => new File(["video-bytes"], "clip.mp4", { type: "video/mp4" });

test("selectFile accepts an image and builds a preview URL", () => {
  const { result } = renderHook(() => useMediaUpload());

  act(() => result.current.selectFile(imageFile()));

  expect(result.current.file.name).toBe("scene.png");
  expect(result.current.preview).toBe("blob:preview-url");
  expect(result.current.error).toBeNull();
});

test("selectFile accepts videos without a preview", () => {
  const { result } = renderHook(() => useMediaUpload());

  act(() => result.current.selectFile(videoFile()));

  expect(result.current.file.type).toBe("video/mp4");
  expect(result.current.preview).toBeNull();
});

test("selectFile rejects unsupported file types", () => {
  const { result } = renderHook(() => useMediaUpload());

  act(() =>
    result.current.selectFile(new File(["pdf"], "notes.pdf", { type: "application/pdf" })),
  );

  expect(result.current.file).toBeNull();
  expect(result.current.error).toMatch(/image or video/i);
});

test("selectFile rejects files above the configured size limit", () => {
  const { result } = renderHook(() => useMediaUpload({ maxSizeMb: 1 }));

  const huge = new File(["x".repeat(2 * 1024 * 1024)], "big.mp4", { type: "video/mp4" });
  act(() => result.current.selectFile(huge));

  expect(result.current.file).toBeNull();
  expect(result.current.error).toMatch(/too large/i);
});

test("clearFile drops the file and the preview", () => {
  const { result } = renderHook(() => useMediaUpload());
  act(() => result.current.selectFile(imageFile()));

  act(() => result.current.clearFile());

  expect(result.current.file).toBeNull();
  expect(result.current.preview).toBeNull();
  expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-url");
});

test("upload refuses to run without a selected file", async () => {
  const { result } = renderHook(() => useMediaUpload());

  await act(async () => {
    await expect(result.current.upload(42)).rejects.toThrow(/select a file/i);
  });
  expect(api.post).not.toHaveBeenCalled();
});

test("upload posts multipart form data and reports progress", async () => {
  api.post.mockImplementation(async (_url, _formData, config = {}) => {
    config.onUploadProgress?.({ loaded: 50, total: 100 });
    return {
      data: {
        status: "success",
        data: { media: { id: 7, media_type: "image", file_name: "scene.png" } },
      },
    };
  });

  const { result } = renderHook(() => useMediaUpload());
  act(() => result.current.selectFile(imageFile()));

  let media;
  await act(async () => {
    media = await result.current.upload(42, { caption: "Evidence" });
  });

  expect(api.post).toHaveBeenCalledWith(
    "/incidents/42/media",
    expect.any(FormData),
    expect.objectContaining({
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: expect.any(Function),
    }),
  );
  expect(media.id).toBe(7);
  expect(result.current.progress).toBe(100);
  expect(result.current.uploading).toBe(false);
});

test("upload surfaces API errors", async () => {
  api.post.mockRejectedValue({
    response: { data: { message: "Media can only be added while the report is still a draft." } },
  });

  const { result } = renderHook(() => useMediaUpload());
  act(() => result.current.selectFile(imageFile()));

  await act(async () => {
    await expect(result.current.upload(42)).rejects.toBeDefined();
  });

  expect(result.current.error).toMatch(/still a draft/i);
  expect(result.current.uploading).toBe(false);
});
