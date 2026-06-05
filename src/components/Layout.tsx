import type { ReactNode } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import CursorFollower from './CursorFollower'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <CursorFollower />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
