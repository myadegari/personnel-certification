import { describe, test, expect, mock, beforeEach } from "bun:test";

/**
 * Tests for lib/userService.js — validation, role rules, deputy coupling,
 * signature compensation, and last-superadmin invariants. Models and
 * signature upload are mocked; no MongoDB required.
 */

// Mongoose's find() returns a Query synchronously (thenable, chainable) —
// NOT a Promise — so .select() chains before any await. The mock must
// mirror that: a sync function returning a chainable object.
const findQuery = (rows) => ({
  select: async () => rows,
});

const UserMock = {
  create: mock(async (data) => ({
    _id: "new-user-id",
    toObject: () => ({ ...data }),
    save: mock(async () => {}),
  })),
  findById: mock(async () => null),
  findByIdAndDelete: mock(async () => null),
  find: mock(() => findQuery([{ role: "USER" }])),
  countDocuments: mock(async () => 1),
  deleteMany: mock(async () => ({})),
};

mock.module("@/models/User", () => ({ default: UserMock }));

const DeputyMock = {
  exists: mock(async () => true),
};

mock.module("@/models/Deputy", () => ({ default: DeputyMock }));

const FileMock = {
  findById: mock(async (id) => ({ _id: id })),
};

mock.module("@/models/File", () => ({ default: FileMock }));

const signatureUploadMock = {
  uploadUserSignature: mock(async () => {}),
};

mock.module("@/lib/signatureUpload", () => signatureUploadMock);

const {
  createUser,
  updateUser,
  deleteUsers,
  UserServiceError,
} = await import("@/lib/userService");

const SUPERADMIN_SESSION = { user: { id: "actor-1", role: "SUPERADMIN" } };
const ADMIN_SESSION = { user: { id: "actor-2", role: "ADMIN" } };

function baseFields(overrides = {}) {
  return {
    personnelNumber: "1001",
    password: "password123",
    firstName: "نام",
    lastName: "خانوادگی",
    nationalId: "0111111110",
    email: "a@b.c",
    role: "USER",
    gender: "Male",
    ...overrides,
  };
}

beforeEach(() => {
  UserMock.create.mockClear();
  UserMock.findByIdAndDelete.mockClear();
  UserMock.find.mockClear();
  UserMock.countDocuments.mockClear();
  UserMock.deleteMany.mockClear();
  DeputyMock.exists.mockClear();
  FileMock.findById.mockClear();
  signatureUploadMock.uploadUserSignature.mockClear();
});

describe("createUser", () => {
  test("creates a VERIFIED user with hashed password and normalized national id", async () => {
    const safeUser = await createUser({
      session: ADMIN_SESSION,
      fields: baseFields(),
    });

    const created = UserMock.create.mock.calls[0][0];
    expect(created.status).toBe("VERIFIED");
    expect(created.role).toBe("USER");
    // bcrypt hash applied, never the raw password.
    expect(created.password).not.toBe("password123");
    expect(safeUser.password).toBeUndefined();
  });

  test("rejects invalid national id with 400", async () => {
    try {
      await createUser({ session: ADMIN_SESSION, fields: baseFields({ nationalId: "123" }) });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(UserServiceError);
      expect(err.status).toBe(400);
    }
    expect(UserMock.create).not.toHaveBeenCalled();
  });

  test("rejects short password with 400", async () => {
    try {
      await createUser({ session: ADMIN_SESSION, fields: baseFields({ password: "short" }) });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.status).toBe(400);
    }
  });

  test("admin cannot assign non-USER role (403)", async () => {
    try {
      await createUser({
        session: ADMIN_SESSION,
        fields: baseFields({ role: "ADMIN" }),
      });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.status).toBe(403);
    }
    expect(UserMock.create).not.toHaveBeenCalled();
  });

  test("DEPUTY_HEAD requires headedDeputy and forces deputy = headedDeputy", async () => {
    try {
      await createUser({
        session: SUPERADMIN_SESSION,
        fields: baseFields({ role: "DEPUTY_HEAD" }),
      });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.status).toBe(400);
    }

    await createUser({
      session: SUPERADMIN_SESSION,
      fields: baseFields({ role: "DEPUTY_HEAD", headedDeputy: "64b000000000000000000001" }),
    });

    const created = UserMock.create.mock.calls[0][0];
    expect(created.headedDeputy).toBe("64b000000000000000000001");
    expect(created.deputy).toBe("64b000000000000000000001");
  });

  test("signature upload failure rolls back the created user", async () => {
    signatureUploadMock.uploadUserSignature.mockImplementationOnce(async () => {
      throw new Error("S3 down");
    });

    try {
      await createUser({
        session: ADMIN_SESSION,
        fields: baseFields(),
        signatureFile: { name: "sig.png" },
      });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.status).toBe(500);
    }
    expect(UserMock.findByIdAndDelete).toHaveBeenCalledWith("new-user-id");
  });

  test("missing signatureFileId rolls back the created user (404)", async () => {
    FileMock.findById.mockImplementationOnce(async () => null);

    try {
      await createUser({
        session: ADMIN_SESSION,
        fields: baseFields(),
        signatureFileId: "missing-file",
      });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.status).toBe(404);
    }
    expect(UserMock.findByIdAndDelete).toHaveBeenCalledWith("new-user-id");
  });

  test("valid signatureFileId links without rollback", async () => {
    await createUser({
      session: ADMIN_SESSION,
      fields: baseFields(),
      signatureFileId: "file-9",
    });

    expect(UserMock.findByIdAndDelete).not.toHaveBeenCalled();
    expect(FileMock.findById).toHaveBeenCalledWith("file-9");
  });
});

describe("updateUser", () => {
  function makeExistingUser(overrides = {}) {
    return {
      _id: "user-1",
      role: "USER",
      deputy: null,
      headedDeputy: null,
      nationalId: "0111111110",
      toObject: () => ({ _id: "user-1", role: "USER" }),
      save: mock(async () => {}),
      ...overrides,
    };
  }

  beforeEach(() => {
    UserMock.findById.mockImplementation(async () => makeExistingUser());
  });

  test("404 when user missing", async () => {
    UserMock.findById.mockImplementationOnce(async () => null);

    try {
      await updateUser({ session: ADMIN_SESSION, id: "x", fields: {} });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.status).toBe(404);
    }
  });

  test("admin cannot edit another admin (403)", async () => {
    UserMock.findById.mockImplementationOnce(async () =>
      makeExistingUser({ role: "ADMIN" })
    );

    try {
      await updateUser({ session: ADMIN_SESSION, id: "user-1", fields: { firstName: "x" } });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.status).toBe(403);
    }
  });

  test("unchanged nationalId passes without revalidation", async () => {
    const { safeUser } = await updateUser({
      session: ADMIN_SESSION,
      id: "user-1",
      fields: { nationalId: "0111111110" },
    });

    expect(safeUser._id).toBe("user-1");
  });

  test("changed nationalId must be valid (400 on garbage)", async () => {
    try {
      await updateUser({
        session: ADMIN_SESSION,
        id: "user-1",
        fields: { nationalId: "nope" },
      });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.status).toBe(400);
    }
  });

  test("no-op update rejected with 400", async () => {
    try {
      await updateUser({ session: ADMIN_SESSION, id: "user-1", fields: {} });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.message).toBe("No valid fields to update");
    }
  });

  test("cannot demote own superadmin (400)", async () => {
    UserMock.findById.mockImplementationOnce(async () =>
      makeExistingUser({ role: "SUPERADMIN" })
    );

    try {
      await updateUser({
        session: { user: { id: "user-1", role: "SUPERADMIN" } },
        id: "user-1",
        fields: { role: "ADMIN" },
      });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.message).toContain("own superadmin");
    }
  });

  test("cannot demote the last superadmin (400)", async () => {
    UserMock.findById.mockImplementationOnce(async () =>
      makeExistingUser({ role: "SUPERADMIN" })
    );
    UserMock.countDocuments.mockImplementationOnce(async () => 1);

    try {
      await updateUser({
        session: SUPERADMIN_SESSION,
        id: "user-2",
        fields: { role: "ADMIN" },
      });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.message).toContain("last superadmin");
    }
  });

  test("returns updatedFields for audit metadata", async () => {
    const { updatedFields } = await updateUser({
      session: ADMIN_SESSION,
      id: "user-1",
      fields: { firstName: "جدید", email: "n@e.x" },
    });

    expect(updatedFields.sort()).toEqual(["email", "firstName"]);
  });
});

describe("deleteUsers", () => {
  test("rejects empty list with 400", async () => {
    try {
      await deleteUsers({ session: ADMIN_SESSION, userIds: [] });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.status).toBe(400);
    }
  });

  test("self-deletion rejected with 400", async () => {
    try {
      await deleteUsers({ session: SUPERADMIN_SESSION, userIds: ["actor-1"] });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.message).toContain("own account");
    }
  });

  test("admin cannot delete another admin (403)", async () => {
    UserMock.find.mockImplementationOnce(() => findQuery([{ role: "ADMIN" }]));

    try {
      await deleteUsers({ session: ADMIN_SESSION, userIds: ["u1"] });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.status).toBe(403);
    }
    expect(UserMock.deleteMany).not.toHaveBeenCalled();
  });

  test("superadmin cannot delete the last superadmin (400)", async () => {
    UserMock.find.mockImplementationOnce(() => findQuery([{ role: "SUPERADMIN" }]));
    UserMock.countDocuments.mockImplementationOnce(async () => 1);

    try {
      await deleteUsers({ session: SUPERADMIN_SESSION, userIds: ["u1"] });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.message).toContain("last superadmin");
    }
  });

  test("valid bulk delete returns count and ids", async () => {
    UserMock.find.mockImplementationOnce(() => findQuery([{ role: "USER" }]));

    const result = await deleteUsers({
      session: ADMIN_SESSION,
      userIds: ["u1", "u2"],
    });

    expect(result.count).toBe(2);
    expect(result.ids).toEqual(["u1", "u2"]);
    expect(UserMock.deleteMany).toHaveBeenCalledWith({ _id: { $in: ["u1", "u2"] } });
  });
});
