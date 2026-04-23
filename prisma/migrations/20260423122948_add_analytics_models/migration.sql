-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "referrer" TEXT,
    "referrerDomain" TEXT,
    "userAgent" TEXT,
    "sessionHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleFeedback" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "comment" TEXT,
    "sessionHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchQuery" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "sessionHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageView_articleId_idx" ON "PageView"("articleId");

-- CreateIndex
CREATE INDEX "PageView_referrerDomain_idx" ON "PageView"("referrerDomain");

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");

-- CreateIndex
CREATE INDEX "PageView_sessionHash_articleId_idx" ON "PageView"("sessionHash", "articleId");

-- CreateIndex
CREATE INDEX "ArticleFeedback_articleId_idx" ON "ArticleFeedback"("articleId");

-- CreateIndex
CREATE INDEX "ArticleFeedback_createdAt_idx" ON "ArticleFeedback"("createdAt");

-- CreateIndex
CREATE INDEX "ArticleFeedback_sessionHash_articleId_idx" ON "ArticleFeedback"("sessionHash", "articleId");

-- CreateIndex
CREATE INDEX "SearchQuery_createdAt_idx" ON "SearchQuery"("createdAt");

-- CreateIndex
CREATE INDEX "SearchQuery_query_idx" ON "SearchQuery"("query");

-- AddForeignKey
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleFeedback" ADD CONSTRAINT "ArticleFeedback_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
