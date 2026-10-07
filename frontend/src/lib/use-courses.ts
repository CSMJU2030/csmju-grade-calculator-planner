"use client";

import { useEffect, useState } from "react";
import { asApiError, getAllCourses, type ApiError, type Course } from "@/lib/api";

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void getAllCourses(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setCourses(data);
          setError(null);
        }
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setCourses([]);
          setError(asApiError(failure));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

  function reload() {
    setLoading(true);
    setError(null);
    setRevision((value) => value + 1);
  }

  return { courses, loading, error, reload };
}
