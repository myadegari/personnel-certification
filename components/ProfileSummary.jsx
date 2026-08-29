"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFileUrl } from "@/hooks/useFileUrl";
import { ROLE_LABELS_FA } from "@/lib/roles";
import { USER_STATUS_LABELS } from "@/lib/statusLabels";

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-2 last:border-b-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value || "-"}</span>
    </div>
  );
}

export default function ProfileSummary({ user }) {
  const signatureFileQuery = useFileUrl(user?.signatureImage);

  return (
    <Card className="gap-0">
      <CardHeader>
        <CardTitle>اطلاعات پروفایل</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div>
          <InfoRow label="نام" value={`${user.firstName || ""} ${user.lastName || ""}`.trim()} />
          <InfoRow label="شماره پرسنلی" value={<span dir="ltr">{user.personnelNumber}</span>} />
          <InfoRow label="کد ملی" value={<span dir="ltr">{user.nationalId}</span>} />
          <InfoRow label="ایمیل" value={<span dir="ltr">{user.email}</span>} />
          <InfoRow label="سمت" value={user.position} />
          <InfoRow label="عضو هیات علمی" value={user.isProfessor ? "بله" : "خیر"} />
          <InfoRow label="نقش" value={ROLE_LABELS_FA[user.role] || "نامشخص"} />
          <InfoRow label="وضعیت" value={USER_STATUS_LABELS[user.status] || "نامشخص"} />
        </div>

        {(signatureFileQuery.isLoading || signatureFileQuery.data) && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <span className="text-sm text-gray-500">امضای کاربر</span>
            {signatureFileQuery.isLoading ? (
              <div className="mt-2 h-20 w-40 rounded-lg bg-gray-200 animate-pulse"></div>
            ) : (
              <img
                src={signatureFileQuery.data}
                alt="امضای کاربر"
                width={160}
                height={80}
                className="mt-2 h-20 w-40 rounded-lg border border-gray-200 bg-gray-50 object-contain p-2"
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
