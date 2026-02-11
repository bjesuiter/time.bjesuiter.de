import { registerAdminUser } from "@/server/userServerFns";
import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { AlertCircle, CheckCircle, UserPlus } from "lucide-react";
import z from "zod/v4";

// Validating search params
// https://tanstack.com/router/latest/docs/framework/react/guide/search-params#validating-and-typing-search-params
export const Route = createFileRoute("/registerAdmin")({
  component: RegisterAdminPage,
  validateSearch: zodValidator(
    z.object({
      force: z.boolean().optional(),
    }),
  ),
  beforeLoad: async ({ search }) => {
    const result = await registerAdminUser({
      data: { force: search.force === true },
    });
    return {
      result,
    };
  },
  loader: async ({ context }) => {
    return context.result;
  },
});

function RegisterAdminPage() {
  const data = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <UserPlus className="w-16 h-16 text-slate-700" />
          </div>
          <h1
            className="text-3xl font-bold text-gray-900 mb-2"
            data-testid="admin-registration-heading"
          >
            Admin Registration
          </h1>
          <p className="text-gray-600">Automated admin user setup</p>
        </div>

        {/* Result Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {data.success ? (
            // Success State
            <div className="space-y-6">
              <div
                className="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-lg"
                data-testid="admin-registration-success-message"
              >
                <CheckCircle className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-1">
                    Registration Successful
                  </h3>
                  <p className="text-sm text-green-800">{data.message}</p>
                </div>
              </div>

              {data.userEmail && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Admin Details:</h4>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Email:</span>{" "}
                      {data.userEmail}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <Link
                  to="/signin"
                  className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  data-testid="admin-registration-go-to-signin-button"
                >
                  Go to Sign In
                </Link>
              </div>
            </div>
          ) : (
            // Error/Info State
            <div className="space-y-6">
              <div
                className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg"
                data-testid="admin-registration-error-message"
              >
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 mb-1">
                    {data.canForceRegister
                      ? "User Already Exists"
                      : "Registration Failed"}
                  </h3>
                  <p className="text-sm text-amber-800">{data.message}</p>
                </div>
              </div>

              {data.canForceRegister && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-700 mb-3">
                      If you want to reset the admin user and re-register with
                      the current environment variables, you can force
                      re-registration.
                    </p>
                    <p className="text-xs text-gray-600 font-mono bg-white p-2 rounded border border-gray-300">
                      ⚠️ Warning: This will delete all sessions and data
                      associated with this user account.
                    </p>
                  </div>

                  <Link
                    to="/registerAdmin"
                    search={{ force: true }}
                    className="block w-full text-center bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                    data-testid="admin-registration-force-re-register-button"
                  >
                    Force Re-register
                  </Link>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <Link
                  to="/"
                  className="block w-full text-center bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  data-testid="admin-registration-go-to-home-button"
                >
                  Go to Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
