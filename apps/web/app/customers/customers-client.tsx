"use client";

import { filterCustomers, validateCustomerInput } from "@pest-patrol/domain";
import type {
  Customer,
  CustomerInput,
  CustomerLocationInput,
  CustomerStatus,
  PropertyType,
} from "@pest-patrol/types";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import {
  useArchiveCustomer,
  useCreateCustomer,
  useCustomers,
  useUpdateCustomer,
} from "../../hooks/useCustomers";
import { CustomerPortalLinks } from "./customer-portal-links";

const emptyLocation: CustomerLocationInput = {
  address: "",
  nickname: "",
  service_notes: "",
  is_primary: true,
};

const emptyForm: CustomerInput = {
  name: "",
  phone: "",
  email: "",
  property_type: "residential",
  service_notes: "",
  locations: [{ ...emptyLocation }],
};

const createSuccessMessage =
  "Customer saved. Schedule the first job next; share portal links when closeout and billing are ready.";
const updateSuccessMessage =
  "Customer updated. Schedule the first job next; share portal links when closeout and billing are ready.";

function customerToInput(customer: Customer): CustomerInput {
  return {
    name: customer.name,
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    property_type: customer.property_type,
    service_notes: customer.service_notes ?? "",
    locations:
      customer.locations?.map((location) => ({
        id: location.id,
        address: location.address,
        nickname: location.nickname ?? "",
        service_notes: location.service_notes ?? "",
        is_primary: location.is_primary,
      })) ?? [{ ...emptyLocation }],
  };
}

export function CustomersClient() {
  const customersQuery = useCustomers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const archiveCustomer = useArchiveCustomer();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CustomerStatus>("active");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const visibleCustomers = useMemo(
    () => filterCustomers(customersQuery.data ?? [], search, status),
    [customersQuery.data, search, status],
  );

  const isSaving = createCustomer.isPending || updateCustomer.isPending;

  function resetForm() {
    setEditingCustomer(null);
    setForm({ ...emptyForm, locations: [{ ...emptyLocation }] });
    setFormError(null);
    setSaveMessage(null);
  }

  function editCustomer(customer: Customer) {
    setEditingCustomer(customer);
    setForm(customerToInput(customer));
    setFormError(null);
    setSaveMessage(null);
  }

  function updateLocation(index: number, update: Partial<CustomerLocationInput>) {
    setForm((current) => ({
      ...current,
      locations: current.locations.map((location, locationIndex) => {
        if (locationIndex !== index) {
          return update.is_primary ? { ...location, is_primary: false } : location;
        }

        return { ...location, ...update };
      }),
    }));
  }

  function removeLocation(index: number) {
    setForm((current) => {
      const remaining = current.locations.filter((_, locationIndex) => locationIndex !== index);

      return {
        ...current,
        locations: remaining.map((location, locationIndex) => ({
          ...location,
          is_primary: remaining.some((item) => item.is_primary)
            ? location.is_primary
            : locationIndex === 0,
        })),
      };
    });
  }

  async function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSaveMessage(null);

    try {
      const input = validateCustomerInput(form);
      const isEditing = Boolean(editingCustomer);

      if (editingCustomer) {
        await updateCustomer.mutateAsync({ id: editingCustomer.id, input });
      } else {
        await createCustomer.mutateAsync(input);
      }

      resetForm();
      setSaveMessage(isEditing ? updateSuccessMessage : createSuccessMessage);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save customer");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
            Admin
          </p>
          <h1 className="text-3xl font-bold text-neutralDark">Customers</h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            aria-label="Search customers"
            className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            value={search}
          />
          <select
            aria-label="Customer status"
            className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
            onChange={(event) => setStatus(event.target.value as CustomerStatus)}
            value={status}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-3">
          {customersQuery.isLoading ? (
            <p className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">
              Loading customers
            </p>
          ) : visibleCustomers.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">
              No customers found
            </p>
          ) : (
            visibleCustomers.map((customer) => (
              <article
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
                key={customer.id}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-neutralDark">
                      {customer.name}
                    </h2>
                    <p className="text-sm capitalize text-gray-600">
                      {customer.property_type}
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      {[customer.phone, customer.email].filter(Boolean).join(" | ") ||
                        "No contact saved"}
                    </p>
                    <div className="mt-3 flex flex-col gap-1">
                      {(customer.locations ?? []).map((location) => (
                        <p className="text-sm text-gray-700" key={location.id}>
                          {location.is_primary ? "Primary: " : ""}
                          {location.address}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-medium text-neutralDark hover:bg-gray-50"
                      onClick={() => editCustomer(customer)}
                      type="button"
                    >
                      Edit
                    </button>
                    {customer.status === "active" ? (
                      <button
                        className="min-h-10 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50"
                        disabled={archiveCustomer.isPending}
                        onClick={() => archiveCustomer.mutate(customer.id)}
                        type="button"
                      >
                        Archive
                      </button>
                    ) : null}
                  </div>
                </div>
                {customer.status === "active" ? (
                  <CustomerPortalLinks customerId={customer.id} />
                ) : null}
              </article>
            ))
          )}
        </div>

        <form
          className="flex h-fit flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          onSubmit={submitCustomer}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-neutralDark">
              {editingCustomer ? "Edit customer" : "Create customer"}
            </h2>
            {editingCustomer ? (
              <button
                className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-medium text-neutralDark hover:bg-gray-50"
                onClick={resetForm}
                type="button"
              >
                New
              </button>
            ) : null}
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-800">
              Customer setup demo tip
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Save the customer with one active service location, then schedule
              the first job.
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Use portal links after closeout and billing are ready.
            </p>
            <Link
              className="mt-3 inline-flex min-h-10 items-center rounded-md border border-amber-300 px-3 text-sm font-semibold text-amber-900 hover:bg-amber-100"
              href="/jobs"
            >
              Schedule job
            </Link>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Name
            <input
              className="min-h-11 rounded-md border border-gray-300 px-3 text-sm font-normal outline-none focus:border-primary"
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              value={form.name}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
              Phone
              <input
                className="min-h-11 rounded-md border border-gray-300 px-3 text-sm font-normal outline-none focus:border-primary"
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                value={form.phone ?? ""}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
              Email
              <input
                className="min-h-11 rounded-md border border-gray-300 px-3 text-sm font-normal outline-none focus:border-primary"
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                type="email"
                value={form.email ?? ""}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Property type
            <select
              className="min-h-11 rounded-md border border-gray-300 px-3 text-sm font-normal outline-none focus:border-primary"
              onChange={(event) =>
                setForm({ ...form, property_type: event.target.value as PropertyType })
              }
              value={form.property_type}
            >
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Service notes
            <textarea
              className="min-h-24 rounded-md border border-gray-300 px-3 py-2 text-sm font-normal outline-none focus:border-primary"
              onChange={(event) =>
                setForm({ ...form, service_notes: event.target.value })
              }
              value={form.service_notes ?? ""}
            />
          </label>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-neutralDark">Locations</h3>
              <button
                className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-medium text-neutralDark hover:bg-gray-50"
                onClick={() =>
                  setForm({
                    ...form,
                    locations: [
                      ...form.locations,
                      { ...emptyLocation, is_primary: form.locations.length === 0 },
                    ],
                  })
                }
                type="button"
              >
                Add
              </button>
            </div>

            {form.locations.map((location, index) => (
              <div
                className="flex flex-col gap-3 rounded-md border border-gray-200 p-3"
                key={location.id ?? index}
              >
                <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
                  Address
                  <input
                    className="min-h-11 rounded-md border border-gray-300 px-3 text-sm font-normal outline-none focus:border-primary"
                    onChange={(event) =>
                      updateLocation(index, { address: event.target.value })
                    }
                    value={location.address}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
                  Nickname
                  <input
                    className="min-h-11 rounded-md border border-gray-300 px-3 text-sm font-normal outline-none focus:border-primary"
                    onChange={(event) =>
                      updateLocation(index, { nickname: event.target.value })
                    }
                    value={location.nickname ?? ""}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
                  Location notes
                  <textarea
                    className="min-h-20 rounded-md border border-gray-300 px-3 py-2 text-sm font-normal outline-none focus:border-primary"
                    onChange={(event) =>
                      updateLocation(index, { service_notes: event.target.value })
                    }
                    value={location.service_notes ?? ""}
                  />
                </label>
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-neutralDark">
                    <input
                      checked={Boolean(location.is_primary)}
                      onChange={(event) =>
                        updateLocation(index, { is_primary: event.target.checked })
                      }
                      type="checkbox"
                    />
                    Primary
                  </label>
                  <button
                    className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-medium text-neutralDark hover:bg-gray-50"
                    onClick={() => removeLocation(index)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
          {saveMessage ? (
            <p
              className="rounded-md border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800"
              role="status"
            >
              {saveMessage}
            </p>
          ) : null}

          <button
            className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-gray-400"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Saving" : "Save customer"}
          </button>
        </form>
      </section>
    </main>
  );
}
