import type { FarmNode, FarmProfile, FarmTask, CalendarEvent, GardenData, BedNodeData, GreenhouseData, Planting } from "@/types";
import { getCropById } from "./crop-catalog";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function subDays(dateStr: string, days: number): string {
  return addDays(dateStr, -days);
}

function plantingEvents(planting: Planting, nodeId: string, nodeName: string, profile: FarmProfile): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const crop = planting.catalogId ? getCropById(planting.catalogId) : null;
  const dtm = planting.daysToMaturity ?? crop?.dtmMin ?? 90;
  const lastFrost = profile.lastFrostSpring;
  const firstFrost = profile.firstFrostFall;
  const label = planting.crop || crop?.name || "Crop";
  const prefix = `${label} — ${nodeName}`;

  if (crop?.sowIndoorsWeeks && lastFrost) {
    const sowIndoorDate = subDays(lastFrost, crop.sowIndoorsWeeks * 7);
    events.push({
      id: `sow-indoor-${planting.id}`,
      type: "sow-indoor",
      title: `Start ${prefix} indoors`,
      date: sowIndoorDate,
      nodeId,
      plantingId: planting.id,
      color: "#8b5cf6",
      allDay: true,
    });
  }

  if (crop?.directSowFrostWeeks != null && lastFrost) {
    const directSowDate = addDays(lastFrost, -(crop.directSowFrostWeeks * 7));
    events.push({
      id: `direct-sow-${planting.id}`,
      type: "direct-sow",
      title: `Direct sow ${prefix}`,
      date: directSowDate,
      nodeId,
      plantingId: planting.id,
      color: "#22c55e",
      allDay: true,
    });
  }

  if (planting.datePlanted) {
    events.push({
      id: `planted-${planting.id}`,
      type: "transplant",
      title: `${prefix} planted`,
      date: planting.datePlanted,
      nodeId,
      plantingId: planting.id,
      color: "#16a34a",
      allDay: true,
    });

    const harvestDate = addDays(planting.datePlanted, dtm);
    events.push({
      id: `harvest-${planting.id}`,
      type: "harvest",
      title: `Harvest ${prefix}`,
      date: harvestDate,
      nodeId,
      plantingId: planting.id,
      color: "#f59e0b",
      allDay: true,
    });

    if (firstFrost && harvestDate > firstFrost) {
      events.push({
        id: `frost-warn-${planting.id}`,
        type: "frost-warning",
        title: `${prefix} — harvest after frost!`,
        date: firstFrost,
        nodeId,
        plantingId: planting.id,
        color: "#ef4444",
        allDay: true,
      });
    }
  } else if (lastFrost) {
    const sowDate = addDays(lastFrost, 14);
    const harvestDate = addDays(sowDate, dtm);
    events.push({
      id: `est-harvest-${planting.id}`,
      type: "harvest",
      title: `Est. harvest ${prefix}`,
      date: harvestDate,
      nodeId,
      plantingId: planting.id,
      color: "#f59e0b",
      allDay: true,
    });
  }

  return events;
}

function taskEvents(task: FarmTask): CalendarEvent | null {
  if (!task.dueDate) return null;
  return {
    id: `task-${task.id}`,
    type: "task",
    title: task.title,
    date: task.dueDate,
    nodeId: task.nodeId,
    taskId: task.id,
    color: task.priority === "urgent" ? "#ef4444" : task.priority === "high" ? "#f59e0b" : "#60a5fa",
    allDay: true,
  };
}

export function buildCalendarEvents(
  nodes: FarmNode[],
  tasks: FarmTask[],
  profile: FarmProfile,
  season?: number,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const year = season ?? profile.currentSeason ?? new Date().getFullYear();

  for (const node of nodes) {
    let plantings: Planting[] = [];

    if (node.data.kind === "garden") {
      const gd = node.data as GardenData;
      gd.beds.forEach((bed) => {
        bed.plantings
          .filter((p) => !p.season || p.season === year)
          .forEach((p) => plantings.push(p));
      });
    } else if (node.data.kind === "bed") {
      const bd = node.data as BedNodeData;
      plantings = (bd.plantings ?? []).filter((p) => !p.season || p.season === year);
    } else if (node.data.kind === "greenhouse") {
      const ghd = node.data as GreenhouseData;
      ghd.beds.forEach((bed) => {
        bed.plantings
          .filter((p) => !p.season || p.season === year)
          .forEach((p) => plantings.push(p));
      });
    }

    for (const p of plantings) {
      events.push(...plantingEvents(p, node.id, node.name, profile));
    }
  }

  if (profile.lastFrostSpring) {
    events.push({
      id: "last-frost-spring",
      type: "frost-warning",
      title: "Last frost (spring)",
      date: profile.lastFrostSpring,
      color: "#06b6d4",
      allDay: true,
    });
  }
  if (profile.firstFrostFall) {
    events.push({
      id: "first-frost-fall",
      type: "frost-warning",
      title: "First frost (fall)",
      date: profile.firstFrostFall,
      color: "#06b6d4",
      allDay: true,
    });
  }

  for (const task of tasks) {
    if (task.status === "done" || task.status === "skipped") continue;
    const ev = taskEvents(task);
    if (ev) events.push(ev);
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}
