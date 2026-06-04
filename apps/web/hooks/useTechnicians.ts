"use client";

import {
  archiveTechnicianLicense,
  createTechnicianLicense,
  inviteTechnician,
  listTechnicianLicenses,
  listTechnicianDirectory,
  listTechnicians,
  updateTechnicianLicense,
} from "@pest-patrol/domain";
import { isTechnicianLicenseSchemaUnavailableError } from "@pest-patrol/api-client";
import type {
  TechnicianLicense,
  TechnicianLicenseInput,
  TechnicianInviteInput,
  TechnicianProfile,
} from "@pest-patrol/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveLocalDemoTechnicianLicense,
  createLocalDemoTechnicianLicense,
  getLocalDemoFixtures,
  inviteLocalDemoTechnician,
  listLocalDemoTechnicianLicenses,
  updateLocalDemoTechnicianLicense,
} from "./localDemoData";

export const techniciansQueryKey = ["technicians"] as const;
export const technicianDirectoryQueryKey = ["technician-directory"] as const;
export const technicianLicensesQueryKey = ["technician-licenses"] as const;

export function useTechnicians() {
  return useQuery({
    queryKey: techniciansQueryKey,
    queryFn: () => getLocalDemoFixtures()?.technicians ?? listTechnicians(),
  });
}

export function useTechnicianDirectory() {
  return useQuery({
    queryKey: technicianDirectoryQueryKey,
    queryFn: () =>
      getLocalDemoFixtures()?.technicians ?? listTechnicianDirectory(),
  });
}

export function useTechnicianLicenses(technicianId?: string) {
  const query = useQuery({
    queryKey: technicianId
      ? [...technicianLicensesQueryKey, technicianId]
      : technicianLicensesQueryKey,
    queryFn: () =>
      getLocalDemoFixtures()
        ? Promise.resolve(listLocalDemoTechnicianLicenses(technicianId))
        : listTechnicianLicenses(technicianId),
  });
  const schemaUnavailable = isTechnicianLicenseSchemaUnavailableError(
    query.error,
  );

  return {
    ...query,
    data: schemaUnavailable ? ([] as TechnicianLicense[]) : query.data,
    schemaUnavailable,
    setupWarning: schemaUnavailable
      ? "Technician credential records are unavailable until the technician_licenses migration is applied."
      : null,
  };
}

export function useCreateTechnicianLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TechnicianLicenseInput) =>
      getLocalDemoFixtures()
        ? Promise.resolve(createLocalDemoTechnicianLicense(input))
        : createTechnicianLicense(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: technicianLicensesQueryKey,
      });
    },
  });
}

export function useUpdateTechnicianLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: TechnicianLicenseInput;
    }) =>
      getLocalDemoFixtures()
        ? Promise.resolve(updateLocalDemoTechnicianLicense(id, input))
        : updateTechnicianLicense(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: technicianLicensesQueryKey,
      });
    },
  });
}

export function useArchiveTechnicianLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      getLocalDemoFixtures()
        ? Promise.resolve(archiveLocalDemoTechnicianLicense(id))
        : archiveTechnicianLicense(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: technicianLicensesQueryKey,
      });
    },
  });
}

export function useInviteTechnician() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TechnicianInviteInput) =>
      getLocalDemoFixtures()
        ? Promise.resolve(inviteLocalDemoTechnician(input))
        : inviteTechnician(input),
    onSuccess: (result) => {
      queryClient.setQueryData<TechnicianProfile[]>(
        technicianDirectoryQueryKey,
        (previous = []) => {
          const existing = previous.filter(
            (technician) => technician.id !== result.technician.id,
          );

          return [...existing, result.technician].sort((left, right) =>
            (left.display_name ?? left.email ?? left.id).localeCompare(
              right.display_name ?? right.email ?? right.id,
            ),
          );
        },
      );

      void queryClient.invalidateQueries({ queryKey: techniciansQueryKey });
      void queryClient.invalidateQueries({
        queryKey: technicianDirectoryQueryKey,
      });
    },
  });
}
