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
          queuedToSync: "Queued to sync",
          savedOffline: "Saved offline",
          syncFailedRetry: "Sync failed - retry",
          synced: "Synced",
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
          validation: {
            amountRequired: "Enter an amount greater than zero",
            offlineReconcileNote: "Inventory will reconcile after sync",
            productRequired: "Choose a chemical before saving",
            targetContextRequired:
              "Add target pests and treated site details before saving",
            unitRequired: "The selected chemical is missing a unit",
          },
        },
        fieldFlow: {
          reviewSummary:
            "Some field captures still need attention before completion.",
          stateLabels: {
            done: "Done",
            failed: "Failed",
            needed: "Needed",
            queued: "Queued",
          },
          stateSummaries: {
            done: "Synced.",
            failed: "Sync failed - retry available.",
            needed: "Needed before completion.",
            queued: "Queued to sync.",
          },
          steps: {
            chemical: "Chemical use",
            form: "Treatment notes",
            geofence: "Arrive and depart",
            photo: "Photos",
            signature: "Signature",
            status: "Start visit",
          },
          summary: "{done} done - {queued} queued - {failed} failed - {needed} needed",
          title: "Field checklist",
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
          fields: {
            target_pests: {
              label: "Target pests",
              placeholder: "Ants, roaches, rodents",
            },
            areas_treated: {
              label: "Areas treated",
              placeholder: "Kitchen, garage, exterior perimeter",
            },
            materials_applied: {
              label: "Materials applied",
              placeholder: "Products or methods used",
            },
            application_method: {
              label: "Application method",
              placeholder:
                "Bait placement, crack-and-crevice, exclusion, monitoring",
            },
            service_branch: {
              label: "Service branch",
              placeholder: "San Diego branch route",
            },
            weather_conditions: {
              label: "Weather / site conditions",
              placeholder:
                "Interior service, dry exterior, wind, rain, access notes",
            },
            customer_instructions: {
              label: "Customer instructions",
              placeholder: "Re-entry notes, prep, follow-up instructions",
            },
            epa_label_reviewed: {
              label: "EPA label reviewed",
            },
            follow_up_required: {
              label: "Follow-up required",
            },
          },
          queueButton: "Queue form",
          requiredFieldError: "{field} is required",
          fallbackError: "Unable to queue treatment form",
        },
        sync: {
          clearSynced: "Clear synced",
          failedDetail: "Some items failed. Review the list and retry.",
          failedTitle: "Sync failed - retry",
          noItemsWaiting: "Nothing waiting to sync.",
          noLocalChanges: "No local changes",
          offlineDetail:
            "Work is saved on this device and will sync when the connection returns.",
          pendingDetail:
            "Queued work will sync as soon as the device is online.",
          nextRetryAt: "Next retry",
          queuedTitle: "Queued to sync",
          retrySync: "Retry sync",
          savedOffline: "Saved offline",
          notSynced: "Not synced",
          syncedDetail: "All queued work is synced.",
          syncedAt: "Synced",
          syncedTitle: "Synced",
          syncingNow: "Syncing now",
          syncWhenOnline: "Sync when online",
          syncNow: "Sync now",
          counts: {
            failed: "{count} failed",
            queued: "{count} queued",
            retrying: "{count} retrying",
            synced: "{count} synced",
          },
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
          queuedToSync: "En cola para sincronizar",
          savedOffline: "Guardado sin conexión",
          syncFailedRetry: "La sincronización falló - reintentar",
          synced: "Sincronizado",
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
          validation: {
            amountRequired: "Ingresa una cantidad mayor que cero",
            offlineReconcileNote: "El inventario se reconciliará después de sincronizar",
            productRequired: "Elige un químico antes de guardar",
            targetContextRequired:
              "Agrega las plagas objetivo y el sitio tratado antes de guardar",
            unitRequired: "El químico seleccionado no tiene unidad",
          },
        },
        fieldFlow: {
          reviewSummary:
            "Aún hay capturas de campo que revisar antes de completar.",
          stateLabels: {
            done: "Listo",
            failed: "Fallido",
            needed: "Necesario",
            queued: "En cola",
          },
          stateSummaries: {
            done: "Sincronizado.",
            failed: "La sincronización falló - reintentar disponible.",
            needed: "Necesario antes de completar.",
            queued: "En cola para sincronizar.",
          },
          steps: {
            chemical: "Uso de químicos",
            form: "Notas de tratamiento",
            geofence: "Llegada y salida",
            photo: "Fotos",
            signature: "Firma",
            status: "Iniciar visita",
          },
          summary: "{done} listos - {queued} en cola - {failed} fallidos - {needed} necesarios",
          title: "Lista de campo",
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
          fields: {
            target_pests: {
              label: "Plagas objetivo",
              placeholder: "Hormigas, cucarachas, roedores",
            },
            areas_treated: {
              label: "Áreas tratadas",
              placeholder: "Cocina, garaje, perímetro exterior",
            },
            materials_applied: {
              label: "Materiales aplicados",
              placeholder: "Productos o métodos usados",
            },
            application_method: {
              label: "Método de aplicación",
              placeholder:
                "Cebo, grietas y hendiduras, exclusión, monitoreo",
            },
            service_branch: {
              label: "Sucursal de servicio",
              placeholder: "Ruta de San Diego",
            },
            weather_conditions: {
              label: "Clima / condiciones del sitio",
              placeholder:
                "Servicio interior, exterior seco, viento, lluvia, notas de acceso",
            },
            customer_instructions: {
              label: "Instrucciones para el cliente",
              placeholder: "Reingreso, preparación, seguimiento",
            },
            epa_label_reviewed: {
              label: "Etiqueta EPA revisada",
            },
            follow_up_required: {
              label: "Se requiere seguimiento",
            },
          },
          queueButton: "Guardar formulario",
          requiredFieldError: "El campo {field} es obligatorio",
          fallbackError: "No se pudo guardar el formulario de tratamiento",
        },
        sync: {
          clearSynced: "Borrar sincronizados",
          failedDetail: "Algunos elementos fallaron. Revisa la lista y vuelve a intentar.",
          failedTitle: "La sincronización falló - reintentar",
          noItemsWaiting: "Nada pendiente para sincronizar.",
          noLocalChanges: "Sin cambios locales",
          offlineDetail:
            "El trabajo se guarda en este dispositivo y se sincroniza cuando vuelve la conexión.",
          pendingDetail:
            "El trabajo en cola se sincroniza en cuanto el dispositivo vuelva a estar en linea.",
          nextRetryAt: "Próximo reintento",
          queuedTitle: "En cola para sincronizar",
          retrySync: "Reintentar sincronizacion",
          savedOffline: "Guardado sin conexión",
          notSynced: "No sincronizado",
          syncedDetail: "Todo lo que estaba en cola ya se sincronizo.",
          syncedAt: "Sincronizado",
          syncedTitle: "Sincronizado",
          syncingNow: "Sincronizando ahora",
          syncWhenOnline: "Sincronizar cuando haya conexion",
          syncNow: "Sincronizar ahora",
          counts: {
            failed: "{count} fallidos",
            queued: "{count} en cola",
            retrying: "{count} reintentando",
            synced: "{count} sincronizados",
          },
        },
      },
    },
  },
};

export type Language = keyof typeof translations;
