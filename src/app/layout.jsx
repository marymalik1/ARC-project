import './globals.css'
import './mobile.css'
import './login.css'
import { ShellProvider } from '../components/ShellState'

export const metadata = {
  title: 'ARC Administration',
  description: 'ARC dealer administration and customer support',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ShellProvider>{children}</ShellProvider>
      </body>
    </html>
  )
}
