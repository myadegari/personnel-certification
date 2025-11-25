import {Suspense} from 'react'
import SignupPageClient from './SignupPageClient'
import Loader from '@/components/Loader'

export default function page() {
  return (
    <div>
      <Suspense fallback={
        <Loader/>
    }>
        <SignupPageClient />
      </Suspense>
    </div>
  )
}
