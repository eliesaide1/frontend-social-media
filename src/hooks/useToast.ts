"use client";

import { useState, useCallback } from "react";

interface ToastState {
  show: boolean;
  message: string;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ show: false, message: "" });

  const showToast = useCallback((message: string) => {
    setToast({ show: true, message });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, show: false }));
  }, []);

  return { toast, showToast, hideToast };
}
