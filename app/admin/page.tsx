import { auth, signOut } from "@/auth";

export default async function AdminPage() {
  const session = await auth();

  return (
    <main style={{ padding: 24 }}>
      <h1>Admin</h1>
      <p>
        Signed in as <b>{session?.user?.email ?? "No email"}</b>
      </p>
      <p>Roles: {(session?.user as any)?.roles?.join(", ") ?? "(none)"}</p>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
