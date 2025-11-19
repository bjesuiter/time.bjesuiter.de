import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { authClient } from '@/client/auth-client'
import { Sparkles, BarChart3, Calendar, Target, ArrowRight, Rocket } from 'lucide-react'
import { checkClockifySetup } from '@/server/clockifyServerFns'
import { getPublicEnv } from '@/server/envServerFns'
import { Toolbar } from '@/components/Toolbar'

export const Route = createFileRoute('/')({
  component: App,
  loader: async () => {
    const { allowUserSignup } = await getPublicEnv()
    return { allowUserSignup }
  },
  beforeLoad: async () => {
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
  const { allowUserSignup } = Route.useLoaderData()

  if (isPending) {
    return (
      <>
        <Toolbar user={null} />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 bg-indigo-200 rounded-full mb-4"></div>
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Toolbar user={session?.user || null} />
      
      {session?.user ? (
        <DashboardView />
      ) : (
        <LandingPage allowSignup={allowUserSignup} />
      )}
    </>
  )
}

function DashboardView() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard
          </h1>
          <Sparkles className="w-6 h-6 text-yellow-500" />
        </div>

        <div className="space-y-6">
          {/* Main Dashboard Content */}
          <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-8 transition-all hover:shadow-md">
            <div className="text-center py-12">
              <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Welcome to Your Dashboard</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Your time tracking hub is ready. We're currently building out more features to help you visualize your productivity.
              </p>
              
              <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-6 max-w-2xl mx-auto">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Rocket className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-blue-900 mb-1">Coming Soon: Phase 2</h3>
                    <p className="text-sm text-blue-700 leading-relaxed">
                      Get ready for detailed weekly time summaries, granular project tracking, and smart overtime calculations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LandingPage({ allowSignup }: { allowSignup: boolean }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-linear-to-b from-indigo-50/50">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-24 sm:pb-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight mb-6 leading-tight">
              Time Tracking, <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-purple-600">
                But Make It Fun!
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              A personal Clockify-powered dashboard that brings joy to your productivity tracking. Visualization, summaries, and a touch of sparkle. ✨
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/signin"
                className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-indigo-200 flex items-center justify-center gap-2"
              >
                Sign In <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<BarChart3 className="w-8 h-8 text-indigo-600" />}
              title="Clockify Integration"
              description="Seamlessly syncs with your existing Clockify data. No migration needed."
            />
            <FeatureCard 
              icon={<Calendar className="w-8 h-8 text-purple-600" />}
              title="Weekly Summaries"
              description="Beautiful, easy-to-read breakdowns of your weekly time investments."
            />
            <FeatureCard 
              icon={<Target className="w-8 h-8 text-pink-600" />}
              title="Overtime Tracking"
              description="Keep tabs on those extra hours and maintain a healthy work-life balance."
            />
          </div>
        </div>
      </div>

      {/* Social Proof / Footer */}
      <div className="bg-gray-50 py-16 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 mb-6 font-medium">Connect with the developer</p>
          <div className="flex justify-center gap-4 mb-8">
            <a
              href="https://bsky.app/profile/codemonument.bsky.social"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:border-blue-400 hover:text-blue-500 transition-all shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
              <span className="font-semibold">Bluesky</span>
            </a>
            <a
              href="https://blog.codemonument.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:border-purple-400 hover:text-purple-500 transition-all shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <span className="font-semibold">Blog</span>
            </a>
          </div>

          <div className="pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-center gap-4">
            {allowSignup && (
              <Link 
                to="/signup"
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Create an account
              </Link>
            )}
            <Link
              to="/registerAdmin"
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Admin Registration
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-gray-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">
        {description}
      </p>
    </div>
  )
}
