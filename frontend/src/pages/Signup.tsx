import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthCard } from "../components/AuthCard";
import { FormField } from "../components/FormField";
import { Button } from "../components/Button";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signUp(email, password);
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    // Supabase sends a confirmation email by default; there's no session yet
    // until the user confirms, so don't redirect into the gated app.
    setConfirmationSent(true);
  }

  if (confirmationSent) {
    return (
      <AuthCard title="Check your email" subtitle="We sent a confirmation link to finish creating your account." footer={<></>}>
        <p className="text-sm text-ink-300">
          Click the link in the email we sent to <span className="font-medium text-ink-100">{email}</span>, then{" "}
          <Link to="/login" className="text-edge-400 hover:underline">
            log in
          </Link>
          .
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start free, upgrade when you're ready for the full slate."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-edge-400 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormField
          label="Password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-danger-500">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
