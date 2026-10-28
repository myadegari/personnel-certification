import { describe, test, expect, mock, beforeEach } from "bun:test";

/**
 * Characterization tests for lib/signatureUpload.js (now a thin wrapper
 * over lib/uploadService.js). `lib/storage` and `models/File` are mocked so
 * no S3 endpoint or MongoDB instance is required.
 *
 * bun:test resolves "@/..." via jsconfig paths, same as the app.
 */

const savedPresign = "https://storage.example.internal/signature/1/signature-1.png?X-Amz=Signature";

const storageMock = {
  ensureBucket: mock(async () => {}),
  putBuffer: mock(async () => {}),
  getPresignedUrl: mock(async () => savedPresign),
};

mock.module("@/lib/storage", () => storageMock);

let savedFileDoc = null;
let createdFileDoc = null;
const FileMock = {
  findOne: mock(async () => savedFileDoc),
  create: mock(async (data) => {
    createdFileDoc = { _id: "new-file-id", ...data };
    return createdFileDoc;
  }),
};

mock.module("@/models/File", () => ({ default: FileMock }));

// Import AFTER the mocks are registered.
const { uploadUserSignature } = await import("@/lib/signatureUpload");

function makeUser(overrides = {}) {
  return {
    _id: "user-id-1",
    personnelNumber: "123456",
    save: mock(async () => {}),
    ...overrides,
  };
}

function makeFile(overrides = {}) {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6]);
  return {
    name: "sig.png",
    type: "image/png",
    size: bytes.length,
    arrayBuffer: async () => bytes.buffer,
    ...overrides,
  };
}

describe("uploadUserSignature", () => {
  beforeEach(() => {
    savedFileDoc = null;
    createdFileDoc = null;
    storageMock.ensureBucket.mockClear();
    storageMock.putBuffer.mockClear();
    storageMock.getPresignedUrl.mockClear();
    FileMock.findOne.mockClear();
    FileMock.create.mockClear();
  });

  test("uploads to the signature bucket under personnelNumber key and links user", async () => {
    const user = makeUser();
    const file = makeFile();

    const record = await uploadUserSignature(user, file);

    expect(storageMock.ensureBucket).toHaveBeenCalledWith("signature");
    expect(storageMock.putBuffer).toHaveBeenCalledWith({
      bucket: "signature",
      objectName: "123456/signature-123456.png",
      buffer: expect.any(Uint8Array),
      contentType: "image/png",
    });
    // Presign uses the shared 7-day expiry.
    const call = storageMock.getPresignedUrl.mock.calls[0][0];
    expect(call.bucket).toBe("signature");
    expect(call.objectName).toBe("123456/signature-123456.png");
    expect(call.expiresInSeconds).toBe(7 * 24 * 60 * 60);
    expect(record._id).toBe("new-file-id");
    expect(user.signatureImage).toBe("new-file-id");
    expect(await user.save).toHaveBeenCalled();
  });

  test("updates an existing File record instead of creating a duplicate", async () => {
    savedFileDoc = {
      _id: "existing-file-id",
      userId: "old-user",
      originalName: "old.png",
      mimeType: "image/jpeg",
      size: 1,
      presignedUrl: "stale",
      expiresAt: new Date(0),
      save: mock(async () => {}),
    };
    const user = makeUser({ personnelNumber: "777" });

    const record = await uploadUserSignature(user, makeFile());

    expect(record._id).toBe("existing-file-id");
    expect(savedFileDoc.userId).toBe("user-id-1");
    expect(savedFileDoc.originalName).toBe("sig.png");
    expect(savedFileDoc.presignedUrl).toBe(savedPresign);
    expect(savedFileDoc.mimeType).toBe("image/png");
    expect(FileMock.create).not.toHaveBeenCalled();
  });

  test("rejects a non-image file with the validator's status", async () => {
    const user = makeUser();

    try {
      await uploadUserSignature(user, makeFile({ type: "application/pdf" }));
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.status).toBe(415);
      expect(String(err.message)).toContain("JPEG");
    }
    expect(storageMock.putBuffer).not.toHaveBeenCalled();
  });

  test("rejects a file exceeding the 5MB limit", async () => {
    const user = makeUser();
    const big = makeFile({ size: 6 * 1024 * 1024 });

    try {
      await uploadUserSignature(user, big);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.status).toBe(413);
    }
    expect(storageMock.putBuffer).not.toHaveBeenCalled();
  });

  test("requires user and file", async () => {
    try {
      await uploadUserSignature(null, makeFile());
      throw new Error("should have thrown");
    } catch (err) {
      expect(String(err.message)).toContain("User is required");
    }
    try {
      await uploadUserSignature(makeUser(), null);
      throw new Error("should have thrown");
    } catch (err) {
      expect(String(err.message)).toContain("File is required");
    }
  });
});
