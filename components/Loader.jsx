'use client'
import React from 'react'
import { FallingLines } from 'react-loader-spinner'

function Loader() {
  return (
   <div className='w-full h-full grid place-content-center'>
        <FallingLines
          width="100"
          visible={true}
          ariaLabel="falling-circles-loading"
        />
      </div>
  )
}

export default Loader