import { useMutation } from '@tanstack/react-query'

import { login } from '../services/authService'

export function useLoginMutation() {
  return useMutation({
    mutationFn: login,
  })
}
