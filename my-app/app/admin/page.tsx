import { redirect } from "next/navigation";

export default function AdminPage() {
  // Temporary redirect to media hub until main admin dashboard is implemented
  redirect("/admin/media");
}
