import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './input'

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('accepts and displays typed text', async () => {
    const user = userEvent.setup()
    render(<Input />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'Hello World')

    expect(input).toHaveValue('Hello World')
  })

  it('applies custom className', () => {
    render(<Input className="custom-class" />)
    expect(screen.getByRole('textbox')).toHaveClass('custom-class')
  })

  it('handles disabled state', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('displays placeholder text', () => {
    render(<Input placeholder="Enter your name" />)
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument()
  })

  it('supports different input types', () => {
    render(<Input type="email" data-testid="email-input" />)
    const input = screen.getByTestId('email-input')
    expect(input).toHaveAttribute('type', 'email')
  })

  it('supports password type', () => {
    render(<Input type="password" data-testid="password-input" />)
    const input = screen.getByTestId('password-input')
    expect(input).toHaveAttribute('type', 'password')
  })

  it('calls onChange handler', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<Input onChange={handleChange} />)
    await user.type(screen.getByRole('textbox'), 'a')

    expect(handleChange).toHaveBeenCalled()
  })

  it('calls onBlur handler', async () => {
    const user = userEvent.setup()
    const handleBlur = vi.fn()

    render(<Input onBlur={handleBlur} />)
    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.tab()

    expect(handleBlur).toHaveBeenCalled()
  })

  it('forwards ref to input element', () => {
    const ref = vi.fn()
    render(<Input ref={ref} />)
    expect(ref).toHaveBeenCalled()
  })

  it('supports controlled value', () => {
    const { rerender } = render(<Input value="initial" onChange={() => {}} />)
    expect(screen.getByRole('textbox')).toHaveValue('initial')

    rerender(<Input value="updated" onChange={() => {}} />)
    expect(screen.getByRole('textbox')).toHaveValue('updated')
  })

  it('supports name attribute', () => {
    render(<Input name="email" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('name', 'email')
  })

  it('supports id attribute', () => {
    render(<Input id="my-input" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'my-input')
  })

  it('supports required attribute', () => {
    render(<Input required />)
    expect(screen.getByRole('textbox')).toBeRequired()
  })

  it('supports readonly attribute', () => {
    render(<Input readOnly value="readonly value" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly')
  })

  it('applies base styles', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('rounded-md')
    expect(input).toHaveClass('border')
  })
})
