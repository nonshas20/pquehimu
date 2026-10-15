import React from 'react';
import type { AssetItem, AssetStatus } from '../types/inventory';
import { Package, Truck, Wrench, CheckCircle2 } from './HugeIcons';

interface StatsOverviewProps {
  assets: AssetItem[];
  totalLocationsCount: number;
  activeStatusFilter?: AssetStatus | 'ALL';
  onSelectStatusFilter?: (status: AssetStatus | 'ALL') => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  assets,
  totalLocationsCount,
  activeStatusFilter = 'ALL',
  onSelectStatusFilter,
}) => {
  const inServiceCount = assets.filter((a) => a.status === 'in_service').length;
  const inTransitCount = assets.filter((a) => a.status === 'in_transit').length;
  const underRepairCount = assets.filter((a) => a.status === 'under_repair').length;
  const standbyCount = assets.filter((a) => a.status === 'standby').length;

  const stats: Array<{
    label: string;
    value: number;
    detail: string;
    icon: any;
    iconColor: string;
    bgColor: string;
    filterValue: AssetStatus | 'ALL';
    highlight?: boolean;
  }> = [
    {
      label: 'Total HIMU Assets',
      value: assets.length,
      detail: `Across ${totalLocationsCount} Parañaque sites`,
      icon: Package,
      iconColor: 'text-neutral-900',
      bgColor: 'bg-neutral-100',
      filterValue: 'ALL',
    },
    {
      label: 'In Active Service',
      value: inServiceCount,
      detail: assets.length > 0 ? `${Math.round((inServiceCount / assets.length) * 100)}% operational rate` : 'Ready for asset entry',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      filterValue: 'in_service',
    },
    {
      label: 'Live In-Transit',
      value: inTransitCount,
      detail: inTransitCount === 1 ? '1 active movement' : `${inTransitCount} movements logged`,
      icon: Truck,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      filterValue: 'in_transit',
      highlight: inTransitCount > 0,
    },
    {
      label: 'Depot & Maintenance',
      value: underRepairCount + standbyCount,
      detail: `${underRepairCount} repair / ${standbyCount} standby`,
      icon: Wrench,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      filterValue: 'under_repair',
    },
  ];

  const handleCardClick = (filterValue: AssetStatus | 'ALL') => {
    if (onSelectStatusFilter) {
      onSelectStatusFilter(filterValue);
      const registrySection = document.getElementById('asset-registry-section');
      if (registrySection) {
        registrySection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        const isActive = activeStatusFilter === stat.filterValue;

        return (
          <button
            type="button"
            key={idx}
            onClick={() => handleCardClick(stat.filterValue)}
            className={`group relative text-left overflow-hidden rounded-2xl sm:rounded-3xl bg-white border shadow-md sm:shadow-lg p-4 sm:p-5 transition-all hover:shadow-xl cursor-pointer active:scale-[0.98] ${
              isActive
                ? 'border-neutral-900 ring-2 ring-neutral-900/10'
                : stat.highlight
                ? 'border-blue-300 ring-2 ring-blue-500/20'
                : 'border-neutral-200/90'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13px] font-semibold text-neutral-500 group-hover:text-neutral-900 transition-colors">
                {stat.label}
              </span>
              <div
                className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-2xl ${stat.bgColor} ${stat.iconColor} transition-transform group-hover:scale-110 shadow-xs`}
              >
                <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
            </div>

            <div className="mt-2.5 sm:mt-3">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                {stat.value}
              </div>
              <p className="mt-1 text-xs text-neutral-400 font-medium group-hover:text-neutral-600 transition-colors">
                {stat.detail}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
