-- AlterTable: add synthesiaId and thumbnailUrl to Video
ALTER TABLE "Video" ADD COLUMN "synthesiaId" TEXT;
ALTER TABLE "Video" ADD COLUMN "thumbnailUrl" TEXT;

-- Create unique index on synthesiaId
CREATE UNIQUE INDEX "Video_synthesiaId_key" ON "Video"("synthesiaId");

-- Backfill: extract Synthesia UUID from originalFilename for existing records
UPDATE "Video"
SET "synthesiaId" = substring("originalFilename" FROM 'synthesia-([a-f0-9-]+)\.mp4'),
    "hlsPath" = NULL,
    "thumbnailPath" = NULL
WHERE "originalFilename" LIKE 'synthesia-%.mp4';
