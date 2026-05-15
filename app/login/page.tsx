import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { homePathForRole } from "@/lib/auth/roles";
import LoginForm from "./login-form";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const session = await getSession();
  if (session) {
    redirect(homePathForRole(session.role));
  }
  const sp = await searchParams;
  return <LoginForm nextPath={sp.next} />;
}
