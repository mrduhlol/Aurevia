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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
