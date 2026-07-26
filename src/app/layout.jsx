import './globals.css'
import './mobile.css'

export const metadata = {
  title: 'ARC — User Management',
  description: 'ARC dealer account administration',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
