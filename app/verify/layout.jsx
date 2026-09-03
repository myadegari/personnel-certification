/* FILE: app/verify/layout.js */
import Image from "next/image";
import universityLogo from '@/public/universityLogo.jpg';

// Shared on every certificate link, so the share preview should say what the
// page is even before the id-specific metadata resolves.
export const metadata = {
  title: "اعتبارسنجی گواهینامه",
  description: "اعتبارسنجی گواهینامه‌های صادرشده توسط سامانه گواهیار",
  robots: { index: false, follow: false },
};

// Verify pages render inside a flex column: the child (verdict + PDF viewer)
// flexes to fill the viewport minus the institutional footer, so the only
// trust branding on this public page is always visible without scrolling.
export default function VerifyLayout({ children }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {children}

      <footer className="border-t border-border bg-card py-4">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-row-reverse gap-2 justify-center items-center">
            <div className="text-xs text-muted-foreground grid gap-1 w-fit">
              <p className="font-bold">مجتمع آموزش عالی لارستان</p>
              <p>Larestan Higher Education Complex</p>
            </div>
            <Image
              src={universityLogo}
              width={55}
              height={50}
              alt="لوگوی مجتمع آموزش عالی لارستان"
              className="object-contain opacity-80"
              priority={false}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
