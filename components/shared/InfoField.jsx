"use client";

/**
 * Icon + label + value row used across profile-style surfaces (profile page,
 * user detail sheet) for a consistent look.
 */
export default function InfoField({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/5 bg-white/60 p-3 transition-colors hover:bg-white">
      {Icon && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
          <Icon className="size-4" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-gray-800">{value || "—"}</p>
      </div>
    </div>
  );
}
