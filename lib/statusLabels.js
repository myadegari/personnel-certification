// Single source of truth for status display across admin + user surfaces.
// Raw enum values are used for logic only — never rendered to the user.
export {
  ENROLLMENT_STATUS,
  ENROLLMENT_STATUS_FILTERS,
  STATUS_TONE_CLASSES,
} from "@/lib/enrollmentStatus";

// Account status (User.status): Persian label + pill tone classes.
export const USER_STATUS_META = {
  PENDING: {
    label: "در انتظار تکمیل",
    tone: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20",
  },
  NEED_TO_VERIFY: {
    label: "در انتظار تایید",
    tone: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
  },
  VERIFIED: {
    label: "تایید شده",
    tone: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  },
  REJECTED: {
    label: "رد شده",
    tone: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
  },
};

export const USER_STATUS_LABELS = Object.fromEntries(
  Object.entries(USER_STATUS_META).map(([key, meta]) => [key, meta.label])
);

export const FALLBACK_STATUS_META = {
  label: "نامشخص",
  tone: "bg-stone-100 text-stone-600 ring-1 ring-inset ring-stone-500/20",
};

// Tone classes keyed by the semantic color names the @radix-ui/themes Badge
// API used before it was replaced with shadcn Badge + className.
export const BADGE_TONES = {
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  blue: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
  gray: "bg-stone-100 text-stone-600 ring-1 ring-inset ring-stone-500/20",
  ruby: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
  orange: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20",
  yellow: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
};
