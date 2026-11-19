import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildDatabaseWorkbook, buildMembersWorkbook } from "@/lib/export";

export const dynamic = "force-dynamic";
// exceljs needs Node APIs (streams, Buffer), not the Edge runtime.
export const runtime = "nodejs";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Admin-only Excel export.
 *   GET /api/admin/export?type=members   -> members.xlsx (one sheet)
 *   GET /api/admin/export?type=database  -> full database, one sheet per table
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Administrator access required." }, { status: 403 });
  }

  const type = request.nextUrl.searchParams.get("type") ?? "members";
  if (type !== "members" && type !== "database") {
    return NextResponse.json({ error: "type must be 'members' or 'database'" }, { status: 400 });
  }

  try {
    const buffer = type === "members" ? await buildMembersWorkbook() : await buildDatabaseWorkbook();
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = type === "members" ? `images-members-${stamp}.xlsx` : `images-database-${stamp}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": XLSX_TYPE,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Excel export failed:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
