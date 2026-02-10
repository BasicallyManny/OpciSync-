export type LeadStatus =
  | "SPOKE"
  | "MET"
  | "OFFER"
  | "CONTRACT"
  | "We Received Offers"
  | "Negotiating Lease"
  | "Unknown"
  | "CLOSE";

export interface Lead {
  name: string;
  status: LeadStatus;
  lastUpdated: string;
}