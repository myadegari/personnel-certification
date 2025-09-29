import {Suspense} from 'react'
import SignupPageClient from './SignupPageClient'

export default function page() {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <SignupPageClient />
      </Suspense>
    </div>
  )
}
