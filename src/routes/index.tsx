import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { authClient } from '@/client/auth-client'
import { Sparkles } from 'lucide-react'
import { checkClockifySetup } from '@/server/clockifyServerFns'
import { Toolbar } from '@/components/Toolbar'

export const Route = createFileRoute('/')({
  component: App,
  beforeLoad: async ({ context }) => {
    // Only check Clockify setup if user is authenticated
    // If not authenticated, let the component handle showing sign-in UI
    try {
      const setupStatus = await checkClockifySetup()
      if (setupStatus && !setupStatus.hasSetup) {
        throw redirect({ to: '/settings' })
      }
    } catch (error: any) {
      // If it's a TanStack Router redirect, re-throw it
      if (error?.routerCode === 'BEFORE_LOAD') {
        throw error
      }
      // If checkClockifySetup fails (e.g., user not authenticated), 
      // let the component handle it - don't redirect
      console.log('beforeLoad: Could not check Clockify setup, continuing to component')
    }
  },
})

function App() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <>
        <Toolbar user={null} />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Toolbar user={session?.user || null} />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard
            </h1>
            <Sparkles className="w-6 h-6 text-yellow-500" />
          </div>

          {session?.user ? (
            // Signed In View
            <div className="space-y-6">
              {/* Main Dashboard Content */}
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center py-12">
                  <Sparkles className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Your Dashboard</h2>
                  <p className="text-gray-600 mb-4">
                    Your time tracking dashboard is set up and ready to go!
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
                    <p className="text-sm text-blue-800">
                      <strong>Coming Soon:</strong> Weekly time summaries, project tracking, and overtime calculations will be available in Phase 2.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Signed Out View
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow-xl p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Get Started</h2>
                <p className="text-gray-600 mb-6">
                  Sign in to access your time tracking dashboard or create a new account.
                </p>
                <div className="flex gap-3">
                  <Link
                    to="/signin"
                    className="text-white bg-indigo-600 hover:bg-indigo-700 border border-indigo-600 rounded-md px-4 py-2 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="text-indigo-600 bg-white hover:bg-indigo-50 border border-indigo-600 rounded-md px-4 py-2 transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
