const verifyEmailOTPTemplate = (otp) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Email Verification</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.08);overflow:hidden;">

          <tr>
            <td style="padding:24px 32px;background:#0f172a;color:#ffffff;">
              <h2 style="margin:0;font-size:20px;font-weight:600;">GridVital</h2>
              <p style="margin:6px 0 0;font-size:13px;opacity:0.85;">
                Clinic Management System
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <h3 style="margin:0 0 12px;font-size:18px;color:#111827;">
                Verify Your Email Address
              </h3>

              <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.6;">
                Welcome to GridVital! Use the OTP below to verify your email address.
                This OTP is valid for <strong>10 minutes</strong>.
              </p>

              <div style="text-align:center;margin:28px 0;">
                <span style="display:inline-block;font-size:28px;letter-spacing:6px;font-weight:700;color:#0f172a;background:#f1f5f9;padding:14px 24px;border-radius:10px;">
                  ${otp}
                </span>
              </div>

              <p style="margin:0 0 16px;font-size:13px;color:#6b7280;line-height:1.6;">
                If you didn't create an account, you can safely ignore this email.
              </p>

              <p style="margin:0;font-size:13px;color:#6b7280;">
                — GridVital Team
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 32px;background:#f8fafc;text-align:center;font-size:12px;color:#9ca3af;">
              &copy; 2026 GridVital. All rights reserved.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

module.exports = verifyEmailOTPTemplate;
