import React from 'react';
import type { AssetItem } from '../types/inventory';
import { Package, Truck, Wrench, CheckCircle2 } from 'lucide-react';

interface StatsOverviewProps {
  assets: AssetItem[];
  totalLocationsCount: number;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  assets,
  totalLocationsCount,
}) => {
  const inServiceCount = assets.filter((a) => a.status === 'in_service').length;
  const inTransitCount = assets.filter((a) => a.status === 'in_transit').length;
  const underRepairCount = assets.filter((a) => a.status === 'under_repair').length;
  const standbyCount = assets.filter((a) => a.status === 'standby').length;

  const stats = [
    {
      label: 'Total HIMU Assets',
      value: assets.length,
      detail: `Across ${totalLocationsCount} Parañaque sites`,
      icon: Package,
      iconColor: 'text-neutral-900',
      bgColor: 'bg-neutral-100',
    },
    {
      label: 'In Active Service',
      value: inServiceCount,
      detail: assets.length > 0 ? `${Math.round((inServiceCount / assets.length) * 100)}% operational rate` : 'Ready for asset entry',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Live In-Transit',
      value: inTransitCount,
      detail: inTransitCount === 1 ? '1 active movement' : `${inTransitCount} movements logged`,
      icon: Truck,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      highlight: inTransitCount > 0,
    },
    {
      label: 'Depot & Maintenance',
      value: underRepairCount + standbyCount,
      detail: `${underRepairCount} repair / ${standbyCount} standby`,
      icon: Wrench,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className={`group relative overflow-hidden rounded-3xl liquid-glass p-4 sm:p-5 transition-all hover:shadow-md ${
              stat.highlight
                ? 'ring-2 ring-blue-500/30'
                : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13px] font-semibold text-neutral-500">
                {stat.label}
              </span>
              <div
                className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-2xl ${stat.bgColor} ${stat.iconColor} transition-transform group-hover:scale-105 shadow-xs`}
              >
                <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
            </div>

            <div className="mt-2.5 sm:mt-3">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                {stat.value}
              </div>
              <p className="mt-1 text-xs text-neutral-400 font-medium">
                {stat.detail}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
