-- CreateIndex
CREATE INDEX "SocialFeedItem_isDeleted_score_createdAt_idx" ON "SocialFeedItem"("isDeleted", "score", "createdAt");
