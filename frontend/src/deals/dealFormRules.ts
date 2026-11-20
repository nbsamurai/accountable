// The deal form's rules (spec 3.2 and 3.4), as plain functions so they can be tested alone.

import type { Ref } from "../lib/api";
import { stage as stageInfo, type Stage } from "../lib/stages";
import type { Deal, DealValues } from "./queries";

export type ContactChoice = Ref & {
  organization_id: number | null;
  organization_name: string | null;
};

export type DealFormState = {
  name: string;
  organization: Ref | null;
  contact: ContactChoice | null;
  stage: Stage;
  value: string;
  probability: string;
  close_date: string | null;
};

export type DealDefaults = {
  organization?: Ref | null;
  contact?: ContactChoice | null;
  stage?: Stage;
};

/** A new deal: New, or the stage it's added at, with that stage's probability (spec 3.2). */
export function newDeal(defaults: DealDefaults = {}, today: string): DealFormState {
  const empty: DealFormState = {
    name: "",
    organization: defaults.organization ?? null,
    contact: null,
    stage: "new",
    value: "",
    probability: String(stageInfo("new").probability),
    close_date: null,
  };
  const withContact = defaults.contact ? pickContact(empty, defaults.contact) : empty;
  return defaults.stage ? changeStage(withContact, defaults.stage, today) : withContact;
}

export function fromDeal(deal: Deal): DealFormState {
  return {
    name: deal.name,
    organization: deal.organization,
    contact: deal.contact,
    stage: deal.stage,
    value: deal.value === null ? "" : String(deal.value),
    probability: String(deal.probability),
    close_date: deal.close_date,
  };
}

/** The main contact picker lists only the organization's people, or everyone when there's none. */
export function contactScope(form: DealFormState): number | undefined {
  return form.organization?.id;
}

/** Picking an organization clears a main contact who works elsewhere. */
export function pickOrganization(form: DealFormState, organization: Ref | null): DealFormState {
  const contact =
    form.contact && form.contact.organization_id === (organization?.id ?? null)
      ? form.contact
      : null;
  return { ...form, organization, contact };
}

/** Picking a contact who has an organization fills it in. */
export function pickContact(form: DealFormState, contact: ContactChoice | null): DealFormState {
  if (contact && contact.organization_id !== null) {
    return {
      ...form,
      contact,
      organization: { id: contact.organization_id, name: contact.organization_name ?? "" },
    };
  }
  return { ...form, contact };
}

/** A new stage fills in its usual probability, and today's date for Won or Lost. */
export function changeStage(form: DealFormState, stage: Stage, today: string): DealFormState {
  if (stage === form.stage) return form;
  const closed = stage === "won" || stage === "lost";
  return {
    ...form,
    stage,
    probability: String(stageInfo(stage).probability),
    close_date: closed ? today : form.close_date,
  };
}

/**
 * A main contact who has since moved to another organization: "Jane Doe now works at
 * Brightlane". The form asks for a new main contact before it can be saved.
 */
export function mismatch(form: DealFormState): string | null {
  const { contact, organization } = form;
  if (!contact || contact.organization_id === (organization?.id ?? null)) return null;
  if (contact.organization_name) return `${contact.name} now works at ${contact.organization_name}`;
  return `${contact.name} no longer works at ${organization?.name ?? "this organization"}`;
}

function wholeNumber(text: string): number | null | "invalid" {
  const cleaned = text.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  return /^\d+$/.test(cleaned) ? Number(cleaned) : "invalid";
}

/** The form's own checks, by field, before anything is sent. */
export function check(form: DealFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Enter a name.";
  if (wholeNumber(form.value) === "invalid")
    errors.value = "Enter a value of 0 or more, in whole dollars.";
  const probability = wholeNumber(form.probability);
  if (probability === null || probability === "invalid" || probability > 100) {
    errors.probability = "Enter a probability from 0 to 100.";
  }
  const moved = mismatch(form);
  if (moved) errors.contact_id = `${moved}. Choose a new main contact.`;
  return errors;
}

export function toValues(form: DealFormState): DealValues {
  return {
    name: form.name.trim(),
    organization_id: form.organization?.id ?? null,
    contact_id: form.contact?.id ?? null,
    stage: form.stage,
    value: wholeNumber(form.value) as number | null,
    probability: wholeNumber(form.probability) as number,
    close_date: form.close_date,
  };
}
