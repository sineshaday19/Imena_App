import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import SignUp from '../SignUp'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn() }),
}))

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  getCooperatives: vi.fn().mockResolvedValue([]),
  getCooperativesForSignup: vi.fn().mockResolvedValue([{ id: 1, name: 'Coop One' }]),
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

  it('shows combined duplicate message for email-or-phone backend errors', async () => {
    const { apiFetch } = await import('@/lib/api')
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new Error('A user with this email or phone number already exists.')
    )

    render(<Wrapped />)
    await screen.findByText('Coop One')

    fireEvent.change(screen.getByLabelText('signup.fullName'), {
      target: { value: 'Test User' },
    })
    fireEvent.change(screen.getByLabelText('signup.emailOptional'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('signup.phone'), {
      target: { value: '0780222140' },
    })
    fireEvent.change(screen.getByLabelText('signup.cooperativeName'), {
      target: { value: '1' },
    })
    fireEvent.change(screen.getByLabelText('signup.password'), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText('signup.confirmPassword'), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'signup.createAccount' }))

    await waitFor(() =>
      expect(
        screen.getByText('signup.errors.emailOrPhoneAlreadyExists')
      ).toBeInTheDocument()
    )
  })

  it('rider with no email does not see email-only duplicate when API returns misleading text', async () => {
    const { apiFetch } = await import('@/lib/api')
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new Error('A user with this email already exists.')
    )

    render(<Wrapped />)
    await screen.findByText('Coop One')

    fireEvent.change(screen.getByLabelText('signup.fullName'), {
      target: { value: 'Test User' },
    })
    fireEvent.change(screen.getByLabelText('signup.emailOptional'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('signup.phone'), {
      target: { value: '+250780222001' },
    })
    fireEvent.change(screen.getByLabelText('signup.cooperativeName'), {
      target: { value: '1' },
    })
    fireEvent.change(screen.getByLabelText('signup.password'), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText('signup.confirmPassword'), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'signup.createAccount' }))

    await waitFor(() =>
      expect(
        screen.getByText('signup.errors.emailOrPhoneAlreadyExists')
      ).toBeInTheDocument()
    )
  })
})
