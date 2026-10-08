import React from 'react';

interface SvgProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

// 🖨️ High-Fidelity Office Tank Printer SVG
export const PrinterSvg: React.FC<SvgProps> = ({ className = 'w-6 h-6', size, ...props }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    {...props}
  >
    {/* Rear Paper Feeder & Input Paper */}
    <rect x="18" y="6" width="28" height="20" rx="2" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="2" />
    <path d="M22 11H34" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
    <path d="M22 16H42" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />

    {/* Main Printer Chassis */}
    <rect x="8" y="20" width="48" height="28" rx="6" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
    
    {/* Printer Control Panel / Button Strip */}
    <rect x="14" y="24" width="36" height="6" rx="2" fill="#334155" />
    <circle cx="18" cy="27" r="1.5" fill="#10B981" /> {/* Power LED */}
    <circle cx="23" cy="27" r="1.2" fill="#38BDF8" /> {/* Wi-Fi LED */}
    <circle cx="28" cy="27" r="1.2" fill="#F59E0B" /> {/* Paper Error LED */}

    {/* Front Output Paper Tray */}
    <rect x="16" y="34" width="32" height="18" rx="3" fill="#F8FAFC" stroke="#64748B" strokeWidth="1.5" />
    {/* Printed Text Lines on Output Document */}
    <path d="M20 40H38" stroke="#0284C7" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M20 44H44" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M20 48H32" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />

    {/* Ink Tank Level Windows (Cyan, Magenta, Yellow, Black) */}
    <rect x="44" y="34" width="8" height="12" rx="1.5" fill="#0F172A" />
    <rect x="45.5" y="41" width="1" height="4" fill="#06B6D4" />
    <rect x="47" y="40" width="1" height="5" fill="#EC4899" />
    <rect x="48.5" y="39" width="1" height="6" fill="#EAB308" />
    <rect x="50" y="38" width="1" height="7" fill="#F8FAFC" />
  </svg>
);

// 🌐 Wi-Fi 6 Gigabit Router SVG with Antennas & Signal Radiations
export const RouterSvg: React.FC<SvgProps> = ({ className = 'w-6 h-6', size, ...props }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    {...props}
  >
    {/* Wi-Fi Radio Wave Arcs */}
    <path
      d="M24 14C28.5 10.5 35.5 10.5 40 14"
      stroke="#38BDF8"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.85"
    />
    <path
      d="M27 19C30 16.5 34 16.5 37 19"
      stroke="#0284C7"
      strokeWidth="2.5"
      strokeLinecap="round"
    />

    {/* 4 High-Gain Antennas */}
    <line x1="14" y1="34" x2="8" y2="12" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
    <line x1="22" y1="32" x2="18" y2="8" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
    <line x1="42" y1="32" x2="46" y2="8" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
    <line x1="50" y1="34" x2="56" y2="12" stroke="#334155" strokeWidth="3" strokeLinecap="round" />

    {/* Antenna Base Joints */}
    <circle cx="14" cy="34" r="2.5" fill="#0F172A" />
    <circle cx="22" cy="32" r="2.5" fill="#0F172A" />
    <circle cx="42" cy="32" r="2.5" fill="#0F172A" />
    <circle cx="50" cy="34" r="2.5" fill="#0F172A" />

    {/* Main Router Chassis */}
    <rect x="10" y="32" width="44" height="20" rx="5" fill="#0F172A" stroke="#1E293B" strokeWidth="2" />
    
    {/* Ventilation Rib Top Detail */}
    <line x1="16" y1="36" x2="48" y2="36" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="19" y1="39" x2="45" y2="39" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />

    {/* Front LED Panel with Active Internet Indicators */}
    <rect x="14" y="44" width="36" height="5" rx="2" fill="#1E293B" />
    <circle cx="18" cy="46.5" r="1.3" fill="#10B981" /> {/* Power */}
    <circle cx="23" cy="46.5" r="1.3" fill="#10B981" /> {/* Internet WAN */}
    <circle cx="28" cy="46.5" r="1.3" fill="#38BDF8" /> {/* 2.4GHz */}
    <circle cx="33" cy="46.5" r="1.3" fill="#38BDF8" /> {/* 5GHz */}
    <circle cx="38" cy="46.5" r="1.3" fill="#10B981" /> {/* LAN 1 */}
    <circle cx="43" cy="46.5" r="1.3" fill="#10B981" /> {/* LAN 2 */}
  </svg>
);

// 🔌 Heavy-Duty Multi-Gang Surge Protector Extension Cord SVG
export const ExtensionCordSvg: React.FC<SvgProps> = ({ className = 'w-6 h-6', size, ...props }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    {...props}
  >
    {/* Coiled Heavy-Duty Power Cable */}
    <path
      d="M12 36C8 38 6 44 8 49C10 54 16 56 22 55C29 54 30 48 26 44C23 41 18 43 17 47C16 51 21 54 28 54C34 54 44 52 48 50"
      stroke="#F97316"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    
    {/* Heavy-Duty 3-Prong Plug at cable end */}
    <rect x="47" y="46" width="9" height="7" rx="2" fill="#1E293B" />
    <line x1="56" y1="48" x2="60" y2="48" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="56" y1="51" x2="60" y2="51" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />

    {/* Surge Protector Power Strip Body (Tilted/Straight) */}
    <rect
      x="12"
      y="12"
      width="44"
      height="22"
      rx="6"
      fill="#F8FAFC"
      stroke="#475569"
      strokeWidth="2"
    />

    {/* Master Red Illuminated Rocker Switch */}
    <rect x="16" y="17" width="7" height="12" rx="2" fill="#EF4444" stroke="#DC2626" strokeWidth="1" />
    <line x1="19.5" y1="19" x2="19.5" y2="23" stroke="#FEF2F2" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="19.5" cy="26" r="0.8" fill="#FEE2E2" />

    {/* Universal Socket 1 */}
    <rect x="26" y="16" width="7" height="14" rx="2" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
    <circle cx="28.5" cy="20" r="0.9" fill="#0F172A" />
    <circle cx="30.5" cy="20" r="0.9" fill="#0F172A" />
    <rect x="29" y="23" width="1.2" height="3" rx="0.5" fill="#0F172A" />

    {/* Universal Socket 2 */}
    <rect x="35" y="16" width="7" height="14" rx="2" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
    <circle cx="37.5" cy="20" r="0.9" fill="#0F172A" />
    <circle cx="39.5" cy="20" r="0.9" fill="#0F172A" />
    <rect x="38" y="23" width="1.2" height="3" rx="0.5" fill="#0F172A" />

    {/* Universal Socket 3 */}
    <rect x="44" y="16" width="7" height="14" rx="2" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
    <circle cx="46.5" cy="20" r="0.9" fill="#0F172A" />
    <circle cx="48.5" cy="20" r="0.9" fill="#0F172A" />
    <rect x="47" y="23" width="1.2" height="3" rx="0.5" fill="#0F172A" />

    {/* Power / Surge Protected LED indicator */}
    <circle cx="53" cy="19" r="1.2" fill="#10B981" />
  </svg>
);

// 💻 All-in-One Workstation / Desktop Computer SVG
export const ComputerSvg: React.FC<SvgProps> = ({ className = 'w-6 h-6', size, ...props }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    {...props}
  >
    {/* Monitor Screen Frame */}
    <rect x="10" y="10" width="44" height="30" rx="3" fill="#0F172A" stroke="#334155" strokeWidth="2" />
    {/* Inner Display Glass */}
    <rect x="13" y="13" width="38" height="23" rx="1.5" fill="#1E293B" />
    
    {/* Screen Content (EHR / Clinic Census chart) */}
    <path d="M16 29L22 24L28 27L36 19L44 23L48 18" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="16" y="16" width="10" height="3" rx="1" fill="#0284C7" />

    {/* Monitor Stand */}
    <path d="M29 40H35V48H29V40Z" fill="#64748B" />
    <path d="M22 48H42" stroke="#475569" strokeWidth="3" strokeLinecap="round" />

    {/* Keyboard */}
    <rect x="14" y="52" width="26" height="6" rx="1.5" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
    {/* Mouse */}
    <rect x="43" y="52" width="5" height="6" rx="2" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
  </svg>
);

// Raw HTML strings for Leaflet L.divIcon markers
export const getPrinterMarkerSvg = (size = 20) => `
  <svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="18" y="6" width="28" height="20" rx="2" fill="#F1F5F9" stroke="#94A3B8" stroke-width="2"/>
    <rect x="8" y="20" width="48" height="28" rx="6" fill="#1E293B" stroke="#0F172A" stroke-width="2"/>
    <rect x="14" y="24" width="36" height="6" rx="2" fill="#334155"/>
    <circle cx="18" cy="27" r="1.5" fill="#10B981"/>
    <rect x="16" y="34" width="32" height="18" rx="3" fill="#F8FAFC" stroke="#64748B" stroke-width="1.5"/>
    <path d="M20 40H38" stroke="#0284C7" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M20 44H44" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round"/>
    <rect x="44" y="34" width="8" height="12" rx="1.5" fill="#0F172A"/>
    <rect x="45.5" y="41" width="1" height="4" fill="#06B6D4"/>
    <rect x="47" y="40" width="1" height="5" fill="#EC4899"/>
    <rect x="48.5" y="39" width="1" height="6" fill="#EAB308"/>
  </svg>
`;

export const getRouterMarkerSvg = (size = 20) => `
  <svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 14C28.5 10.5 35.5 10.5 40 14" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="14" y1="34" x2="8" y2="12" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
    <line x1="22" y1="32" x2="18" y2="8" stroke="#1E293B" stroke-width="3" stroke-linecap="round"/>
    <line x1="42" y1="32" x2="46" y2="8" stroke="#1E293B" stroke-width="3" stroke-linecap="round"/>
    <line x1="50" y1="34" x2="56" y2="12" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
    <rect x="10" y="32" width="44" height="20" rx="5" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>
    <rect x="14" y="44" width="36" height="5" rx="2" fill="#1E293B"/>
    <circle cx="18" cy="46.5" r="1.3" fill="#10B981"/>
    <circle cx="23" cy="46.5" r="1.3" fill="#10B981"/>
    <circle cx="28" cy="46.5" r="1.3" fill="#38BDF8"/>
  </svg>
`;

export const getExtensionCordMarkerSvg = (size = 20) => `
  <svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 36C8 38 6 44 8 49C10 54 16 56 22 55C29 54 30 48 26 44C23 41 18 43 17 47C16 51 21 54 28 54C34 54 44 52 48 50" stroke="#F97316" stroke-width="3.5" stroke-linecap="round"/>
    <rect x="12" y="12" width="44" height="22" rx="6" fill="#F8FAFC" stroke="#475569" stroke-width="2"/>
    <rect x="16" y="17" width="7" height="12" rx="2" fill="#EF4444"/>
    <rect x="26" y="16" width="7" height="14" rx="2" fill="#E2E8F0" stroke="#94A3B8" stroke-width="1"/>
    <circle cx="28.5" cy="20" r="0.9" fill="#0F172A"/>
    <circle cx="30.5" cy="20" r="0.9" fill="#0F172A"/>
    <rect x="35" y="16" width="7" height="14" rx="2" fill="#E2E8F0" stroke="#94A3B8" stroke-width="1"/>
    <circle cx="37.5" cy="20" r="0.9" fill="#0F172A"/>
    <circle cx="39.5" cy="20" r="0.9" fill="#0F172A"/>
    <circle cx="53" cy="19" r="1.2" fill="#10B981"/>
  </svg>
`;

export const getComputerMarkerSvg = (size = 20) => `
  <svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="10" width="44" height="30" rx="3" fill="#0F172A" stroke="#334155" stroke-width="2"/>
    <rect x="13" y="13" width="38" height="23" rx="1.5" fill="#1E293B"/>
    <path d="M16 29L22 24L28 27L36 19L44 23" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/>
    <path d="M29 40H35V48H29V40Z" fill="#64748B"/>
    <path d="M22 48H42" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
  </svg>
`;
