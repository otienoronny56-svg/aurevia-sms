/**
 * Aurevia Specialty Coffee Academy - Institutional Email Templates
 * Responsive, dark luxury & crema gold HTML email templates compatible with all major email clients.
 */

const BASE_STYLES = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #E6E1DC;
  background-color: #120E0C;
  margin: 0;
  padding: 0;
  line-height: 1.6;
`;

const CARD_STYLES = `
  background-color: #1E1713;
  border: 1px solid #3A2E26;
  border-radius: 12px;
  padding: 28px 22px;
  max-width: 600px;
  width: 100%;
  box-sizing: border-box;
  margin: 16px auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
`;

const RESPONSIVE_CSS = `
  <style>
    @media only screen and (max-width: 600px) {
      .email-card {
        padding: 20px 16px !important;
        border-radius: 8px !important;
      }
      .email-title {
        font-size: 20px !important;
      }
      .email-btn {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
        box-sizing: border-box !important;
        padding: 14px 20px !important;
      }
      .detail-table td {
        font-size: 12px !important;
        padding: 6px 4px !important;
      }
    }
  </style>
`;

const HEADER_STYLES = `
  text-align: center;
  border-bottom: 1px solid #3A2E26;
  padding-bottom: 24px;
  margin-bottom: 24px;
`;

const LOGO_BADGE = `
  display: inline-block;
  background: linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%);
  color: #181310;
  font-weight: 800;
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 20px;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 12px;
`;

const FOOTER_STYLES = `
  text-align: center;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid #2E231C;
  font-size: 12px;
  color: #8C7E74;
`;

const BUTTON_STYLES = `
  display: inline-block;
  background: linear-gradient(135deg, #D49A5B 0%, #B87B3C 100%);
  color: #181310;
  font-weight: 700;
  font-size: 14px;
  padding: 12px 28px;
  border-radius: 6px;
  text-decoration: none;
  margin: 18px 0;
  box-sizing: border-box;
`;

export interface WelcomeAdmissionEmailParams {
  studentName: string;
  regNumber: string;
  courseTitle: string;
  cohortName: string;
  branchName: string;
  scheduleTiming?: string;
  startDate?: string;
  googleMeetLink?: string;
  portalUrl?: string;
}

export function generateWelcomeAdmissionEmailHtml(params: WelcomeAdmissionEmailParams): string {
  const portalUrl = params.portalUrl || 'https://aureviacoffee.com/student/portal';
  const meetLink = params.googleMeetLink || 'https://meet.google.com/aur-sca-2026';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Aurevia Specialty Coffee Academy</title>
  ${RESPONSIVE_CSS}
</head>
<body style="${BASE_STYLES}">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #120E0C; padding: 12px 6px;">
    <tr>
      <td align="center">
        <div class="email-card" style="${CARD_STYLES}">
          <div style="${HEADER_STYLES}">
            <div style="${LOGO_BADGE}">AUREVIA SPECIALTY COFFEE ACADEMY</div>
            <h1 class="email-title" style="color: #F5EBE1; font-size: 24px; font-weight: 800; margin: 8px 0 4px 0;">Official Enrollment Confirmation</h1>
            <p style="color: #D49A5B; font-size: 13px; font-weight: 600; margin: 0; font-family: monospace;">REG: ${params.regNumber}</p>
          </div>

          <p style="font-size: 15px; color: #E6E1DC;">Dear <strong>${params.studentName}</strong>,</p>
          <p style="font-size: 14px; color: #C4B8AD; line-height: 1.6;">
            Congratulations on your formal admission to <strong>Aurevia Specialty Coffee Academy</strong>. Your trainee record has been verified and registered in the SCA international training database.
          </p>

          <table class="detail-table" width="100%" style="background-color: #271E19; border: 1px solid #443429; border-radius: 6px; padding: 16px; margin: 20px 0; font-size: 13px; color: #E6E1DC;">
            <tr>
              <td style="padding: 6px 0; color: #A89B8F; width: 38%;">Enrolled Program:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #F5EBE1;">${params.courseTitle}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #A89B8F;">Assigned Cohort:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #D49A5B;">${params.cohortName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #A89B8F;">Campus / Branch:</td>
              <td style="padding: 6px 0; color: #F5EBE1;">${params.branchName}</td>
            </tr>
            ${params.scheduleTiming ? `
            <tr>
              <td style="padding: 6px 0; color: #A89B8F;">Practical Lab Timing:</td>
              <td style="padding: 6px 0; color: #F5EBE1;">${params.scheduleTiming}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 6px 0; color: #A89B8F;">Virtual Classroom:</td>
              <td style="padding: 6px 0;"><a href="${meetLink}" style="color: #38BDF8; text-decoration: none; font-weight: 600;">Open Google Meet Class</a></td>
            </tr>
          </table>

          <div style="background-color: rgba(212, 154, 91, 0.08); border-left: 3px solid #D49A5B; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #D6C7BB;">
            <strong>Mandatory SCA Academic Requirement:</strong> Trainees are required to maintain a minimum of <strong>80% attendance</strong> across physical espresso lab calibrations and theory webinars to qualify for practical examinations.
          </div>

          <div style="text-align: center; margin: 26px 0;">
            <a href="${portalUrl}" class="email-btn" style="${BUTTON_STYLES}">Access Student Portal & Dossier</a>
          </div>

          <p style="font-size: 13px; color: #A89B8F; line-height: 1.5;">
            You may log in to review your class modules, tuition ledger, download your signed enrollment agreement, or update your emergency contact details.
          </p>

          <div style="${FOOTER_STYLES}">
            <p style="margin: 4px 0;"><strong>Aurevia Specialty Coffee Academy & Roastery</strong></p>
            <p style="margin: 4px 0;">SCA Premier Training Campus • Nairobi • Mombasa • Eldoret • Kigali</p>
            <p style="margin: 4px 0; color: #635850;">This is an automated institutional message. For inquiries, reply to this email or contact your Campus Registrar.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export interface TuitionReceiptEmailParams {
  studentName: string;
  regNumber: string;
  courseTitle: string;
  amountPaid: number;
  receiptNumber: string;
  mpesaCode: string;
  balanceDue: number;
  paymentDate?: string;
}

export function generateTuitionReceiptEmailHtml(params: TuitionReceiptEmailParams): string {
  const dateStr = params.paymentDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const isFullyCleared = params.balanceDue <= 0;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tuition Payment Receipt - Aurevia</title>
  ${RESPONSIVE_CSS}
</head>
<body style="${BASE_STYLES}">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #120E0C; padding: 12px 6px;">
    <tr>
      <td align="center">
        <div class="email-card" style="${CARD_STYLES}">
          <div style="${HEADER_STYLES}">
            <div style="${LOGO_BADGE}">OFFICIAL PAYMENT RECEIPT</div>
            <h1 class="email-title" style="color: #F5EBE1; font-size: 24px; font-weight: 800; margin: 8px 0 4px 0;">Tuition Payment Confirmation</h1>
            <p style="color: #10B981; font-size: 13px; font-weight: 700; margin: 0;">RECEIPT: ${params.receiptNumber}</p>
          </div>

          <p style="font-size: 15px; color: #E6E1DC;">Dear <strong>${params.studentName}</strong>,</p>
          <p style="font-size: 14px; color: #C4B8AD; line-height: 1.6;">
            We gratefully acknowledge receipt of your tuition installment for <strong>${params.courseTitle}</strong>. Your payment has been credited to your student financial ledger.
          </p>

          <table class="detail-table" width="100%" style="background-color: #271E19; border: 1px solid #443429; border-radius: 6px; padding: 18px; margin: 20px 0; font-size: 13px; color: #E6E1DC;">
            <tr>
              <td style="padding: 6px 0; color: #A89B8F; width: 40%;">Amount Paid:</td>
              <td style="padding: 6px 0; font-weight: 800; font-size: 17px; color: #10B981;">KES ${params.amountPaid.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #A89B8F;">M-Pesa Reference:</td>
              <td style="padding: 6px 0; font-family: monospace; font-weight: 700; color: #D49A5B;">${params.mpesaCode}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #A89B8F;">Payment Date:</td>
              <td style="padding: 6px 0; color: #F5EBE1;">${dateStr}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #A89B8F;">Trainee Reg No:</td>
              <td style="padding: 6px 0; font-family: monospace; color: #F5EBE1;">${params.regNumber}</td>
            </tr>
            <tr style="border-top: 1px dashed #443429;">
              <td style="padding: 10px 0 4px 0; color: #A89B8F;">Remaining Balance:</td>
              <td style="padding: 10px 0 4px 0; font-weight: 700; color: ${isFullyCleared ? '#10B981' : '#F59E0B'};">
                ${isFullyCleared ? 'KES 0 (FULLY CLEARED)' : `KES ${params.balanceDue.toLocaleString()}`}
              </td>
            </tr>
          </table>

          ${isFullyCleared ? `
          <div style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 12px 16px; margin: 18px 0; font-size: 13px; color: #10B981; text-align: center;">
            ✓ <strong>Tuition Account Fully Settled:</strong> Your official graduation certificate and SCA practical examination eligibility are fully unlocked upon completion!
          </div>` : `
          <div style="background-color: rgba(245, 158, 11, 0.08); border-left: 3px solid #F59E0B; padding: 12px 16px; margin: 18px 0; font-size: 13px; color: #D6C7BB;">
            Please ensure remaining balance of <strong>KES ${params.balanceDue.toLocaleString()}</strong> is cleared prior to the final practical calibration week.
          </div>`}

          <div style="${FOOTER_STYLES}">
            <p style="margin: 4px 0;"><strong>Aurevia Specialty Coffee Academy Finance Office</strong></p>
            <p style="margin: 4px 0;">Official Safaricom M-Pesa Integration • Paybill 400200</p>
            <p style="margin: 4px 0; color: #635850;">Keep this receipt for your personal records or sponsor reimbursement.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export interface AgreementSignedEmailParams {
  studentName: string;
  regNumber: string;
  courseTitle: string;
  signedAt: string;
  mediaConsentGranted: boolean;
}

export function generateAgreementSignedEmailHtml(params: AgreementSignedEmailParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aurevia Institutional Agreement Signed</title>
  ${RESPONSIVE_CSS}
</head>
<body style="${BASE_STYLES}">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #120E0C; padding: 12px 6px;">
    <tr>
      <td align="center">
        <div class="email-card" style="${CARD_STYLES}">
          <div style="${HEADER_STYLES}">
            <div style="${LOGO_BADGE}">ACCREDITATION AGREEMENT</div>
            <h1 class="email-title" style="color: #F5EBE1; font-size: 22px; font-weight: 800; margin: 8px 0 4px 0;">Signed Terms & Code of Conduct</h1>
            <p style="color: #10B981; font-size: 12px; font-weight: 600; margin: 0;">✓ Digitally Executed & Bound</p>
          </div>

          <p style="font-size: 15px; color: #E6E1DC;">Dear <strong>${params.studentName}</strong> (${params.regNumber}),</p>
          <p style="font-size: 14px; color: #C4B8AD; line-height: 1.6;">
            This confirmation validates that you have digitally reviewed and accepted the <strong>Aurevia Specialty Coffee Academy Enrollment Agreement, 80% Attendance Requirement, Commercial Espresso Lab Safety Standards, and Data Protection policies</strong> for <em>${params.courseTitle}</em>.
          </p>

          <table class="detail-table" width="100%" style="background-color: #271E19; border: 1px solid #443429; border-radius: 6px; padding: 16px; margin: 18px 0; font-size: 13px; color: #E6E1DC;">
            <tr>
              <td style="padding: 6px 0; color: #A89B8F; width: 42%;">Execution Date:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #F5EBE1;">${params.signedAt}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #A89B8F;">Attendance Mandate:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #10B981;">80% Minimum Threshold Accepted</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #A89B8F;">Photo/Video Release:</td>
              <td style="padding: 6px 0; font-weight: 600; color: ${params.mediaConsentGranted ? '#10B981' : '#F59E0B'};">
                ${params.mediaConsentGranted ? 'Consent Granted (Promotional Media Authorized)' : 'Opted Out (Private Training Only)'}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #A89B8F;">Legal Governance:</td>
              <td style="padding: 6px 0; color: #F5EBE1;">Kenya Data Protection Act (2019)</td>
            </tr>
          </table>

          <p style="font-size: 13px; color: #A89B8F; line-height: 1.5;">
            An official certified PDF copy of your agreement letter is available to download inside your student portal under the <em>Agreements & Consents</em> tab.
          </p>

          <div style="${FOOTER_STYLES}">
            <p style="margin: 4px 0;"><strong>Aurevia Specialty Coffee Academy Registry</strong></p>
            <p style="margin: 4px 0;">Official Institutional Document Record</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export interface BroadcastNotificationEmailParams {
  recipientName: string;
  subject: string;
  messageContent: string;
  purposeBadge?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export function generateBroadcastEmailHtml(params: BroadcastNotificationEmailParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.subject}</title>
  ${RESPONSIVE_CSS}
</head>
<body style="${BASE_STYLES}">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #120E0C; padding: 12px 6px;">
    <tr>
      <td align="center">
        <div class="email-card" style="${CARD_STYLES}">
          <div style="${HEADER_STYLES}">
            <div style="${LOGO_BADGE}">AUREVIA COFFEE ACADEMY</div>
            <h1 class="email-title" style="color: #F5EBE1; font-size: 22px; font-weight: 800; margin: 8px 0 4px 0;">${params.subject}</h1>
            ${params.purposeBadge ? `<span style="background: rgba(212,154,91,0.15); color: #D49A5B; font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600;">${params.purposeBadge}</span>` : ''}
          </div>

          <p style="font-size: 15px; color: #E6E1DC;">Dear <strong>${params.recipientName}</strong>,</p>
          
          <div style="font-size: 14px; color: #D6C7BB; line-height: 1.7; margin: 18px 0; white-space: pre-line;">
            ${params.messageContent}
          </div>

          ${params.actionUrl ? `
          <div style="text-align: center; margin: 28px 0;">
            <a href="${params.actionUrl}" class="email-btn" style="${BUTTON_STYLES}">${params.actionLabel || 'View Student Portal'}</a>
          </div>` : ''}

          <div style="${FOOTER_STYLES}">
            <p style="margin: 4px 0;"><strong>Aurevia Specialty Coffee Academy & Roastery</strong></p>
            <p style="margin: 4px 0;">Specialty Coffee Association (SCA) Accredited Campus</p>
            <p style="margin: 4px 0; color: #635850;">Nairobi • Mombasa • Eldoret • Kigali</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
