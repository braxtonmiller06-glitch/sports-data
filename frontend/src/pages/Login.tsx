import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthCard } from "../components/AuthCard";
import { FormField } from "../components/FormField";
import { Button } from "../components/Button";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    navigate("/dashboard");
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to see today's picks."
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium text-edge-400 hover:underline">
            Sign up
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-danger-500">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </AuthCard>
  );
}
