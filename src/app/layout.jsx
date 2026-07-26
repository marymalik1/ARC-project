import './globals.css'
import './mobile.css'
import './login.css'

export const metadata = {
  title: 'ARC Administration',
  description: 'ARC dealer administration and customer support',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
