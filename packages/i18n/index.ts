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
        completed: "Completed"
      }
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
        en_route: "En Camino",
        in_progress: "En Progreso",
        completed: "Completado"
      }
    },
  },
};

export type Language = keyof typeof translations;