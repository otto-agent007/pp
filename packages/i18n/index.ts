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
      classification: {
        callback: "Callback",
        estimate: "Estimate",
        exclusion: "Exclusion",
        follow_up: "Follow-up",
        general_pest: "General Pest",
        inspection: "Inspection",
        project_work: "Project Work",
        recurring_service: "Recurring Service",
        warranty: "Warranty",
        wdo_escrow: "WDO / Escrow",
      },
      workModes: {
        labels: {
          estimate: "Estimate",
          recurring_service: "Recurring Service",
          general_pest: "General Pest",
          exclusion_project: "Exclusion / Project",
          wdo_escrow: "WDO / Escrow",
          warranty_callback: "Warranty / Callback",
          follow_up: "Follow-up",
          inspection: "Inspection",
          standard_service: "Service",
        },
        shortLabels: {
          estimate: "Estimate",
          recurring_service: "Recurring",
          general_pest: "General Pest",
          exclusion_project: "Project",
          wdo_escrow: "WDO / Escrow",
          warranty_callback: "Callback",
          follow_up: "Follow-up",
          inspection: "Inspection",
          standard_service: "Service",
        },
        summaries: {
          estimate:
            "Inspect, capture photos, and document the proposed scope. Treatment is not required unless directed.",
          recurring_service:
            "Complete the scheduled route service and note any access issues or follow-up needs.",
          general_pest:
            "Complete treatment workflow and chemical log if product is used.",
          exclusion_project:
            "Review scope, capture before/after photos, and document project work.",
          wdo_escrow:
            "Capture inspection proof and findings. Office review is required before final document release.",
          warranty_callback:
            "Confirm the issue, document findings, and flag any billable follow-up.",
          follow_up: "Document findings and next steps.",
          inspection: "Document findings and next steps.",
          standard_service: "Complete the standard field workflow.",
        },
        checklistLabels: {
          access_issues: "Access/issues notes",
          acknowledgement: "Customer acknowledgement / signature if available",
          after_photos: "After photos",
          arrival: "Arrival",
          before_photos: "Before photos",
          chemical_if_used: "Chemical log if used",
          complete: "Complete",
          estimate_scope: "Estimate scope",
          findings_recommendations: "Findings / recommendations",
          follow_up_needed: "Follow-up needed?",
          follow_up_recommendation: "Follow-up recommendation",
          inspection_form: "Inspection form",
          inspection_notes: "Inspection notes",
          office_review: "Office review",
          photos: "Photos",
          photos_if_needed: "Photos if needed",
          required_photos: "Required photos",
          review_scope: "Review scope",
          service_checklist: "Service checklist / treatment form",
          service_notes: "Service notes",
          signature: "Signature",
          signature_if_required: "Signature if required",
          sync: "Sync",
          treatment_form: "Treatment form",
          work_checklist: "Work checklist",
        },
        checklistSummaries: {
          access_issues: "Note access issues or follow-up needs.",
          acknowledgement: "Capture acknowledgement when available.",
          after_photos: "Photo proof expected after work.",
          arrival: "Capture arrival at the service location.",
          before_photos: "Photo proof expected before work.",
          chemical_if_used: "Chemical log is only needed if product was used.",
          complete: "Complete the stop.",
          estimate_scope:
            "Document the proposed scope for office/customer follow-up.",
          findings_recommendations: "Document findings and recommendations.",
          follow_up_needed: "Flag follow-up needs for office review.",
          follow_up_recommendation: "Document recommendation or next action.",
          inspection_form: "Capture inspection proof and findings.",
          inspection_notes: "Document findings and next steps.",
          office_review:
            "Office review required before final document release.",
          photos: "Photos strongly recommended.",
          photos_if_needed: "Capture photos when proof is useful.",
          required_photos: "Photo proof expected.",
          review_scope: "Confirm scope before work begins.",
          service_checklist: "Complete the scheduled route service workflow.",
          service_notes: "Document findings and next steps.",
          signature: "Capture signature when available.",
          signature_if_required:
            "Capture signature when the account or office requires it.",
          sync: "Sync queued field proof.",
          treatment_form: "Complete treatment notes.",
          work_checklist: "Document completed project work.",
        },
        proofExpectations: {
          photoProofExpected: "Photo proof expected",
        },
        warnings: {
          chemicalIfUsed: "Chemical log is only needed if product was used.",
          estimateTreatmentNotRequired:
            "Estimate - treatment not required unless directed.",
          officeReviewRequired:
            "Office review required before final document release.",
        },
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
            notExpected: "Not expected",
            optional: "Optional",
            queued: "Queued",
            recommended: "Recommended",
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
          arrivalNotice: {
            title: "Arrival notice",
            description:
              "You've arrived. Choose whether to notify the customer now, delay the notice for 5 minutes, or skip it.",
            sendNow: "Send now",
            delayFiveMinutes: "Delay 5 min",
            skip: "Skip",
            status: {
              delayFiveMinutes:
                "Arrival notice queued with a 5 minute delay",
              sendNow: "Arrival notice queued for immediate send",
              skip: "Arrival notice skipped and recorded",
            },
          },
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
          discard: "Discard",
          storageFailedTitle: "This device is not saving your work",
          storageFailedDetail:
            "Captures and queued changes are only in memory right now, so closing the app would lose them. Sync now if you can, and tell the office if this keeps happening.",
          recoveryTitle: "Needs your attention",
          recoveryDetail:
            "These changes stopped syncing on their own. Check the job, then discard each one once it is handled.",
          outcomes: {
            conflict:
              "The office or another device changed this first - check the job before discarding.",
            terminal: "This cannot be sent. Redo it on the job if it still matters.",
            unknown: "This stopped syncing and needs a look.",
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
      classification: {
        callback: "Revisita",
        estimate: "Estimado",
        exclusion: "Exclusión",
        follow_up: "Seguimiento",
        general_pest: "Plagas generales",
        inspection: "Inspección",
        project_work: "Trabajo de proyecto",
        recurring_service: "Servicio recurrente",
        warranty: "Garantía",
        wdo_escrow: "WDO / Escrow",
      },
      workModes: {
        labels: {
          estimate: "Estimado",
          recurring_service: "Servicio recurrente",
          general_pest: "Control general",
          exclusion_project: "Exclusión / Proyecto",
          wdo_escrow: "WDO / Escrow",
          warranty_callback: "Garantía / Revisión",
          follow_up: "Seguimiento",
          inspection: "Inspección",
          standard_service: "Servicio",
        },
        shortLabels: {
          estimate: "Estimado",
          recurring_service: "Recurrente",
          general_pest: "Control general",
          exclusion_project: "Proyecto",
          wdo_escrow: "WDO / Escrow",
          warranty_callback: "Revisión",
          follow_up: "Seguimiento",
          inspection: "Inspección",
          standard_service: "Servicio",
        },
        summaries: {
          estimate:
            "Inspecciona, captura fotos y documenta el alcance propuesto. No se requiere tratamiento a menos que se indique.",
          recurring_service:
            "Completa el servicio programado de ruta y anota problemas de acceso o necesidades de seguimiento.",
          general_pest:
            "Completa el flujo de tratamiento y el registro químico si se usó producto.",
          exclusion_project:
            "Revisa el alcance, captura fotos de antes/después y documenta el trabajo del proyecto.",
          wdo_escrow:
            "Captura prueba de inspección y hallazgos. Se requiere revisión de oficina antes de liberar el documento final.",
          warranty_callback:
            "Confirma el problema, documenta hallazgos y marca cualquier seguimiento facturable.",
          follow_up: "Documenta hallazgos y próximos pasos.",
          inspection: "Documenta hallazgos y próximos pasos.",
          standard_service: "Completa el flujo de campo estándar.",
        },
        checklistLabels: {
          access_issues: "Notas de acceso/problemas",
          acknowledgement: "Reconocimiento del cliente / firma si está disponible",
          after_photos: "Fotos después",
          arrival: "Llegada",
          before_photos: "Fotos antes",
          chemical_if_used: "Registro químico si se usó",
          complete: "Completar",
          estimate_scope: "Alcance del estimado",
          findings_recommendations: "Hallazgos / recomendaciones",
          follow_up_needed: "¿Se necesita seguimiento?",
          follow_up_recommendation: "Recomendación de seguimiento",
          inspection_form: "Formulario de inspección",
          inspection_notes: "Notas de inspección",
          office_review: "Revisión de oficina",
          photos: "Fotos",
          photos_if_needed: "Fotos si se necesitan",
          required_photos: "Fotos requeridas",
          review_scope: "Revisar alcance",
          service_checklist: "Lista de servicio / formulario de tratamiento",
          service_notes: "Notas de servicio",
          signature: "Firma",
          signature_if_required: "Firma si se requiere",
          sync: "Sincronizar",
          treatment_form: "Formulario de tratamiento",
          work_checklist: "Lista de trabajo",
        },
        checklistSummaries: {
          access_issues: "Anota problemas de acceso o necesidades de seguimiento.",
          acknowledgement: "Captura reconocimiento cuando esté disponible.",
          after_photos: "Se espera prueba fotográfica después del trabajo.",
          arrival: "Captura la llegada en la ubicación del servicio.",
          before_photos: "Se espera prueba fotográfica antes del trabajo.",
          chemical_if_used: "El registro químico solo es necesario si se usó producto.",
          complete: "Completa la parada.",
          estimate_scope:
            "Documenta el alcance propuesto para seguimiento de oficina/cliente.",
          findings_recommendations: "Documenta hallazgos y recomendaciones.",
          follow_up_needed: "Marca necesidades de seguimiento para revisión de oficina.",
          follow_up_recommendation: "Documenta recomendación o próxima acción.",
          inspection_form: "Captura prueba de inspección y hallazgos.",
          inspection_notes: "Documenta hallazgos y próximos pasos.",
          office_review:
            "Se requiere revisión de oficina antes de liberar el documento final.",
          photos: "Fotos muy recomendadas.",
          photos_if_needed: "Captura fotos cuando la prueba sea útil.",
          required_photos: "Se espera prueba fotográfica.",
          review_scope: "Confirma el alcance antes de comenzar el trabajo.",
          service_checklist: "Completa el flujo del servicio programado de ruta.",
          service_notes: "Documenta hallazgos y próximos pasos.",
          signature: "Captura firma cuando esté disponible.",
          signature_if_required:
            "Captura firma cuando la cuenta o la oficina la requiera.",
          sync: "Sincroniza la prueba de campo guardada.",
          treatment_form: "Completa notas de tratamiento.",
          work_checklist: "Documenta el trabajo de proyecto completado.",
        },
        proofExpectations: {
          photoProofExpected: "Se espera prueba fotográfica",
        },
        warnings: {
          chemicalIfUsed:
            "El registro químico solo es necesario si se usó producto.",
          estimateTreatmentNotRequired:
            "Estimado - no se requiere tratamiento a menos que se indique.",
          officeReviewRequired:
            "Se requiere revisión de oficina antes de liberar el documento final.",
        },
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
            notExpected: "No esperado",
            optional: "Opcional",
            queued: "En cola",
            recommended: "Recomendado",
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
          arrivalNotice: {
            title: "Aviso de llegada",
            description:
              "Ya llegaste. Elige si avisar al cliente ahora, retrasar el aviso 5 minutos o omitirlo.",
            sendNow: "Enviar ahora",
            delayFiveMinutes: "Retrasar 5 min",
            skip: "Omitir",
            status: {
              delayFiveMinutes:
                "Aviso de llegada guardado con retraso de 5 minutos",
              sendNow: "Aviso de llegada guardado para enviar de inmediato",
              skip: "Aviso de llegada omitido y registrado",
            },
          },
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
          discard: "Descartar",
          storageFailedTitle: "Este dispositivo no está guardando tu trabajo",
          storageFailedDetail:
            "Las capturas y los cambios en cola solo están en memoria ahora mismo, así que cerrar la aplicación los perdería. Sincroniza si puedes y avisa a la oficina si esto sigue pasando.",
          recoveryTitle: "Requiere tu atención",
          recoveryDetail:
            "Estos cambios dejaron de sincronizarse por su cuenta. Revisa el trabajo y descarta cada uno cuando ya esté resuelto.",
          outcomes: {
            conflict:
              "La oficina u otro dispositivo lo cambió primero: revisa el trabajo antes de descartarlo.",
            terminal:
              "Esto no se puede enviar. Vuelve a hacerlo en el trabajo si todavía hace falta.",
            unknown: "Esto dejó de sincronizarse y necesita revisión.",
          },
        },
      },
    },
  },
};

export type Language = keyof typeof translations;
