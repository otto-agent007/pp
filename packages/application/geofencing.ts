import type { GeofencingPort } from "./ports";
export async function listJobGeofenceEvents(port: GeofencingPort) {
  return port.listJobGeofenceEventRecords();
}
