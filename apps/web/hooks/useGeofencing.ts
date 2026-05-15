"use client";

import { listJobGeofenceEvents } from "@pest-patrol/domain";
import { useQuery } from "@tanstack/react-query";

import { getLocalDemoFixtures } from "./localDemoData";

export const jobGeofenceEventsQueryKey = ["job-geofence-events"] as const;

export function useJobGeofenceEvents() {
  return useQuery({
    queryKey: jobGeofenceEventsQueryKey,
    queryFn: () => (getLocalDemoFixtures() ? [] : listJobGeofenceEvents()),
  });
}
