import { describe, test, expect, mock, beforeEach } from "bun:test";

/**
 * Tests for lib/uploadService.js — the shared validate -> upload ->
 * presign -> File-upsert pipeline. Storage and models are mocked.
 */

const savedPresign = "https://storage.example.internal/media/asset.png?X-Amz=Signature";

const storageMock = {
  ensureBucket: mock(async () => {}),
  putBuffer: mock(async () => {}),
  getPresignedUrl: mock(async () => savedPresign),
};

mock.module("@/lib/storage", () => storageMock);

let savedFileDoc = null;
const FileMock = {
  findOne: mock(async () => savedFileDoc),
  create: mock(async (data) => ({ _id: "created-file-id", ...data })),
};

mock.module("@/models/File", () => ({ default: FileMock }));

const { uploadValidatedFile, PRESIGN_EXPIRY_SECONDS } = await import("@/lib/uploadService");

function makeFile(overrides = {}) {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6]);
  return {
    name: "asset.png",
    type: "image/png",
    size: bytes.length,
    arrayBuffer: async () => bytes.buffer,
    ...overrides,
  };
}

describe("uploadValidatedFile", () => {
  beforeEach(() => {
    savedFileDoc = null;
    storageMock.ensureBucket.mockClear();
    storageMock.putBuffer.mockClear();
    storageMock.getPresignedUrl.mockClear();
    FileMock.findOne.mockClear();
    FileMock.create.mockClear();
  });

  test("appends the validated extension to the objectNameBase", async () => {
    await uploadValidatedFile({
      file: makeFile(),
      bucket: "stamp",
      objectNameBase: "course-1/stamp1",
      userId: "user-1",
    });

    expect(storageMock.putBuffer.mock.calls[0][0].objectName).toBe("course-1/stamp1.png");
  });

  test("creates a new File record when no objectName match exists", async () => {
    const { fileRecord, objectName } = await uploadValidatedFile({
      file: makeFile(),
      bucket: "stamp",
      objectNameBase: "course-1/stamp1",
      userId: "user-1",
      extra: { courseId: "course-1" },
    });

    expect(fileRecord._id).toBe("created-file-id");
    expect(objectName).toBe("course-1/stamp1.png");
    expect(fileRecord.bucket).toBe("stamp");
    expect(fileRecord.userId).toBe("user-1");
    expect(fileRecord.courseId).toBe("course-1");
    expect(fileRecord.presignedUrl).toBe(savedPresign);
    expect(fileRecord.originalName).toBe("asset.png");
  });

  test("upsert mode updates the existing record instead of duplicating", async () => {
    savedFileDoc = {
      _id: "existing-id",
      userId: "someone-else",
      size: 1,
      save: mock(async () => {}),
    };

    const { fileRecord } = await uploadValidatedFile({
      file: makeFile(),
      bucket: "stamp",
      objectNameBase: "course-1/stamp1",
      userId: "user-1",
    });

    expect(fileRecord._id).toBe("existing-id");
    expect(savedFileDoc.userId).toBe("user-1");
    expect(savedFileDoc.size).toBe(14);
    expect(savedFileDoc.presignedUrl).toBe(savedPresign);
    expect(FileMock.create).not.toHaveBeenCalled();
  });

  test("upsert=false always creates (UUID media keys)", async () => {
    savedFileDoc = { _id: "should-not-be-used", save: mock(async () => {}) };

    const { fileRecord } = await uploadValidatedFile({
      file: makeFile(),
      bucket: "media",
      objectNameBase: "uuid-1",
      userId: "user-1",
      extra: { title: "T", alt: "A" },
      upsert: false,
    });

    expect(FileMock.findOne).not.toHaveBeenCalled();
    expect(fileRecord._id).toBe("created-file-id");
    expect(fileRecord.title).toBe("T");
    expect(fileRecord.alt).toBe("A");
  });

  test("presign uses the shared 7-day expiry constant", async () => {
    expect(PRESIGN_EXPIRY_SECONDS).toBe(7 * 24 * 60 * 60);

    await uploadValidatedFile({
      file: makeFile(),
      bucket: "media",
      objectNameBase: "x",
      userId: "u",
    });

    expect(storageMock.getPresignedUrl.mock.calls[0][0].expiresInSeconds).toBe(
      7 * 24 * 60 * 60
    );
  });

  test("validation failure carries the validator status and skips storage", async () => {
    try {
      await uploadValidatedFile({
        file: makeFile({ type: "text/html" }),
        bucket: "media",
        objectNameBase: "x",
        userId: "u",
      });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.status).toBe(415);
    }
    expect(storageMock.putBuffer).not.toHaveBeenCalled();
    expect(FileMock.create).not.toHaveBeenCalled();
  });
});
