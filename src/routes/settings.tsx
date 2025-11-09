import { createFileRoute, Link } from '@tanstack/react-router'
import { authClient } from '@/client/auth-client'
import { User, Mail, Calendar, Settings2, CheckCircle2, ArrowRight, Clock, Briefcase, Globe, FolderKanban, Save, Loader2, History, ChevronDown, ChevronUp } from 'lucide-react'
import { checkClockifySetup, getClockifyDetails, getClockifyProjects } from '@/server/clockifyServerFns'
import { getTrackedProjects, setTrackedProjects, getConfigHistory } from '@/server/configServerFns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Toolbar } from '@/components/Toolbar'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/settings')({ component: SettingsPage })

function SettingsPage() {
  const { data: session, isPending } = authClient.useSession()
  const queryClient = useQueryClient()
  
  // Check Clockify setup status
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

  // Get available projects from Clockify
  const { data: availableProjects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['clockify-projects', clockifyDetails?.config?.clockifyWorkspaceId, clockifyDetails?.config?.selectedClientId],
    queryFn: () => getClockifyProjects({
      data: {
        workspaceId: clockifyDetails!.config.clockifyWorkspaceId,
        clientId: clockifyDetails!.config.selectedClientId || undefined,
      },
    }),
    enabled: !!clockifyDetails?.success && !!clockifyDetails.config.clockifyWorkspaceId,
  })

  // State for tracked projects selection
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Get current tracked projects configuration
  const { data: trackedProjectsConfig, isLoading: isLoadingTrackedProjects } = useQuery({
    queryKey: ['tracked-projects'],
    queryFn: () => getTrackedProjects({ data: undefined }),
    enabled: !!session?.user && !!setupStatus?.hasSetup,
  })

  // Get configuration history
  const { data: configHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['config-history', 'tracked_projects'],
    queryFn: () => getConfigHistory({ data: { configType: 'tracked_projects' } }),
    enabled: !!session?.user && !!setupStatus?.hasSetup,
  })

  // Initialize selected projects when data loads
  useEffect(() => {
    if (trackedProjectsConfig?.success && trackedProjectsConfig.config) {
      setSelectedProjectIds(trackedProjectsConfig.config.value.projectIds)
      setHasChanges(false)
    }
  }, [trackedProjectsConfig])

  // Mutation to save tracked projects
  const saveTrackedProjectsMutation = useMutation({
    mutationFn: (data: { projectIds: string[]; projectNames: string[] }) => 
      setTrackedProjects({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracked-projects'] })
      queryClient.invalidateQueries({ queryKey: ['config-history', 'tracked_projects'] })
      setHasChanges(false)
    },
  })

  // Handle project selection toggle
  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds(prev => {
      const newSelection = prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
      setHasChanges(true)
      return newSelection
    })
  }

  // Handle save tracked projects
  const handleSaveTrackedProjects = () => {
    if (!availableProjects?.success || !availableProjects.projects) return

    const selectedProjects = availableProjects.projects.filter(p => 
      selectedProjectIds.includes(p.id)
    )

    saveTrackedProjectsMutation.mutate({
      projectIds: selectedProjects.map(p => p.id),
      projectNames: selectedProjects.map(p => p.name),
    })
  }

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

  if (!session?.user) {
    return (
      <>
        <Toolbar user={null} />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-6">
              Please sign in to access your settings.
            </p>
            <Link
              to="/signin"
              className="inline-block text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-4 py-2 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Toolbar user={session.user} />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Settings
            </h1>
            <Settings2 className="w-6 h-6 text-indigo-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Takes 2 columns */}
            <div className="lg:col-span-2 space-y-6">

              {/* Clockify Setup Status Card */}
              <div className="bg-white rounded-lg shadow-lg p-8">
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
                      Setup Clockify Integration
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Tracked Projects Configuration Card */}
              {setupStatus?.hasSetup && (
                <div className="bg-white rounded-lg shadow-lg p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <FolderKanban className="w-6 h-6 text-indigo-600" />
                    <h3 className="text-xl font-bold text-gray-900">Tracked Projects</h3>
                  </div>
                  
                  <p className="text-gray-600 mb-6">
                    Select which projects should be displayed in detail in your weekly time breakdown. 
                    Other projects will be grouped under "Extra Work".
                  </p>

                  {isLoadingProjects || isLoadingTrackedProjects ? (
                    <div className="flex items-center justify-center py-8 text-gray-600">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      Loading projects...
                    </div>
                  ) : availableProjects?.success && availableProjects.projects ? (
                    <div className="space-y-6">
                      {/* Projects List */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700 mb-3">
                          Select projects to track ({selectedProjectIds.length} selected):
                        </p>
                        
                        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                          {availableProjects.projects.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                              No projects found. Create some projects in Clockify first.
                            </div>
                          ) : (
                            availableProjects.projects.map((project) => (
                              <label
                                key={project.id}
                                className={`flex items-start gap-3 p-4 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                                  selectedProjectIds.includes(project.id) ? 'bg-indigo-50' : ''
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedProjectIds.includes(project.id)}
                                  onChange={() => toggleProjectSelection(project.id)}
                                  className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: project.color }}
                                    />
                                    <p className="font-medium text-gray-900">{project.name}</p>
                                  </div>
                                  {project.clientName && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      Client: {project.clientName}
                                    </p>
                                  )}
                                </div>
                              </label>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Current Configuration Display */}
                      {trackedProjectsConfig?.success && trackedProjectsConfig.config && (
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Currently Tracked Projects:
                          </p>
                          {trackedProjectsConfig.config.value.projectNames.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {trackedProjectsConfig.config.value.projectNames.map((name, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">No projects configured yet</p>
                          )}
                        </div>
                      )}

                      {/* Save Button */}
                      <div className="flex items-center gap-4">
                        <button
                          onClick={handleSaveTrackedProjects}
                          disabled={!hasChanges || saveTrackedProjectsMutation.isPending}
                          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          {saveTrackedProjectsMutation.isPending ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-5 h-5" />
                              Save Configuration
                            </>
                          )}
                        </button>
                        
                        {hasChanges && (
                          <p className="text-sm text-amber-600 font-medium">
                            You have unsaved changes
                          </p>
                        )}

                        {saveTrackedProjectsMutation.isSuccess && !hasChanges && (
                          <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            Saved successfully
                          </p>
                        )}

                        {saveTrackedProjectsMutation.isError && (
                          <p className="text-sm text-red-600 font-medium">
                            Error saving configuration
                          </p>
                        )}
                      </div>

                      {/* Configuration History Panel */}
                      <div className="border-t border-gray-200 pt-6">
                        <button
                          onClick={() => setShowHistory(!showHistory)}
                          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                        >
                          <History className="w-5 h-5" />
                          Configuration History
                          {showHistory ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>

                        {showHistory && (
                          <div className="mt-4">
                            {isLoadingHistory ? (
                              <div className="flex items-center justify-center py-4 text-gray-600">
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Loading history...
                              </div>
                            ) : configHistory?.success && configHistory.history ? (
                              <div className="space-y-4">
                                {configHistory.history.length === 0 ? (
                                  <p className="text-sm text-gray-600">
                                    No configuration history yet. Save your first configuration to start tracking changes.
                                  </p>
                                ) : (
                                  configHistory.history.map((entry, idx) => (
                                    <div
                                      key={entry.id}
                                      className={`p-4 rounded-lg border ${
                                        idx === 0
                                          ? 'bg-indigo-50 border-indigo-200'
                                          : 'bg-gray-50 border-gray-200'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <div>
                                          <p className="text-sm font-medium text-gray-900">
                                            {idx === 0 && entry.validUntil === null && (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mr-2">
                                                Current
                                              </span>
                                            )}
                                            {new Date(entry.validFrom).toLocaleDateString('en-US', {
                                              year: 'numeric',
                                              month: 'long',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            })}
                                          </p>
                                          <p className="text-xs text-gray-600 mt-1">
                                            {entry.validUntil === null
                                              ? 'Active since this date'
                                              : `Active until ${new Date(entry.validUntil).toLocaleDateString('en-US', {
                                                  year: 'numeric',
                                                  month: 'long',
                                                  day: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                })}`}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="mt-3">
                                        <p className="text-xs text-gray-600 mb-2">Tracked projects:</p>
                                        {entry.value.projectNames.length > 0 ? (
                                          <div className="flex flex-wrap gap-2">
                                            {entry.value.projectNames.map((name, nameIdx) => (
                                              <span
                                                key={nameIdx}
                                                className="inline-flex items-center px-2 py-1 bg-white text-gray-800 rounded text-xs border border-gray-200"
                                              >
                                                {name}
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-gray-500">No projects tracked</p>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-red-600">
                                Error loading configuration history
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm text-amber-800">
                        Unable to load projects. Please check your Clockify configuration.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Sidebar - Profile Card */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Profile</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <User className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="text-xs text-gray-600">Name</p>
                      <p className="text-sm font-medium text-gray-900">{session.user.name || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <Mail className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="text-xs text-gray-600">Email</p>
                      <p className="text-sm font-medium text-gray-900 truncate">{session.user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="text-xs text-gray-600">Member Since</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(session.user.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="w-5 h-5 flex items-center justify-center">
                      {session.user.emailVerified ? (
                        <span className="text-green-600 font-bold">✓</span>
                      ) : (
                        <span className="text-amber-600 font-bold">!</span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Email Status</p>
                      <p className="text-sm font-medium text-gray-900">
                        {session.user.emailVerified ? 'Verified' : 'Not verified'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

