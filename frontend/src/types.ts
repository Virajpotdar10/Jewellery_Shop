export interface Customer { _id: string; name: string; mobile: string; currentBalance: number; fineBalance: number; address?: string; }
export interface BillItem { _id?: string; description: string; quantity: number; weight: number; touch: number; fine: number; rate?: number; makingCharge: number; amount: number; }
export interface SilverPayment { _id?: string; billId?: string; grossWeight: number; purity: number; fineWeight: number; silverRate?: number; silverValue?: number; date?: string; notes?: string; }
export type PaymentMode = 'Cash' | 'UPI' | 'Bank' | 'Mixed';
