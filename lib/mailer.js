import nodemailer from "nodemailer";

// This is a placeholder for sending emails.
// You will need to configure it with your actual email service provider (e.g., Gmail, SendGrid, etc.)
// For development, you can use a service like Ethereal (https://ethereal.email/) to catch emails.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"سامانه کارمندان" <${process.env.GMAIL_EMAIL}>`,
      to,
      subject,
      html,
    });

    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    // In a real app, you might want to throw the error or handle it differently
    return false;
  }
};

export const sendForgotPasswordEmail = async (email, resetToken) => {
  const subject = "درخواست بازنشانی رمز عبور";
  const html = `
        <h1>درخواست بازنشانی رمز عبور</h1>
        <p>شما درخواست بازنشانی رمز عبور داده‌اید. لطفاً از توکن زیر برای بازنشانی رمز عبور خود استفاده کنید:</p>
        <h2>${resetToken}</h2>
        <p>این توکن در 10 دقیقه منقضی خواهد شد.</p>
      `;
  return sendEmail({ to: email, subject, html });
};


export const sendAdminNotificationEmail = async (email, status) => {
  let subject, html;

  if (status === "VERIFIED") {
    subject = "حساب کاربری شما تایید شد";
    html = `<p>سلام،</p>
                <p>حساب کاربری شما توسط مدیر سامانه تایید شد. اکنون می‌توانید با دسترسی کامل از امکانات برنامه استفاده کنید.</p>
                <a href="${process.env.NEXTAUTH_URL}/authentication/login">ورود به سامانه</a>`;
  } else {
    // rejected
    subject = "حساب کاربری شما رد شد";
    html = `<p>سلام،</p>
                <p>متاسفانه حساب کاربری شما در سامانه توسط مدیر رد شد. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.</p>`;
  }

  return sendEmail({ to: email, subject, html });
};
