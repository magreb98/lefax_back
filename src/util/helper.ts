export function formatErrorResponse(error: unknown) {
  const err = error as Error;
  return { message: 'Erreur serveur', error: err.message || 'Erreur inconnue' };
}