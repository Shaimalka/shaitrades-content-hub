export const ADMIN_EMAIL = 'shaimalkas@gmail.com'

export const isAdmin = (email: string | null | undefined) =>
    email === ADMIN_EMAIL
