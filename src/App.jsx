import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SmrRmrPage from './pages/SmrRmrPage'
import NodePage from './pages/NodePage'
import ProfilePage from './pages/ProfilePage'
import DisplacementPage from './pages/DisplacementPage'
import CumulativeDisplacementPage from './pages/CumulativeDisplacementPage'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'))

  return (
    <Routes>
      <Route
        path="/"
        element={
          !isLoggedIn ? (
            <LoginPage setIsLoggedIn={setIsLoggedIn} />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />
      <Route
        path="/dashboard"
        element={
          isLoggedIn ? (
            <DashboardPage setIsLoggedIn={setIsLoggedIn} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/displacement"
        element={
          isLoggedIn ? (
            <DisplacementPage setIsLoggedIn={setIsLoggedIn} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/cumulative-displacement"
        element={
          isLoggedIn ? (
            <CumulativeDisplacementPage setIsLoggedIn={setIsLoggedIn} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/smr-rmr"
        element={
          isLoggedIn ? (
            <SmrRmrPage setIsLoggedIn={setIsLoggedIn} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/node"
        element={
          isLoggedIn ? (
            <NodePage setIsLoggedIn={setIsLoggedIn} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/profile"
        element={
          isLoggedIn ? (
            <ProfilePage setIsLoggedIn={setIsLoggedIn} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

    </Routes>
  )
}

export default App