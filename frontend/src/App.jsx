import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Knowledge from './pages/Knowledge'
import AIChat from './pages/AIChat'
import AIChatV2 from './pages/AIChatV2'
import EssayGrading from './pages/EssayGrading'
import LearningPlan from './pages/LearningPlan'
import Progress from './pages/Progress'
import Textbooks from './pages/Textbooks'
import Points from './pages/Points'
import Practice from './pages/Practice'
import ParentBind from './pages/ParentBind'
import StudentMonitor from './pages/StudentMonitor'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/home/Profile'

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
        path="/ai-chat-v2"
        element={
          <PrivateRoute>
            <AIChatV2 />
          </PrivateRoute>
        }
      />
      <Route
        path="/ai/essay-grading"
        element={
          <PrivateRoute>
            <EssayGrading />
          </PrivateRoute>
        }
      />
      <Route
        path="/ai/learning-plan"
        element={
          <PrivateRoute>
            <LearningPlan />
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
      <Route
        path="/practice"
        element={
          <PrivateRoute>
            <Practice />
          </PrivateRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <PrivateRoute>
            <Leaderboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/parent/bind"
        element={
          <PrivateRoute>
            <ParentBind />
          </PrivateRoute>
        }
      />
      <Route
        path="/parent/monitor"
        element={
          <PrivateRoute>
            <StudentMonitor />
          </PrivateRoute>
        }
      />
      <Route
        path="/parent/monitor/:studentId"
        element={
          <PrivateRoute>
            <StudentMonitor />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

export default App
