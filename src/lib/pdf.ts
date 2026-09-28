import jsPDF from 'jspdf';
import { Invoice, Payment, Profile, Enrollment, Assessment, Course, Branch } from '../types/database.types';

/**
 * Generates an official payment receipt PDF
 */
export function buildPaymentReceiptDoc(payment: Partial<Payment>, invoice: Partial<Invoice>, studentProfile: Partial<Profile>, branch?: Partial<Branch>): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Background Header
  doc.setFillColor(26, 20, 18); // Espresso obsidian
  doc.rect(0, 0, 210, 42, 'F');

  // Institution Branding
  doc.setTextColor(212, 154, 91); // Golden Crema
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('AUREVIA INSTITUTE OF COFFEE', 15, 20);

  doc.setTextColor(230, 230, 230);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Specialty Coffee Roastery & Barista Academy', 15, 27);
  doc.text(`${branch?.name || 'Nairobi Campus'} • ${branch?.phone || '+254 711 234 567'}`, 15, 33);

  // Document Title
  doc.setTextColor(26, 20, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('OFFICIAL PAYMENT RECEIPT', 15, 54);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Receipt No: ${payment.mpesa_receipt_number || 'REC-' + (payment.id || '001').slice(0, 8)}`, 15, 61);
  doc.text(`Date Issued: ${new Date(payment.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`, 15, 67);

  // Status Badge
  doc.setFillColor(62, 107, 82); // Green
  doc.roundedRect(150, 48, 45, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PAYMENT VERIFIED', 155, 56);

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(15, 74, 195, 74);

  // Student Information Box
  doc.setFillColor(248, 245, 240);
  doc.rect(15, 80, 180, 36, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 20, 18);
  doc.text('RECEIVED FROM:', 20, 88);
  doc.text('STUDENT REG NO:', 110, 88);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(studentProfile.full_name || 'Trainee', 20, 96);
  doc.text(studentProfile.email || 'student@aurevia.ac.ke', 20, 102);
  doc.text(studentProfile.phone || 'N/A', 20, 108);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(212, 154, 91);
  doc.text(studentProfile.reg_number || 'PENDING', 110, 96);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(`Invoice Ref: ${invoice.invoice_number || 'INV-2026-001'}`, 110, 102);
  doc.text(`Payment Mode: ${(payment.payment_method || 'mpesa').toUpperCase()}`, 110, 108);

  // Line Item Table
  doc.setFillColor(235, 228, 220);
  doc.rect(15, 126, 180, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 20, 18);
  doc.text('Description', 20, 132);
  doc.text('Amount (KES)', 160, 132);

  doc.setFont('helvetica', 'normal');
  doc.text('Tuition Payment / Practical Lab Fee', 20, 146);
  doc.text(`KES ${(payment.amount || 0).toLocaleString()}`, 160, 146);

  doc.line(15, 154, 195, 154);

  // Financial Summary Box
  doc.setFont('helvetica', 'normal');
  doc.text('Total Course Fee:', 120, 166);
  doc.text(`KES ${(invoice.total_fee || 35000).toLocaleString()}`, 165, 166);

  doc.setFont('helvetica', 'bold');
  doc.text('Amount Paid Today:', 120, 174);
  doc.setTextColor(62, 107, 82);
  doc.text(`KES ${(payment.amount || 0).toLocaleString()}`, 165, 174);

  doc.setTextColor(26, 20, 18);
  doc.setFont('helvetica', 'bold');
  doc.text('Remaining Balance Due:', 120, 182);
  const remaining = (invoice.total_fee || 35000) - (invoice.amount_paid || (payment.amount || 0));
  doc.setTextColor(remaining > 0 ? 180 : 62, remaining > 0 ? 40 : 107, remaining > 0 ? 40 : 82);
  doc.text(`KES ${Math.max(0, remaining).toLocaleString()}`, 165, 182);

  // Security Verification Stamp
  doc.setDrawColor(212, 154, 91);
  doc.setLineWidth(0.8);
  doc.roundedRect(15, 205, 180, 32, 3, 3);
  doc.setTextColor(26, 20, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('INSTITUTIONAL VALIDATION & M-PESA RECONCILIATION', 22, 213);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(`Verified via Safaricom Daraja C2B Gateway. Checkout Reference: ${payment.mpesa_receipt_number || 'STK-DIRECT'}.`, 22, 220);
  doc.text('This is an official computer-generated institutional receipt from Aurevia Institute of Coffee.', 22, 226);
  doc.text('Inquiries: finance@aureviacoffee.com | Admissions Office, Nairobi & Mombasa.', 22, 232);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Aurevia Institute of Coffee • Excellence in Coffee Education & Roastery Operations', 40, 285);

  return doc;
}

/**
 * Generates and downloads an official payment receipt PDF
 */
export function generatePaymentReceiptPDF(payment: Payment, invoice: Invoice, studentProfile: Profile, branch?: Branch) {
  const doc = buildPaymentReceiptDoc(payment, invoice, studentProfile, branch);
  doc.save(`Aurevia_Receipt_${payment.mpesa_receipt_number || payment.id.slice(0, 6)}.pdf`);
}

/**
 * Generates a File object of the payment receipt PDF for Web Share / attachments
 */
export function generatePaymentReceiptFile(payment: Partial<Payment>, invoice: Partial<Invoice>, studentProfile: Partial<Profile>, branch?: Partial<Branch>): File {
  const doc = buildPaymentReceiptDoc(payment, invoice, studentProfile, branch);
  const blob = doc.output('blob');
  const fileName = `Aurevia_Receipt_${payment.mpesa_receipt_number || 'REC'}.pdf`;
  return new File([blob], fileName, { type: 'application/pdf' });
}

/**
 * Generates an official Certificate of Completion PDF
 */
export function generateCertificatePDF(params: {
  studentName: string;
  courseTitle: string;
  serialNumber: string;
  branchName: string;
  completionDate: string;
  directorName: string;
}) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Border & Luxury Frame
  doc.setFillColor(252, 250, 245);
  doc.rect(0, 0, 297, 210, 'F');

  // Outer Gold Margin
  doc.setDrawColor(212, 154, 91); // Golden Crema
  doc.setLineWidth(3);
  doc.rect(8, 8, 281, 194);

  // Inner Subtle Line
  doc.setDrawColor(38, 30, 26);
  doc.setLineWidth(0.6);
  doc.rect(12, 12, 273, 186);

  // Header Title
  doc.setTextColor(212, 154, 91);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('AUREVIA INSTITUTE OF COFFEE', 148.5, 36, { align: 'center' });

  doc.setTextColor(80, 60, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('CENTRE FOR SPECIALTY COFFEE STUDIES & PROFESSIONAL BARISTA TRAINING', 148.5, 44, { align: 'center' });

  // Main Statement
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(30, 25, 22);
  doc.text('THIS IS TO CERTIFY THAT', 148.5, 68, { align: 'center' });

  // Student Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(26, 20, 18);
  doc.text(params.studentName.toUpperCase(), 148.5, 86, { align: 'center' });

  // Underline for name
  doc.setDrawColor(212, 154, 91);
  doc.setLineWidth(1);
  doc.line(60, 91, 237, 91);

  // Description
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(60, 50, 45);
  doc.text('has successfully completed the intensive curriculum, practical masterclasses, and sensory examinations for', 148.5, 104, { align: 'center' });

  // Course Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(158, 42, 43); // Coffee Cherry Red
  doc.text(params.courseTitle, 148.5, 118, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(70, 70, 70);
  doc.text(`Conducted at the ${params.branchName} on ${params.completionDate}`, 148.5, 128, { align: 'center' });

  // Gold Seal Placeholder
  doc.setFillColor(212, 154, 91);
  doc.circle(148.5, 158, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('OFFICIAL', 148.5, 156, { align: 'center' });
  doc.text('SEAL', 148.5, 161, { align: 'center' });

  // Signatures
  doc.setDrawColor(70, 70, 70);
  doc.setLineWidth(0.5);
  doc.line(45, 172, 105, 172);
  doc.line(192, 172, 252, 172);

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(params.directorName, 75, 178, { align: 'center' });
  doc.text('Wanjiku Kamau (Q-Grader)', 222, 178, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text('Director of Academic Studies', 75, 183, { align: 'center' });
  doc.text('Head of Sensory & Faculty Certification', 222, 183, { align: 'center' });

  // Verification Serial
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text(`Certificate Serial: ${params.serialNumber}`, 18, 192);
  doc.text('Verify Online at: verify.aureviacoffee.com', 225, 192);

  doc.save(`Aurevia_Certificate_${params.serialNumber}.pdf`);
}

/**
 * Generates an official signed Enrollment Agreement & Media Consent PDF
 */
export function generateStudentAgreementPDF(params: {
  studentName: string;
  regNumber: string;
  nationalId: string;
  courseTitle: string;
  branchName: string;
  signedDate: string;
  mediaConsentGranted: boolean;
  termsAccepted: boolean;
}): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner
  doc.setFillColor(26, 20, 18);
  doc.rect(0, 0, 210, 38, 'F');

  doc.setTextColor(212, 154, 91);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('AUREVIA INSTITUTE OF COFFEE', 15, 18);

  doc.setTextColor(230, 230, 230);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Specialty Coffee Roastery & Professional Barista Academy', 15, 25);
  doc.text(`${params.branchName} • Academic Registry & Compliance Office`, 15, 30);

  // Document Title
  doc.setTextColor(26, 20, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('STUDENT ENROLLMENT AGREEMENT & MEDIA CONSENT', 15, 48);

  // Metadata Box
  doc.setFillColor(248, 245, 240);
  doc.roundedRect(15, 54, 180, 28, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);

  doc.setFont('helvetica', 'bold');
  doc.text('Trainee Name:', 20, 62);
  doc.setFont('helvetica', 'normal');
  doc.text(params.studentName, 52, 62);

  doc.setFont('helvetica', 'bold');
  doc.text('Registration No:', 115, 62);
  doc.setFont('helvetica', 'normal');
  doc.text(params.regNumber, 150, 62);

  doc.setFont('helvetica', 'bold');
  doc.text('Program / Course:', 20, 70);
  doc.setFont('helvetica', 'normal');
  doc.text(params.courseTitle, 52, 70);

  doc.setFont('helvetica', 'bold');
  doc.text('National ID / Pass:', 115, 70);
  doc.setFont('helvetica', 'normal');
  doc.text(params.nationalId || 'N/A', 150, 70);

  doc.setFont('helvetica', 'bold');
  doc.text('Agreement Date:', 20, 78);
  doc.setFont('helvetica', 'normal');
  doc.text(params.signedDate, 52, 78);

  // Section 1: Academic & Attendance Regulations
  let y = 92;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(140, 90, 40);
  doc.text('1. ACADEMIC CODE OF CONDUCT & 80% ATTENDANCE MANDATE', 15, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  const text1 = 'As an enrolled trainee of Aurevia Specialty Coffee Academy, I understand that official graduation and SCA-accredited certification require a minimum physical attendance rate of 80% across all scheduled practical labs and theory modules. Any absence must be officially communicated to the Campus Branch Manager in advance.';
  const lines1 = doc.splitTextToSize(text1, 180);
  doc.text(lines1, 15, y);
  y += lines1.length * 4 + 4;

  // Section 2: Laboratory Safety
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(140, 90, 40);
  doc.text('2. SPECIALTY ESPRESSO LAB SAFETY & HYGIENE PROTOCOLS', 15, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  const text2 = 'Trainees must adhere strictly to commercial espresso machine operating guidelines (pressurized boilers, 93°C hot water discharge, 130°C steam wands). Food hygiene and sanitation protocols must be maintained at all barista stations, including grinder hoppers, milk pitch pitchers, and La Marzocco portafilter backflushing.';
  const lines2 = doc.splitTextToSize(text2, 180);
  doc.text(lines2, 15, y);
  y += lines2.length * 4 + 4;

  // Section 3: Photo & Media Consent
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(140, 90, 40);
  doc.text('3. PHOTO, VIDEO & SOCIAL MEDIA CONSENT CLAUSE', 15, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  const text3 = 'I acknowledge that Aurevia Institute regularly captures professional high-definition photography and videography during practical barista sessions, sensory cupping workshops, and latte art exhibitions for academic instruction, public alumni showcase, and promotional marketing across digital platforms.';
  const lines3 = doc.splitTextToSize(text3, 180);
  doc.text(lines3, 15, y);
  y += lines3.length * 4 + 4;

  // Media Status Pill
  doc.setFillColor(params.mediaConsentGranted ? 240 : 254, params.mediaConsentGranted ? 253 : 242, params.mediaConsentGranted ? 244 : 242);
  doc.roundedRect(15, y, 180, 10, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(params.mediaConsentGranted ? 16 : 185, params.mediaConsentGranted ? 140 : 28, params.mediaConsentGranted ? 80 : 28);
  doc.text(
    params.mediaConsentGranted
      ? '✓ MEDIA CONSENT: GRANTED (Permission given for promotional photos & videos)'
      : '✕ MEDIA CONSENT: DECLINED (Opted out of promotional photography)',
    20,
    y + 6.5
  );
  y += 16;

  // Section 4: Data Protection
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(140, 90, 40);
  doc.text('4. DATA PROTECTION ACT 2019 COMPLIANCE DECLARATION', 15, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  const text4 = 'Aurevia guarantees that all national identification cards, passport copies, contact credentials, and emergency phone numbers provided by trainees are stored securely in compliance with the Kenyan Data Protection Act (2019) and will not be shared with unauthorized third parties.';
  const lines4 = doc.splitTextToSize(text4, 180);
  doc.text(lines4, 15, y);
  y += lines4.length * 4 + 6;

  // Digital Sign-Off Box
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(200, 200, 200);
  doc.rect(15, y, 180, 32, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 20, 18);
  doc.text('DIGITAL SIGNATURE VERIFICATION', 20, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`Electronically Signed By: ${params.studentName}`, 20, y + 15);
  doc.text(`Digital Timestamp: ${params.signedDate} • Kenya Standard Time (EAT)`, 20, y + 21);
  doc.text(`Institutional Agreement Status: ${params.termsAccepted ? 'CONFIRMED & BOUND' : 'PENDING'}`, 20, y + 27);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(212, 154, 91);
  doc.text('AUREVIA ACADEMIC REGISTRY', 125, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 110);
  doc.text('Ronny Ronald, Academy Director', 125, y + 21);
  doc.text('Specialty Coffee Association Chapter', 125, y + 26);

  doc.save(`Aurevia_Agreement_${params.regNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

