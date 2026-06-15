// Every error in SpoonChat goes through this file.
// Components never inspect raw HTTP status codes themselves —
// they receive a classified error with a human message.

export const ErrorType = {
  NETWORK:    'NETWORK',     // server unreachable
  AUTH:       'AUTH',        // 401 / 403
  VALIDATION: 'VALIDATION',  // 400 bad input
  CRYPTO:     'CRYPTO',      // encryption / decryption failure
  WEBSOCKET:  'WEBSOCKET',   // WS connection issues
  UNKNOWN:    'UNKNOWN',
};

/**
 * Takes any thrown error and returns { type, message }.
 * Safe to call on network errors, HTTP errors, or generic JS errors.
 */
export function classifyError(error) {
  // No response — server is down or no internet
  if (!error?.response) {
    return {
      type: ErrorType.NETWORK,
      message: 'Cannot reach SpoonChat server. Check your connection.',
    };
  }

  const status = error.response.status;
  const data   = error.response.data;

  if (status === 401) {
    return { type: ErrorType.AUTH, message: 'Session expired. Please log in again.' };
  }
  if (status === 403) {
    return { type: ErrorType.AUTH, message: "You don't have permission to do that." };
  }
  if (status === 400) {
    // Try to surface the first field-level error from DRF
    if (data && typeof data === 'object') {
      const first = Object.entries(data)[0];
      if (first) {
        const [field, msg] = first;
        const text = Array.isArray(msg) ? msg[0] : msg;
        return { type: ErrorType.VALIDATION, message: `${field}: ${text}` };
      }
    }
    return { type: ErrorType.VALIDATION, message: 'Invalid input.' };
  }
  if (status === 404) {
    return { type: ErrorType.UNKNOWN, message: 'Not found.' };
  }
  if (status >= 500) {
    return { type: ErrorType.NETWORK, message: 'Server error. Try again in a moment.' };
  }

  return { type: ErrorType.UNKNOWN, message: data?.detail || 'Something went wrong.' };
}

/**
 * Maps a DRF validation response onto a { fieldName: errorString } object.
 * Used in forms to show per-field errors.
 */
export function mapFieldErrors(responseData) {
  if (!responseData || typeof responseData !== 'object') return {};
  const out = {};
  Object.entries(responseData).forEach(([key, val]) => {
    out[key] = Array.isArray(val) ? val[0] : String(val);
  });
  return out;
}
