// Single source of truth for enrollment status display + tone.
// The raw enum values (PENDING/APPROVED/REJECTED) are only used internally for
// logic and filtering — never rendered to the user.

export const ENROLLMENT_STATUS = {
  PENDING: { label: "در انتظار تایید", tone: "amber", locked: false },
  APPROVED: { label: "تایید شده", tone: "emerald", locked: true },
  REJECTED: { label: "رد شده", tone: "rose", locked: true },
};

export const ENROLLMENT_STATUS_FILTERS = [
  { value: "ALL", label: "همه" },
  { value: "PENDING", label: ENROLLMENT_STATUS.PENDING.label },
  { value: "APPROVED", label: ENROLLMENT_STATUS.APPROVED.label },
  { value: "REJECTED", label: ENROLLMENT_STATUS.REJECTED.label },
];

// Tailwind classes for the colored status pill, keyed by tone.
export const STATUS_TONE_CLASSES = {
  amber: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
  emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  rose: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
};
