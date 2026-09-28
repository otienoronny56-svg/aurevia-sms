import { buildPaymentReceiptDoc } from './pdf';

export interface ReceiptShareData {
  studentName: string;
  studentEmail?: string;
  studentPhone?: string;
  regNumber?: string;
  courseTitle: string;
  receiptNumber: string;
  amount: number;
  totalFee?: number;
  balanceDue?: number;
  branchName?: string;
  paymentDate?: string;
}

export const formatReceiptWhatsAppMessage = (data: ReceiptShareData): string => {
  const dateStr = data.paymentDate || new Date().toLocaleDateString('en-GB');
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://aureviacoffeeinstitute.co.ke';
  const downloadLink = `${appOrigin}/receipt?ref=${data.receiptNumber}`;

  return `☕ *AUREVIA INSTITUTE OF SPECIALTY COFFEE*
📜 *OFFICIAL PAYMENT RECEIPT*
----------------------------------------
• *Receipt No:* ${data.receiptNumber}
• *Date:* ${dateStr}
• *Trainee:* ${data.studentName}
• *Reg No:* ${data.regNumber || 'N/A'}
• *Course:* ${data.courseTitle}
• *Amount Paid:* KES ${data.amount.toLocaleString()}
• *Balance Due:* KES ${(data.balanceDue ?? 0).toLocaleString()}
• *Status:* ${data.balanceDue === 0 ? '✅ FULLY CLEARED & PAID' : '⏳ PARTIAL CLEARANCE'}
• *Campus:* ${data.branchName || 'Aurevia Academy'}
----------------------------------------
📄 *Download Official PDF Receipt:*
${downloadLink}

Thank you for your payment. Keep brewing excellence!
🌐 aureviacoffeeinstitute.co.ke`;
};

export const formatReceiptEmailContent = (data: ReceiptShareData) => {
  const dateStr = data.paymentDate || new Date().toLocaleDateString('en-GB');
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://aureviacoffeeinstitute.co.ke';
  const downloadLink = `${appOrigin}/receipt?ref=${data.receiptNumber}`;

  const subject = `Official Fee Receipt: ${data.receiptNumber} - Aurevia Institute of Coffee`;
  const body = `Dear ${data.studentName},

We confirm that your payment has been received and verified by the Aurevia Institute of Specialty Coffee finance ledger.

TRANSACTION SUMMARY:
------------------------------------------------
Receipt Number:   ${data.receiptNumber}
Date Received:    ${dateStr}
Registration No:  ${data.regNumber || 'N/A'}
Enrolled Course:  ${data.courseTitle}
Amount Credited:  KES ${data.amount.toLocaleString()}
Outstanding Due:  KES ${(data.balanceDue ?? 0).toLocaleString()}
Payment Status:   ${data.balanceDue === 0 ? 'COMPLETED / FULLY PAID' : 'PARTIAL PAYMENT RECORDED'}
Campus Center:    ${data.branchName || 'Aurevia Academy'}
------------------------------------------------

📄 DOWNLOAD YOUR OFFICIAL PDF RECEIPT:
${downloadLink}

Your student dossier and examination clearance have been updated accordingly.

Warm regards,
Finance & Admissions Registry
Aurevia Specialty Coffee Academy
Website: https://aureviacoffeeinstitute.co.ke`;

  return { subject, body };
};

export const shareReceiptOnWhatsApp = (data: ReceiptShareData) => {
  const text = formatReceiptWhatsAppMessage(data);

  let cleanPhone = (data.studentPhone || '').replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '254' + cleanPhone.slice(1);
  } else if (cleanPhone.startsWith('7') || cleanPhone.startsWith('1')) {
    cleanPhone = '254' + cleanPhone;
  }

  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;

  window.open(url, '_blank');
};

export const shareReceiptViaEmail = (data: ReceiptShareData) => {
  const { subject, body } = formatReceiptEmailContent(data);
  const email = data.studentEmail || '';
  const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailtoUrl, '_blank');
};
