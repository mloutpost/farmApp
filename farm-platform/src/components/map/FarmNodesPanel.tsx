"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFarmStore } from "@/store/farm-store";
import { useMapStore } from "@/store/map-store";
import {
  NODE_KIND_LABELS,
  NODE_KIND_COLORS,
  nodeColor,
  type FarmNode,
  type FarmGroup,
  type NodeKind,
} from "@/types";
import { NodeKindIcon } from "@/components/icons/FarmIcons";

const PRESET_COLORS = [
  "#22c55e", "#84cc16", "#a3e635", "#4ade80",
  "#38bdf8", "#60a5fa", "#0ea5e9", "#22d3ee",
  "#a78bfa", "#c084fc", "#f472b6", "#fb923c",
  "#facc15", "#ef4444", "#94a3b8", "#78716c",
];

function ColorPicker({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (color: string | undefined) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-1 z-50 rounded-lg border border-border bg-bg-elevated p-3 shadow-xl"
      style={{ width: 200 }}
    >
      <div className="grid grid-cols-8 gap-1.5 mb-3">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => { onChange(c); onClose(); }}
            className="w-5 h-5 rounded-full border border-white/10 transition-transform hover:scale-125"
            style={{ backgroundColor: c, outline: value === c ? "2px solid white" : "none", outlineOffset: 2 }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border border-border bg-transparent"
        />
        <span className="text-[10px] text-text-muted font-mono flex-1">{value}</span>
        <button
          onClick={() => { onChange(undefined); onClose(); }}
          className="text-[10px] text-text-muted hover:text-text-secondary"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function NodeRow({ node, groups, indent }: { node: FarmNode; groups: FarmGroup[]; indent?: boolean }) {
  const router = useRouter();
  const updateNode = useFarmStore((s) => s.updateNode);
  const setEditingNodeId = useMapStore((s) => s.setEditingNodeId);
  const [editing, setEditing] = useState(false);
  const [showColor, setShowColor] = useState(false);
  const [name, setName] = useState(node.name);
  const color = nodeColor(node, groups);

  useEffect(() => { setName(node.name); }, [node.name]);

  const commitName = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== node.name) {
      updateNode(node.id, { name: trimmed });
    } else {
      setName(node.name);
    }
    setEditing(false);
  }, [name, node.id, node.name, updateNode]);

  return (
    <div className={`group flex items-center gap-2 py-1.5 hover:bg-bg-surface/60 transition-colors rounded-md ${indent ? "pl-7 pr-3" : "px-3"}`}>
      <div className="relative">
        <button
          onClick={() => setShowColor(!showColor)}
          className="w-3.5 h-3.5 rounded-full border border-white/15 shrink-0 hover:scale-125 transition-transform"
          style={{ backgroundColor: color }}
          title="Change color"
        />
        {showColor && (
          <ColorPicker
            value={color}
            onChange={(c) => updateNode(node.id, { color: c })}
            onClose={() => setShowColor(false)}
          />
        )}
      </div>

      {editing ? (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitName();
            if (e.key === "Escape") { setName(node.name); setEditing(false); }
          }}
          className="flex-1 min-w-0 bg-bg-surface rounded px-2 py-0.5 text-xs text-text-primary outline-none border border-accent/40"
          autoFocus
        />
      ) : (
        <button
          onDoubleClick={() => setEditing(true)}
          onClick={() => setEditingNodeId(node.id)}
          className="flex-1 min-w-0 text-left text-xs text-text-primary truncate"
          title="Click to locate · Double-click to rename"
        >
          {node.name}
        </button>
      )}

      <span className="shrink-0 text-[10px] text-text-muted hidden group-hover:inline">
        {NODE_KIND_LABELS[node.kind]}
      </span>

      <button
        onClick={() => router.push(`/node?id=${node.id}`)}
        className="shrink-0 opacity-0 group-hover:opacity-100 rounded p-0.5 text-text-muted hover:text-text-primary transition-all"
        title="Open detail page"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

function GroupSection({
  group,
  nodes,
  groups,
  filter,
}: {
  group: FarmGroup;
  nodes: FarmNode[];
  groups: FarmGroup[];
  filter: string;
}) {
  const updateGroup = useFarmStore((s) => s.updateGroup);
  const removeGroup = useFarmStore((s) => s.removeGroup);
  const updateNode = useFarmStore((s) => s.updateNode);
  const [collapsed, setCollapsed] = useState(group.collapsed ?? false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(group.name);
  const [showColor, setShowColor] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setName(group.name); }, [group.name]);
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const forceOpen = filter.length > 0;
  const isOpen = forceOpen || !collapsed;

  const commitName = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== group.name) {
      updateGroup(group.id, { name: trimmed });
    } else {
      setName(group.name);
    }
    setEditingName(false);
  }, [name, group.id, group.name, updateGroup]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    updateGroup(group.id, { collapsed: next });
  };

  const handleUngroup = () => {
    removeGroup(group.id);
    setShowMenu(false);
  };

  const displayColor = group.color ?? NODE_KIND_COLORS[nodes[0]?.kind] ?? "#22c55e";

  return (
    <div className="mb-1">
      <div className="flex items-center gap-1.5 px-3 py-2 hover:bg-bg-surface/40 rounded-md transition-colors">
        <button onClick={toggleCollapse} className="shrink-0 text-text-muted hover:text-text-primary transition-colors">
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowColor(!showColor)}
            className="w-3.5 h-3.5 rounded shrink-0 border border-white/15 hover:scale-125 transition-transform"
            style={{ backgroundColor: displayColor }}
            title="Group color"
          />
          {showColor && (
            <ColorPicker
              value={displayColor}
              onChange={(c) => updateGroup(group.id, { color: c })}
              onClose={() => setShowColor(false)}
            />
          )}
        </div>

        {editingName ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") { setName(group.name); setEditingName(false); }
            }}
            className="flex-1 min-w-0 bg-bg-surface rounded px-2 py-0.5 text-xs font-medium text-text-primary outline-none border border-accent/40"
            autoFocus
          />
        ) : (
          <button
            onDoubleClick={() => setEditingName(true)}
            onClick={toggleCollapse}
            className="flex-1 min-w-0 text-left text-xs font-medium text-text-primary truncate"
            title="Double-click to rename"
          >
            {group.name}
          </button>
        )}

        <span className="shrink-0 text-[10px] text-text-muted">{nodes.length}</span>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="shrink-0 rounded p-0.5 text-text-muted hover:text-text-primary hover:bg-bg-surface transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
          </button>
          {showMenu && (
            <div ref={menuRef} className="absolute right-0 top-full mt-1 z-50 rounded-lg border border-border bg-bg-elevated shadow-xl py-1 w-40">
              <button
                onClick={handleUngroup}
                className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-surface hover:text-text-primary transition-colors"
              >
                Ungroup all
              </button>
              <button
                onClick={() => {
                  nodes.forEach((n) => updateNode(n.id, { color: group.color }));
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-surface hover:text-text-primary transition-colors"
              >
                Apply color to all
              </button>
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <div>
          {nodes.map((node) => (
            <NodeRow key={node.id} node={node} groups={groups} indent />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FarmNodesPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nodes = useFarmStore((s) => s.nodes);
  const groups = useFarmStore((s) => s.groups);
  const profile = useFarmStore((s) => s.profile);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter) return nodes;
    const q = filter.toLowerCase();
    return nodes.filter((n) =>
      n.name.toLowerCase().includes(q) ||
      n.kind.toLowerCase().includes(q) ||
      NODE_KIND_LABELS[n.kind].toLowerCase().includes(q) ||
      (n.groupId && groups.find((g) => g.id === n.groupId)?.name.toLowerCase().includes(q))
    );
  }, [nodes, groups, filter]);

  const { groupedEntries, ungrouped } = useMemo(() => {
    const byGroup = new Map<string, FarmNode[]>();
    const ungrouped: FarmNode[] = [];

    filtered.forEach((n) => {
      if (n.groupId) {
        const arr = byGroup.get(n.groupId) ?? [];
        arr.push(n);
        byGroup.set(n.groupId, arr);
      } else {
        ungrouped.push(n);
      }
    });

    const groupedEntries: { group: FarmGroup; nodes: FarmNode[] }[] = [];
    groups.forEach((g) => {
      const gNodes = byGroup.get(g.id);
      if (gNodes?.length) {
        groupedEntries.push({ group: g, nodes: gNodes });
      }
    });

    return { groupedEntries, ungrouped };
  }, [filtered, groups]);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/30" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 left-0 z-40 h-full w-80 bg-bg-elevated border-r border-border shadow-2xl transform transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">{profile.name || "My Farm"}</h2>
              <p className="text-[10px] text-text-muted mt-0.5">
                {nodes.length} node{nodes.length !== 1 ? "s" : ""}
                {groups.length > 0 && ` · ${groups.length} group${groups.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-3 py-2 border-b border-border">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter nodes..."
              className="w-full rounded-md border border-border bg-bg-surface px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent/40 transition-colors"
            />
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-1">
            {nodes.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-text-muted">No nodes yet.</p>
                <p className="text-xs text-text-muted mt-1">Draw shapes on the map or import GeoJSON to get started.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-text-muted">No matches for &ldquo;{filter}&rdquo;</p>
              </div>
            ) : (
              <>
                {groupedEntries.map(({ group, nodes: gNodes }) => (
                  <GroupSection key={group.id} group={group} nodes={gNodes} groups={groups} filter={filter} />
                ))}

                {ungrouped.length > 0 && groupedEntries.length > 0 && (
                  <div className="px-4 py-1.5 mt-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Ungrouped ({ungrouped.length})
                  </div>
                )}
                {ungrouped.map((node) => (
                  <NodeRow key={node.id} node={node} groups={groups} />
                ))}
              </>
            )}
          </div>

          <div className="px-4 py-3 border-t border-border">
            <p className="text-[10px] text-text-muted leading-relaxed">
              Click to locate · Double-click to rename · Color dot to restyle
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
