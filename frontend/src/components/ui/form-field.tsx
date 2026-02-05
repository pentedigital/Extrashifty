import * as React from 'react'
import { UseFormRegisterReturn, FieldError } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export interface FormFieldProps {
  /** Unique identifier for the field */
  id: string
  /** Label text for the field */
  label: string
  /** Register function return from react-hook-form */
  register: UseFormRegisterReturn
  /** Field error from react-hook-form */
  error?: FieldError
  /** Type of input field */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea'
  /** Placeholder text */
  placeholder?: string
  /** Whether the field is required */
  required?: boolean
  /** Whether the field is disabled */
  disabled?: boolean
  /** Additional CSS classes for the container */
  className?: string
  /** Additional CSS classes for the input */
  inputClassName?: string
  /** Number of rows for textarea */
  rows?: number
  /** Maximum character length */
  maxLength?: number
  /** Helper text displayed below the field */
  helperText?: string
  /** Show character count (for textarea) */
  showCharCount?: boolean
  /** Current value length (for character count) */
  valueLength?: number
}

/**
 * FormField - Reusable form field component that wraps Label + Input/Textarea + error message
 * Designed to work with react-hook-form register function
 */
export function FormField({
  id,
  label,
  register,
  error,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  className,
  inputClassName,
  rows = 4,
  maxLength,
  helperText,
  showCharCount = false,
  valueLength = 0,
}: FormFieldProps) {
  const isTextarea = type === 'textarea'

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
        {!required && <span className="text-muted-foreground ml-1">(optional)</span>}
      </Label>

      {isTextarea ? (
        <Textarea
          id={id}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          className={cn(error && 'border-destructive', inputClassName)}
          {...register}
        />
      ) : (
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          className={cn(error && 'border-destructive', inputClassName)}
          {...register}
        />
      )}

      {/* Error message */}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {error.message}
        </p>
      )}

      {/* Helper text or character count */}
      {!error && (helperText || showCharCount) && (
        <div className={cn('text-xs text-muted-foreground', showCharCount && 'flex justify-between')}>
          {helperText && <span id={`${id}-helper`}>{helperText}</span>}
          {showCharCount && maxLength && (
            <span className={!helperText ? 'ml-auto' : ''}>
              {valueLength}/{maxLength} characters
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export interface FormFieldWrapperProps {
  /** Unique identifier for the field */
  id: string
  /** Label text for the field */
  label: string
  /** Field error from react-hook-form */
  error?: FieldError
  /** Whether the field is required */
  required?: boolean
  /** Additional CSS classes for the container */
  className?: string
  /** Helper text displayed below the field */
  helperText?: string
  /** Children elements (custom input) */
  children: React.ReactNode
}

/**
 * FormFieldWrapper - Wraps custom form controls with Label + error message pattern
 * Use this for custom components like StarRating that don't use standard Input
 */
export function FormFieldWrapper({
  id,
  label,
  error,
  required = false,
  className,
  helperText,
  children,
}: FormFieldWrapperProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
        {!required && <span className="text-muted-foreground ml-1">(optional)</span>}
      </Label>

      {children}

      {/* Error message */}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {error.message}
        </p>
      )}

      {/* Helper text */}
      {!error && helperText && (
        <p id={`${id}-helper`} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  )
}
