"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, SlidersHorizontal } from "lucide-react";
import {
  getPerspectiveWorker,
  type PerspectiveSchema,
  type PerspectiveTable,
  type PerspectiveViewerElement,
} from "@/lib/perspective";

export type DatasetKey = "members" | "events" | "ledger";

/** Explicit schemas so empty tables still load and date columns are typed. */
const SCHEMAS: Record<DatasetKey, PerspectiveSchema> = {
  members: {
    Member: "string",
    Role: "string",
    Status: "string",
    Residence: "string",
    Batch: "string",
    Age: "integer",
    Points: "integer",
    "Events Attended": "integer",
    Joined: "date",
    "Joined Month": "string",
    Count: "integer",
  },
  events: {
    Event: "string",
    Type: "string",
    Status: "string",
    Date: "date",
    Month: "string",
    Participants: "integer",
    "Pending Requests": "integer",
    "Attendance Marked": "string",
    Count: "integer",
  },
  ledger: {
    Member: "string",
    Amount: "integer",
    Kind: "string",
    Reason: "string",
    "Event Type": "string",
    Date: "date",
    Month: "string",
    Count: "integer",
  },
};

interface Preset {
  id: string;
  label: string;
  dataset: DatasetKey;
  config: Record<string, unknown>;
}

const DATASET_LABELS: Record<DatasetKey, string> = { members: "Members", events: "Events", ledger: "Points" };

/**
 * Starting views. Each is a single series (one measure, one colour) so the
 * charts stay readable; admins can pivot further from the settings panel.
 */
const PRESETS: Preset[] = [
  { id: "joins", label: "New members per month", dataset: "members", config: { plugin: "Y Bar", group_by: ["Joined Month"], columns: ["Count"], filter: [["Status", "==", "APPROVED"]] } },
  { id: "top", label: "Top members by points", dataset: "members", config: { plugin: "X Bar", group_by: ["Member"], columns: ["Points"], sort: [["Points", "desc"]], filter: [["Status", "==", "APPROVED"]] } },
  { id: "residence", label: "Day scholar vs hosteller", dataset: "members", config: { plugin: "Datagrid", group_by: ["Residence"], columns: ["Count", "Points", "Events Attended"], aggregates: { Points: "avg", "Events Attended": "avg" }, filter: [["Status", "==", "APPROVED"]] } },
  { id: "batch", label: "Members by batch", dataset: "members", config: { plugin: "Y Bar", group_by: ["Batch"], columns: ["Count"], filter: [["Status", "==", "APPROVED"]] } },
  { id: "members-table", label: "All members", dataset: "members", config: { plugin: "Datagrid", columns: ["Member", "Role", "Status", "Residence", "Batch", "Age", "Points", "Events Attended", "Joined"], sort: [["Points", "desc"]] } },
  { id: "event-types", label: "Events by type", dataset: "events", config: { plugin: "Y Bar", group_by: ["Type"], columns: ["Count"] } },
  { id: "participation", label: "Participants per event", dataset: "events", config: { plugin: "X Bar", group_by: ["Event"], columns: ["Participants"], sort: [["Participants", "desc"]] } },
  { id: "events-table", label: "All events", dataset: "events", config: { plugin: "Datagrid", columns: ["Event", "Type", "Status", "Date", "Participants", "Pending Requests", "Attendance Marked"], sort: [["Date", "desc"]] } },
  { id: "points-month", label: "Points awarded per month", dataset: "ledger", config: { plugin: "Y Bar", group_by: ["Month"], columns: ["Amount"], filter: [["Kind", "==", "Awarded"]] } },
  { id: "points-type", label: "Points by event type", dataset: "ledger", config: { plugin: "Y Bar", group_by: ["Event Type"], columns: ["Amount"], filter: [["Kind", "==", "Awarded"]], sort: [["Amount", "desc"]] } },
  { id: "ledger-table", label: "Points ledger", dataset: "ledger", config: { plugin: "Datagrid", columns: ["Date", "Member", "Kind", "Amount", "Reason", "Event Type"], sort: [["Date", "desc"]] } },
];

/** Every key a preset may set, so switching presets never inherits stale pivots. */
const BLANK_CONFIG = {
  group_by: [],
  split_by: [],
  filter: [],
  sort: [],
  aggregates: {},
  expressions: {},
  settings: false,
  theme: "Pro Light",
};

export default function PerspectiveWorkspace({ tables }: { tables: Record<DatasetKey, Record<string, unknown>[]> }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PerspectiveViewerElement | null>(null);
  const tableRefs = useRef<Partial<Record<DatasetKey, PerspectiveTable>>>({});
  const loadedDataset = useRef<DatasetKey | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [presetId, setPresetId] = useState(PRESETS[0].id);

  // Boot Perspective, create one table per dataset and mount a single viewer.
  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    const created: PerspectiveTable[] = [];
    let viewer: PerspectiveViewerElement | null = null;

    (async () => {
      try {
        const worker = await getPerspectiveWorker();
        for (const key of Object.keys(SCHEMAS) as DatasetKey[]) {
          const table = await worker.table(SCHEMAS[key]);
          created.push(table);
          await table.update(tables[key]);
          tableRefs.current[key] = table;
        }
        if (cancelled || !host) return;
        viewer = document.createElement("perspective-viewer") as PerspectiveViewerElement;
        viewer.style.cssText = "position:absolute;inset:0;";
        // Theme variables are scoped to [theme="Pro Light"]; without it charts can't read their colours.
        viewer.setAttribute("theme", "Pro Light");
        host.appendChild(viewer);
        viewerRef.current = viewer;
        loadedDataset.current = null;
        setState("ready");
      } catch (error) {
        console.error("Perspective failed to start:", error);
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
      viewerRef.current = null;
      tableRefs.current = {};
      // Viewer must be released before the tables it reads from.
      (async () => {
        if (viewer) {
          await viewer.delete().catch(() => {});
          viewer.remove();
        }
        for (const table of created) await table.delete().catch(() => {});
      })();
    };
  }, [tables]);

  // Apply the selected preset.
  useEffect(() => {
    const viewer = viewerRef.current;
    const preset = PRESETS.find((p) => p.id === presetId);
    if (state !== "ready" || !viewer || !preset) return;
    (async () => {
      const table = tableRefs.current[preset.dataset];
      if (!table) return;
      if (loadedDataset.current !== preset.dataset) {
        await viewer.load(table);
        loadedDataset.current = preset.dataset;
      }
      await viewer.restore({ ...BLANK_CONFIG, title: preset.label, ...preset.config });
    })().catch((error) => console.error("Failed to apply analytics view:", error));
  }, [state, presetId]);

  const groups = (Object.keys(DATASET_LABELS) as DatasetKey[]).map((key) => ({
    key,
    presets: PRESETS.filter((p) => p.dataset === key),
  }));

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-zinc-200 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          {groups.map(({ key, presets }) => (
            <div key={key} className="flex flex-wrap items-center gap-2">
              <span className="w-16 shrink-0 text-xs font-semibold uppercase tracking-widest text-zinc-400">{DATASET_LABELS[key]}</span>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setPresetId(preset.id)}
                  aria-pressed={presetId === preset.id}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    presetId === preset.id ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={state !== "ready"}
            onClick={() => viewerRef.current?.toggleConfig()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" /> Customize view
          </button>
          <button
            type="button"
            disabled={state !== "ready"}
            onClick={() => viewerRef.current?.download(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> Export CSV
          </button>
        </div>
      </div>

      <div ref={hostRef} className="relative h-140">
        {state === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading analytics engine…
          </div>
        )}
        {state === "error" && (
          <div role="alert" className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-rose-700">
            The interactive analytics engine could not load (it is fetched from cdn.jsdelivr.net). Check your connection and reload the page.
          </div>
        )}
      </div>
    </section>
  );
}
