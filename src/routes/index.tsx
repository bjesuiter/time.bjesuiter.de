import { createFileRoute, Link } from '@tanstack/react-router'
import { authClient } from '@/client/auth-client'
import { Sparkles, LogOut, User, Mail, Calendar, Settings2, CheckCircle2, ArrowRight, Clock, Briefcase, Globe } from 'lucide-react'
import { checkClockifySetup, getClockifyDetails } from '@/server/clockifyServerFns'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const { data: session, isPending } = authClient.useSession()
  
  // Only check Clockify setup if user is signed in
  const { data: setupStatus } = useQuery({
    queryKey: ['clockify-setup'],
    queryFn: () => checkClockifySetup(),
    enabled: !!session?.user,
  })

  // Get detailed Clockify configuration if setup is complete
  const { data: clockifyDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['clockify-details'],
    queryFn: () => getClockifyDetails(),
    enabled: !!session?.user && !!setupStatus?.hasSetup,
  })

  const handleSignOut = async () => {
    await authClient.signOut()
    window.location.reload() // Refresh to update session state
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 p-5">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-8">
          Time Tracking Dashboard <Sparkles className="text-yellow-500" />
        </h1>

        {session?.user ? (
          // Signed In View
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-lg shadow-xl p-8">
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Welcome Back!</h2>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition-colors border border-gray-300 hover:border-red-600 rounded-md px-3 py-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <User className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium text-gray-900">{session.user.name || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <Mail className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{session.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="text-sm text-gray-600">Account Created</p>
                    <p className="font-medium text-gray-900">
                      {new Date(session.user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-5 h-5 flex items-center justify-center">
                    {session.user.emailVerified ? (
                      <span className="text-green-600 font-bold">✓</span>
                    ) : (
                      <span className="text-amber-600 font-bold">!</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email Status</p>
                    <p className="font-medium text-gray-900">
                      {session.user.emailVerified ? 'Verified' : 'Not verified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Clockify Setup Status Card */}
            <div className="bg-white rounded-lg shadow-xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Clockify Integration</h3>
              
              {setupStatus?.hasSetup ? (
                // Setup Complete
                <div className="space-y-6">
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Connected</p>
                      <p className="text-sm text-green-700">
                        Your Clockify account is connected and ready to use
                      </p>
                    </div>
                  </div>

                  {isLoadingDetails ? (
                    <div className="text-center py-4 text-gray-600">
                      Loading configuration...
                    </div>
                  ) : clockifyDetails?.success ? (
                    <div className="space-y-6">
                      {/* Clockify Account Info */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Clockify Account</h4>
                        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          {clockifyDetails.clockifyUser.profilePicture ? (
                            <img
                              src={clockifyDetails.clockifyUser.profilePicture}
                              alt={clockifyDetails.clockifyUser.name}
                              className="w-16 h-16 rounded-full object-cover border-2 border-indigo-200"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-200">
                              <User className="w-8 h-8 text-indigo-600" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{clockifyDetails.clockifyUser.name}</p>
                            <p className="text-sm text-gray-600">{clockifyDetails.clockifyUser.email}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {clockifyDetails.clockifyUser.settings.timeZone}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Week starts: {clockifyDetails.clockifyUser.settings.weekStart}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Configuration Details */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Configuration</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="w-4 h-4 text-gray-600" />
                              <p className="text-sm font-medium text-gray-600">Regular Hours/Week</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{clockifyDetails.config.regularHoursPerWeek}h</p>
                          </div>
                          
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-4 h-4 text-gray-600" />
                              <p className="text-sm font-medium text-gray-600">Working Days/Week</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{clockifyDetails.config.workingDaysPerWeek}</p>
                          </div>

                          {clockifyDetails.config.selectedClientName && (
                            <div className="col-span-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2 mb-1">
                                <Briefcase className="w-4 h-4 text-gray-600" />
                                <p className="text-sm font-medium text-gray-600">Client Filter</p>
                              </div>
                              <p className="font-medium text-gray-900">{clockifyDetails.config.selectedClientName}</p>
                            </div>
                          )}

                          {clockifyDetails.config.cumulativeOvertimeStartDate && (
                            <div className="col-span-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="w-4 h-4 text-gray-600" />
                                <p className="text-sm font-medium text-gray-600">Overtime Tracking Since</p>
                              </div>
                              <p className="font-medium text-gray-900">
                                {new Date(clockifyDetails.config.cumulativeOvertimeStartDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Coming in Phase 2:</strong> Weekly time summaries, project tracking, and overtime calculations will be available soon.
                    </p>
                  </div>
                  
                  <Link
                    to="/setup/clockify"
                    className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    <Settings2 className="w-4 h-4" />
                    Update Configuration
                  </Link>
                </div>
              ) : (
                // Setup Required
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Connect your Clockify account to start tracking your time and view weekly summaries.
                  </p>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                      <strong>Setup Required:</strong> You need to configure your Clockify integration before you can use the time tracking dashboard.
                    </p>
                  </div>
                  
                  <Link
                    to="/setup/clockify"
                    className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    <Settings2 className="w-5 h-5" />
                    Connect Clockify Account
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Signed Out View
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
        )}
      </div>
    </div>
  )
}
