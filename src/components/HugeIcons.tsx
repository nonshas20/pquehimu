import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import type { IconSvgElement } from '@hugeicons/react';
import {
  Search01Icon,
  Cancel01Icon,
  Add01Icon,
  Copy01Icon,
  CheckmarkCircle01Icon,
  Tick01Icon,
  Clock01Icon,
  File01Icon,
  Location01Icon,
  Building03Icon,
  DeliveryTruck01Icon,
  Wrench01Icon,
  Package01Icon,
  Layers01Icon,
  Maximize01Icon,
  Minimize01Icon,
  RefreshCcwIcon,
  SparklesIcon,
  GripVerticalIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  CloudUploadIcon,
  MailSend01Icon,
  Camera01Icon,
  AlertCircleIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  UserCheck01Icon,
  PrinterIcon,
  Wifi01Icon,
  NetworkIcon,
  MonitorIcon,
  FingerPrintIcon,
  FlashIcon,
  Plug01Icon,
  Time02Icon,
  Archive01Icon,
  Grid2x2Icon,
  LayoutTable01Icon,
  Database01Icon,
  MapIcon as HugeMapIcon,
  ArrowLeftRightIcon,
  ArrowRight01Icon,
  Delete01Icon,
  Edit01Icon,
  Logout01Icon
} from '@hugeicons/core-free-icons';

export interface HugeIconProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number;
  className?: string;
  color?: string;
}

export const createHugeIcon = (iconData: IconSvgElement, name: string) => {
  const Component = React.forwardRef<SVGSVGElement, HugeIconProps>(
    ({ size = 20, strokeWidth = 1.6, className = '', color = 'currentColor', ...rest }, ref) => {
      return (
        <HugeiconsIcon
          ref={ref}
          icon={iconData}
          size={size}
          strokeWidth={strokeWidth}
          className={className}
          color={color}
          {...(rest as any)}
        />
      );
    }
  );
  Component.displayName = name;
  return Component;
};

// Unified Hugeicons Library
export const Search = createHugeIcon(Search01Icon, 'Search');
export const X = createHugeIcon(Cancel01Icon, 'X');
export const Plus = createHugeIcon(Add01Icon, 'Plus');
export const Copy = createHugeIcon(Copy01Icon, 'Copy');
export const Check = createHugeIcon(Tick01Icon, 'Check');
export const CheckCircle2 = createHugeIcon(CheckmarkCircle01Icon, 'CheckCircle2');
export const Clock = createHugeIcon(Clock01Icon, 'Clock');
export const FileText = createHugeIcon(File01Icon, 'FileText');
export const MapPin = createHugeIcon(Location01Icon, 'MapPin');
export const Building2 = createHugeIcon(Building03Icon, 'Building2');
export const Truck = createHugeIcon(DeliveryTruck01Icon, 'Truck');
export const Wrench = createHugeIcon(Wrench01Icon, 'Wrench');
export const Package = createHugeIcon(Package01Icon, 'Package');
export const Layers = createHugeIcon(Layers01Icon, 'Layers');
export const Maximize2 = createHugeIcon(Maximize01Icon, 'Maximize2');
export const Minimize2 = createHugeIcon(Minimize01Icon, 'Minimize2');
export const RotateCcw = createHugeIcon(RefreshCcwIcon, 'RotateCcw');
export const Sparkles = createHugeIcon(SparklesIcon, 'Sparkles');
export const GripVertical = createHugeIcon(GripVerticalIcon, 'GripVertical');
export const ChevronRight = createHugeIcon(ChevronRightIcon, 'ChevronRight');
export const ChevronLeft = createHugeIcon(ChevronLeftIcon, 'ChevronLeft');
export const ChevronDown = createHugeIcon(ChevronDownIcon, 'ChevronDown');
export const UploadCloud = createHugeIcon(CloudUploadIcon, 'UploadCloud');
export const Send = createHugeIcon(MailSend01Icon, 'Send');
export const Camera = createHugeIcon(Camera01Icon, 'Camera');
export const AlertCircle = createHugeIcon(AlertCircleIcon, 'AlertCircle');
export const QrCode = createHugeIcon(QrCodeIcon, 'QrCode');
export const ShieldCheck = createHugeIcon(ShieldCheckIcon, 'ShieldCheck');
export const UserCheck = createHugeIcon(UserCheck01Icon, 'UserCheck');
export const Printer = createHugeIcon(PrinterIcon, 'Printer');
export const Wifi = createHugeIcon(Wifi01Icon, 'Wifi');
export const Network = createHugeIcon(NetworkIcon, 'Network');
export const Monitor = createHugeIcon(MonitorIcon, 'Monitor');
export const Fingerprint = createHugeIcon(FingerPrintIcon, 'Fingerprint');
export const Zap = createHugeIcon(FlashIcon, 'Zap');
export const Plug = createHugeIcon(Plug01Icon, 'Plug');
export const History = createHugeIcon(Time02Icon, 'History');
export const Archive = createHugeIcon(Archive01Icon, 'Archive');
export const LayoutGrid = createHugeIcon(Grid2x2Icon, 'LayoutGrid');
export const TableIcon = createHugeIcon(LayoutTable01Icon, 'TableIcon');
export const Database = createHugeIcon(Database01Icon, 'Database');
export const MapIcon = createHugeIcon(HugeMapIcon, 'MapIcon');
export const ArrowRightLeft = createHugeIcon(ArrowLeftRightIcon, 'ArrowRightLeft');
export const ArrowRight = createHugeIcon(ArrowRight01Icon, 'ArrowRight');
export const Trash = createHugeIcon(Delete01Icon, 'Trash');
export const Edit = createHugeIcon(Edit01Icon, 'Edit');
export const LogOut = createHugeIcon(Logout01Icon, 'LogOut');
