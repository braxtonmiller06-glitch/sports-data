import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { Button } from "./Button";
import { AccountMenu } from "./AccountMenu";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-ink-800/80 bg-ink-950/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink-300 md:flex">
          <a href="/#how-it-works" className="hover:text-ink-50">
            How it works
          </a>
          <a href="/#pricing" className="hover:text-ink-50">
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="hidden text-sm font-medium text-ink-200 hover:text-ink-50 sm:block"
              >
                Dashboard
              </Link>
              <AccountMenu />
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-ink-200 hover:text-ink-50">
                Log in
              </Link>
              <Link to="/signup">
                <Button>Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
