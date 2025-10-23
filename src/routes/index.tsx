import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Sparkles
} from 'lucide-react'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
  <div className='flex flex-col gap-4 items-start p-5'>
    <h1>Hello World <Sparkles></Sparkles></h1>
    
    <Link to="/signup" className='text-blue-500 border border-blue-500 rounded-md p-2'>Sign up</Link>
    {/* <Link to="/signin" className='text-blue-500 border border-blue-500 rounded-md p-2'>Sign in</Link> */}
    </div>
  )
}
