import { auth, signOut } from "@/auth";

export default async function AdminPage() {
  const session = await auth();

  return (
    <main style={{ padding: 24 }}>
      <h1>Admin</h1>

      <p>
        Signed in as: <b>{session?.user?.email ?? session?.user?.name ?? "Unknown"}</b>
      </p>

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
