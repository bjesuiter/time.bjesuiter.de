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
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-xl p-12">
                {/* Hero Section */}
                <div className="text-center mb-8">
                  <h2 className="text-5xl font-bold text-gray-900 mb-4">
                    ⏰ Time Tracking, But Make It Fun! ⏱️
                  </h2>
                  <p className="text-xl text-indigo-600 font-semibold mb-6">
                    My personal Clockify-powered dashboard (with extra sparkle ✨)
                  </p>
                </div>

                {/* Features Description */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 mb-8">
                  <div className="grid md:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-3xl mb-2">📊</div>
                      <h3 className="font-semibold text-gray-900 mb-1">Clockify Integration</h3>
                      <p className="text-sm text-gray-600">Seamlessly sync with your Clockify data</p>
                    </div>
                    <div>
                      <div className="text-3xl mb-2">📅</div>
                      <h3 className="font-semibold text-gray-900 mb-1">Weekly Summaries</h3>
                      <p className="text-sm text-gray-600">Beautiful weekly time breakdowns</p>
                    </div>
                    <div>
                      <div className="text-3xl mb-2">🎯</div>
                      <h3 className="font-semibold text-gray-900 mb-1">Overtime Tracking</h3>
                      <p className="text-sm text-gray-600">Keep tabs on those extra hours</p>
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                <div className="flex justify-center gap-4 mb-8">
                  <a
                    href="https://bsky.app/profile/codemonument.bsky.social"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
                    </svg>
                    <span className="font-semibold">Find me on Bluesky</span>
                  </a>
                  <a
                    href="https://blog.codemonument.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                    <span className="font-semibold">Read my blog</span>
                  </a>
                </div>

                {/* Call to Action */}
                <div className="border-t border-gray-200 pt-8">
                  <p className="text-center text-gray-700 mb-4 text-lg">
                    Ready to track some time? ☕ Let's get started!
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Link
                      to="/signin"
                      className="text-white bg-indigo-600 hover:bg-indigo-700 border border-indigo-600 rounded-lg px-8 py-3 text-lg font-semibold transition-all hover:scale-105 shadow-md hover:shadow-lg"
                    >
                      Sign In →
                    </Link>
                    <Link
                      to="/signup"
                      className="text-indigo-600 bg-white hover:bg-indigo-50 border-2 border-indigo-600 rounded-lg px-8 py-3 text-lg font-semibold transition-all hover:scale-105 shadow-md hover:shadow-lg"
                    >
                      Create Account 🚀
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
