import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import SignUp from '../SignUp'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn() }),
}))

vi.mock('@/lib/api', () => ({
  getCooperatives: vi.fn().mockResolvedValue([]),
  getCooperativesForSignup: vi.fn().mockResolvedValue([]),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

function Wrapped() {
  return (
    <BrowserRouter>
      <SignUp />
    </BrowserRouter>
  )
}

describe('SignUp', () => {
  it('renders signup form', () => {
    render(<Wrapped />)
    expect(screen.getByText('signup.pageTitle')).toBeInTheDocument()
  })
})
