import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './lib/wagmi'
import { ConnectButton } from './components/ConnectButton'
import { Home } from './pages/Home'
import { Victim } from './pages/Victim'
import { Leaderboard } from './pages/Leaderboard'

const queryClient = new QueryClient()

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid #333',
        }}
      >
        <Link to="/" style={{ color: '#ffeb3b', textDecoration: 'none', fontSize: '20px', fontWeight: 'bold' }}>
          🦶 Kick Me
        </Link>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link to="/leaderboard" style={{ color: '#888', textDecoration: 'none' }}>
            Leaderboard
          </Link>
          <ConnectButton />
        </nav>
      </header>
      <main style={{ flex: 1 }}>{children}</main>
      <footer style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '14px' }} />
    </div>
  )
}

export function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/:address" element={<Victim />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
