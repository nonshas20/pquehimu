import React, { useState, useMemo } from 'react';
import type { AuditLogEntry } from '../types/inventory';
import { 
  History, 
  Search, 
  X, 
  Printer, 
  ShieldCheck, 
  ArrowRightLeft, 
  Package, 
  Lock, 
  Check, 
  FileText 
} from './HugeIcons';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLogEntry[];
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  logs,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Category filter
      if (selectedCategory !== 'ALL' && log.category !== selectedCategory) {
        return false;
      }
      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        log.details.toLowerCase().includes(q) ||
        log.officerName.toLowerCase().includes(q) ||
        log.officerRole.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        (log.serialNumber && log.serialNumber.toLowerCase().includes(q)) ||
        (log.assetName && log.assetName.toLowerCase().includes(q)) ||
        (log.referenceNo && log.referenceNo.toLowerCase().includes(q)) ||
        (log.locationName && log.locationName.toLowerCase().includes(q))
      );
    });
  }, [logs, selectedCategory, searchQuery]);

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = [
      'Timestamp (ISO)',
      'Date & Time',
      'Reference No',
      'Category',
      'Action',
      'Officer Name',
      'Officer Role',
      'Asset Name',
      'Serial Number',
      'Destination / Location',
      'Details',
    ];

    const rows = filteredLogs.map((l) => {
      const dt = new Date(l.timestamp).toLocaleString('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      return [
        `"${l.timestamp}"`,
        `"${dt}"`,
        `"${l.referenceNo || 'N/A'}"`,
        `"${l.category}"`,
        `"${l.action}"`,
        `"${l.officerName}"`,
        `"${l.officerRole}"`,
        `"${l.assetName || 'N/A'}"`,
        `"${l.serialNumber || 'N/A'}"`,
        `"${l.locationName || 'N/A'}"`,
        `"${l.details.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `COA_HIMU_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl rounded-t-3xl sm:rounded-3xl bg-white border border-neutral-200 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 bg-neutral-50/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-xs">
              <History className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-900">
                  System Audit Trail & Custody Log
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  <Check className="h-3 w-3" />
                  COA Compliant
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Chronological chain of custody and administrative accountability
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              title="Export filtered records to CSV"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition shadow-2xs"
            >
              <FileText className="h-3.5 w-3.5 text-neutral-500" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              title="Print official audit log report"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition shadow-2xs"
            >
              <Printer className="h-3.5 w-3.5 text-neutral-500" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
              aria-label="Close Audit Log"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3.5 sm:p-4 border-b border-neutral-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by officer, serial, asset tag, or action..."
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50/70 pl-9 pr-3.5 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'DISPATCH', label: 'Dispatches' },
              { id: 'INVENTORY', label: 'Inventory' },
              { id: 'SECURITY', label: 'Security' },
              { id: 'COMPLIANCE', label: 'Receipts' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 cursor-pointer ${
                  selectedCategory === tab.id
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80 hover:text-neutral-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile quick export bar */}
        <div className="sm:hidden px-3.5 py-2 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs">
          <span className="text-neutral-500 font-medium">
            {filteredLogs.length} events logged
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1 rounded-lg bg-white border border-neutral-300 font-semibold text-neutral-700 shadow-2xs"
            >
              CSV
            </button>
            <button
              onClick={handlePrint}
              className="px-2.5 py-1 rounded-lg bg-white border border-neutral-300 font-semibold text-neutral-700 shadow-2xs"
            >
              Print
            </button>
          </div>
        </div>

        {/* Audit Log Entries List */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 divide-y divide-neutral-100">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 flex flex-col items-center justify-center space-y-2">
              <History className="h-8 w-8 text-neutral-300" />
              <p className="text-sm font-semibold text-neutral-600">No audit records found</p>
              <p className="text-xs text-neutral-400 max-w-xs">
                No activity matches your current filters. System activities are logged automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredLogs.map((log) => {
                const dateObj = new Date(log.timestamp);
                const dateStr = dateObj.toLocaleDateString('en-PH', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const timeStr = dateObj.toLocaleTimeString('en-PH', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                // Action badge styling
                let badgeColor = 'bg-neutral-100 text-neutral-700 border-neutral-200';
                let Icon = History;
                if (log.action.includes('DISPATCH')) {
                  badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                  Icon = ArrowRightLeft;
                } else if (log.action.includes('RETURN')) {
                  badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                  Icon = Check;
                } else if (log.action.includes('ASSET_CREATED')) {
                  badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
                  Icon = Package;
                } else if (log.action.includes('AUTH')) {
                  badgeColor = 'bg-purple-50 text-purple-800 border-purple-200';
                  Icon = Lock;
                } else if (log.action.includes('CHECKLIST') || log.action.includes('PRINT')) {
                  badgeColor = 'bg-teal-50 text-teal-800 border-teal-200';
                  Icon = Printer;
                }

                return (
                  <div
                    key={log.id}
                    className="p-3 sm:p-3.5 rounded-2xl border border-neutral-200/90 bg-white hover:bg-neutral-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    {/* Left: Timestamp + Action Badge + Description */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Icon */}
                      <div className="h-8 w-8 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="h-4 w-4 text-neutral-600" />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Action Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}
                          >
                            {log.action.replace(/_/g, ' ')}
                          </span>

                          {/* Reference Tag if available */}
                          {log.referenceNo && (
                            <span className="font-mono text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                              {log.referenceNo}
                            </span>
                          )}

                          {/* Date and Time */}
                          <span className="text-[11px] text-neutral-400">
                            {dateStr} • {timeStr}
                          </span>
                        </div>

                        {/* Human details description */}
                        <p className="text-neutral-800 font-medium leading-relaxed">
                          {log.details}
                        </p>

                        {/* Asset metadata pill */}
                        {log.serialNumber && (
                          <div className="flex items-center gap-2 pt-0.5 text-[11px] text-neutral-500 font-mono">
                            <span>SN: {log.serialNumber}</span>
                            {log.locationName && (
                              <>
                                <span>•</span>
                                <span className="font-sans font-medium text-neutral-600">
                                  {log.locationName}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Acting Officer Badge */}
                    <div className="shrink-0 flex items-center sm:flex-col sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-100">
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-700">
                          {log.officerName.slice(0, 1)}
                        </div>
                        <span className="font-semibold text-neutral-800 text-[11px]">
                          {log.officerName}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mt-0.5">
                        {log.officerRole}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-neutral-200 bg-neutral-50/80 flex items-center justify-between text-xs text-neutral-500 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-[11px] font-medium">
              City of Parañaque • HIMU Custody Log
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-neutral-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
