import type { Middleware } from '@reduxjs/toolkit'

/**
 * RTK Query API middleware. Empty until the first API slice exists; the store
 * concats whatever is here onto the default middleware.
 */
export const APIS: Middleware[] = []
