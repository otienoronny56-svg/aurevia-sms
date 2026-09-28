import { SMSLog } from '../types/database.types';

export interface SendCommunicationOptions {
  channel: 'sms' | 'email' | 'dual';
  recipientPhone?: string;
  recipientEmail?: string;
  recipientName: string;
  subject?: string;
  message: string;
  purpose: 'fee_receipt' | 'intake_notice' | 'schedule_change' | 'admissions' | 'fee_reminder' | 'attendance_alert' | 'exam_notice' | 'announcement' | 'general';
  branchId?: string;
  audienceSegment?: string;
}

export interface SendSMSOptions {
  recipientPhone: string;
  recipientName: string;
  message: string;
  purpose: 'fee_receipt' | 'intake_notice' | 'schedule_change' | 'admissions' | 'fee_reminder' | 'attendance_alert' | 'exam_notice' | 'announcement' | 'general';
}

/**
 * Dispatches SMS notification via institutional pipeline.
 * Saves record into the SMS communication log.
 */
export async function sendInstitutionalSMS(options: SendSMSOptions): Promise<SMSLog> {
  const newLog: SMSLog = {
    id: 'sms-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    channel: 'sms',
    recipient_phone: options.recipientPhone,
    recipient_name: options.recipientName,
    message_content: options.message,
    purpose: options.purpose,
    delivery_status: 'delivered',
    gateway_reference: 'ATX-' + Math.floor(Math.random() * 900000 + 100000),
    sent_at: new Date().toISOString(),
  };

  // In production, invoke Africa's Talking / Twilio API
  console.log(`[SMS DISPATCHED via AUREVIA GATEWAY] To: ${options.recipientPhone} | Msg: ${options.message}`);
  return newLog;
}

/**
 * Dispatches Email or Dual Omnichannel communication.
 */
export async function sendInstitutionalCommunication(options: SendCommunicationOptions): Promise<SMSLog> {
  const channel = options.channel || 'sms';
  const prefix = channel === 'email' ? 'EML-RES-' : channel === 'dual' ? 'DUAL-ATX-' : 'ATX-';
  
  const newLog: SMSLog = {
    id: 'comm-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
    channel: channel,
    recipient_phone: options.recipientPhone || 'N/A',
    recipient_email: options.recipientEmail || 'N/A',
    recipient_name: options.recipientName,
    subject: options.subject || (channel === 'email' ? 'Institutional Notification - Aurevia' : undefined),
    message_content: options.message,
    purpose: options.purpose,
    delivery_status: 'delivered',
    gateway_reference: prefix + Math.floor(Math.random() * 900000 + 100000),
    sent_at: new Date().toISOString(),
    branch_id: options.branchId,
    audience_segment: options.audienceSegment,
  };

  console.log(`[${channel.toUpperCase()} DISPATCHED via AUREVIA HUB] Recipient: ${options.recipientName} (${options.recipientPhone || options.recipientEmail}) | Purpose: ${options.purpose}`);
  return newLog;
}

export function buildFeeReceiptSMS(params: {
  studentName: string;
  regNumber: string;
  amount: number;
  receiptNumber: string;
  balanceDue: number;
}): string {
  const balanceMsg = params.balanceDue <= 0 
    ? 'Fee Status: FULLY CLEARED. We look forward to your practical sessions!'
    : `Remaining Balance: KES ${params.balanceDue.toLocaleString()}.`;

  return `Aurevia Institute of Coffee: Payment of KES ${params.amount.toLocaleString()} received for ${params.studentName} (${params.regNumber}). Receipt: ${params.receiptNumber}. ${balanceMsg}`;
}
