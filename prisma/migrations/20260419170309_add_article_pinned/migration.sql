-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Media" ALTER COLUMN "size" SET DATA TYPE BIGINT;

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Article_categoryId_idx" ON "Article"("categoryId");

-- CreateIndex
CREATE INDEX "ArticleTranslation_translatedBy_idx" ON "ArticleTranslation"("translatedBy");

-- CreateIndex
CREATE INDEX "ArticleTranslation_reviewedBy_idx" ON "ArticleTranslation"("reviewedBy");

-- CreateIndex
CREATE INDEX "Media_uploadedBy_idx" ON "Media"("uploadedBy");

-- CreateIndex
CREATE INDEX "RelatedArticle_relatedArticleId_idx" ON "RelatedArticle"("relatedArticleId");
