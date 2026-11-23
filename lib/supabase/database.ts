import type { FlightDetails, FlightSource } from "../flight/validation";

export type Profile = {
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_path: string | null;
  discoverable: boolean;
  created_at: string;
  updated_at: string;
};

type ProfileInsert = Pick<Profile, "user_id" | "display_name"> &
  Partial<Pick<Profile, "bio" | "discoverable">>;

export type FlightClaim = FlightDetails & {
  id: string;
  user_id: string;
  source: FlightSource;
  status: "unverified";
  consent_version: number;
  created_at: string;
  expires_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
        Relationships: [];
      };
      flight_claims: {
        Row: FlightClaim;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      submit_flight_claim: {
        Args: {
          p_flight_number: string;
          p_departure_date: string;
          p_origin: string;
          p_destination: string;
          p_source: FlightSource;
          p_consent_version: number;
        };
        Returns: string;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
