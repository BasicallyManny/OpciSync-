export type LeadStatus =
  | "SPOKE"
  | "MET"
  | "OFFER"
  | "CONTRACT"
  | "CLOSE";

export interface Lead {
  name: string;
  status: LeadStatus;
  lastUpdated: string;
}