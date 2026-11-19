import { useState } from "react";
import { ApiError } from "./api";

/** The errors a form shows after a failed save: under each field, or at the top. */
export function useFormErrors() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function show(error: unknown) {
    if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
      setFieldErrors(error.fields);
      setFormError(null);
    } else {
      setFieldErrors({});
      setFormError(error instanceof Error ? error.message : "Something went wrong. Try again.");
    }
  }

  function clear() {
    setFieldErrors({});
    setFormError(null);
  }

  return { fieldErrors, formError, show, clear, setFieldErrors };
}
