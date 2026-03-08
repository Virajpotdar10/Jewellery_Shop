import React from 'react';
import type { Customer, BillItem, SilverPayment } from '../types';

interface PrintableBillProps {
    customer: Customer | null;
    items: BillItem[];
    subtotal: number;
    previousBalance: number;
    previousFine?: number;
    totalPayable: number;
    cashPaid: number;
    upiPaid: number;
    bankPaid: number;
    silverPayments: SilverPayment[];
    remainingBalance: number;
    billNumber?: number;
    billDate?: string;
    silverRate: number;
    totalFineWeight: number;
}

export const PrintableBill: React.FC<PrintableBillProps> = ({
    customer, items, subtotal, previousBalance, previousFine = 0, totalPayable,
    cashPaid, upiPaid, bankPaid, silverPayments, remainingBalance,
    billNumber, billDate, silverRate, totalFineWeight
}) => {
    const totalSilverFine = silverPayments.reduce((s, p) => s + (p.fineWeight || 0), 0);

    const tdStyle: React.CSSProperties = { border: '1px solid #C62828', padding: '7px 9px', textAlign: 'right', fontSize: '14px', whiteSpace: 'nowrap' };
    const thStyle: React.CSSProperties = { border: '1px solid #B71C1C', padding: '8px 9px', backgroundColor: '#C62828', color: '#fff', fontWeight: '700', fontSize: '13px', whiteSpace: 'nowrap' };

    return (
        <div style={{
            fontFamily: "'Mukta', 'Noto Sans Devanagari', sans-serif",
            backgroundColor: '#FFFDE7',
            border: '4px solid #C62828',
            borderRadius: '12px',
            padding: '24px',
            width: '920px',
            minWidth: '920px',
            boxSizing: 'border-box',
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Mukta:wght@400;600;700;800&display=swap');
                @media print {
                    @page { size: A4 landscape; margin: 8mm; }
                }
            `}</style>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1.2fr', alignItems: 'center', borderBottom: '3px solid #C62828', paddingBottom: '14px', marginBottom: '16px', gap: '15px' }}>
                <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '12px', color: '#777', margin: '0 0 2px' }}>नाव :</p>
                    <p style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a1a', margin: 0 }}>{customer?.name || '—'}</p>
                    {customer?.mobile && <p style={{ fontSize: '14px', color: '#333', margin: '2px 0 0' }}>📞 {customer.mobile}</p>}
                </div>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#C62828', margin: '0 0 4px', textTransform: 'uppercase' }}>अलंकार ज्वेलर्स</h1>
                    <p style={{ fontSize: '14px', color: '#444', margin: 0, fontWeight: '600' }}>हुपरी, कोल्हापूर | मुख्य चांदी बाजार</p>
                </div>
                <div style={{ fontSize: '14px', textAlign: 'right' }}>
                    <div>दिनांक: <strong>{billDate ? new Date(billDate).toLocaleDateString('mr-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('mr-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong></div>
                    <div>वेळ: <strong>{billDate ? new Date(billDate).toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' })}</strong></div>
                    {billNumber && <div style={{ color: '#C62828', fontWeight: '800', fontSize: '16px', marginTop: '4px' }}>बिल क्रमांक: {billNumber}</div>}
                </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', tableLayout: 'fixed' }}>
                <thead>
                    <tr>
                        {['तपशील', 'नग', 'वजन (g)', 'टंच %', 'फाइन (g)', 'मजुरी', 'रक्कम'].map((h, i) => (
                            <th key={i} style={{ ...thStyle, textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {items.filter(it => it.description || it.weight > 0).map((item, i) => (
                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FFF9C4' }}>
                            <td style={{ ...tdStyle, textAlign: 'left', fontWeight: '700', fontSize: '15px' }}>{item.description || '—'}</td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>{item.quantity}</td>
                            <td style={tdStyle}>{item.weight.toFixed(3)}</td>
                            <td style={tdStyle}>{item.touch.toFixed(2)}</td>
                            <td style={{ ...tdStyle, fontWeight: '700', color: '#C62828' }}>{item.fine.toFixed(3)}</td>
                            <td style={tdStyle}>{item.makingCharge.toFixed(2)}</td>
                            <td style={{ ...tdStyle, fontWeight: '800', fontSize: '16px' }}>₹{item.amount.toLocaleString('en-IN')}</td>
                        </tr>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
                        <tr key={`empty-${i}`}>
                            {Array.from({ length: 7 }).map((_, j) => (
                                <td key={j} style={{ ...tdStyle, height: '36px' }}> </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr style={{ backgroundColor: '#FFEBEE' }}>
                        <td colSpan={2} style={{ ...tdStyle, textAlign: 'left', fontWeight: '800', fontSize: '14px', color: '#B71C1C' }}>एकूण फाइन: {totalFineWeight.toFixed(3)} g</td>
                        <td colSpan={4} style={{ ...tdStyle, textAlign: 'right', fontWeight: '800', fontSize: '15px' }}>एकूण रक्कम:</td>
                        <td style={{ ...tdStyle, fontWeight: '900', fontSize: '18px', color: '#C62828' }}>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                </tfoot>
            </table>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
                {(totalFineWeight > 0 || previousFine > 0 || silverPayments.length > 0) ? (
                    <div style={{ border: '2px solid #2E7D32', borderRadius: '10px', padding: '15px', backgroundColor: '#F1F8E9', display: 'flex', flexDirection: 'column' }}>
                        <p style={{ textAlign: 'center', fontWeight: '800', color: '#2E7D32', fontSize: '16px', marginBottom: '12px' }}>फाइन तपशील (Silver Fine)</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}><span>बिलाचे फाइन:</span><strong>{totalFineWeight.toFixed(3)} g</strong></div>
                            {previousFine > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#C62828' }}><span>मागील फाइन (येणे):</span><strong>{previousFine.toFixed(3)} g</strong></div>}

                            {(totalFineWeight + previousFine) > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', fontWeight: '800', color: '#C62828', borderTop: '1.5px solid #2E7D32', marginTop: '8px', paddingTop: '8px' }}>
                                    <span>एकूण फाइन:</span><span>{(totalFineWeight + previousFine).toFixed(3)} g</span>
                                </div>
                            )}

                            {silverPayments.length > 0 && (
                                <div style={{ marginTop: '10px', borderTop: '1px dashed #2E7D32', paddingTop: '8px' }}>
                                    {silverPayments.map((p, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#2E7D32', marginBottom: '4px' }}>
                                            <span>जमा चांदी: {p.grossWeight.toFixed(3)}g ({p.purity}%)</span>
                                            <strong>- {p.fineWeight.toFixed(3)} g</strong>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', borderTop: '2.5px solid #2E7D32', paddingTop: '10px', marginTop: 'auto', fontWeight: '900', color: ((totalFineWeight + previousFine) - totalSilverFine) > 0 ? '#C62828' : '#2E7D32' }}>
                                <span>शिल्लक फाइन:</span><span>{((totalFineWeight + previousFine) - totalSilverFine).toFixed(3)} g</span>
                            </div>
                        </div>
                    </div>
                ) : <div />}

                <div style={{ border: '2px solid #C62828', borderRadius: '10px', padding: '15px', backgroundColor: '#FFF3E0' }}>
                    <p style={{ textAlign: 'center', fontWeight: '800', color: '#C62828', fontSize: '16px', marginBottom: '12px' }}>रक्कम तपशील (Rupees)</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}><span>बिलाची रक्कम:</span><strong>₹{subtotal.toLocaleString('en-IN')}</strong></div>
                        {previousBalance > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#C62828' }}><span>मागील थकबाकी:</span><strong>₹{previousBalance.toLocaleString('en-IN')}</strong></div>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', fontWeight: '800', color: '#C62828', borderTop: '1.5px solid #C62828', marginTop: '8px', paddingTop: '8px' }}>
                            <span>एकूण देणे:</span><span>₹{totalPayable.toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ marginTop: '10px', borderTop: '1px dashed #C62828', paddingTop: '8px' }}>
                            {cashPaid > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#2E7D32' }}><span>रोख जमा:</span><strong>₹{cashPaid.toLocaleString('en-IN')}</strong></div>}
                            {upiPaid > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#1565C0' }}><span>UPI जमा:</span><strong>₹{upiPaid.toLocaleString('en-IN')}</strong></div>}
                            {bankPaid > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6A1B9A' }}><span>बँक जमा:</span><strong>₹{bankPaid.toLocaleString('en-IN')}</strong></div>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', borderTop: '2.5px solid #C62828', paddingTop: '10px', marginTop: '10px', fontWeight: '900', color: remainingBalance > 0 ? '#C62828' : '#2E7D32' }}>
                            <span>शिल्लक र.:</span><span>₹{remainingBalance.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ fontSize: '14px', color: '#C62828', fontWeight: '700' }}>
                    आजचा चांदी दर : ₹{silverRate}/kg
                </div>

            </div>

            <div style={{ textAlign: 'center', borderTop: '1px dashed #C62828', paddingTop: '10px', marginTop: '16px', fontSize: '12px', color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
                <span>🙏 धन्यवाद! पुन्हा भेट द्या.</span>
                <span>अलंकार ज्वेलर्स — हुपरी, कोल्हापूर</span>
            </div>
        </div>
    );
};
