import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { UserMenu } from "./UserMenu";

interface ToolbarProps {
  user?: {
    name?: string | null;
    email: string;
    image?: string | null;
  } | null;
}

export function Toolbar({ user }: ToolbarProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-bold text-gray-900 hover:text-indigo-600 transition-colors"
          >
            <Clock className="w-6 h-6 text-indigo-600" />
            <span className="hidden sm:inline">Time Tracker</span>
          </Link>

          {/* Navigation Links (if signed in) */}
          {user && (
            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
                activeProps={{
                  className: "text-sm font-medium text-indigo-600",
                }}
              >
                Dashboard
              </Link>
              <Link
                to="/settings"
                className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
                activeProps={{
                  className: "text-sm font-medium text-indigo-600",
                }}
              >
                Settings
              </Link>
            </nav>
          )}

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {user ? (
              <UserMenu user={user} />
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/signin"
                  className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors px-3 py-2"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
