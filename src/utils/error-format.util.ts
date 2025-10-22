export interface ErrorResponse {
  message: string;
  success: boolean;
  code: string; // could be the error name or custom code
}

export function createErrorResponse(error: any): ErrorResponse {
  if (!error) {
    return {
      message: "Unknown error",
      success: false,
      code: "UNKNOWN_ERROR",
    };
  }

  // If it's one of our custom errors
  if (error.statusCode && error.message) {
    return {
      message: error.message,
      success: false,
      code: error.name || "ERROR",
    };
  }

  // Fallback for unknown errors
  return {
    message: error.message || String(error),
    success: false,
    code: error.name || "ERROR",
  };
}