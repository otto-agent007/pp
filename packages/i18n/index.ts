export const translations = {
  en: {
    dashboard: {
      title: "Pest Patrol OS",
      welcome: "Welcome back",
    },
    jobs: {
      title: "Jobs",
      start: "Start Job",
      complete: "Complete Job",
      status: {
        scheduled: "Scheduled",
        en_route: "En Route",
        in_progress: "In Progress",
        completed: "Completed",
        canceled: "Canceled",
      },
      fieldStatus: {
        reviewCompletion: "Review completion",
        reviewBeforeCompleting: "Review before completing",
        completeAnyway: "Complete anyway",
      },
      fieldCopy: {
        common: {
          queuedForSync: "Queued locally for sync",
        },
        chemical: {
          title: "Chemical log",
          description:
            "Choose the product and amount used. Chemical logs are queued locally and sync later with the job.",
          loading: "Loading chemicals",
          empty: "No active chemicals available",
          amountPlaceholder: "Amount used",
          notesPlaceholder: "Notes",
          queueButton: "Queue chemical",
          fallbackError: "Unable to queue chemical log",
        },
        location: {
          title: "Location",
          description:
            "Capture arrival and departure at the service location. Location events queue locally and sync later.",
          missingCoordinates: "Service coordinates are not saved yet",
          arrival: "Arrival",
          departure: "Departure",
          permissionError: "Location permission is required",
          fallbackError: "Unable to capture location",
          withoutCoordinates: "{event} queued without service coordinates",
          withinRadius: "{event} queued within {distance}m",
          outsideRadius: "{event} queued {distance}m from service location",
        },
        photos: {
          title: "Photos",
          description:
            "Capture clear before, during, or after photos. Each photo queues on this device and syncs when service is available.",
          descriptionPlaceholder: "Description",
          camera: "Camera",
          library: "Library",
          cameraPermissionError: "Camera permission is required",
          libraryPermissionError: "Photo library permission is required",
          fallbackError: "Unable to queue photo",
        },
        signature: {
          title: "Signature",
          description:
            "Enter the signer name, then tap Queue in the signature box. Signatures stay local until sync can send them.",
          signerPlaceholder: "Signer name",
          clear: "Clear",
          queue: "Queue",
          requiredError: "Signature is required",
          queuedForSync: "Signature queued locally for sync",
          fallbackError: "Unable to queue signature",
        },
        treatment: {
          title: "Treatment form",
          description:
            "Record the field notes before leaving the stop. Queued forms stay on this device and sync when the connection is ready.",
          queueButton: "Queue form",
          fallbackError: "Unable to queue treatment form",
        },
      },
    },
  },
  es: {
    dashboard: {
      title: "Pest Patrol OS",
      welcome: "Bienvenido de nuevo",
    },
    jobs: {
      title: "Trabajos",
      start: "Iniciar Trabajo",
      complete: "Completar Trabajo",
      status: {
        scheduled: "Programado",
        en_route: "En camino",
        in_progress: "En progreso",
        completed: "Completado",
        canceled: "Cancelado",
      },
      fieldStatus: {
        reviewCompletion: "Revisar finalización",
        reviewBeforeCompleting: "Revisar antes de completar",
        completeAnyway: "Completar de todos modos",
      },
      fieldCopy: {
        common: {
          queuedForSync: "Guardado localmente para sincronizar",
        },
        chemical: {
          title: "Registro químico",
          description:
            "Elige el producto y la cantidad usada. Los registros químicos se guardan localmente y se sincronizan después con el trabajo.",
          loading: "Cargando químicos",
          empty: "No hay químicos activos disponibles",
          amountPlaceholder: "Cantidad usada",
          notesPlaceholder: "Notas",
          queueButton: "Guardar químico",
          fallbackError: "No se pudo guardar el registro químico",
        },
        location: {
          title: "Ubicación",
          description:
            "Captura la llegada y salida en la ubicación del servicio. Los eventos de ubicación se guardan localmente y se sincronizan después.",
          missingCoordinates: "Las coordenadas del servicio aún no están guardadas",
          arrival: "Llegada",
          departure: "Salida",
          permissionError: "Se requiere permiso de ubicación",
          fallbackError: "No se pudo capturar la ubicación",
          withoutCoordinates: "{event} guardada sin coordenadas del servicio",
          withinRadius: "{event} guardada dentro de {distance}m",
          outsideRadius:
            "{event} guardada a {distance}m de la ubicación del servicio",
        },
        photos: {
          title: "Fotos",
          description:
            "Captura fotos claras de antes, durante o después. Cada foto se guarda en este dispositivo y se sincroniza cuando haya servicio.",
          descriptionPlaceholder: "Descripción",
          camera: "Cámara",
          library: "Biblioteca",
          cameraPermissionError: "Se requiere permiso de cámara",
          libraryPermissionError: "Se requiere permiso de la biblioteca de fotos",
          fallbackError: "No se pudo guardar la foto",
        },
        signature: {
          title: "Firma",
          description:
            "Ingresa el nombre del firmante y toca Guardar en el cuadro de firma. Las firmas quedan locales hasta que se puedan sincronizar.",
          signerPlaceholder: "Nombre del firmante",
          clear: "Borrar",
          queue: "Guardar",
          requiredError: "La firma es obligatoria",
          queuedForSync: "Firma guardada localmente para sincronizar",
          fallbackError: "No se pudo guardar la firma",
        },
        treatment: {
          title: "Formulario de tratamiento",
          description:
            "Registra las notas de campo antes de salir de la parada. Los formularios guardados quedan en este dispositivo y se sincronizan cuando la conexión esté lista.",
          queueButton: "Guardar formulario",
          fallbackError: "No se pudo guardar el formulario de tratamiento",
        },
      },
    },
  },
};

export type Language = keyof typeof translations;
