import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Knowledge from './pages/Knowledge'
import AIChat from './pages/AIChat'
import Progress from './pages/Progress'
import Textbooks from './pages/Textbooks'
import Points from './pages/Points'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">加载中...</div>
  }
  
  return user ? children : <Navigate to="/login" />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/knowledge"
        element={
          <PrivateRoute>
            <Knowledge />
          </PrivateRoute>
        }
      />
      <Route
        path="/ai-chat"
        element={
          <PrivateRoute>
            <AIChat />
          </PrivateRoute>
        }
      />
      <Route
        path="/aichat"
        element={
          <PrivateRoute>
            <AIChat />
          </PrivateRoute>
        }
      />
      <Route
        path="/progress"
        element={
          <PrivateRoute>
            <Progress />
          </PrivateRoute>
        }
      />
      <Route
        path="/points"
        element={
          <PrivateRoute>
            <Points />
          </PrivateRoute>
        }
      />
      <Route
        path="/textbooks"
        element={
          <PrivateRoute>
            <Textbooks />
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

export default App
