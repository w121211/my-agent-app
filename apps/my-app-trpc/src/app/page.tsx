// src/app/page.tsx
// apps/my-app-trpc/src/app/page.tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  // Redirect to workspace - in a real app, you might want to show a landing page first
  // or redirect to the first available project/chat
  redirect("/workspace");
}
