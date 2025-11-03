import { db } from '@/db'
import { user } from '@/db/schema/better-auth'
import { auth } from '@/lib/auth/auth'
import { envStore } from '@/lib/env/envStore'
import { createFileRoute, Link } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { eq } from 'drizzle-orm'
import { AlertCircle, CheckCircle, UserPlus } from 'lucide-react'
import z from 'zod/v4'

// Validating search params
// https://tanstack.com/router/latest/docs/framework/react/guide/search-params#validating-and-typing-search-params
export const Route = createFileRoute('/registerAdmin')({
  component: RegisterAdminPage,
  validateSearch: zodValidator(z.object({
    force: z.boolean().optional(),
  })),
  beforeLoad: async ({search}) => {
    return {
      force: search.force === true,
    }
  },
  loader: async (args) => {
    const { force } = args.context
    // Check if admin credentials are configured
    if (!envStore.ADMIN_EMAIL || !envStore.ADMIN_PASSWORD) {
      return {
        success: false,
        message:
          'Admin credentials are not configured. Please set ADMIN_EMAIL, ADMIN_LABEL, and ADMIN_PASSWORD in your .env file.',
      }
    }

    const adminEmail = envStore.ADMIN_EMAIL
    const adminName = envStore.ADMIN_LABEL || 'Admin'
    const adminPassword = envStore.ADMIN_PASSWORD

    try {
      // Check if user already exists
      const existingUser = await db.query.user.findFirst({
        where: eq(user.email, adminEmail),
      })

      if (existingUser && force) {
        return {
          success: false,
          message: `User with email "${adminEmail}" is already registered.`,
          userEmail: adminEmail,
          canForceRegister: true,
        }
      }

      // If force=true and user exists, delete the existing user first
      if (existingUser && force) {
        // Delete user (cascades to sessions and accounts)
        await db.delete(user).where(eq(user.email, adminEmail))
      }

      // Register the admin user
      const result = await auth.api.signUpEmail({
        body: {
          email: adminEmail,
          password: adminPassword,
          name: adminName,
        },
      })

      if (!result) {
        return {
          success: false,
          message: 'Failed to register admin user. Please check your configuration.',
        }
      }

      return {
        success: true,
        message: `Admin user "${adminName}" (${adminEmail}) has been successfully ${force ? 're-' : ''}registered!`,
        userEmail: adminEmail,
      }
    } catch (error) {
      console.error('Admin registration error:', error)
      return {
        success: false,
        message: `Error during registration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  },
})

function RegisterAdminPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <UserPlus className="w-16 h-16 text-slate-700" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Registration
          </h1>
          <p className="text-gray-600">Automated admin user setup</p>
        </div>

        {/* Result Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {data.success ? (
            // Success State
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
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
                      <span className="font-medium">Email:</span> {data.userEmail}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <Link
                  to="/signin"
                  className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Go to Sign In
                </Link>
              </div>
            </div>
          ) : (
            // Error/Info State
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 mb-1">
                    {data.canForceRegister ? 'User Already Exists' : 'Registration Failed'}
                  </h3>
                  <p className="text-sm text-amber-800">{data.message}</p>
                </div>
              </div>

              {data.canForceRegister && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-700 mb-3">
                      If you want to reset the admin user and re-register with the
                      current environment variables, you can force re-registration.
                    </p>
                    <p className="text-xs text-gray-600 font-mono bg-white p-2 rounded border border-gray-300">
                      ⚠️ Warning: This will delete all sessions and data associated
                      with this user account.
                    </p>
                  </div>

                  <Link
                    to="/registerAdmin"
                    search={{ force: true }}
                    className="block w-full text-center bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Force Re-register
                  </Link>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <Link
                  to="/"
                  className="block w-full text-center bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Go to Home
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-slate-800 text-slate-200 rounded-lg text-xs font-mono">
            <p>
              <span className="text-slate-400">Search params:</span>{' '}
              {JSON.stringify(search)}
            </p>
            <p className="mt-1">
              <span className="text-slate-400">Admin email configured:</span>{' '}
              {envStore.ADMIN_EMAIL ? '✓' : '✗'}
            </p>
            <p className="mt-1">
              <span className="text-slate-400">Admin password configured:</span>{' '}
              {envStore.ADMIN_PASSWORD ? '✓' : '✗'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

