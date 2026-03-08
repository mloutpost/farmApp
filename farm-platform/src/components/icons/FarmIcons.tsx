"use client";

import type { NodeKind } from "@/types";

const iconClass = "flex-shrink-0";

export function IconWater({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}

export function IconFilter({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  );
}

export function IconPump({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

export function IconGarden({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M12 22v-8M4 14l4-4 4 4 4-4" />
      <path d="M4 14v8h16v-8" />
      <path d="M4 14h16" />
    </svg>
  );
}

export function IconBed({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M4 8v12M20 8v12M4 12h16M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4H4V8z" />
    </svg>
  );
}

export function IconField({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M4 20l4-8 4 4 4-4 4 8" />
      <path d="M4 20h16" />
    </svg>
  );
}

export function IconPasture({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <circle cx="8" cy="14" r="2" />
      <circle cx="16" cy="14" r="2" />
      <path d="M8 12v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function IconCompost({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

export function IconOrchard({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <circle cx="12" cy="8" r="3" />
      <path d="M12 11v11M8 18l4-4 4 4" />
    </svg>
  );
}

export function IconInfrastructure({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M4 20V10l8-5 8 5v10" />
      <path d="M4 10h16M12 5v5" />
    </svg>
  );
}

export function IconEquipment({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

export function IconStream({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M4 12h16M4 8h12M4 16h14" strokeDasharray="4 2" />
    </svg>
  );
}

export function IconHome({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

export function IconPin({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M12 2v8l4 4 4 4-4 4-4-4" />
      <path d="M12 2l-4 4 4 4 4-4-4-4z" />
    </svg>
  );
}

export function IconSettings({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

export function IconMove({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
    </svg>
  );
}

export function IconEdit({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function IconTrash({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function IconFolder({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function IconClose({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

const FLOW_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  water_source: IconWater,
  water_distribution: IconFilter,
  garden: IconGarden,
  raised_bed: IconBed,
  field: IconField,
  livestock_system: IconPasture,
  compost_facility: IconCompost,
  pasture: IconPasture,
};

export function FlowIcon({ variant, size = 14 }: { variant: string; size?: number }) {
  const Icon = FLOW_ICONS[variant] ?? IconPin;
  return <Icon size={size} />;
}

const ZONE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  garden: IconGarden,
  field: IconField,
  pasture: IconPasture,
  orchard: IconOrchard,
  infrastructure: IconInfrastructure,
};

export function ZoneIcon({ zoneType, size = 14 }: { zoneType: string; size?: number }) {
  const Icon = ZONE_ICONS[zoneType ?? ""] ?? IconPin;
  return <Icon size={size} />;
}

export function IconPond({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <ellipse cx="12" cy="14" rx="9" ry="5" />
      <path d="M6 10c1-2 3-3 6-3s5 1 6 3" />
    </svg>
  );
}

export function IconGreenhouse({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M4 20V10a8 8 0 0 1 16 0v10" />
      <path d="M4 20h16" />
      <path d="M12 2v18" />
      <path d="M4 14h16" />
    </svg>
  );
}

export function IconSpring({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      <path d="M12 8v6M9 11h6" />
    </svg>
  );
}

export function IconShop({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

export function IconSilo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M5 20V8a7 7 0 0 1 14 0v12" />
      <path d="M5 20h14" />
      <path d="M5 14h14" />
    </svg>
  );
}

export function IconBeehive({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M12 2l6 4v4l-6 4-6-4V6z" />
      <path d="M12 10l6 4v4l-6 4-6-4v-4z" />
    </svg>
  );
}

export function IconGate({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M4 4v16M20 4v16" />
      <path d="M4 8h16M4 16h16" />
      <path d="M12 8v8" />
    </svg>
  );
}

export function IconRoad({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M6 2l2 20M16 2l2 20" />
      <path d="M12 6v2M12 12v2M12 18v2" strokeDasharray="2 4" />
    </svg>
  );
}

export function IconPipeline({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M4 10h16M4 14h16" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="12" r="2" />
    </svg>
  );
}

export function IconDitch({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M2 10l4 6h12l4-6" />
      <path d="M6 16v4M18 16v4" />
    </svg>
  );
}

export function IconPowerline({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

export function IconVineyard({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M12 22V8" />
      <path d="M8 12a4 4 0 0 0 8 0" />
      <circle cx="8" cy="6" r="2" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="12" cy="3" r="2" />
    </svg>
  );
}

export function IconWoodlot({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M8 22v-6" />
      <path d="M16 22v-6" />
      <path d="M8 16l-4-5h8l-4-5h8l-4-5h8l-4 5h8l-4 5h8l-4 5" />
    </svg>
  );
}

export function IconCorral({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <rect x="3" y="6" width="18" height="12" rx="1" />
      <path d="M3 10h18M3 14h18" />
      <path d="M9 6v12M15 6v12" />
    </svg>
  );
}

export function IconCoop({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M3 21V11l9-7 9 7v10" />
      <path d="M9 21v-4a3 3 0 0 1 6 0v4" />
      <circle cx="12" cy="11" r="1.5" />
    </svg>
  );
}

export function IconCellar({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M4 12h16" />
      <path d="M4 12v8h16v-8" />
      <path d="M4 12l4-6h8l4 6" />
      <path d="M8 16h8" />
    </svg>
  );
}

export function IconSmokehouse({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <rect x="5" y="10" width="14" height="12" rx="1" />
      <path d="M5 10l7-6 7 6" />
      <path d="M10 4c0-1 1-2 2-2s2 1 2 2" />
      <path d="M10 16h4M10 19h4" />
    </svg>
  );
}

export function IconBuilding({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <rect x="3" y="10" width="18" height="12" rx="1" />
      <path d="M3 10l9-8 9 8" />
      <rect x="9" y="15" width="6" height="7" />
      <rect x="5" y="13" width="3" height="3" />
      <rect x="16" y="13" width="3" height="3" />
    </svg>
  );
}

export function IconRainwater({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
      <path d="M7 20h10a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3z" />
      <path d="M12 2v4M8 3l1 3M16 3l-1 3" />
      <path d="M8 14h8" />
    </svg>
  );
}

const KIND_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  garden: IconGarden,
  bed: IconBed,
  field: IconField,
  pasture: IconPasture,
  orchard: IconOrchard,
  pond: IconPond,
  greenhouse: IconGreenhouse,
  vineyard: IconVineyard,
  woodlot: IconWoodlot,
  corral: IconCorral,
  building: IconBuilding,
  well: IconWater,
  pump: IconPump,
  barn: IconInfrastructure,
  compost: IconCompost,
  spring: IconSpring,
  shop: IconShop,
  silo: IconSilo,
  beehive: IconBeehive,
  gate: IconGate,
  coop: IconCoop,
  cellar: IconCellar,
  smokehouse: IconSmokehouse,
  rainwater: IconRainwater,
  irrigation: IconStream,
  fence: IconEquipment,
  stream: IconStream,
  road: IconRoad,
  pipeline: IconPipeline,
  ditch: IconDitch,
  powerline: IconPowerline,
};

export function NodeKindIcon({ kind, size = 14 }: { kind: NodeKind; size?: number }) {
  const Icon = KIND_ICONS[kind] ?? IconPin;
  return <Icon size={size} />;
}
