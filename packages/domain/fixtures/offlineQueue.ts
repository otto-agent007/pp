import type {
  OfflineQueueAction,
  OfflineQueueItem,
  OfflineQueuePayloadByAction,
} from "@pest-patrol/types";

/**
 * The smallest valid payload for each queue action.
 *
 * Before CR07 a fixture could stand in a bare `{ job_id }` for any action,
 * because `OfflineQueueItem` defaulted its payload to `Record<string, unknown>`.
 * Now the action decides the payload, so a test that only cares which job an
 * item belongs to still has to produce a well-formed envelope. Building those
 * here keeps that noise out of the assertions.
 *
 * The map is total over `OfflineQueueAction` by construction: a newly added
 * action is a compile error here rather than a fixture nobody wrote.
 */
const queuePayloadsByAction: {
  [K in OfflineQueueAction]: (jobId: string) => OfflineQueuePayloadByAction[K];
} = {
  arrival_notification_create: (jobId) => ({
    captured_at: "2026-05-05T12:00:00.000Z",
    client_event_id: "arrival-event-1",
    decision: "send_now",
    job_id: jobId,
  }),
  chemical_log_create: (jobId) => ({
    amount_used: 2,
    chemical_id: "chemical-1",
    job_id: jobId,
  }),
  form_submission_create: (jobId) => ({
    form_data: {},
    job_id: jobId,
    template_id: "template-1",
  }),
  geofence_event_create: (jobId) => ({
    accuracy_m: 5,
    captured_at: "2026-05-05T12:00:00.000Z",
    client_event_id: "geofence-event-1",
    distance_m: 10,
    event_type: "arrival",
    job_id: jobId,
    latitude: 30.27,
    longitude: -97.74,
    within_radius: true,
  }),
  job_status_update: (jobId) => ({
    job_id: jobId,
    status: "en_route",
  }),
  photo_upload: (jobId) => ({
    content_type: "image/jpeg",
    file_name: "photo.jpg",
    job_id: jobId,
    local_uri: "file:///photo.jpg",
    storage_bucket: "job-media",
    storage_path: `${jobId}/photo.jpg`,
  }),
  signature_capture: (jobId) => ({
    content_type: "image/png",
    file_name: "signature.png",
    job_id: jobId,
    local_uri: "data:image/png;base64,signature",
    storage_bucket: "job-media",
    storage_path: `${jobId}/signature.png`,
  }),
};

/** A valid payload for `action`, belonging to `jobId`. */
export function queuePayload<TAction extends OfflineQueueAction>(
  action: TAction,
  jobId = "job-1",
): OfflineQueuePayloadByAction[TAction] {
  return queuePayloadsByAction[action](jobId);
}

/** Everything about an item except the action and the payload it decides. */
type QueueItemOverrides = Partial<Omit<OfflineQueueItem, "action" | "payload">> & {
  jobId?: string;
};

/**
 * A whole queue item for `action`, with a payload that matches it.
 *
 * Written generically over the action so a caller mapping across several
 * actions still gets one correctly paired item per action, rather than a single
 * item type whose payload is the union of all seven.
 */
export function queueItem<TAction extends OfflineQueueAction>(
  action: TAction,
  overrides: QueueItemOverrides = {},
): OfflineQueueItem<TAction> {
  const { jobId = "job-1", ...itemOverrides } = overrides;

  return {
    id: `queue-${action}`,
    action,
    payload: queuePayload(action, jobId),
    status: "queued",
    attempts: 0,
    created_at: "2026-05-05T12:00:00.000Z",
    updated_at: "2026-05-05T12:00:00.000Z",
    next_retry_at: null,
    last_error: null,
    outcome: null,
    ...itemOverrides,
  };
}
