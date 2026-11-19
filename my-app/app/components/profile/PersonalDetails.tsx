"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Cake, Hash, Home, Pencil, Phone } from "lucide-react";
import { RESIDENCE_LABELS, RESIDENCE_OPTIONS } from "@/lib/validations/profile";

type Residence = (typeof RESIDENCE_OPTIONS)[number];

export interface PersonalDetailsData {
  sid: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  residence: Residence | null;
}

type FieldErrors = Partial<Record<keyof PersonalDetailsData, string[]>>;

/** DOB is stored as a DATE column and serialized as midnight UTC; read it back in UTC. */
const toInputDate = (value: string | null) => (value ? value.slice(0, 10) : "");
const formatDob = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
    : null;

export default function PersonalDetails<T extends PersonalDetailsData>({
  details,
  saveUrl,
  onSaved,
}: {
  details: PersonalDetailsData;
  saveUrl: string;
  onSaved: (profile: T) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState({
    sid: details.sid ?? "",
    phone: details.phone ?? "",
    dateOfBirth: toInputDate(details.dateOfBirth),
    residence: details.residence ?? "",
  });

  const startEditing = () => {
    setForm({
      sid: details.sid ?? "",
      phone: details.phone ?? "",
      dateOfBirth: toInputDate(details.dateOfBirth),
      residence: details.residence ?? "",
    });
    setErrors({});
    setEditing(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const res = await fetch(saveUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(json.fieldErrors || {});
        toast.error(json.error || "Could not save your details.");
        return;
      }
      onSaved(json.profile);
      setEditing(false);
      toast.success("Profile updated");
    } catch {
      toast.error("Could not save your details.");
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    { icon: Hash, label: "SID", value: details.sid },
    { icon: Phone, label: "Phone", value: details.phone ? `+91 ${details.phone}` : null },
    { icon: Cake, label: "Date of birth", value: formatDob(details.dateOfBirth) },
    { icon: Home, label: "Residence", value: details.residence ? RESIDENCE_LABELS[details.residence] : null },
  ];

  const inputClass = (field: keyof FieldErrors) =>
    `mt-1 w-full rounded-xl border px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40 ${
      errors[field]?.length ? "border-rose-400" : "border-zinc-300"
    }`;
  const fieldError = (field: keyof FieldErrors) =>
    errors[field]?.[0] ? <p className="mt-1 text-xs text-rose-600">{errors[field]![0]}</p> : null;

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50/50 p-5">
        <h2 className="text-lg font-bold">Personal details</h2>
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-2" noValidate>
          <label className="block text-sm font-medium text-zinc-700">
            SID
            <input
              inputMode="numeric"
              maxLength={8}
              placeholder="e.g. 23104012"
              value={form.sid}
              onChange={(e) => setForm({ ...form, sid: e.target.value })}
              className={inputClass("sid")}
            />
            {fieldError("sid")}
          </label>
          <label className="block text-sm font-medium text-zinc-700">
            Phone number
            <input
              type="tel"
              inputMode="tel"
              placeholder="10-digit mobile number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass("phone")}
            />
            {fieldError("phone")}
          </label>
          <label className="block text-sm font-medium text-zinc-700">
            Date of birth
            <input
              type="date"
              value={form.dateOfBirth}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
              className={inputClass("dateOfBirth")}
            />
            {fieldError("dateOfBirth")}
          </label>
          <fieldset className="text-sm font-medium text-zinc-700">
            <legend>Residence</legend>
            <div className="mt-1 flex gap-2">
              {RESIDENCE_OPTIONS.map((option) => (
                <label
                  key={option}
                  className={`flex-1 cursor-pointer rounded-xl border px-3 py-2 text-center transition ${
                    form.residence === option ? "border-sky-500 bg-sky-50 text-sky-800" : "border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="residence"
                    value={option}
                    checked={form.residence === option}
                    onChange={() => setForm({ ...form, residence: option })}
                    className="sr-only"
                  />
                  {RESIDENCE_LABELS[option]}
                </label>
              ))}
            </div>
            {fieldError("residence")}
          </fieldset>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="rounded-full px-5 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save details"}
            </button>
          </div>
        </form>
      ) : (
        <dl className="grid gap-px bg-zinc-100 sm:grid-cols-2">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 bg-white px-5 py-4">
              <Icon className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{label}</dt>
                <dd className={value ? "font-medium text-zinc-800 break-all" : "text-sm italic text-zinc-400"}>
                  {value ?? "Not provided"}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
