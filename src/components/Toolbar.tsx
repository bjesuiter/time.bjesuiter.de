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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo/Brand */}
          <Link
            to="/"
            className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-900 hover:text-indigo-600 transition-colors min-h-[44px]"
          >
            <Clock className="w-5 sm:w-6 h-5 sm:h-6 text-indigo-600" />
            <span className="hidden sm:inline">Time Tracker</span>
          </Link>

          {/* Navigation Links (if signed in) - visible on tablet and up */}
          {user && (
            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors min-h-[44px] flex items-center"
                activeProps={{
                  className: "text-sm font-medium text-indigo-600",
                }}
                data-testid="toolbar-dashboard-link"
              >
                Dashboard
              </Link>
              <Link
                to="/settings"
                className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors min-h-[44px] flex items-center"
                activeProps={{
                  className: "text-sm font-medium text-indigo-600",
                }}
                data-testid="toolbar-settings-link"
              >
                Settings
              </Link>
            </nav>
          )}

          {/* Right Side */}
          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <UserMenu user={user} />
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to="/signin"
                  className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors px-3 py-2 min-h-[44px] flex items-center"
                  data-testid="toolbar-signin-link"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation - shown only on mobile when user is signed in */}
      {user && (
        <nav className="md:hidden border-t border-gray-100 bg-gray-50">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center gap-1">
            <Link
              to="/"
              className="flex-1 text-center text-xs sm:text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors py-2.5 rounded-lg"
              activeProps={{
                className:
                  "flex-1 text-center text-xs sm:text-sm font-medium text-indigo-600 bg-indigo-50 py-2.5 rounded-lg",
              }}
              data-testid="toolbar-mobile-dashboard-link"
            >
              Dashboard
            </Link>
            <Link
              to="/settings"
              className="flex-1 text-center text-xs sm:text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 transition-colors py-2.5 rounded-lg"
              activeProps={{
                className:
                  "flex-1 text-center text-xs sm:text-sm font-medium text-indigo-600 bg-indigo-50 py-2.5 rounded-lg",
              }}
              data-testid="toolbar-mobile-settings-link"
            >
              Settings
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
