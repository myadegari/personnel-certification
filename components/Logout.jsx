'use client';
import { Button } from '@/components/ui/button';
import React from 'react'
import {  signOut } from 'next-auth/react';
function Logout() {
  return (
    <Button variant="destructive" onClick={() => signOut()}>خروج</Button>
  )
}

export default Logout