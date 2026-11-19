import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { getMembers, type Member } from "@/lib/members";
import { RESIDENCE_LABELS } from "@/lib/validations/profile";

/**
 * Excel exports for admins. Password hashes and OTP hashes are never exported.
 * Values are written as typed cells (never formulas), so user-entered text
 * such as "=cmd" cannot execute when the sheet is opened.
 */

const ADMIN_FILL = "FFFEF3C7"; // amber-100, same cue as the admin members list
const HEADER_FILL = "FF18181B"; // zinc-900

interface ColumnSpec<T> {
  header: string;
  width: number;
  value: (row: T) => string | number | Date | null;
  numFmt?: string;
}

function addSheet<T>(
  workbook: ExcelJS.Workbook,
  name: string,
  rows: T[],
  columns: ColumnSpec<T>[],
  highlight?: (row: T) => boolean,
) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columns.map((c) => ({ header: c.header, width: c.width, style: c.numFmt ? { numFmt: c.numFmt } : {} }));

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  header.alignment = { vertical: "middle" };
  header.height = 20;

  for (const row of rows) {
    const added = sheet.addRow(columns.map((c) => c.value(row)));
    if (highlight?.(row)) {
      added.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ADMIN_FILL } };
      });
    }
  }

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return sheet;
}

const memberColumns: ColumnSpec<Member>[] = [
  { header: "Username", width: 22, value: (m) => m.username },
  { header: "Email", width: 32, value: (m) => m.email },
  { header: "Role", width: 10, value: (m) => m.role },
  { header: "Status", width: 12, value: (m) => m.status },
  { header: "SID", width: 12, value: (m) => m.sid },
  { header: "Phone", width: 14, value: (m) => m.phone },
  { header: "Date of Birth", width: 14, value: (m) => m.dateOfBirth, numFmt: "dd-mmm-yyyy" },
  { header: "Residence", width: 14, value: (m) => (m.residence ? RESIDENCE_LABELS[m.residence] : null) },
  { header: "Points", width: 10, value: (m) => m.points },
  { header: "Events Attended", width: 16, value: (m) => m.eventsAttended },
  { header: "Joined", width: 14, value: (m) => m.createdAt, numFmt: "dd-mmm-yyyy" },
  { header: "User ID", width: 38, value: (m) => m.id },
];

function newWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IMAGES Admin";
  workbook.created = new Date();
  return workbook;
}

async function toBuffer(workbook: ExcelJS.Workbook) {
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** One sheet with every member. */
export async function buildMembersWorkbook() {
  const workbook = newWorkbook();
  addSheet(workbook, "Members", await getMembers(), memberColumns, (m) => m.role === "ADMIN");
  return toBuffer(workbook);
}

/** Every table in the database, one sheet each, with readable joins. */
export async function buildDatabaseWorkbook() {
  const [members, events, transactions, eventTypes, media] = await Promise.all([
    getMembers(),
    db.event.findMany({ orderBy: { eventDate: "desc" } }),
    db.pointTransaction.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { username: true } }, event: { select: { title: true } } },
    }),
    db.eventType.findMany({ orderBy: { name: "asc" } }),
    db.mediaImage.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const usernames = new Map(members.map((m) => [m.id, m.username]));
  const names = (ids: string[]) => ids.map((id) => usernames.get(id) ?? id).join(", ");

  const workbook = newWorkbook();
  addSheet(workbook, "Members", members, memberColumns, (m) => m.role === "ADMIN");

  addSheet(workbook, "Events", events, [
    { header: "Title", width: 32, value: (e) => e.title },
    { header: "Type", width: 16, value: (e) => e.eventType },
    { header: "Status", width: 12, value: (e) => e.status },
    { header: "Date", width: 14, value: (e) => e.eventDate, numFmt: "dd-mmm-yyyy" },
    { header: "Start", width: 10, value: (e) => e.startTime },
    { header: "End", width: 10, value: (e) => e.endTime },
    { header: "Location", width: 24, value: (e) => e.location },
    { header: "Participants", width: 12, value: (e) => e.participantIds.length },
    { header: "Participant Names", width: 40, value: (e) => names(e.participantIds) },
    { header: "Pending Requests", width: 40, value: (e) => names(e.requestedParticipantIds) },
    { header: "Attendance Marked", width: 18, value: (e) => (e.attendanceMarked ? "Yes" : "No") },
    { header: "Description", width: 50, value: (e) => e.description },
    { header: "Cover Image", width: 40, value: (e) => e.coverImage },
    { header: "Image Count", width: 12, value: (e) => e.images.length },
    { header: "Created", width: 14, value: (e) => e.createdAt, numFmt: "dd-mmm-yyyy" },
    { header: "Event ID", width: 38, value: (e) => e.id },
  ]);

  addSheet(workbook, "Points Ledger", transactions, [
    { header: "Date", width: 18, value: (t) => t.createdAt, numFmt: "dd-mmm-yyyy hh:mm" },
    { header: "Member", width: 22, value: (t) => t.user.username },
    { header: "Amount", width: 10, value: (t) => t.amount },
    { header: "Reason", width: 40, value: (t) => t.reason },
    { header: "Event", width: 32, value: (t) => t.event?.title ?? null },
    { header: "Transaction ID", width: 38, value: (t) => t.id },
  ]);

  addSheet(workbook, "Event Types", eventTypes, [
    { header: "Name", width: 24, value: (t) => t.name },
    { header: "Points", width: 10, value: (t) => t.points },
    { header: "Created", width: 14, value: (t) => t.createdAt, numFmt: "dd-mmm-yyyy" },
  ]);

  addSheet(workbook, "Media", media, [
    { header: "Title", width: 30, value: (m) => m.title },
    { header: "Category", width: 14, value: (m) => m.category },
    { header: "URL", width: 60, value: (m) => m.url },
    { header: "Format", width: 10, value: (m) => m.format },
    { header: "Size (KB)", width: 12, value: (m) => (m.bytes ? Math.round(m.bytes / 1024) : null) },
    { header: "Width", width: 10, value: (m) => m.width },
    { header: "Height", width: 10, value: (m) => m.height },
    { header: "Uploaded", width: 14, value: (m) => m.createdAt, numFmt: "dd-mmm-yyyy" },
  ]);

  return toBuffer(workbook);
}
