// lib/auditConstants.js
// Client-safe audit constants (no mongoose imports) so the audit viewer page
// can render Persian labels without pulling server-only code into the bundle.

export const AUDIT_ACTIONS = {
  // Auth
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  IMPERSONATE_START: "IMPERSONATE_START",
  IMPERSONATE_END: "IMPERSONATE_END",
  PASSWORD_CHANGE: "PASSWORD_CHANGE",
  PASSWORD_RESET_REQUEST: "PASSWORD_RESET_REQUEST",
  PASSWORD_RESET: "PASSWORD_RESET",
  // User actions
  ENROLL: "ENROLL",
  // Admin: courses
  COURSE_CREATE: "COURSE_CREATE",
  COURSE_UPDATE: "COURSE_UPDATE",
  COURSE_DELETE: "COURSE_DELETE",
  // Admin: deputies
  DEPUTY_CREATE: "DEPUTY_CREATE",
  DEPUTY_UPDATE: "DEPUTY_UPDATE",
  DEPUTY_DELETE: "DEPUTY_DELETE",
  // Admin: enrollments
  ENROLLMENT_APPROVE: "ENROLLMENT_APPROVE",
  ENROLLMENT_REJECT: "ENROLLMENT_REJECT",
  ENROLLMENT_BULK: "ENROLLMENT_BULK",
  // Admin: users
  USER_CREATE: "USER_CREATE",
  USER_UPDATE: "USER_UPDATE",
  USER_DELETE: "USER_DELETE",
  USER_STATUS_UPDATE: "USER_STATUS_UPDATE",
  USER_IMPORT: "USER_IMPORT",
  SIGNATURE_UPDATE: "SIGNATURE_UPDATE",
  // Admin: media
  MEDIA_UPLOAD: "MEDIA_UPLOAD",
  MEDIA_UPDATE: "MEDIA_UPDATE",
  MEDIA_DELETE: "MEDIA_DELETE",
  // Certificates
  CERTIFICATE_ISSUED: "CERTIFICATE_ISSUED",
};

export const AUDIT_ACTION_LABELS_FA = {
  [AUDIT_ACTIONS.LOGIN]: "ورود به سامانه",
  [AUDIT_ACTIONS.LOGOUT]: "خروج از سامانه",
  [AUDIT_ACTIONS.IMPERSONATE_START]: "ورود مدیر به حساب",
  [AUDIT_ACTIONS.IMPERSONATE_END]: "خروج مدیر از حساب",
  [AUDIT_ACTIONS.PASSWORD_CHANGE]: "تغییر رمز عبور",
  [AUDIT_ACTIONS.PASSWORD_RESET_REQUEST]: "درخواست بازنشانی رمز",
  [AUDIT_ACTIONS.PASSWORD_RESET]: "بازنشانی رمز عبور",
  [AUDIT_ACTIONS.ENROLL]: "ثبت‌نام در دوره",
  [AUDIT_ACTIONS.COURSE_CREATE]: "ایجاد دوره",
  [AUDIT_ACTIONS.COURSE_UPDATE]: "ویرایش دوره",
  [AUDIT_ACTIONS.COURSE_DELETE]: "حذف دوره",
  [AUDIT_ACTIONS.DEPUTY_CREATE]: "ایجاد معاونت",
  [AUDIT_ACTIONS.DEPUTY_UPDATE]: "ویرایش معاونت",
  [AUDIT_ACTIONS.DEPUTY_DELETE]: "حذف معاونت",
  [AUDIT_ACTIONS.ENROLLMENT_APPROVE]: "تایید ثبت‌نام",
  [AUDIT_ACTIONS.ENROLLMENT_REJECT]: "رد ثبت‌نام",
  [AUDIT_ACTIONS.ENROLLMENT_BULK]: "عملیات گروهی ثبت‌نام",
  [AUDIT_ACTIONS.USER_CREATE]: "ایجاد کاربر",
  [AUDIT_ACTIONS.USER_UPDATE]: "ویرایش کاربر",
  [AUDIT_ACTIONS.USER_DELETE]: "حذف کاربر",
  [AUDIT_ACTIONS.USER_STATUS_UPDATE]: "تغییر وضعیت کاربر",
  [AUDIT_ACTIONS.USER_IMPORT]: "ورود گروهی کاربران",
  [AUDIT_ACTIONS.SIGNATURE_UPDATE]: "بروزرسانی امضا",
  [AUDIT_ACTIONS.MEDIA_UPLOAD]: "بارگذاری رسانه",
  [AUDIT_ACTIONS.MEDIA_UPDATE]: "ویرایش رسانه",
  [AUDIT_ACTIONS.MEDIA_DELETE]: "حذف رسانه",
  [AUDIT_ACTIONS.CERTIFICATE_ISSUED]: "صدور گواهی",
};

export const AUDIT_RESOURCE_TYPES = {
  AUTH: "auth",
  USER: "user",
  COURSE: "course",
  DEPUTY: "deputy",
  ENROLLMENT: "enrollment",
  MEDIA: "media",
  CERTIFICATE: "certificate",
};

export const AUDIT_RESOURCE_LABELS_FA = {
  [AUDIT_RESOURCE_TYPES.AUTH]: "احراز هویت",
  [AUDIT_RESOURCE_TYPES.USER]: "کاربر",
  [AUDIT_RESOURCE_TYPES.COURSE]: "دوره",
  [AUDIT_RESOURCE_TYPES.DEPUTY]: "معاونت",
  [AUDIT_RESOURCE_TYPES.ENROLLMENT]: "ثبت‌نام",
  [AUDIT_RESOURCE_TYPES.MEDIA]: "رسانه",
  [AUDIT_RESOURCE_TYPES.CERTIFICATE]: "گواهی",
};
