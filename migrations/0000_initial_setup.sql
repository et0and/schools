-- Create schools table
CREATE TABLE schools (
  "_id" integer PRIMARY KEY NOT NULL,
  "School_Id" text NOT NULL,
  "Org_Name" text NOT NULL,
  "Telephone" text,
  "Fax" text,
  "Email" text,
  "Contact1_Name" text,
  "URL" text,
  "Add1_Line1" text,
  "Add1_Suburb" text,
  "Add1_City" text,
  "Add2_Line1" text,
  "Add2_Suburb" text,
  "Add2_City" text,
  "Add2_Postal_Code" text,
  "Urban_Rural_Indicator" text,
  "Org_Type" text,
  "Definition" text,
  "Authority" text,
  "School_Donations" text,
  "CoEd_Status" text,
  "KMEPeakBody" text,
  "Takiwā" text,
  "Territorial_Authority" text,
  "Regional_Council" text,
  "Local_Office_Name" text,
  "Education_Region" text,
  "General_Electorate" text,
  "Māori_Electorate" text,
  "Statistical_Area_2_Code" text,
  "Statistical_Area_2_Description" text,
  "Ward" text,
  "Col_Id" text,
  "Col_Name" text,
  "Latitude" real,
  "Longitude" real,
  "Enrolment_Scheme" text,
  "EQi_Index" text,
  "Roll_Date" text,
  "Total" integer,
  "European" integer,
  "Māori" integer,
  "Pacific" integer,
  "Asian" integer,
  "MELAA" integer,
  "Other" integer,
  "International" integer,
  "Isolation_Index" text,
  "Language_of_Instruction" text,
  "BoardingFacilities" text,
  "CohortEntry" text,
  "Status" text,
  "DateSchoolOpened" text,
  "created_at" integer DEFAULT (unixepoch()) NOT NULL,
  "updated_at" integer DEFAULT (unixepoch()) NOT NULL
);

-- Create cache_metadata table
CREATE TABLE cache_metadata (
  "id" integer PRIMARY KEY NOT NULL,
  "cache_key" text NOT NULL,
  "last_updated" integer NOT NULL,
  "record_count" integer NOT NULL
);

-- Create indexes for fast queries
CREATE UNIQUE INDEX "cache_metadata_cache_key_unique" ON "cache_metadata"("cache_key");
CREATE INDEX "schools_Org_Name" ON "schools"("Org_Name");
CREATE INDEX "schools_Add1_City" ON "schools"("Add1_City");
CREATE INDEX "schools_Status" ON "schools"("Status");
CREATE INDEX "schools_Authority" ON "schools"("Authority");
CREATE INDEX "schools_Add1_Suburb" ON "schools"("Add1_Suburb");
CREATE INDEX "schools_Email" ON "schools"("Email");
CREATE INDEX "schools_School_Id" ON "schools"("School_Id");