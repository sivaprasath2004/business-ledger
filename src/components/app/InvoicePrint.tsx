/**
 * InvoicePrint — generates a pixel-perfect print window matching a professional
 * tax invoice layout (Image 4 reference: clean header, logo area, bill-to section,
 * GST/tax table with CGST/SGST/IGST columns, footer note, color bar).
 *
 * Called from the invoices route's "Print / Save as PDF" button.
 */

import { useAuth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useRef } from "react";

interface LineItem { description: string; qty: number; price: number; category?: string; hsn?: string; }
interface InvoicePreviewProps { invoice: any; onClose: () => void; }

export function InvoicePreview({ invoice, onClose }: InvoicePreviewProps) {
  const { profile } = useAuth();
  const items: LineItem[] = invoice.items ?? [];
  const printRef = useRef<HTMLDivElement>(null);

  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const taxAmt = Number(invoice.tax ?? 0);
  const discountAmt = Number(invoice.discount ?? 0);
  const total = Number(invoice.total ?? subtotal + taxAmt - discountAmt);
  const amtPaid = Number(invoice.amount_paid ?? 0);
  const balanceDue = Math.max(0, total - amtPaid);

  // Compute GST split (CGST = SGST = tax/2 each, IGST = full tax — adjust as needed)
  const cgst = taxAmt / 2;
  const sgst = taxAmt / 2;
  const igst = 0; // set non-zero for interstate

  const businessName = profile?.business_name ?? profile?.full_name ?? "Your Business";
  const businessAddress = profile?.address ?? "";
  const businessGSTIN = (profile as any)?.gstin ?? "";

  function handlePrint() {
    const styles = `
      @page { margin: 14mm 16mm; size: A4 portrait; }
      * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }

      .invoice-wrap { max-width: 780px; margin: 0 auto; padding: 0; }

      /* ── Header ── */
      .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
      .inv-logo-box { width: 120px; height: 52px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #888; }
      .inv-title { text-align: center; flex: 1; padding: 0 20px; }
      .inv-title h1 { font-size: 20px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #1a1a1a; }
      .inv-company-block { text-align: right; font-size: 11px; line-height: 1.6; color: #444; }
      .inv-company-block strong { font-size: 12px; color: #1a1a1a; }

      /* ── Divider ── */
      .inv-divider { border: none; border-top: 2px solid #1a1a1a; margin: 12px 0; }
      .inv-divider-thin { border: none; border-top: 1px solid #ccc; margin: 10px 0; }

      /* ── Meta row ── */
      .inv-meta { display: flex; justify-content: space-between; font-size: 11px; color: #444; margin-bottom: 20px; line-height: 1.6; }
      .inv-meta .left { max-width: 55%; }
      .inv-meta .right { text-align: right; }

      /* ── Bill To ── */
      .bill-section { margin-bottom: 20px; }
      .bill-label { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 0.05em; margin-bottom: 2px; }
      .bill-name { font-weight: 700; font-size: 13px; }
      .bill-sub { font-size: 11px; color: #444; line-height: 1.6; }
      .bill-row { display: flex; gap: 40px; margin-bottom: 20px; }

      /* ── Table ── */
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
      table thead tr { background: #f5f5f5; }
      table th { padding: 8px 10px; text-align: center; border: 1px solid #ccc; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
      table th.left { text-align: left; }
      table td { padding: 8px 10px; border: 1px solid #ddd; text-align: center; vertical-align: middle; }
      table td.left { text-align: left; }
      table tfoot td { font-weight: 700; background: #f9f9f9; }

      /* ── Totals ── */
      .totals-block { display: flex; justify-content: flex-end; margin-bottom: 16px; }
      .totals-table { width: 280px; font-size: 11px; }
      .totals-table tr td { padding: 4px 8px; }
      .totals-table tr td:first-child { color: #444; }
      .totals-table tr td:last-child { text-align: right; font-weight: 600; }
      .totals-table .total-row td { font-size: 13px; font-weight: 700; border-top: 2px solid #1a1a1a; padding-top: 8px; }
      .totals-table .paid-row td { color: #16a34a; }
      .totals-table .balance-row td { font-size: 13px; font-weight: 700; }

      /* ── Notes ── */
      .notes-block { font-size: 10px; color: #555; margin-bottom: 20px; line-height: 1.6; }
      .notes-block strong { display: block; margin-bottom: 2px; color: #333; }

      /* ── Footer ── */
      .inv-footer { font-size: 9px; color: #888; margin-top: 24px; padding-top: 10px; border-top: 1px solid #eee; }
      .color-bar { height: 6px; background: linear-gradient(90deg, #1a56db 60%, #00b4d8 100%); margin-top: 20px; border-radius: 2px; }

      /* ── Status badge ── */
      .status-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
      .status-paid { background: #dcfce7; color: #166534; }
      .status-sent { background: #dbeafe; color: #1e40af; }
      .status-draft { background: #f3f4f6; color: #6b7280; }
      .status-overdue { background: #fee2e2; color: #991b1b; }

      @media print {
        body { background: white; }
        .invoice-wrap { page-break-inside: avoid; }
      }
    `;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Invoice ${invoice.invoice_number}</title>
<style>${styles}</style>
</head>
<body>
<div class="invoice-wrap">

  <!-- Header: logo | title | company -->
  <div class="inv-header">
    <div class="inv-logo-box">[LOGO]</div>
    <div class="inv-title">
      <h1>TAX INVOICE</h1>
    </div>
    <div class="inv-company-block">
      <strong>${businessName}</strong><br/>
      ${businessAddress ? businessAddress.replace(/\n/g, "<br/>") + "<br/>" : ""}
      ${businessGSTIN ? `GSTIN: ${businessGSTIN}` : ""}
    </div>
  </div>

  <hr class="inv-divider"/>

  <!-- Meta: original copy note + invoice no + date -->
  <div class="inv-meta">
    <div class="left">
      <span>Original For Recipient / Duplicate for Supplier</span><br/>
      <strong>Invoice No:</strong> ${invoice.invoice_number}<br/>
      <strong>Invoice Date:</strong> ${invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}
    </div>
    <div class="right">
      <span class="status-badge status-${invoice.status}">${invoice.status?.toUpperCase() ?? "DRAFT"}</span>
      ${invoice.due_date ? `<br/><strong>Due:</strong> ${new Date(invoice.due_date).toLocaleDateString("en-IN")}` : ""}
    </div>
  </div>

  <hr class="inv-divider-thin"/>

  <!-- Bill To + Ship To -->
  <div class="bill-row">
    <div class="bill-section">
      <div class="bill-label">Bill To,</div>
      <div class="bill-name">${invoice.customer_name ?? "—"}</div>
      <div class="bill-sub">
        Place of Supply: Same as billing address<br/>
        Ship to location: Same as billing address
      </div>
    </div>
  </div>

  <!-- Line items table with GST columns -->
  <table>
    <thead>
      <tr>
        <th class="left" rowspan="2" style="width:35%">Desc. of Goods / Services</th>
        <th rowspan="2" style="width:12%">Taxable Amount</th>
        <th colspan="2">CGST</th>
        <th colspan="2">SGST</th>
        <th colspan="2">IGST</th>
        <th rowspan="2" style="width:12%">Total</th>
      </tr>
      <tr>
        <th>Rate %</th><th>Amount</th>
        <th>Rate %</th><th>Amount</th>
        <th>Rate %</th><th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((it) => {
        const lineAmt = (Number(it.qty) || 0) * (Number(it.price) || 0);
        const lineCgst = lineAmt * (cgst / (subtotal || 1));
        const lineSgst = lineAmt * (sgst / (subtotal || 1));
        const lineIgst = lineAmt * (igst / (subtotal || 1));
        const lineTotal = lineAmt + lineCgst + lineSgst + lineIgst;
        return `<tr>
          <td class="left"><strong>${it.description || "—"}</strong>${it.hsn ? `<br/><small>HSN Code: ${it.hsn}</small>` : ""}</td>
          <td>${lineAmt.toFixed(2)}</td>
          <td>9</td><td>${lineCgst.toFixed(2)}</td>
          <td>9</td><td>${lineSgst.toFixed(2)}</td>
          <td>18</td><td>${lineIgst.toFixed(2)}</td>
          <td>Rs.${lineTotal.toFixed(2)}</td>
        </tr>`;
      }).join("")}
    </tbody>
    <tfoot>
      <tr>
        <td class="left"><strong>Total</strong></td>
        <td><strong>${subtotal.toFixed(2)}</strong></td>
        <td>9</td><td><strong>${cgst.toFixed(2)}</strong></td>
        <td>9</td><td><strong>${sgst.toFixed(2)}</strong></td>
        <td>18</td><td><strong>${igst.toFixed(2)}</strong></td>
        <td><strong>Rs.${total.toFixed(2)}</strong></td>
      </tr>
    </tfoot>
  </table>

  <!-- Totals -->
  <div class="totals-block">
    <table class="totals-table">
      <tr><td>Subtotal</td><td>Rs.${subtotal.toFixed(2)}</td></tr>
      ${taxAmt > 0 ? `<tr><td>Tax (CGST + SGST)</td><td>+Rs.${taxAmt.toFixed(2)}</td></tr>` : ""}
      ${discountAmt > 0 ? `<tr><td>Discount</td><td>-Rs.${discountAmt.toFixed(2)}</td></tr>` : ""}
      <tr class="total-row"><td>Total</td><td>Rs.${total.toFixed(2)}</td></tr>
      ${amtPaid > 0 ? `<tr class="paid-row"><td>Amount Paid</td><td>-Rs.${amtPaid.toFixed(2)}</td></tr>` : ""}
      ${amtPaid > 0 ? `<tr class="balance-row"><td>Balance Due</td><td>Rs.${balanceDue.toFixed(2)}</td></tr>` : ""}
    </table>
  </div>

  <!-- Notes -->
  ${invoice.notes ? `
  <div class="notes-block">
    <strong>Notes:</strong>
    ${invoice.notes}
  </div>` : ""}

  <!-- Footer note -->
  <div class="inv-footer">
    Note: This is a digitally generated document and does not require any signature.<br/>
    ${businessName}
  </div>

  <!-- Color bar at bottom -->
  <div class="color-bar"></div>

</div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { alert("Please allow popups to print invoices."); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    // Delay print slightly so page renders
    win.onload = () => setTimeout(() => { win.focus(); win.print(); }, 400);
  }

  // ─── In-app preview (React) ──────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice {invoice.invoice_number}</DialogTitle>
        </DialogHeader>

        {/* Professional preview card */}
        <div ref={printRef} className="bg-white text-slate-900 rounded-xl border overflow-hidden text-sm">

          {/* Header */}
          <div className="px-8 pt-8 pb-5 border-b-2 border-slate-900 flex items-start justify-between gap-4">
            <div className="border border-slate-200 rounded px-3 py-2 text-xs text-slate-400 w-28 h-14 flex items-center justify-center shrink-0">
              [LOGO]
            </div>
            <div className="flex-1 text-center">
              <h1 className="text-2xl font-black tracking-widest text-slate-900 uppercase">Tax Invoice</h1>
            </div>
            <div className="text-right text-xs text-slate-500 leading-relaxed w-56 shrink-0">
              <div className="font-bold text-slate-900 text-sm">{businessName}</div>
              {businessAddress && <div className="whitespace-pre-line mt-0.5">{businessAddress}</div>}
              {businessGSTIN && <div className="mt-1 font-semibold">GSTIN: {businessGSTIN}</div>}
            </div>
          </div>

          <div className="px-8 py-5">
            {/* Meta row */}
            <div className="flex items-start justify-between mb-5 text-xs text-slate-500">
              <div className="leading-relaxed">
                <div>Original For Recipient / Duplicate for Supplier</div>
                <div><span className="font-semibold text-slate-700">Invoice No:</span> {invoice.invoice_number}</div>
                <div><span className="font-semibold text-slate-700">Invoice Date:</span> {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString("en-IN") : "—"}</div>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                  invoice.status === "paid" ? "bg-green-100 text-green-800" :
                  invoice.status === "overdue" ? "bg-red-100 text-red-800" :
                  invoice.status === "sent" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"
                }`}>{invoice.status}</span>
                {invoice.due_date && <div className="mt-1 text-xs text-slate-500">Due: {formatDate(invoice.due_date)}</div>}
              </div>
            </div>

            <div className="border-t border-slate-200 my-4" />

            {/* Bill to */}
            <div className="mb-5 text-xs">
              <div className="text-slate-400 uppercase tracking-widest text-[9px] mb-1">Bill To,</div>
              <div className="font-bold text-sm text-slate-900">{invoice.customer_name ?? "—"}</div>
              <div className="text-slate-500 mt-0.5 leading-relaxed">
                Place of Supply: Same as billing address<br />
                Ship to location: Same as billing address
              </div>
            </div>

            {/* GST table */}
            <table className="w-full border-collapse text-xs mb-5">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-2 text-left font-semibold uppercase tracking-wide text-[9px]" rowSpan={2}>Desc. of Goods / Services</th>
                  <th className="border border-slate-300 p-2 font-semibold uppercase tracking-wide text-[9px]" rowSpan={2}>Taxable Amount</th>
                  <th className="border border-slate-300 p-2 font-semibold uppercase tracking-wide text-[9px]" colSpan={2}>CGST</th>
                  <th className="border border-slate-300 p-2 font-semibold uppercase tracking-wide text-[9px]" colSpan={2}>SGST</th>
                  <th className="border border-slate-300 p-2 font-semibold uppercase tracking-wide text-[9px]" colSpan={2}>IGST</th>
                  <th className="border border-slate-300 p-2 font-semibold uppercase tracking-wide text-[9px]" rowSpan={2}>Total</th>
                </tr>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-2 font-semibold text-[9px]">Rate %</th>
                  <th className="border border-slate-300 p-2 font-semibold text-[9px]">Amount</th>
                  <th className="border border-slate-300 p-2 font-semibold text-[9px]">Rate %</th>
                  <th className="border border-slate-300 p-2 font-semibold text-[9px]">Amount</th>
                  <th className="border border-slate-300 p-2 font-semibold text-[9px]">Rate %</th>
                  <th className="border border-slate-300 p-2 font-semibold text-[9px]">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const lineAmt = (Number(it.qty) || 0) * (Number(it.price) || 0);
                  const lineCgst = taxAmt > 0 ? (lineAmt / (subtotal || 1)) * cgst : 0;
                  const lineSgst = taxAmt > 0 ? (lineAmt / (subtotal || 1)) * sgst : 0;
                  const lineTotal = lineAmt + lineCgst + lineSgst;
                  return (
                    <tr key={i}>
                      <td className="border border-slate-200 p-2 text-left">
                        <div className="font-medium">{it.description || "—"}</div>
                        {(it as any).hsn && <div className="text-slate-400 text-[9px]">HSN Code: {(it as any).hsn}</div>}
                      </td>
                      <td className="border border-slate-200 p-2 text-center">{lineAmt.toFixed(2)}</td>
                      <td className="border border-slate-200 p-2 text-center">9</td>
                      <td className="border border-slate-200 p-2 text-center">{lineCgst.toFixed(2)}</td>
                      <td className="border border-slate-200 p-2 text-center">9</td>
                      <td className="border border-slate-200 p-2 text-center">{lineSgst.toFixed(2)}</td>
                      <td className="border border-slate-200 p-2 text-center">18</td>
                      <td className="border border-slate-200 p-2 text-center">0.00</td>
                      <td className="border border-slate-200 p-2 text-center font-medium">Rs.{lineTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold">
                  <td className="border border-slate-300 p-2 text-left">Total</td>
                  <td className="border border-slate-300 p-2 text-center">{subtotal.toFixed(2)}</td>
                  <td className="border border-slate-300 p-2 text-center">9</td>
                  <td className="border border-slate-300 p-2 text-center">{cgst.toFixed(2)}</td>
                  <td className="border border-slate-300 p-2 text-center">9</td>
                  <td className="border border-slate-300 p-2 text-center">{sgst.toFixed(2)}</td>
                  <td className="border border-slate-300 p-2 text-center">18</td>
                  <td className="border border-slate-300 p-2 text-center">0.00</td>
                  <td className="border border-slate-300 p-2 text-center">Rs.{total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Summary totals */}
            <div className="flex justify-end mb-5">
              <div className="w-64 text-xs space-y-1">
                <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>Rs.{subtotal.toFixed(2)}</span></div>
                {taxAmt > 0 && <div className="flex justify-between text-slate-500"><span>Tax</span><span>+Rs.{taxAmt.toFixed(2)}</span></div>}
                {discountAmt > 0 && <div className="flex justify-between text-slate-500"><span>Discount</span><span>-Rs.{discountAmt.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-sm border-t-2 border-slate-900 pt-2 mt-2">
                  <span>Total</span><span>Rs.{total.toFixed(2)}</span>
                </div>
                {amtPaid > 0 && <div className="flex justify-between text-green-600 font-medium"><span>Amount paid</span><span>-Rs.{amtPaid.toFixed(2)}</span></div>}
                {amtPaid > 0 && <div className="flex justify-between font-bold"><span>Balance due</span><span>Rs.{balanceDue.toFixed(2)}</span></div>}
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="text-xs text-slate-500 bg-slate-50 rounded p-3 mb-4 leading-relaxed">
                <div className="font-semibold text-slate-700 mb-1">Notes</div>
                {invoice.notes}
              </div>
            )}

            {/* Footer */}
            <div className="text-[9px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
              Note: This is a digitally generated document and does not require any signature.<br />
              {businessName}
            </div>

            {/* Color bar */}
            <div className="mt-4 h-1.5 rounded bg-gradient-to-r from-blue-600 to-cyan-400" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handlePrint} className="gradient-primary text-white border-0">
            <Printer className="h-4 w-4 mr-1.5" /> Print / Save as PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
