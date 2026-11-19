"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import ProfileView from "@/app/components/profile/ProfileView";

export default function UserProfilePage() {
  const params = useParams();
  const { data: session } = useSession();
  const userId = params?.id as string;
  const viewedByAdmin = session?.user?.role === "ADMIN" && session.user.id !== userId;

  return <ProfileView userId={userId} viewedByAdmin={viewedByAdmin} />;
}
