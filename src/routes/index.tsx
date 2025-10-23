import { createFileRoute } from '@tanstack/react-router'
import {
  Sparkles
} from 'lucide-react'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
  <div className=''>
    <h1>Hello World <Sparkles></Sparkles></h1>
  </div>
  )
}
