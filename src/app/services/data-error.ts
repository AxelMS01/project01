import axios from 'axios';

export class DataError extends Error {}

export function dataErrorMessage(error: unknown): string {
  if (error instanceof DataError) return error.message;
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return 'El servidor tardó demasiado en responder. Intenta de nuevo.';
    }
    if (error.response) {
      if (error.response.status >= 500) return 'El servidor no puede acceder a los datos en este momento. Intenta más tarde.';
      if (error.response.status === 401) return 'No se pudo iniciar sesión. Revisa tu correo y contraseña.';
      if (error.response.status === 409) return 'El correo ya está registrado. Intenta iniciar sesión.';
      return 'No se pudo completar la solicitud. Revisa los datos e intenta de nuevo.';
    }
    return 'No se pudo contactar al servidor. Revisa tu conexión e intenta de nuevo.';
  }
  return 'No se pudo completar la operación. Intenta de nuevo.';
}
