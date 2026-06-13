import styled, { css } from 'styled-components';

export const Card = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space.lg};
`;

export const PageHeader = styled.header`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.space.lg};
`;

export const H1 = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xxl};
  margin: 0;
`;

export const H2 = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  margin: 0 0 ${({ theme }) => theme.space.md};
`;

export const Muted = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const inputBase = css`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

export const Input = styled.input`${inputBase}`;
export const Select = styled.select`${inputBase}`;
export const TextArea = styled.textarea`
  ${inputBase}
  min-height: 60px;
  resize: vertical;
  width: 100%;
`;

export const Button = styled.button<{ variant?: 'primary' | 'ghost' | 'danger' }>`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font-weight: ${({ theme }) => theme.fontWeights.medium};

  &:disabled { opacity: 0.5; cursor: not-allowed; }

  ${({ variant, theme }) =>
    variant === 'primary' &&
    css`
      background: ${theme.colors.primary};
      color: ${theme.colors.primaryText};
      border-color: ${theme.colors.primary};
    `}

  ${({ variant, theme }) =>
    variant === 'danger' &&
    css`
      background: transparent;
      color: ${theme.colors.danger};
      border-color: ${theme.colors.danger};
    `}

  ${({ variant }) =>
    variant === 'ghost' &&
    css`
      background: transparent;
      border-color: transparent;
    `}
`;

export const Row = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.sm};
  align-items: center;
`;

export const Stack = styled.div<{ gap?: keyof { xs: 0; sm: 0; md: 0; lg: 0; xl: 0 } }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme, gap = 'md' }) => theme.space[gap]};
`;
