import { describe, expect, test } from "vitest";
import {
  changeStage,
  check,
  contactScope,
  mismatch,
  newDeal,
  pickContact,
  pickOrganization,
  toValues,
  type ContactChoice,
} from "./dealFormRules";

const TODAY = "2026-11-19";
const northpeak = { id: 1, name: "Northpeak" };
const brightlane = { id: 2, name: "Brightlane" };
const jane: ContactChoice = {
  id: 10,
  name: "Jane Doe",
  organization_id: 1,
  organization_name: "Northpeak",
};
const sam: ContactChoice = {
  id: 11,
  name: "Sam Okafor",
  organization_id: null,
  organization_name: null,
};

describe("the organization and main contact (spec 3.4)", () => {
  test("picking an organization limits the contacts to its people", () => {
    expect(contactScope(newDeal({}, TODAY))).toBeUndefined();
    expect(contactScope(pickOrganization(newDeal({}, TODAY), northpeak))).toBe(1);
  });

  test("picking a contact fills in their organization", () => {
    const form = pickContact(newDeal({}, TODAY), jane);
    expect(form.organization).toEqual(northpeak);
    expect(form.contact).toEqual(jane);
  });

  test("a contact with no organization leaves the organization as it is", () => {
    const form = pickContact(newDeal({}, TODAY), sam);
    expect(form.organization).toBeNull();
    expect(mismatch(form)).toBeNull();
  });

  test("changing the organization clears a contact who works elsewhere", () => {
    const form = pickContact(newDeal({}, TODAY), jane);
    expect(pickOrganization(form, brightlane).contact).toBeNull();
    expect(pickOrganization(form, northpeak).contact).toEqual(jane);
    expect(pickOrganization(form, null).contact).toBeNull();
  });

  test("a contact who has moved gives a message, and the form can't be saved", () => {
    const moved = { ...jane, organization_id: 2, organization_name: "Brightlane" };
    const form = {
      ...newDeal({ organization: northpeak }, TODAY),
      name: "Website redesign",
      contact: moved,
    };
    expect(mismatch(form)).toBe("Jane Doe now works at Brightlane");
    expect(check(form)).toEqual({
      contact_id: "Jane Doe now works at Brightlane. Choose a new main contact.",
    });
    const left = { ...form, contact: { ...jane, organization_id: null, organization_name: null } };
    expect(mismatch(left)).toBe("Jane Doe no longer works at Northpeak");
  });
});

describe("the stage (spec 3.2)", () => {
  test("changing the stage fills in the probability", () => {
    const form = changeStage(newDeal({}, TODAY), "proposal", TODAY);
    expect(form.probability).toBe("50");
    expect(form.close_date).toBeNull();
  });

  test("Won and Lost fill in today's date", () => {
    const form = { ...newDeal({}, TODAY), close_date: "2027-01-31" };
    expect(changeStage(form, "won", TODAY)).toMatchObject({
      probability: "100",
      close_date: TODAY,
    });
    expect(changeStage(form, "lost", TODAY)).toMatchObject({ probability: "0", close_date: TODAY });
  });

  test("a deal added in a column starts at that stage", () => {
    expect(newDeal({ stage: "negotiation" }, TODAY)).toMatchObject({
      stage: "negotiation",
      probability: "75",
    });
    expect(newDeal({ stage: "won" }, TODAY)).toMatchObject({ stage: "won", close_date: TODAY });
  });

  test("a deal added from a contact's page has the contact and their organization", () => {
    expect(newDeal({ contact: jane }, TODAY)).toMatchObject({
      contact: jane,
      organization: northpeak,
    });
  });
});

describe("the values sent", () => {
  test("money and percents are whole numbers", () => {
    const form = { ...newDeal({}, TODAY), name: " Kiosk ", value: "$48,000", probability: "65" };
    expect(toValues(form)).toMatchObject({
      name: "Kiosk",
      value: 48000,
      probability: 65,
      stage: "new",
    });
    expect(toValues({ ...form, value: "" }).value).toBeNull();
  });

  test("the form's own checks", () => {
    const form = { ...newDeal({}, TODAY), value: "12.5", probability: "120" };
    expect(check(form)).toEqual({
      name: "Enter a name.",
      value: "Enter a value of 0 or more, in whole dollars.",
      probability: "Enter a probability from 0 to 100.",
    });
  });
});
