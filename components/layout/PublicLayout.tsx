import Nav from './Nav'
import Footer from './Footer'
import { getVisibility } from '@/lib/visibility'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const visibility = await getVisibility()
  return (
    <>
      <Nav visibility={visibility} />
      <main>{children}</main>
      <Footer />
    </>
  )
}
