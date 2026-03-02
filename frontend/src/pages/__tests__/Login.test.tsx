import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import Login from '../Login'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn() }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

function WrappedLogin() {
  return (
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  )
}

describe('Login', () => {
  it('renders login form', () => {
    render(<WrappedLogin />)
    expect(screen.getByRole('button', { name: 'login.logIn' })).toBeInTheDocument()
  })

  it('shows page title', () => {
    render(<WrappedLogin />)
    expect(screen.getByText('login.pageTitle')).toBeInTheDocument()
  })
})
