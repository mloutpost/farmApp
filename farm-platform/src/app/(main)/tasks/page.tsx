"use client";

import { useMemo, useState, useCallback } from "react";
import { useFarmStore } from "@/store/farm-store";
import type { FarmTask } from "@/types";
import { NODE_KIND_LABELS, NODE_KIND_COLORS } from "@/types";

type SortKey = "dueDate" | "priority" | "createdAt";
type FilterStatus = "all" | FarmTask["status"];
type FilterPriority = "all" | FarmTask["priority"];

const PRIORITY_ORDER: Record<FarmTask["priority"], number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const PRIORITY_STYLES: Record<FarmTask["priority"], { bg: string; text: string }> = {
  urgent: { bg: "bg-red-500/15", text: "text-red-400" },
  high: { bg: "bg-amber-500/15", text: "text-amber-400" },
  medium: { bg: "bg-blue-500/15", text: "text-blue-400" },
  low: { bg: "bg-zinc-500/15", text: "text-zinc-400" },
};

const CATEGORY_LABELS: Record<NonNullable<FarmTask["category"]>, string> = {
  planting: "Planting",
  watering: "Watering",
  harvest: "Harvest",
  maintenance: "Maintenance",
  livestock: "Livestock",
  equipment: "Equipment",
  other: "Other",
};

const RECURRENCE_LABELS: Record<FarmTask["recurrence"], string> = {
  none: "None",
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function emptyForm(): Omit<FarmTask, "id" | "createdAt" | "updatedAt"> {
  return {
    title: "",
    notes: "",
    nodeId: undefined,
    dueDate: toDateStr(new Date()),
    priority: "medium",
    status: "todo",
    recurrence: "none",
    category: undefined,
    estimatedMinutes: undefined,
  };
}

/* ── Icons (inline SVG, no deps) ── */

function CheckIcon({ checked }: { checked: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
      <rect x="1" y="1" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.5"
        className={checked ? "fill-accent/20 stroke-accent" : "stroke-current"} />
      {checked && <path d="M5 9.5l2.5 2.5L13 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />}
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function RecurrenceIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
      <path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" />
      <path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

/* ── TaskForm ── */

function TaskForm({
  initial,
  nodes,
  onSave,
  onCancel,
  submitLabel = "Save Task",
}: {
  initial: Omit<FarmTask, "id" | "createdAt" | "updatedAt">;
  nodes: { id: string; name: string; kind: string }[];
  onSave: (data: Omit<FarmTask, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [form, setForm] = useState(initial);
  const patch = useCallback(<K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v })), []);

  const inputCls = "w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50 transition-colors";
  const labelCls = "text-xs font-medium text-text-secondary mb-1.5 block";

  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-5 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Title *</label>
          <input type="text" className={inputCls} placeholder="What needs to be done?" value={form.title} onChange={(e) => patch("title", e.target.value)} autoFocus />
        </div>
        <div>
          <label className={labelCls}>Due Date</label>
          <input type="date" className={inputCls} value={form.dueDate ?? ""} onChange={(e) => patch("dueDate", e.target.value || undefined)} />
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <select className={inputCls} value={form.priority} onChange={(e) => patch("priority", e.target.value as FarmTask["priority"])}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={form.category ?? ""} onChange={(e) => patch("category", (e.target.value || undefined) as FarmTask["category"])}>
            <option value="">None</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Link to Node</label>
          <select className={inputCls} value={form.nodeId ?? ""} onChange={(e) => patch("nodeId", e.target.value || undefined)}>
            <option value="">None</option>
            {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Recurrence</label>
          <select className={inputCls} value={form.recurrence} onChange={(e) => patch("recurrence", e.target.value as FarmTask["recurrence"])}>
            {Object.entries(RECURRENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Estimated Time (min)</label>
          <input type="number" min="0" className={inputCls} placeholder="e.g. 30" value={form.estimatedMinutes ?? ""} onChange={(e) => patch("estimatedMinutes", e.target.value ? Number(e.target.value) : undefined)} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Additional details…" value={form.notes ?? ""} onChange={(e) => patch("notes", e.target.value || undefined)} />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
        <button
          onClick={() => { if (form.title.trim()) onSave(form); }}
          disabled={!form.title.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitLabel}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── TaskRow ── */

function TaskRow({
  task,
  nodeName,
  nodeKind,
  onComplete,
  onDelete,
  onUpdate,
  nodes,
}: {
  task: FarmTask;
  nodeName?: string;
  nodeKind?: string;
  onComplete: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<FarmTask>) => void;
  nodes: { id: string; name: string; kind: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isDone = task.status === "done";
  const pStyle = PRIORITY_STYLES[task.priority];

  const dueDateDisplay = useMemo(() => {
    if (!task.dueDate) return null;
    const d = new Date(task.dueDate + "T12:00:00");
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (diff < 0) return { label, cls: "text-red-400" };
    if (diff === 0) return { label: "Today", cls: "text-amber-400" };
    if (diff === 1) return { label: "Tomorrow", cls: "text-blue-400" };
    return { label, cls: "text-text-muted" };
  }, [task.dueDate]);

  if (editing) {
    const editData: Omit<FarmTask, "id" | "createdAt" | "updatedAt"> = {
      title: task.title,
      notes: task.notes,
      nodeId: task.nodeId,
      dueDate: task.dueDate,
      completedDate: task.completedDate,
      assignedTo: task.assignedTo,
      priority: task.priority,
      status: task.status,
      recurrence: task.recurrence,
      recurrenceEndDate: task.recurrenceEndDate,
      category: task.category,
      estimatedMinutes: task.estimatedMinutes,
    };
    return (
      <TaskForm
        initial={editData}
        nodes={nodes}
        submitLabel="Update Task"
        onSave={(data) => { onUpdate(data); setEditing(false); setExpanded(false); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className={`group border-b border-border/50 transition-colors ${isDone ? "opacity-60" : "hover:bg-bg-surface/50"}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        <button onClick={onComplete} className="text-text-muted hover:text-accent transition-colors" aria-label={isDone ? "Undo complete" : "Complete task"}>
          <CheckIcon checked={isDone} />
        </button>

        {/* Title + meta row */}
        <button className="flex-1 min-w-0 text-left" onClick={() => setExpanded(!expanded)}>
          <span className={`text-sm font-medium ${isDone ? "line-through text-text-muted" : "text-text-primary"}`}>
            {task.title}
          </span>
        </button>

        {/* Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {task.recurrence !== "none" && <RecurrenceIcon />}

          {task.estimatedMinutes != null && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-text-muted">
              <ClockIcon />{task.estimatedMinutes}m
            </span>
          )}

          {nodeName && nodeKind && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-text-muted max-w-[120px] truncate">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: NODE_KIND_COLORS[nodeKind as keyof typeof NODE_KIND_COLORS] ?? "#6b7280" }} />
              {nodeName}
            </span>
          )}

          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${pStyle.bg} ${pStyle.text}`}>
            {task.priority}
          </span>

          {dueDateDisplay && (
            <span className={`text-xs font-medium ${dueDateDisplay.cls} tabular-nums`}>
              {dueDateDisplay.label}
            </span>
          )}

          <button onClick={() => setExpanded(!expanded)} className="text-text-muted hover:text-text-primary transition-colors p-0.5">
            <ChevronIcon open={expanded} />
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pl-12 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs mb-3">
            {task.category && (
              <div><span className="text-text-muted">Category</span><p className="text-text-secondary mt-0.5">{CATEGORY_LABELS[task.category]}</p></div>
            )}
            {task.recurrence !== "none" && (
              <div><span className="text-text-muted">Recurrence</span><p className="text-text-secondary mt-0.5">{RECURRENCE_LABELS[task.recurrence]}</p></div>
            )}
            {task.estimatedMinutes != null && (
              <div><span className="text-text-muted">Est. Time</span><p className="text-text-secondary mt-0.5">{task.estimatedMinutes} min</p></div>
            )}
            {task.completedDate && (
              <div><span className="text-text-muted">Completed</span><p className="text-text-secondary mt-0.5">{new Date(task.completedDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p></div>
            )}
            {nodeName && (
              <div><span className="text-text-muted">Linked Node</span><p className="text-text-secondary mt-0.5">{nodeName}{nodeKind ? ` (${NODE_KIND_LABELS[nodeKind as keyof typeof NODE_KIND_LABELS] ?? nodeKind})` : ""}</p></div>
            )}
          </div>
          {task.notes && (
            <p className="text-xs text-text-secondary bg-bg-surface rounded-lg px-3 py-2 mb-3 whitespace-pre-wrap">{task.notes}</p>
          )}
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(true)} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
              Edit
            </button>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:text-danger transition-colors flex items-center gap-1">
                <TrashIcon /> Delete
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-danger">Delete this task?</span>
                <button onClick={onDelete} className="rounded-md bg-red-500/15 px-3 py-1.5 text-xs font-medium text-danger hover:bg-red-500/25 transition-colors">
                  Yes, delete
                </button>
                <button onClick={() => setConfirmDelete(false)} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Section ── */

function TaskSection({
  label,
  count,
  badge,
  children,
  defaultOpen = true,
}: {
  label: string;
  count: number;
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;

  return (
    <div className="mb-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-bg-surface/30 rounded-lg transition-colors">
        <ChevronIcon open={open} />
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{label}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge ?? "bg-bg-surface text-text-muted"}`}>
          {count}
        </span>
      </button>
      {open && (
        <div className="rounded-xl border border-border bg-bg-elevated overflow-hidden mt-1 animate-in fade-in duration-150">
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ── */

export default function TasksPage() {
  const tasks = useFarmStore((s) => s.tasks);
  const nodes = useFarmStore((s) => s.nodes);
  const addTask = useFarmStore((s) => s.addTask);
  const updateTask = useFarmStore((s) => s.updateTask);
  const removeTask = useFarmStore((s) => s.removeTask);
  const completeTask = useFarmStore((s) => s.completeTask);

  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("dueDate");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterPriority, setFilterPriority] = useState<FilterPriority>("all");
  const [filterNode, setFilterNode] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const nodeMap = useMemo(() => {
    const m = new Map<string, { name: string; kind: string }>();
    nodes.forEach((n) => m.set(n.id, { name: n.name, kind: n.kind }));
    return m;
  }, [nodes]);

  const nodeList = useMemo(() => nodes.map((n) => ({ id: n.id, name: n.name, kind: n.kind })), [nodes]);

  const hasActiveFilters = filterStatus !== "all" || filterPriority !== "all" || filterNode !== "all" || filterCategory !== "all";

  const filtered = useMemo(() => {
    let list = [...tasks];
    if (filterStatus !== "all") list = list.filter((t) => t.status === filterStatus);
    if (filterPriority !== "all") list = list.filter((t) => t.priority === filterPriority);
    if (filterNode !== "all") list = list.filter((t) => t.nodeId === filterNode);
    if (filterCategory !== "all") list = list.filter((t) => t.category === filterCategory);
    return list;
  }, [tasks, filterStatus, filterPriority, filterNode, filterCategory]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "priority") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (sortBy === "createdAt") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      const aDate = a.dueDate ?? "9999-12-31";
      const bDate = b.dueDate ?? "9999-12-31";
      return aDate.localeCompare(bDate);
    });
  }, [filtered, sortBy]);

  const today = toDateStr(new Date());

  const { overdue, todayTasks, upcoming, completed } = useMemo(() => {
    const overdue: FarmTask[] = [];
    const todayTasks: FarmTask[] = [];
    const upcoming: FarmTask[] = [];
    const completed: FarmTask[] = [];

    sorted.forEach((t) => {
      if (t.status === "done" || t.status === "skipped") {
        completed.push(t);
      } else if (t.dueDate && t.dueDate < today) {
        overdue.push(t);
      } else if (t.dueDate === today) {
        todayTasks.push(t);
      } else {
        upcoming.push(t);
      }
    });
    return { overdue, todayTasks, upcoming, completed };
  }, [sorted, today]);

  const handleAdd = useCallback((data: Omit<FarmTask, "id" | "createdAt" | "updatedAt">) => {
    addTask(data);
    setShowForm(false);
  }, [addTask]);

  const clearFilters = useCallback(() => {
    setFilterStatus("all");
    setFilterPriority("all");
    setFilterNode("all");
    setFilterCategory("all");
  }, []);

  const selectCls = "rounded-lg border border-border bg-bg-surface px-2.5 py-1.5 text-xs text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent/50 transition-colors";

  const renderRows = (list: FarmTask[]) =>
    list.map((t) => {
      const linked = t.nodeId ? nodeMap.get(t.nodeId) : undefined;
      return (
        <TaskRow
          key={t.id}
          task={t}
          nodeName={linked?.name}
          nodeKind={linked?.kind}
          nodes={nodeList}
          onComplete={() => completeTask(t.id)}
          onDelete={() => removeTask(t.id)}
          onUpdate={(updates) => updateTask(t.id, updates)}
        />
      );
    });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Tasks</h1>
            <p className="text-sm text-text-muted mt-1">
              {overdue.length > 0 && <span className="text-red-400">{overdue.length} overdue</span>}
              {overdue.length > 0 && (todayTasks.length > 0 || upcoming.length > 0) && <span className="text-text-muted">{" · "}</span>}
              {todayTasks.length > 0 && <span className="text-amber-400">{todayTasks.length} today</span>}
              {todayTasks.length > 0 && upcoming.length > 0 && <span className="text-text-muted">{" · "}</span>}
              {upcoming.length > 0 && <span className="text-text-secondary">{upcoming.length} upcoming</span>}
              {overdue.length === 0 && todayTasks.length === 0 && upcoming.length === 0 && completed.length === 0 && "No tasks yet"}
              {overdue.length === 0 && todayTasks.length === 0 && upcoming.length === 0 && completed.length > 0 && "All caught up!"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                hasActiveFilters ? "border-accent/50 text-accent bg-accent/10" : "border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              <FilterIcon /> Filters{hasActiveFilters ? " ●" : ""}
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors flex items-center gap-1.5"
            >
              <PlusIcon /> Add Task
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="rounded-xl border border-border bg-bg-elevated p-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-[11px] font-medium text-text-muted mb-1 block">Status</label>
                <select className={selectCls} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}>
                  <option value="all">All</option>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="skipped">Skipped</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-text-muted mb-1 block">Priority</label>
                <select className={selectCls} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as FilterPriority)}>
                  <option value="all">All</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-text-muted mb-1 block">Node</label>
                <select className={selectCls} value={filterNode} onChange={(e) => setFilterNode(e.target.value)}>
                  <option value="all">All Nodes</option>
                  {nodeList.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-text-muted mb-1 block">Category</label>
                <select className={selectCls} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="all">All</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-text-muted mb-1 block">Sort By</label>
                <select className={selectCls} value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
                  <option value="dueDate">Due Date</option>
                  <option value="priority">Priority</option>
                  <option value="createdAt">Created</option>
                </select>
              </div>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-accent hover:text-accent-hover transition-colors pb-1.5">
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        {/* Add Task Form */}
        {showForm && (
          <TaskForm initial={emptyForm()} nodes={nodeList} onSave={handleAdd} onCancel={() => setShowForm(false)} />
        )}

        {/* Task Sections */}
        {filtered.length === 0 && !showForm ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-sm">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 text-accent">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                {hasActiveFilters ? "No matching tasks" : "No tasks yet"}
              </h2>
              <p className="text-sm text-text-secondary">
                {hasActiveFilters
                  ? "Try adjusting your filters or add a new task."
                  : "Add your first task to start tracking farm work."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <TaskSection label="Overdue" count={overdue.length} badge="bg-red-500/15 text-red-400">
              {renderRows(overdue)}
            </TaskSection>

            <TaskSection label="Today" count={todayTasks.length} badge="bg-amber-500/15 text-amber-400">
              {renderRows(todayTasks)}
            </TaskSection>

            <TaskSection label="Upcoming" count={upcoming.length} badge="bg-blue-500/15 text-blue-400">
              {renderRows(upcoming)}
            </TaskSection>

            <TaskSection label="Completed" count={completed.length} defaultOpen={false}>
              {renderRows(completed)}
            </TaskSection>
          </>
        )}
      </div>
    </div>
  );
}
