import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Sign in</h1>

      <form
        action={async () => {
          "use server";
          // Sign in with GitHub, then go to /admin
          await signIn("github", { redirectTo: "/admin" });
        }}
      >
        <button type="submit">Sign in with GitHub</button>
      </form>
    </main>
  );
}
