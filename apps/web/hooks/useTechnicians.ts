"use client";

import {
  inviteTechnician,
  listTechnicianDirectory,
  listTechnicians,
} from "@pest-patrol/domain";
import type {
  TechnicianInviteInput,
  TechnicianProfile,
} from "@pest-patrol/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLocalDemoFixtures,
  inviteLocalDemoTechnician,
} from "./localDemoData";

export const techniciansQueryKey = ["technicians"] as const;
export const technicianDirectoryQueryKey = ["technician-directory"] as const;

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
