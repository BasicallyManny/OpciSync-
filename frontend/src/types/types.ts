export type LeadStatus =
  | "SPOKE"
  | "MET"
  | "OFFER"
  | "CONTRACT"
  | "We Received Offers"
  | "Negotiating Lease"
  | "Unknown"
  | "We Met / Listed Home"
  | "CLOSE";

export interface Lead {
  name: string;
  status: LeadStatus;
  lastUpdated: string;
}