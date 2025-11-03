import { createFileRoute, Link } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <div className="flex flex-col gap-4 items-start p-5">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        Time Tracking Dashboard <Sparkles className="text-yellow-500" />
      </h1>

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
  )
}
