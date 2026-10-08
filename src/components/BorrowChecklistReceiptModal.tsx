import React, { useRef, useState, useEffect } from 'react';
import type { AssetTransferRecord, AssetItem, BarangayLocation } from '../types/inventory';
import { X, Printer } from './HugeIcons';

interface BorrowChecklistReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AssetTransferRecord | null;
  asset?: AssetItem | null;
  location?: BarangayLocation | null;
  onMarkReturned?: (recordId: string, officerName: string) => void;
}

export const BorrowChecklistReceiptModal: React.FC<BorrowChecklistReceiptModalProps> = ({
  isOpen,
  onClose,
  record,
  asset,
  location,
  onMarkReturned,
}) => {
  const printContentRef = useRef<HTMLDivElement>(null);

  // Editable metadata fields (can be typed directly into the document preview before printing)
  const [editableEvent, setEditableEvent] = useState('');
  const [editableOffice, setEditableOffice] = useState('');
  const [editableBorrower, setEditableBorrower] = useState('');

  useEffect(() => {
    if (record) {
      setEditableEvent(
        record.eventName ||
        record.purpose ||
        `PHILHEALTH YAKAP PROFILING ${location?.name?.replace(/^Barangay\s+/i, '') || record.toLocationName || 'HEALTH CENTER'}`.toUpperCase()
      );
      setEditableOffice(
        record.requestingOffice ||
        `${location?.name || record.toLocationName || 'BARANGAY'} HEALTH CENTER`.toUpperCase()
      );
      setEditableBorrower(
        record.borrowerName ||
        record.receivedBy ||
        `${location?.name || 'BARANGAY'} HEALTH CENTER STAFF`.toUpperCase()
      );
    }
  }, [record, location]);

  if (!isOpen || !record) return null;

  // Format date and time for receipt
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatDateOnly = (isoString?: string) => {
    if (!isoString) return new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  // Synthesize table rows if not explicitly recorded in record.borrowedItemsList
  const items = record.borrowedItemsList && record.borrowedItemsList.length > 0
    ? record.borrowedItemsList
    : [
        {
          itemEquipment: (asset?.name || asset?.brandModel || 'IT EQUIPMENT').toUpperCase(),
          serialNo: asset?.serialNumber || 'N/A',
          quantity: 1,
          remarks: asset?.category === 'Printer' ? 'WITH POWER AND CABLE' : asset?.category === 'Network Router' ? 'WITH POWER' : 'WITH POWER',
        },
        ...(asset?.category === 'Printer'
          ? [
              {
                itemEquipment: '2 EXTENSIONS',
                serialNo: 'N/A',
                quantity: 2,
                remarks: '',
              },
            ]
          : []),
      ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      
      {/* Container Dialog */}
      <div className="relative w-full max-w-[620px] rounded-3xl bg-neutral-900 border border-neutral-700/80 shadow-2xl p-4 sm:p-6 my-auto text-white">
        
        {/* Top Control Bar (Hidden during print) */}
        <div className="no-print flex items-center justify-between pb-3.5 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-bold tracking-tight text-neutral-100">
              Official A5 Borrowing Checklist Slip
            </h3>
            <span className="text-[10px] rounded-full bg-white/10 px-2 py-0.5 text-neutral-300 font-mono">
              A5 Standard (148 × 210 mm)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-bold shadow-md transition active:scale-95"
            >
              <Printer size={15} />
              <span>Print A5 Copy</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 transition"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Helper Banner */}
        <div className="no-print mb-2.5 rounded-xl bg-white/10 px-3 py-1.5 text-[11px] text-neutral-300 flex items-center justify-between">
          <span>✏️ <strong>Live Input:</strong> Click directly on <u>Event/Activity</u>, <u>Office</u>, or <u>Borrower</u> below to customize or type any title before printing.</span>
        </div>

        {/* ========================================================================= */}
        {/* A5 DOCUMENT CANVAS (1-TO-1 EXACT REPLICA OF PHYSICAL A5 CHECKLIST PAPER) */}
        {/* ========================================================================= */}
        <div
          ref={printContentRef}
          className="a5-printable-document rounded-2xl bg-white text-black p-6 sm:p-8 shadow-xl font-sans leading-normal selection:bg-neutral-200 selection:text-black border border-neutral-200 text-left mx-auto"
          style={{
            color: '#000000',
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* 1. Header Logos (4 Logos in exact horizontal alignment) */}
          <div className="flex items-center justify-between gap-1 sm:gap-2 pb-2">
            {/* Logo 1: City of Parañaque Official Seal */}
            <div className="flex items-center justify-center shrink-0">
              <img
                src="/logo-paranaque-seal.png"
                alt="City of Parañaque"
                className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
              />
            </div>

            {/* Logo 2: Bagong Pilipinas */}
            <div className="flex items-center justify-center shrink-0">
              <img
                src="/logo-bagong-pilipinas.png"
                alt="Bagong Pilipinas"
                className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
              />
            </div>

            {/* Logo 3: Parañaque A Mega City By The Bay */}
            <div className="flex items-center justify-center shrink-0 max-w-[120px] sm:max-w-[140px]">
              <img
                src="/logo-paranaque-megacity.png"
                alt="Parañaque A Mega City By The Bay"
                className="h-9 sm:h-11 object-contain"
              />
            </div>

            {/* Logo 4: City Health Office Parañaque */}
            <div className="flex items-center justify-center shrink-0">
              <img
                src="/logo-city-health-office.png"
                alt="City Health Office"
                className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
              />
            </div>
          </div>

          {/* 2. Official Republic & Department Hierarchy */}
          <div className="text-center mt-1 leading-tight text-[11px] sm:text-[12px] font-bold text-neutral-800 tracking-wide uppercase">
            <p>Republic of the Philippines</p>
            <p>Office of the City Health Officer</p>
            <p>City of Paranaque</p>
          </div>

          {/* 3. Document Titles */}
          <div className="text-center mt-3 mb-3">
            <h2 className="text-[11.5px] sm:text-[12.5px] font-bold tracking-wide uppercase text-neutral-900">
              Health Information Management Unit (HIMU)
            </h2>
            <h1 className="text-[13.5px] sm:text-[15px] font-black tracking-wider uppercase text-neutral-950 mt-0.5">
              Event Equipment Borrowing Checklist
            </h1>
          </div>

          {/* 4. Metadata Block (Directly Editable on Screen, Underlined on Print) */}
          <div className="space-y-1.5 text-[11.5px] sm:text-[12px] font-bold text-neutral-900 mt-2">
            <div className="flex items-baseline gap-1">
              <span className="shrink-0 font-bold">Event/Activity:</span>
              <input
                type="text"
                value={editableEvent}
                onChange={(e) => setEditableEvent(e.target.value)}
                className="font-bold uppercase underline tracking-tight flex-1 bg-transparent border-none outline-none focus:bg-emerald-50 focus:ring-1 focus:ring-emerald-500 rounded px-1 text-neutral-950 p-0 m-0"
                placeholder="TYPE EVENT / PROFILING TITLE..."
                title="Click to edit event title directly"
              />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="shrink-0 font-bold">Requesting Office/Unit:</span>
              <input
                type="text"
                value={editableOffice}
                onChange={(e) => setEditableOffice(e.target.value)}
                className="font-bold uppercase underline tracking-tight flex-1 bg-transparent border-none outline-none focus:bg-emerald-50 focus:ring-1 focus:ring-emerald-500 rounded px-1 text-neutral-950 p-0 m-0"
                placeholder="TYPE REQUESTING OFFICE..."
                title="Click to edit requesting office"
              />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="shrink-0 font-bold">Borrower/Person Responsible:</span>
              <input
                type="text"
                value={editableBorrower}
                onChange={(e) => setEditableBorrower(e.target.value)}
                className="font-bold uppercase underline tracking-tight flex-1 bg-transparent border-none outline-none focus:bg-emerald-50 focus:ring-1 focus:ring-emerald-500 rounded px-1 text-neutral-950 p-0 m-0"
                placeholder="TYPE BORROWER NAME..."
                title="Click to edit borrower name"
              />
            </div>
          </div>

          {/* 5. Items Borrowed Table */}
          <div className="mt-3">
            <div className="text-[11.5px] sm:text-[12px] font-black uppercase text-neutral-950 mb-1">
              Items Borrowed:
            </div>
            <table className="w-full border-collapse border border-black text-[11px] sm:text-[11.5px] text-neutral-950">
              <thead>
                <tr className="border-b border-black font-black uppercase bg-neutral-100/60">
                  <th className="border-r border-black p-1.5 text-left font-black w-[38%]">
                    Item/Equipment
                  </th>
                  <th className="border-r border-black p-1.5 text-left font-black w-[24%]">
                    Serial #
                  </th>
                  <th className="border-r border-black p-1.5 text-center font-black w-[14%]">
                    Quantity
                  </th>
                  <th className="p-1.5 text-left font-black w-[24%]">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={idx} className="border-b border-black">
                    <td className="border-r border-black p-1.5 font-bold uppercase">
                      {row.itemEquipment}
                    </td>
                    <td className="border-r border-black p-1.5 font-mono uppercase">
                      {row.serialNo || ''}
                    </td>
                    <td className="border-r border-black p-1.5 text-center font-bold">
                      {row.quantity}
                    </td>
                    <td className="p-1.5 uppercase font-medium">
                      {row.remarks || ''}
                    </td>
                  </tr>
                ))}

                {/* Blank line for write-ins just like physical print */}
                {items.length < 3 && (
                  <tr className="border-b border-black h-7">
                    <td className="border-r border-black p-1.5">&nbsp;</td>
                    <td className="border-r border-black p-1.5">&nbsp;</td>
                    <td className="border-r border-black p-1.5 text-center">&nbsp;</td>
                    <td className="p-1.5">&nbsp;</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 6. Reminder Notice */}
          <div className="mt-3 text-[10.5px] sm:text-[11px] leading-tight font-medium text-neutral-900">
            <strong className="font-bold">REMINDER:</strong> Please check and ensure that all borrowed equipment/items are returned complete and in good condition after the event/activity.
          </div>

          {/* 7. Sign-off Two-Column Signatures */}
          <div className="mt-5 grid grid-cols-2 gap-4 text-[11px] sm:text-[11.5px] text-neutral-950">
            {/* Column 1: Borrower / Received By */}
            <div>
              <p className="font-bold">Borrowed/Received by:</p>
              <div className="mt-2 space-y-1 font-medium">
                <div>
                  Name: <span className="font-bold underline uppercase">{editableBorrower || 'HEALTH CENTER STAFF'}</span>
                </div>
                <div>
                  Signature: <span className="inline-block border-b border-black w-28 sm:w-36">&nbsp;</span>
                </div>
                <div>
                  Date: <span className="font-bold underline">{formatDateOnly(record.dispatchedAt)}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Released by HIMU */}
            <div>
              <p className="font-bold">Released by HIMU:</p>
              <div className="mt-2 space-y-1 font-medium">
                <div>
                  Name: <span className="font-bold underline uppercase">{record.dispatchedBy || 'JOHN SHANNON O. RODRIGUEZ'}</span>
                </div>
                <div>
                  Signature: <span className="inline-block border-b border-black w-28 sm:w-36">&nbsp;</span>
                </div>
                <div>
                  Date: <span className="font-bold underline">{formatDateOnly(record.dispatchedAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 8. Asterisk Divider Line */}
          <div className="my-3 text-center text-neutral-800 tracking-[0.25em] text-[10px] select-none font-mono">
            *********************************************************************************
          </div>

          {/* 9. Return Verification Section */}
          <div className="text-[11px] sm:text-[11.5px] text-neutral-950">
            <p className="font-bold">Returned/Checked by HIMU:</p>
            <div className="mt-2 grid grid-cols-3 gap-2 font-medium">
              <div>
                Name: <span className="font-bold underline uppercase">{record.returnedCheckedBy || '_________________'}</span>
              </div>
              <div>
                Signature: <span className="inline-block border-b border-black w-24 sm:w-32">&nbsp;</span>
              </div>
              <div>
                Date: <span className="font-bold underline">{record.returnedAt ? formatDateOnly(record.returnedAt) : '___________'}</span>
              </div>
            </div>
          </div>

          {/* Discrete Tracking Reference Footer */}
          <div className="mt-4 pt-2 border-t border-neutral-300 text-[9px] font-mono text-neutral-400 flex items-center justify-between">
            <span>Ref: {record.referenceNo}</span>
            <span>Recorded: {formatDateTime(record.dispatchedAt)}</span>
          </div>
        </div>

        {/* Modal Action Buttons (Bottom) */}
        <div className="no-print mt-4 flex items-center justify-between gap-3">
          <div className="text-xs text-neutral-400">
            Dispatched by: <strong className="text-white">{record.dispatchedBy}</strong>
          </div>

          <div className="flex items-center gap-2">
            {record.status !== 'returned' && onMarkReturned && (
              <button
                onClick={() => onMarkReturned(record.id, record.dispatchedBy)}
                className="rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-xs font-semibold transition"
              >
                Mark Returned
              </button>
            )}

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold shadow-md transition active:scale-95"
            >
              <Printer size={15} />
              <span>Print A5 Paper Copy</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
