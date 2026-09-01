import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function getSiteUrl() {
  const url = process.env.PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

// Email clients ignore flex/grid and most CSS; this shell is a table-based,
// inline-styled RTL layout. The logo is a hosted absolute URL (the app
// excludes static brand assets from auth middleware so mail clients can
// fetch them); its alt text keeps the header readable if the server is
// unreachable.
function emailShell({ heading, bodyHtml, ctaHtml }) {
  const logoUrl = `${getSiteUrl()}/logo.png`;
  return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
  <body style="margin:0;padding:0;background-color:#f3f6f5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f6f5" style="background-color:#f3f6f5;">
      <tr>
        <td align="center" style="padding:28px 12px;font-family:Tahoma,'Segoe UI',Arial,sans-serif;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
            <tr>
              <td align="center" bgcolor="#ecfdf5" style="padding:26px 24px;background-color:#ecfdf5;">
                <img src="${logoUrl}" alt="گواهیار" width="150" style="display:block;border:0;outline:none;text-decoration:none;" />
              </td>
            </tr>
            <tr>
              <td style="padding:30px 32px 8px 32px;">
                <h1 style="margin:0 0 14px 0;font-size:20px;line-height:1.6;font-weight:bold;color:#065f46;">${heading}</h1>
                <div style="font-size:15px;line-height:2;color:#1f2937;">
                  ${bodyHtml}
                </div>
                ${ctaHtml ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 6px 0;">
                  <tr><td align="center" bgcolor="#059669" style="border-radius:10px;background-color:#059669;">
                    ${ctaHtml}
                  </td></tr>
                </table>` : ""}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 30px 32px;">
                <p style="margin:0;font-size:12px;line-height:1.9;color:#9ca3af;">
                  این پیام به‌صورت خودکار توسط گواهیار ارسال شده است؛ لطفاً به آن پاسخ ندهید.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" bgcolor="#f9fafb" style="padding:16px 24px;border-top:1px solid #e5e7eb;background-color:#f9fafb;">
                <p style="margin:0;font-size:12px;line-height:1.8;color:#6b7280;">
                  مجتمع آموزش عالی لارستان — گواهیار
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function ctaButton(url, label) {
  return `<a href="${url}" style="display:inline-block;padding:12px 30px;font-family:Tahoma,'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;background-color:#059669;border-radius:10px;text-decoration:none;">${label}</a>`;
}

function tokenBox(token) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;">
    <tr>
      <td align="center" bgcolor="#f9fafb" style="padding:14px;border:1px dashed #d1d5db;border-radius:10px;background-color:#f9fafb;">
        <span dir="ltr" style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:bold;letter-spacing:3px;color:#111827;">${token}</span>
      </td>
    </tr>
  </table>`;
}

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"گواهیار" <${process.env.GMAIL_EMAIL}>`,
      to,
      subject,
      html,
    });

    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

export const sendForgotPasswordEmail = async (email, resetToken) => {
  const subject = "درخواست بازنشانی رمز عبور";
  const resetUrl = `${getSiteUrl()}/authentication/forgot-password?token=${encodeURIComponent(resetToken)}`;
  const html = emailShell({
    heading: "بازنشانی رمز عبور",
    bodyHtml: `
      <p style="margin:0 0 12px 0;">سلام،</p>
      <p style="margin:0 0 14px 0;">درخواستی برای بازنشانی رمز عبور حساب شما ثبت شده است. برای انتخاب رمز عبور جدید روی دکمه زیر بزنید:</p>
      ${tokenBox(resetToken)}
      <p style="margin:0;font-size:13px;color:#6b7280;">
        این درخواست تا <strong style="color:#b45309;">۱۰ دقیقه</strong> اعتبار دارد. اگر چنین درخواستی نداده‌اید، این ایمیل را نادیده بگیرید؛ رمز عبور شما تغییر نخواهد کرد.
      </p>
    `,
    ctaHtml: ctaButton(resetUrl, "بازنشانی رمز عبور"),
  });
  return sendEmail({ to: email, subject, html });
};

export const sendAdminNotificationEmail = async (email, status) => {
  let subject, html;

  if (status === "VERIFIED") {
    subject = "حساب کاربری شما تایید شد";
    const loginUrl = `${getSiteUrl()}/authentication/login`;
    html = emailShell({
      heading: "حساب کاربری شما تایید شد",
      bodyHtml: `
        <p style="margin:0 0 12px 0;">سلام،</p>
        <p style="margin:0;">حساب کاربری شما توسط مدیر گواهیار تایید شد. اکنون می‌توانید با ورود به حساب خود، از تمام امکانات سامانه استفاده کنید.</p>
      `,
      ctaHtml: ctaButton(loginUrl, "ورود به گواهیار"),
    });
  } else {
    subject = "حساب کاربری شما رد شد";
    html = emailShell({
      heading: "حساب کاربری شما رد شد",
      bodyHtml: `
        <p style="margin:0 0 12px 0;">سلام،</p>
        <p style="margin:0;">متأسفانه حساب کاربری شما توسط مدیر گواهیار تایید نشد. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.</p>
      `,
    });
  }

  return sendEmail({ to: email, subject, html });
};
